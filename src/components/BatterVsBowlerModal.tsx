import React, { useMemo, useState } from 'react';
import { X, Share2, Download, Search } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Match } from '../types/cricket';

// Batter vs Bowler screen with 3 tabs:
//   Most Dismissals - which bowler got which batter out, how many times
//   Most Runs       - which batter scored most off which bowler
//   Finishers       - batters who were on strike when the winning run was scored in a chase
// Everything is worked out from the ball-by-ball records of matches this phone ALREADY has,
// so browsing, choosing or making posters never reads anything from Firebase.

interface BatterVsBowlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[]; // matches of this tournament
  allMatches: Match[]; // every match known on this phone
  tournamentName: string;
  season?: string;
  teamOf?: Record<string, string>; // playerId -> team name (optional)
}

const INNINGS_KEYS = ['innings1', 'innings2', 'innings3', 'innings4'];
// dismissals that are not credited to the bowler
const NOT_BOWLER_OUT = ['runout', 'retired_hurt', 'retired_out', 'retired', 'timed_out', 'obstructing_field'];
const MIN_BALLS_RUNS_TAB = 6; // hide 1-2 ball matchups from the "Most Runs" list
const PAGE = 10; // rows shown at first, and added by each "Show more"

interface Pair {
  key: string;
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  balls: number;
  runs: number;
  fours: number;
  sixes: number;
  dots: number;
  outs: number;
  bowled: number;
  caught: number;
  lbw: number;
  stumped: number;
  hitwicket: number;
  roofOut: number;
  otherOut: number;
  matches: number;
}

interface FinishItem {
  matchId: string;
  opp: string;
  margin: string;
  runs: number;
  balls: number;
  notOut: boolean;
  at: number;
}
interface Finisher {
  id: string;
  name: string;
  finishes: number;
  notOut: number;
  runs: number;
  list: FinishItem[];
}

// ---------- calculations (pure functions, no screen code) ----------
function uniqueMatches(list: Match[]): Match[] {
  const map = new Map<string, Match>();
  (list || []).forEach((m) => {
    if (m && m.id) map.set(m.id, m);
  });
  return Array.from(map.values());
}

function forEachBall(list: Match[], fn: (b: any, m: Match) => void) {
  list.forEach((m) => {
    INNINGS_KEYS.forEach((k) => {
      const inn: any = (m as any)[k];
      if (!inn || !Array.isArray(inn.balls)) return;
      inn.balls.forEach((b: any) => fn(b, m));
    });
  });
}

// matches that were played but have no ball-by-ball detail on this phone
function countMissingDetail(list: Match[]): number {
  let n = 0;
  list.forEach((m) => {
    let hasBalls = false;
    let played = false;
    INNINGS_KEYS.forEach((k) => {
      const inn: any = (m as any)[k];
      if (!inn) return;
      if (Array.isArray(inn.balls) && inn.balls.length > 0) hasBalls = true;
      if ((inn.totalRuns || 0) > 0) played = true;
    });
    if (played && !hasBalls) n += 1;
  });
  return n;
}

// matches that DO have ball-by-ball detail on this phone
function countWithDetail(list: Match[]): number {
  let n = 0;
  list.forEach((m) => {
    const has = INNINGS_KEYS.some((k) => {
      const inn: any = (m as any)[k];
      return inn && Array.isArray(inn.balls) && inn.balls.length > 0;
    });
    if (has) n += 1;
  });
  return n;
}

function computePairs(pool: Match[]): Pair[] {
  const map = new Map<string, Pair & { seen: Set<string> }>();
  forEachBall(pool, (b, m) => {
    if (!b.strikerId || !b.bowlerId) return;
    const key = `${b.strikerId}|${b.bowlerId}`;
    let p = map.get(key);
    if (!p) {
      p = {
        key,
        batterId: b.strikerId,
        batterName: b.strikerName || 'Player',
        bowlerId: b.bowlerId,
        bowlerName: b.bowlerName || 'Bowler',
        balls: 0, runs: 0, fours: 0, sixes: 0, dots: 0, outs: 0,
        bowled: 0, caught: 0, lbw: 0, stumped: 0, hitwicket: 0, roofOut: 0, otherOut: 0,
        matches: 0,
        seen: new Set<string>(),
      };
      map.set(key, p);
    }
    p.seen.add(m.id);
    p.runs += b.runsBat || 0;
    if (b.isLegalDelivery) {
      p.balls += 1;
      if (!b.runsBat && !b.extraRuns) p.dots += 1;
    }
    if (b.isFour || b.runsBat === 4) p.fours += 1;
    if (b.isSix || b.runsBat === 6) p.sixes += 1;
    // Same rule the scorer uses for a bowler's wicket. Old balls without dismissedPlayerId are
    // still counted (the batter on strike is the one who was out for these dismissal types).
    if (
      b.isWicket &&
      !NOT_BOWLER_OUT.includes(b.wicketType) &&
      (!b.dismissedPlayerId || b.dismissedPlayerId === b.strikerId)
    ) {
      p.outs += 1;
      const t = b.wicketType;
      if (t === 'bowled') p.bowled += 1;
      else if (t === 'caught' || t === 'wall_catch') p.caught += 1;
      else if (t === 'lbw') p.lbw += 1;
      else if (t === 'stumped') p.stumped += 1;
      else if (t === 'hitwicket') p.hitwicket += 1;
      else if (t === 'direct_roof_out') p.roofOut += 1;
      else p.otherOut += 1;
    }
  });
  return Array.from(map.values()).map((p) => {
    p.matches = p.seen.size;
    const { seen, ...rest } = p;
    return rest as Pair;
  });
}

// A "finish" = the batter on strike on the LAST ball of a successful chase
// (the innings that won the match and was the last innings played).
// Wide / no-ball on the last ball does not matter: the batter on strike is credited.
function computeFinishers(pool: Match[]): Finisher[] {
  const map = new Map<string, Finisher>();
  pool.forEach((m: any) => {
    if (m.status !== 'completed') return;
    const winnerId = m.result?.winnerTeamId;
    if (!winnerId || m.result?.isTie) return;
    // last innings that has ball records
    let inn: any = null;
    for (let i = INNINGS_KEYS.length - 1; i >= 0; i--) {
      const cand = m[INNINGS_KEYS[i]];
      if (cand && Array.isArray(cand.balls) && cand.balls.length > 0) {
        inn = cand;
        break;
      }
    }
    if (!inn || inn.teamId !== winnerId) return; // winner was defending, not chasing
    const last = inn.balls[inn.balls.length - 1];
    if (!last || !last.strikerId) return;
    const id: string = last.strikerId;

    let runs = 0;
    let balls = 0;
    let out = false;
    inn.balls.forEach((b: any) => {
      if (b.strikerId === id) {
        runs += b.runsBat || 0;
        if (b.isLegalDelivery) balls += 1;
      }
      if (b.isWicket && b.dismissedPlayerId === id && b.wicketType !== 'retired_hurt') out = true;
    });

    const opp =
      m.teamA && m.teamB ? (m.teamA.id === winnerId ? m.teamB.name : m.teamA.name) : m.name || 'Opponent';
    const mw = m.result?.marginWickets;
    const margin = typeof mw === 'number' ? `won by ${mw} wicket${mw === 1 ? '' : 's'}` : 'won the chase';

    let f = map.get(id);
    if (!f) {
      f = { id, name: last.strikerName || 'Player', finishes: 0, notOut: 0, runs: 0, list: [] };
      map.set(id, f);
    }
    f.finishes += 1;
    if (!out) f.notOut += 1;
    f.runs += runs;
    f.list.push({
      matchId: m.id,
      opp,
      margin,
      runs,
      balls,
      notOut: !out,
      at: Number(m.updatedAt) || Date.parse(m.date || '') || 0,
    });
  });
  const rows = Array.from(map.values());
  rows.forEach((f) => f.list.sort((a, b) => b.at - a.at));
  return rows.sort((a, b) => b.finishes - a.finishes || b.runs - a.runs || b.notOut - a.notOut);
}

// ---------- posters ----------
const PW = 1080;
const PH = 1350;
const PF = 'sans-serif';

function makeCanvas(glowA: string, glowB: string) {
  const canvas = document.createElement('canvas');
  canvas.width = PW;
  canvas.height = PH;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;

  const text = (t: string, px: number, py: number, font: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = font;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (
    t: string, px: number, py: number, maxW: number, start: number, weight: string, col: string,
    style = 'italic ', al: CanvasTextAlign = 'center'
  ) => {
    let s = start;
    x.font = `${style}${weight} ${s}px ${PF}`;
    while (x.measureText(t).width > maxW && s > 14) {
      s -= 2;
      x.font = `${style}${weight} ${s}px ${PF}`;
    }
    text(t, px, py, `${style}${weight} ${s}px ${PF}`, col, al);
  };
  const skew = (cy: number, fn: () => void) => {
    x.save();
    x.transform(1, 0, -0.22, 1, 0.22 * cy, 0);
    fn();
    x.restore();
  };

  const g = x.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, '#040a22');
  g.addColorStop(0.55, '#07123a');
  g.addColorStop(1, '#030617');
  x.fillStyle = g;
  x.fillRect(0, 0, PW, PH);
  const gl = x.createRadialGradient(170, 380, 10, 170, 380, 540);
  gl.addColorStop(0, glowA);
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gl;
  x.fillRect(0, 0, PW, PH);
  const gr = x.createRadialGradient(910, 380, 10, 910, 380, 540);
  gr.addColorStop(0, glowB);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, PW, PH);
  x.save();
  x.rotate(-0.35);
  for (let i = -6; i < 22; i++) {
    x.fillStyle = `rgba(255,255,255,${i % 3 === 0 ? 0.045 : 0.02})`;
    x.fillRect(-300 + i * 90, -200, 26, 1900);
  }
  x.restore();
  const tg = x.createLinearGradient(0, 0, PW, 0);
  tg.addColorStop(0, '#2563eb');
  tg.addColorStop(0.5, '#fbbf24');
  tg.addColorStop(1, '#f97316');
  x.fillStyle = tg;
  x.fillRect(0, 0, PW, 12);
  x.fillRect(0, PH - 12, PW, 12);

  const header = (scopeLine: string, title: string, titleSize: number) => {
    x.fillStyle = 'rgba(251,191,36,.7)';
    x.fillRect(70, 70, 150, 3);
    x.fillRect(PW - 220, 70, 150, 3);
    fit(scopeLine.toUpperCase(), PW / 2, 78, 600, 22, '700', '#fbbf24', '');
    x.save();
    x.shadowColor = 'rgba(249,115,22,.7)';
    x.shadowBlur = 30;
    fit(title, PW / 2, 165, 940, titleSize, '900', '#ffffff');
    x.restore();
  };
  const footer = (note?: string) => {
    if (note) text(note, PW / 2, 1270, `600 20px ${PF}`, 'rgba(255,255,255,.55)');
    text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', PW / 2, 1318, `700 20px ${PF}`, 'rgba(255,255,255,.45)');
  };
  const avatar = (cx: number, cy: number, R: number, c1: string, c2: string, ch: string) => {
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 45;
    x.beginPath();
    x.arc(cx, cy, R + 8, 0, Math.PI * 2);
    x.fillStyle = c1;
    x.fill();
    x.restore();
    const rg = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, c1);
    rg.addColorStop(1, c2);
    x.beginPath();
    x.arc(cx, cy, R + 8, 0, Math.PI * 2);
    x.fillStyle = rg;
    x.fill();
    const ig = x.createRadialGradient(cx, cy - 25, 10, cx, cy, R);
    ig.addColorStop(0, '#16296b');
    ig.addColorStop(1, '#070f2e');
    x.beginPath();
    x.arc(cx, cy, R - 4, 0, Math.PI * 2);
    x.fillStyle = ig;
    x.fill();
    text((ch || '?').charAt(0).toUpperCase(), cx, cy + R * 0.36, `italic 900 ${Math.round(R * 1.04)}px ${PF}`, '#fff');
  };
  return { canvas, x, text, fit, skew, header, footer, avatar };
}

function drawPairPoster(
  scopeLine: string,
  batter: { name: string; team?: string },
  bowler: { name: string; team?: string },
  r: Pair,
  basedOn: number
): HTMLCanvasElement {
  const { canvas, x, text, fit, skew, header, footer, avatar } = makeCanvas('rgba(37,99,235,.55)', 'rgba(249,115,22,.5)');
  header(scopeLine, 'BATTER VS BOWLER', 80);

  const cy0 = 370;
  const R0 = 100;
  const side = (p: { name: string; team?: string }, cx: number, c1: string, c2: string, tag: string) => {
    avatar(cx, cy0, R0, c1, c2, p.name);
    fit((p.name || '').toUpperCase(), cx, 545, 410, 40, '900', '#fff');
    skew(578, () => {
      x.fillStyle = c2;
      x.fillRect(cx - 125, 556, 250, 36);
    });
    fit((p.team ? p.team : tag).toUpperCase(), cx, 582, 220, 19, '800', '#fff', '');
    text(tag, cx, 628, `800 18px ${PF}`, 'rgba(255,255,255,.55)');
  };
  side(batter, 230, '#3b82f6', '#1d4ed8', 'BATTER');
  side(bowler, 850, '#fb923c', '#ea580c', 'BOWLER');

  x.save();
  x.shadowColor = '#fbbf24';
  x.shadowBlur = 35;
  x.beginPath();
  x.arc(540, cy0, 48, 0, Math.PI * 2);
  const vg = x.createLinearGradient(494, 330, 586, 420);
  vg.addColorStop(0, '#fde68a');
  vg.addColorStop(1, '#f59e0b');
  x.fillStyle = vg;
  x.fill();
  x.restore();
  text('VS', 540, cy0 + 16, `italic 900 48px ${PF}`, '#07123a');

  const big = (px: number, label: string, value: string, sub: string, c1: string, c2: string) => {
    const y = 665;
    const h = 215;
    const gc = x.createLinearGradient(px, y, px + 460, y + h);
    gc.addColorStop(0, c1);
    gc.addColorStop(1, c2);
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 26;
    x.fillStyle = gc;
    x.beginPath();
    x.roundRect(px, y, 460, h, 28);
    x.fill();
    x.restore();
    x.fillStyle = 'rgba(0,0,0,.25)';
    x.beginPath();
    x.roundRect(px, y, 460, h, 28);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)';
    x.lineWidth = 2;
    x.stroke();
    text(label, px + 230, y + 44, `900 22px ${PF}`, 'rgba(255,255,255,.9)');
    text(value, px + 230, y + 148, `italic 900 110px ${PF}`, '#fff');
    text(sub, px + 230, y + 190, `700 22px ${PF}`, 'rgba(255,255,255,.88)');
  };
  big(60, 'RUNS SCORED', String(r.runs), `off ${r.balls} ball${r.balls === 1 ? '' : 's'}`, '#2563eb', '#1e3a8a');
  big(560, 'TIMES OUT', String(r.outs), r.outs === 1 ? 'bowler got him once' : 'bowler got him', '#f97316', '#9a3412');

  const sr = r.balls > 0 ? ((r.runs / r.balls) * 100).toFixed(1) : '0.0';
  const minis: [string, string][] = [
    ['BALLS FACED', String(r.balls)],
    ['STRIKE RATE', sr],
    ['DOT BALLS', String(r.dots)],
    ['FOURS', String(r.fours)],
    ['SIXES', String(r.sixes)],
    ['MATCHES', String(r.matches)],
  ];
  minis.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = 60 + col * 330;
    const py = 915 + row * 140;
    x.fillStyle = 'rgba(255,255,255,.07)';
    x.beginPath();
    x.roundRect(px, py, 300, 120, 22);
    x.fill();
    x.strokeStyle = 'rgba(251,191,36,.5)';
    x.lineWidth = 2;
    x.stroke();
    text(m[1], px + 150, py + 70, `italic 900 62px ${PF}`, '#fff');
    text(m[0], px + 150, py + 104, `800 18px ${PF}`, '#fde68a');
  });

  footer(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`);
  return canvas;
}

function drawFinisherPoster(
  scopeLine: string,
  f: Finisher,
  team: string | undefined,
  basedOn: number
): HTMLCanvasElement {
  const { canvas, x, text, fit, skew, header, footer, avatar } = makeCanvas('rgba(16,185,129,.45)', 'rgba(249,115,22,.5)');
  header(scopeLine, 'THE FINISHER', 92);
  avatar(540, 350, 104, '#10b981', '#047857', f.name);
  fit((f.name || '').toUpperCase(), 540, 520, 900, 54, '900', '#fff');
  skew(566, () => {
    x.fillStyle = '#047857';
    x.fillRect(360, 544, 360, 36);
  });
  fit((team || 'ARCL').toUpperCase(), 540, 570, 320, 19, '800', '#fff', '');

  // big card
  const y = 640;
  const gc = x.createLinearGradient(80, y, 1000, y + 210);
  gc.addColorStop(0, '#059669');
  gc.addColorStop(1, '#064e3b');
  x.save();
  x.shadowColor = '#10b981';
  x.shadowBlur = 28;
  x.fillStyle = gc;
  x.beginPath();
  x.roundRect(80, y, 920, 210, 30);
  x.fill();
  x.restore();
  x.strokeStyle = 'rgba(255,255,255,.35)';
  x.lineWidth = 2;
  x.stroke();
  text('FINISHES', 540, y + 46, `900 24px ${PF}`, 'rgba(255,255,255,.9)');
  text(String(f.finishes), 540, y + 160, `italic 900 120px ${PF}`, '#fff');
  text('on strike when the winning run was scored', 540, y + 196, `700 22px ${PF}`, 'rgba(255,255,255,.85)');

  // mini stats
  const minis: [string, string][] = [
    ['NOT OUT FINISHES', String(f.notOut)],
    ['RUNS IN THOSE CHASES', String(f.runs)],
  ];
  minis.forEach((m, i) => {
    const px = 80 + i * 470;
    x.fillStyle = 'rgba(255,255,255,.07)';
    x.beginPath();
    x.roundRect(px, 880, 450, 120, 22);
    x.fill();
    x.strokeStyle = 'rgba(251,191,36,.5)';
    x.lineWidth = 2;
    x.stroke();
    text(m[1], px + 225, 945, `italic 900 62px ${PF}`, '#fff');
    text(m[0], px + 225, 981, `800 18px ${PF}`, '#fde68a');
  });

  // recent finishes
  text('RECENT FINISHES', 100, 1050, `800 22px ${PF}`, '#fde68a', 'left');
  f.list.slice(0, 3).forEach((it, i) => {
    const ry = 1070 + i * 62;
    skew(ry + 26, () => {
      x.fillStyle = 'rgba(11,26,77,.95)';
      x.fillRect(70, ry, 940, 52);
      x.strokeStyle = 'rgba(251,191,36,.45)';
      x.lineWidth = 2;
      x.strokeRect(70, ry, 940, 52);
    });
    fit(`vs ${it.opp}  ·  ${it.margin}`, 100, ry + 34, 600, 24, '800', '#fff', '', 'left');
    text(`${it.runs}${it.notOut ? '*' : ''} off ${it.balls}`, 985, ry + 36, `italic 900 28px ${PF}`, '#6ee7b7', 'right');
  });

  footer(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`);
  return canvas;
}

function drawTopFinishers(
  scopeLine: string,
  rows: Finisher[],
  teamOf: Record<string, string> | undefined,
  basedOn: number
): HTMLCanvasElement {
  const { canvas, x, text, fit, skew, header, footer } = makeCanvas('rgba(16,185,129,.45)', 'rgba(249,115,22,.5)');
  header(scopeLine, 'TOP FINISHERS', 92);
  text('ON STRIKE WHEN THE WINNING RUN WAS SCORED', 540, 232, `700 22px ${PF}`, '#fde68a');

  text('BATTER', 130, 330, `800 20px ${PF}`, '#fde68a', 'left');
  text('NOT OUT', 760, 330, `800 20px ${PF}`, '#fde68a');
  text('FINISHES', 930, 330, `800 20px ${PF}`, '#fde68a');

  const top = rows.slice(0, 5);
  top.forEach((r, i) => {
    const bh = 150;
    const ry = 355 + i * 168;
    const cy = ry + bh / 2;
    skew(cy, () => {
      const g = x.createLinearGradient(60, 0, 1020, 0);
      g.addColorStop(0, 'rgba(16,185,129,.22)');
      g.addColorStop(1, 'rgba(249,115,22,.2)');
      x.fillStyle = '#0b1a4d';
      x.fillRect(60, ry, 960, bh);
      x.fillStyle = g;
      x.fillRect(60, ry, 960, bh);
      x.strokeStyle = i === 0 ? 'rgba(251,191,36,.9)' : 'rgba(251,191,36,.45)';
      x.lineWidth = i === 0 ? 3 : 2;
      x.strokeRect(60, ry, 960, bh);
      x.fillStyle = '#059669';
      x.fillRect(850, ry + 10, 150, bh - 20);
    });
    // rank badge
    x.beginPath();
    x.arc(110, cy, 26, 0, Math.PI * 2);
    x.fillStyle = i < 3 ? '#f59e0b' : '#334155';
    x.fill();
    text(String(i + 1), 110, cy + 10, `900 28px ${PF}`, i < 3 ? '#111827' : '#e2e8f0');
    const tm = teamOf?.[r.id];
    fit(r.name.toUpperCase(), 160, tm ? cy - 6 : cy + 14, 480, 40, '900', '#fff', 'italic ', 'left');
    if (tm) fit(tm.toUpperCase(), 160, cy + 36, 480, 22, '700', '#93c5fd', '', 'left');
    text(String(r.notOut), 760, cy + 18, `italic 900 48px ${PF}`, 'rgba(255,255,255,.9)');
    text(String(r.finishes), 930, cy + 28, `italic 900 72px ${PF}`, '#fff');
  });
  footer(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`);
  return canvas;
}

// ---------- screen ----------
type Tab = 'out' | 'runs' | 'finish';
type View = { kind: 'pair'; key: string } | { kind: 'finisher'; id: string } | { kind: 'top' } | null;

export const BatterVsBowlerModal: React.FC<BatterVsBowlerModalProps> = ({
  isOpen,
  onClose,
  matches,
  allMatches,
  tournamentName,
  season,
  teamOf,
}) => {
  const [scope, setScope] = useState<'tournament' | 'all'>('tournament');
  const [tab, setTab] = useState<Tab>('out');
  const [view, setView] = useState<View>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const pool = useMemo(
    () => uniqueMatches(scope === 'all' ? allMatches : matches),
    [scope, allMatches, matches]
  );
  const missing = useMemo(() => countMissingDetail(pool), [pool]);
  const basedOn = useMemo(() => countWithDetail(pool), [pool]);
  const pairs = useMemo(() => (isOpen ? computePairs(pool) : []), [isOpen, pool]);
  const finishers = useMemo(() => (isOpen ? computeFinishers(pool) : []), [isOpen, pool]);

  const needle = q.trim().toLowerCase();

  const outList = useMemo(
    () =>
      pairs
        .filter((p) => p.outs > 0)
        .sort((a, b) => b.outs - a.outs || b.balls - a.balls || b.runs - a.runs),
    [pairs]
  );
  const runsList = useMemo(
    () =>
      pairs
        .filter((p) => p.runs > 0 && p.balls >= MIN_BALLS_RUNS_TAB)
        .sort((a, b) => b.runs - a.runs || b.runs / Math.max(b.balls, 1) - a.runs / Math.max(a.balls, 1)),
    [pairs]
  );

  const matchesNeedle = (...names: string[]) => !needle || names.some((n) => n.toLowerCase().includes(needle));
  const shownPairs = (tab === 'out' ? outList : runsList).filter((p) => matchesNeedle(p.batterName, p.bowlerName));
  const shownFinishers = finishers.filter((f) => matchesNeedle(f.name));

  const scopeLine = scope === 'all' ? 'All Tournaments' : `${tournamentName}${season ? '  ·  ' + season : ''}`;

  const dataUrl = useMemo(() => {
    if (!isOpen || !view) return '';
    try {
      if (view.kind === 'pair') {
        const p = pairs.find((x) => x.key === view.key);
        if (!p) return '';
        return drawPairPoster(
          scopeLine,
          { name: p.batterName, team: teamOf?.[p.batterId] },
          { name: p.bowlerName, team: teamOf?.[p.bowlerId] },
          p,
          basedOn
        ).toDataURL('image/png');
      }
      if (view.kind === 'finisher') {
        const f = finishers.find((x) => x.id === view.id);
        if (!f) return '';
        return drawFinisherPoster(scopeLine, f, teamOf?.[f.id], basedOn).toDataURL('image/png');
      }
      return drawTopFinishers(scopeLine, finishers, teamOf, basedOn).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, view, pairs, finishers, scopeLine, teamOf, basedOn]);

  if (!isOpen) return null;

  const safe = (s: string) => (s || '').replace(/[^a-zA-Z0-9]+/g, '_');
  let fileName = 'ARCL_poster.png';
  let shareTitle = 'ARCL';
  let viewTitle = '';
  if (view?.kind === 'pair') {
    const p = pairs.find((x) => x.key === view.key);
    if (p) {
      fileName = `ARCL_${safe(p.batterName)}_vs_${safe(p.bowlerName)}.png`;
      shareTitle = `${p.batterName} vs ${p.bowlerName}`;
      viewTitle = `${p.batterName} vs ${p.bowlerName}`;
    }
  } else if (view?.kind === 'finisher') {
    const f = finishers.find((x) => x.id === view.id);
    if (f) {
      fileName = `ARCL_Finisher_${safe(f.name)}.png`;
      shareTitle = `${f.name} - The Finisher`;
      viewTitle = `${f.name} · The Finisher`;
    }
  } else if (view?.kind === 'top') {
    fileName = 'ARCL_Top_Finishers.png';
    shareTitle = 'Top Finishers';
    viewTitle = 'Top Finishers';
  }

  const changeScope = (s: 'tournament' | 'all') => {
    cricketAudio.playClick();
    setScope(s);
    setView(null);
    setQ('');
    setVisible(PAGE);
  };
  const changeTab = (t: Tab) => {
    cricketAudio.playClick();
    setTab(t);
    setView(null);
    setQ('');
    setVisible(PAGE);
  };

  const makeFile = (): File => {
    const bin = atob(dataUrl.split(',')[1] || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], fileName, { type: 'image/png' });
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    try {
      setBusy(true);
      cricketAudio.playClick();
      const file = makeFile();
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: shareTitle });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        alert("Share nahi ho paya. 'Save' dabakar image gallery mein save karo, phir WhatsApp se bhej do.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!dataUrl) return;
    cricketAudio.playClick();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => changeTab(t)}
      className={`px-3 py-1.5 rounded-full text-[11.5px] font-black cursor-pointer border whitespace-nowrap ${
        tab === t
          ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white border-orange-500'
          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  const subtitle = view
    ? viewTitle
    : tab === 'out'
    ? 'Who got whom out, and how many runs were given'
    : tab === 'runs'
    ? 'Which batter scored the most off which bowler'
    : 'On strike when the winning run was scored in a chase';

  const outTypes = (p: Pair) => {
    const parts: string[] = [];
    if (p.bowled) parts.push(`Bowled ${p.bowled}`);
    if (p.caught) parts.push(`Caught ${p.caught}`);
    if (p.lbw) parts.push(`LBW ${p.lbw}`);
    if (p.stumped) parts.push(`Stumped ${p.stumped}`);
    if (p.hitwicket) parts.push(`Hit wicket ${p.hitwicket}`);
    if (p.roofOut) parts.push(`Roof out ${p.roofOut}`);
    if (p.otherOut) parts.push(`Other ${p.otherOut}`);
    return parts.join(' · ');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Batter vs Bowler</span>
            <span className="text-[10px] text-slate-500 truncate block">{subtitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!view && (
          <>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => changeScope('tournament')}
                className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
                  scope === 'tournament' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                This Tournament
              </button>
              <button
                onClick={() => changeScope('all')}
                className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
                  scope === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Tournaments
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {tabBtn('out', 'Most Dismissals')}
              {tabBtn('runs', 'Most Runs')}
              {tabBtn('finish', 'Finishers')}
            </div>

            {missing > 0 && (
              <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-snug">
                {missing} match{missing === 1 ? '' : 'es'} {missing === 1 ? 'has' : 'have'} no ball-by-ball detail on this phone, so {missing === 1 ? 'it is' : 'they are'} not counted.
              </div>
            )}

            {tab === 'finish' && (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200 leading-snug">
                A Finish = the batter on strike when the winning run is scored in a successful chase. Works for T10, T20, Test (4th innings) and every format.
              </div>
            )}
            {tab === 'out' && outList.length > 0 && (
              <div className="px-1 text-[10px] text-slate-500">
                Total wickets counted here: <b className="text-slate-300">{outList.reduce((a, p) => a + p.outs, 0)}</b> (bowler wickets only, from {basedOn} match{basedOn === 1 ? '' : 'es'} with ball-by-ball detail). Run outs and retired are not included.
              </div>
            )}
            {tab === 'runs' && (
              <div className="px-1 text-[10px] text-slate-500">Matchups of at least {MIN_BALLS_RUNS_TAB} balls are shown.</div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setVisible(PAGE);
                }}
                placeholder={tab === 'finish' ? 'Search batter' : 'Search batter or bowler'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
              />
            </div>

            {tab === 'finish' && finishers.length > 0 && (
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setView({ kind: 'top' });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:opacity-90 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Top Finishers Poster</span>
              </button>
            )}

            <div className="max-h-[62vh] overflow-y-auto space-y-2 pr-0.5">
              {tab !== 'finish' &&
                shownPairs.slice(0, visible).map((p, i) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      cricketAudio.playClick();
                      setView({ kind: 'pair', key: p.key });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#0b1226] border border-[#1e2b55] hover:border-orange-500 text-left cursor-pointer"
                  >
                    <span
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black ${
                        i < 3 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-extrabold">
                        <span className="text-orange-300 truncate">{p.bowlerName}</span>
                        <span className="text-amber-400 text-[10px] shrink-0">▶</span>
                        <span className="text-sky-300 truncate">{p.batterName}</span>
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1">
                        <b className="text-slate-200">{p.runs}</b> runs · <b className="text-slate-200">{p.balls}</b> balls · SR{' '}
                        <b className="text-slate-200">{p.balls ? ((p.runs / p.balls) * 100).toFixed(0) : 0}</b>
                        {tab === 'runs' && p.outs > 0 && (
                          <>
                            {' '}· <b className="text-slate-200">{p.outs}</b> out
                          </>
                        )}
                      </span>
                      {tab === 'out' && outTypes(p) && (
                        <span className="block text-[10.5px] text-orange-200/80 mt-0.5">{outTypes(p)}</span>
                      )}
                    </span>
                    {tab === 'out' ? (
                      <span className="shrink-0 text-center min-w-[52px] px-2 py-1.5 rounded-xl bg-gradient-to-b from-orange-600 to-orange-900">
                        <span className="block text-2xl font-black italic leading-none text-white">{p.outs}</span>
                        <span className="block text-[9px] font-extrabold tracking-widest text-orange-200 mt-0.5">OUT</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-center min-w-[52px] px-2 py-1.5 rounded-xl bg-gradient-to-b from-blue-600 to-blue-900">
                        <span className="block text-2xl font-black italic leading-none text-white">{p.runs}</span>
                        <span className="block text-[9px] font-extrabold tracking-widest text-blue-200 mt-0.5">RUNS</span>
                      </span>
                    )}
                  </button>
                ))}

              {tab === 'finish' &&
                shownFinishers.slice(0, visible).map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      cricketAudio.playClick();
                      setView({ kind: 'finisher', id: f.id });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#0b1226] border border-[#1e2b55] hover:border-emerald-500 text-left cursor-pointer"
                  >
                    <span
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black ${
                        i < 3 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-extrabold text-white truncate">{f.name}</span>
                      {teamOf?.[f.id] && <span className="block text-[11px] text-slate-500 truncate">{teamOf[f.id]}</span>}
                      <span className="block text-[11px] text-slate-400 mt-1">
                        <b className="text-slate-200">{f.notOut}</b> not out finishes · <b className="text-slate-200">{f.runs}</b> runs in those chases
                      </span>
                    </span>
                    <span className="shrink-0 text-center min-w-[64px] px-2 py-1.5 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-900">
                      <span className="block text-2xl font-black italic leading-none text-white">{f.finishes}</span>
                      <span className="block text-[9px] font-extrabold tracking-widest text-emerald-200 mt-0.5">FINISHES</span>
                    </span>
                  </button>
                ))}

              {tab !== 'finish' && shownPairs.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-6">
                  {pairs.length === 0 ? 'No ball-by-ball detail found yet.' : 'Nothing found.'}
                </div>
              )}
              {tab === 'finish' && shownFinishers.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-6">
                  {finishers.length === 0 ? 'No finished chases with ball-by-ball detail yet.' : 'Nothing found.'}
                </div>
              )}
              {(() => {
                const total = tab === 'finish' ? shownFinishers.length : shownPairs.length;
                if (total <= visible) return null;
                return (
                  <button
                    onClick={() => {
                      cricketAudio.playClick();
                      setVisible((v) => v + PAGE);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[12px] font-bold text-sky-300 cursor-pointer"
                  >
                    Show {Math.min(PAGE, total - visible)} more ({total - visible} left)
                  </button>
                );
              })()}
            </div>

            {(tab === 'out' ? outList.length : tab === 'runs' ? runsList.length : finishers.length) > 0 && (
              <div className="text-center text-[10px] text-slate-600">
                Tap a row for its poster · Based on {basedOn} match{basedOn === 1 ? '' : 'es'}
              </div>
            )}
          </>
        )}

        {view && (
          <>
            {dataUrl ? (
              <img src={dataUrl} alt="Poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">
                Poster could not be made.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShare}
                disabled={busy || !dataUrl}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button
                onClick={handleSave}
                disabled={!dataUrl}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 font-black text-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
            <button
              onClick={() => {
                cricketAudio.playClick();
                setView(null);
              }}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[12px] font-bold text-sky-300 cursor-pointer"
            >
              ← Back to list
            </button>
          </>
        )}
      </div>
    </div>
  );
};
