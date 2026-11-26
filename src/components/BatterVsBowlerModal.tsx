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

interface DefendItem {
  matchId: string;
  opp: string;
  margin: string;
  wickets: number;
  runs: number;
  balls: number;
  at: number;
}
interface Defender {
  id: string;
  name: string;
  defends: number;
  wickets: number;
  runs: number;
  list: DefendItem[];
}

// A "defend" = the bowler of the LAST ball of a failed chase (the team batting first won).
// If the chase ended all out, the last ball is the last wicket, so that bowler is credited.
// Ties, draws and matches without a winner are skipped.
function computeDefenders(pool: Match[]): Defender[] {
  const map = new Map<string, Defender>();
  pool.forEach((m: any) => {
    if (m.status !== 'completed') return;
    const winnerId = m.result?.winnerTeamId;
    if (!winnerId || m.result?.isTie) return;
    let inn: any = null;
    for (let i = INNINGS_KEYS.length - 1; i >= 0; i--) {
      const cand = m[INNINGS_KEYS[i]];
      if (cand && Array.isArray(cand.balls) && cand.balls.length > 0) {
        inn = cand;
        break;
      }
    }
    if (!inn || inn.teamId === winnerId) return; // the chase succeeded, nothing was defended
    const last = inn.balls[inn.balls.length - 1];
    if (!last || !last.bowlerId) return;
    const id: string = last.bowlerId;

    let wickets = 0;
    let runs = 0;
    let balls = 0;
    inn.balls.forEach((b: any) => {
      if (b.bowlerId !== id) return;
      if (b.isLegalDelivery) balls += 1;
      if (b.extraType !== 'bye' && b.extraType !== 'legBye') runs += (b.runsBat || 0) + (b.extraRuns || 0);
      if (b.isWicket && !NOT_BOWLER_OUT.includes(b.wicketType)) wickets += 1;
    });

    const opp =
      m.teamA && m.teamB ? (m.teamA.id === inn.teamId ? m.teamA.name : m.teamB.name) : m.name || 'Opponent';
    const mr = m.result?.marginRuns;
    const margin = typeof mr === 'number' ? `won by ${mr} run${mr === 1 ? '' : 's'}` : 'defended';

    let d = map.get(id);
    if (!d) {
      d = { id, name: last.bowlerName || 'Bowler', defends: 0, wickets: 0, runs: 0, list: [] };
      map.set(id, d);
    }
    d.defends += 1;
    d.wickets += wickets;
    d.runs += runs;
    d.list.push({
      matchId: m.id,
      opp,
      margin,
      wickets,
      runs,
      balls,
      at: Number(m.updatedAt) || Date.parse(m.date || '') || 0,
    });
  });
  const rows = Array.from(map.values());
  rows.forEach((d) => d.list.sort((a, b) => b.at - a.at));
  return rows.sort((a, b) => b.defends - a.defends || b.wickets - a.wickets || a.runs - b.runs);
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

function drawDefenderPoster(
  scopeLine: string,
  d: Defender,
  team: string | undefined,
  basedOn: number
): HTMLCanvasElement {
  const { canvas, x, text, fit, skew, header, footer, avatar } = makeCanvas('rgba(37,99,235,.55)', 'rgba(249,115,22,.45)');
  header(scopeLine, 'THE DEFENDER', 92);
  avatar(540, 350, 104, '#3b82f6', '#1d4ed8', d.name);
  fit((d.name || '').toUpperCase(), 540, 520, 900, 54, '900', '#fff');
  skew(566, () => {
    x.fillStyle = '#1d4ed8';
    x.fillRect(360, 544, 360, 36);
  });
  fit((team || 'ARCL').toUpperCase(), 540, 570, 320, 19, '800', '#fff', '');

  const y = 640;
  const gc = x.createLinearGradient(80, y, 1000, y + 210);
  gc.addColorStop(0, '#2563eb');
  gc.addColorStop(1, '#1e3a8a');
  x.save();
  x.shadowColor = '#3b82f6';
  x.shadowBlur = 28;
  x.fillStyle = gc;
  x.beginPath();
  x.roundRect(80, y, 920, 210, 30);
  x.fill();
  x.restore();
  x.strokeStyle = 'rgba(255,255,255,.35)';
  x.lineWidth = 2;
  x.stroke();
  text('DEFENDS', 540, y + 46, `900 24px ${PF}`, 'rgba(255,255,255,.9)');
  text(String(d.defends), 540, y + 160, `italic 900 120px ${PF}`, '#fff');
  text('bowled the last ball when the chase failed', 540, y + 196, `700 22px ${PF}`, 'rgba(255,255,255,.85)');

  const minis: [string, string][] = [
    ['WICKETS IN THOSE MATCHES', String(d.wickets)],
    ['RUNS GIVEN IN THOSE MATCHES', String(d.runs)],
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
    fit(m[0], px + 225, 981, 400, 18, '800', '#fde68a', '');
  });

  text('RECENT DEFENDS', 100, 1050, `800 22px ${PF}`, '#fde68a', 'left');
  d.list.slice(0, 3).forEach((it, i) => {
    const ry = 1070 + i * 62;
    skew(ry + 26, () => {
      x.fillStyle = 'rgba(11,26,77,.95)';
      x.fillRect(70, ry, 940, 52);
      x.strokeStyle = 'rgba(251,191,36,.45)';
      x.lineWidth = 2;
      x.strokeRect(70, ry, 940, 52);
    });
    fit(`vs ${it.opp}  ·  ${it.margin}`, 100, ry + 34, 600, 24, '800', '#fff', '', 'left');
    text(`${it.wickets} wkt${it.wickets === 1 ? '' : 's'} · ${it.runs} runs`, 985, ry + 36, `italic 900 26px ${PF}`, '#7dd3fc', 'right');
  });

  footer(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`);
  return canvas;
}

function drawTopDefenders(
  scopeLine: string,
  rows: Defender[],
  teamOf: Record<string, string> | undefined,
  basedOn: number
): HTMLCanvasElement {
  const { canvas, x, text, fit, skew, header, footer } = makeCanvas('rgba(37,99,235,.55)', 'rgba(249,115,22,.45)');
  header(scopeLine, 'TOP DEFENDERS', 92);
  text('BOWLED THE LAST BALL WHEN THE CHASE FAILED', 540, 232, `700 22px ${PF}`, '#fde68a');

  text('BOWLER', 130, 330, `800 20px ${PF}`, '#fde68a', 'left');
  text('WICKETS', 760, 330, `800 20px ${PF}`, '#fde68a');
  text('DEFENDS', 930, 330, `800 20px ${PF}`, '#fde68a');

  rows.slice(0, 5).forEach((r, i) => {
    const bh = 150;
    const ry = 355 + i * 168;
    const cy = ry + bh / 2;
    skew(cy, () => {
      const g = x.createLinearGradient(60, 0, 1020, 0);
      g.addColorStop(0, 'rgba(59,130,246,.22)');
      g.addColorStop(1, 'rgba(249,115,22,.2)');
      x.fillStyle = '#0b1a4d';
      x.fillRect(60, ry, 960, bh);
      x.fillStyle = g;
      x.fillRect(60, ry, 960, bh);
      x.strokeStyle = i === 0 ? 'rgba(251,191,36,.9)' : 'rgba(251,191,36,.45)';
      x.lineWidth = i === 0 ? 3 : 2;
      x.strokeRect(60, ry, 960, bh);
      x.fillStyle = '#2563eb';
      x.fillRect(850, ry + 10, 150, bh - 20);
    });
    x.beginPath();
    x.arc(110, cy, 26, 0, Math.PI * 2);
    x.fillStyle = i < 3 ? '#f59e0b' : '#334155';
    x.fill();
    text(String(i + 1), 110, cy + 10, `900 28px ${PF}`, i < 3 ? '#111827' : '#e2e8f0');
    const tm = teamOf?.[r.id];
    fit(r.name.toUpperCase(), 160, tm ? cy - 6 : cy + 14, 480, 40, '900', '#fff', 'italic ', 'left');
    if (tm) fit(tm.toUpperCase(), 160, cy + 36, 480, 22, '700', '#93c5fd', '', 'left');
    text(String(r.wickets), 760, cy + 18, `italic 900 48px ${PF}`, 'rgba(255,255,255,.9)');
    text(String(r.defends), 930, cy + 28, `italic 900 72px ${PF}`, '#fff');
  });
  footer(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`);
  return canvas;
}

// ---------- screen ----------
type Tab = 'players' | 'finish' | 'defend';
type View =
  | { kind: 'pair'; key: string }
  | { kind: 'finisher'; id: string }
  | { kind: 'top' }
  | { kind: 'defender'; id: string }
  | { kind: 'topdef' }
  | null;

interface PlayerRow {
  id: string;
  name: string;
  runs: number;
  balls: number;
  wickets: number;
}

const SHOW_FIRST = 3; // rows shown first in each part of a player's page

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
  const [tab, setTab] = useState<Tab>('players');
  const [view, setView] = useState<View>(null);
  const [playerId, setPlayerId] = useState('');
  const [showAllBat, setShowAllBat] = useState(false);
  const [showAllBowl, setShowAllBowl] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const pool = useMemo(
    () => uniqueMatches(scope === 'all' ? allMatches : matches),
    [scope, allMatches, matches]
  );
  const missing = useMemo(() => countMissingDetail(pool), [pool]);
  const basedOn = useMemo(() => countWithDetail(pool), [pool]);
  const pairs = useMemo(() => (isOpen ? computePairs(pool) : []), [isOpen, pool]);
  const finishers = useMemo(() => (isOpen ? computeFinishers(pool) : []), [isOpen, pool]);
  const defenders = useMemo(() => (isOpen ? computeDefenders(pool) : []), [isOpen, pool]);

  const players = useMemo<PlayerRow[]>(() => {
    const map = new Map<string, PlayerRow>();
    const get = (id: string, name: string) => {
      let r = map.get(id);
      if (!r) {
        r = { id, name, runs: 0, balls: 0, wickets: 0 };
        map.set(id, r);
      }
      return r;
    };
    pairs.forEach((p) => {
      const bat = get(p.batterId, p.batterName);
      bat.runs += p.runs;
      bat.balls += p.balls;
      const bowl = get(p.bowlerId, p.bowlerName);
      bowl.wickets += p.outs;
    });
    return Array.from(map.values()).sort(
      (a, b) => b.runs - a.runs || b.wickets - a.wickets || a.name.localeCompare(b.name)
    );
  }, [pairs]);

  const totalWickets = useMemo(() => pairs.reduce((a, p) => a + p.outs, 0), [pairs]);

  const needle = q.trim().toLowerCase();
  const matchesNeedle = (name: string) => !needle || name.toLowerCase().includes(needle);
  const shownPlayers = players.filter((p) => matchesNeedle(p.name));
  const shownFinishers = finishers.filter((f) => matchesNeedle(f.name));
  const shownDefenders = defenders.filter((d) => matchesNeedle(d.name));

  const sel = playerId ? players.find((p) => p.id === playerId) : undefined;
  const byOuts = (a: Pair, b: Pair) => b.outs - a.outs || b.balls - a.balls || b.runs - a.runs;
  const asBat = useMemo(() => pairs.filter((p) => p.batterId === playerId).sort(byOuts), [pairs, playerId]);
  const asBowl = useMemo(() => pairs.filter((p) => p.bowlerId === playerId).sort(byOuts), [pairs, playerId]);

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
      if (view.kind === 'defender') {
        const d = defenders.find((x) => x.id === view.id);
        if (!d) return '';
        return drawDefenderPoster(scopeLine, d, teamOf?.[d.id], basedOn).toDataURL('image/png');
      }
      if (view.kind === 'topdef') {
        return drawTopDefenders(scopeLine, defenders, teamOf, basedOn).toDataURL('image/png');
      }
      return drawTopFinishers(scopeLine, finishers, teamOf, basedOn).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, view, pairs, finishers, defenders, scopeLine, teamOf, basedOn]);

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
  } else if (view?.kind === 'defender') {
    const d = defenders.find((x) => x.id === view.id);
    if (d) {
      fileName = `ARCL_Defender_${safe(d.name)}.png`;
      shareTitle = `${d.name} - The Defender`;
      viewTitle = `${d.name} · The Defender`;
    }
  } else if (view?.kind === 'topdef') {
    fileName = 'ARCL_Top_Defenders.png';
    shareTitle = 'Top Defenders';
    viewTitle = 'Top Defenders';
  }

  const changeScope = (s: 'tournament' | 'all') => {
    cricketAudio.playClick();
    setScope(s);
    setView(null);
    setPlayerId('');
    setQ('');
  };
  const changeTab = (t: Tab) => {
    cricketAudio.playClick();
    setTab(t);
    setView(null);
    setPlayerId('');
    setQ('');
  };
  const openPlayer = (id: string) => {
    cricketAudio.playClick();
    setPlayerId(id);
    setShowAllBat(false);
    setShowAllBowl(false);
    setQ('');
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
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-black cursor-pointer border whitespace-nowrap ${
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
    : tab === 'finish'
    ? 'On strike when the winning run was scored in a chase'
    : tab === 'defend'
    ? 'Bowled the last ball when a chase failed'
    : sel
    ? 'Tap a row for its poster'
    : 'Choose a player';

  // one row inside a player's page
  const pairRow = (p: Pair, who: 'bat' | 'bowl') => (
    <button
      key={p.key}
      onClick={() => {
        cricketAudio.playClick();
        setView({ kind: 'pair', key: p.key });
      }}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500 text-left cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-white truncate">{who === 'bat' ? p.bowlerName : p.batterName}</span>
        <span className="block text-[11px] text-slate-400 mt-0.5">
          {p.runs} runs{who === 'bowl' ? ' given' : ''} · {p.balls} balls
        </span>
      </span>
      <span
        className={`shrink-0 text-center min-w-[50px] px-2 py-1.5 rounded-xl ${
          p.outs > 0 ? 'bg-gradient-to-b from-orange-600 to-orange-900' : 'bg-slate-900 border border-slate-800'
        }`}
      >
        <span className={`block text-xl font-black italic leading-none ${p.outs > 0 ? 'text-white' : 'text-slate-500'}`}>{p.outs}</span>
        <span className={`block text-[9px] font-extrabold tracking-widest mt-0.5 ${p.outs > 0 ? 'text-orange-200' : 'text-slate-600'}`}>OUT</span>
      </span>
    </button>
  );

  const part = (
    title: string,
    color: string,
    rows: Pair[],
    who: 'bat' | 'bowl',
    all: boolean,
    toggle: () => void,
    empty: string
  ) => (
    <div className="space-y-2">
      <div className={`text-[11px] font-black uppercase tracking-[0.14em] px-0.5 ${color}`}>{title}</div>
      {rows.length === 0 && <div className="text-xs text-slate-500 px-1 py-2">{empty}</div>}
      {(all ? rows : rows.slice(0, SHOW_FIRST)).map((p) => pairRow(p, who))}
      {rows.length > SHOW_FIRST && (
        <button onClick={toggle} className="w-full py-2 text-[12px] font-bold text-sky-300 cursor-pointer">
          {all ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );

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

            {!sel && (
              <div className="flex gap-2">
                {tabBtn('players', 'Players')}
                {tabBtn('finish', 'Finishers')}
                {tabBtn('defend', 'Defenders')}
              </div>
            )}

            {missing > 0 && (
              <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-snug">
                {missing} match{missing === 1 ? '' : 'es'} {missing === 1 ? 'has' : 'have'} no ball-by-ball detail on this phone, so {missing === 1 ? 'it is' : 'they are'} not counted.
              </div>
            )}

            {/* ---------- Players: list ---------- */}
            {tab === 'players' && !sel && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search player"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="max-h-[62vh] overflow-y-auto space-y-1.5 pr-0.5">
                  {shownPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPlayer(p.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-white truncate">{p.name}</span>
                        {teamOf?.[p.id] && <span className="block text-[10px] text-slate-500 truncate">{teamOf[p.id]}</span>}
                      </span>
                      <span className="text-[11px] font-bold text-right shrink-0 leading-snug">
                        <span className="block text-emerald-300">
                          {p.runs} runs · {p.balls} balls
                        </span>
                        <span className="block text-orange-300">
                          {p.wickets} wicket{p.wickets === 1 ? '' : 's'}
                        </span>
                      </span>
                    </button>
                  ))}
                  {shownPlayers.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-6">
                      {players.length === 0 ? 'No ball-by-ball detail found yet.' : 'Nothing found.'}
                    </div>
                  )}
                </div>
                {players.length > 0 && (
                  <div className="text-center text-[10px] text-slate-600">
                    Tap a player to see his list · Wickets counted: {totalWickets} (from {basedOn} match{basedOn === 1 ? '' : 'es'}). Run outs and retired are not included.
                  </div>
                )}
              </>
            )}

            {/* ---------- Players: one player's page ---------- */}
            {tab === 'players' && sel && (
              <>
                <button
                  onClick={() => {
                    cricketAudio.playClick();
                    setPlayerId('');
                  }}
                  className="self-start text-[12px] font-bold text-sky-300 cursor-pointer"
                >
                  ← All players
                </button>
                <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#0b1226] border border-[#1e2b55]">
                  <div className="text-lg font-black text-white">{sel.name}</div>
                  {teamOf?.[sel.id] && <div className="text-[11px] text-slate-400 mt-0.5">{teamOf[sel.id]}</div>}
                </div>
                {part(
                  'As batsman · who got him out',
                  'text-sky-300',
                  asBat,
                  'bat',
                  showAllBat,
                  () => setShowAllBat((v) => !v),
                  'No balls faced yet.'
                )}
                {part(
                  'As bowler · whom he got out',
                  'text-orange-300',
                  asBowl,
                  'bowl',
                  showAllBowl,
                  () => setShowAllBowl((v) => !v),
                  'No balls bowled yet.'
                )}
              </>
            )}

            {/* ---------- Finishers ---------- */}
            {tab === 'finish' && (
              <>
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200 leading-snug">
                  A Finish = the batter on strike when the winning run is scored in a successful chase. Works for T10, T20, Test (4th innings) and every format.
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search batter"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
                  />
                </div>
                {finishers.length > 0 && (
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
                  {shownFinishers.map((f, i) => (
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
                  {shownFinishers.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-6">
                      {finishers.length === 0 ? 'No finished chases with ball-by-ball detail yet.' : 'Nothing found.'}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ---------- Defenders ---------- */}
            {tab === 'defend' && (
              <>
                <div className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-200 leading-snug">
                  A Defend = the bowler who bowled the last ball when the team batting first won and the chase failed. Works for every format.
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search bowler"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500"
                  />
                </div>
                {defenders.length > 0 && (
                  <button
                    onClick={() => {
                      cricketAudio.playClick();
                      setView({ kind: 'topdef' });
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:opacity-90 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Top Defenders Poster</span>
                  </button>
                )}
                <div className="max-h-[62vh] overflow-y-auto space-y-2 pr-0.5">
                  {shownDefenders.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        cricketAudio.playClick();
                        setView({ kind: 'defender', id: d.id });
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-gradient-to-br from-[#0f1b3d] to-[#0b1226] border border-[#1e2b55] hover:border-sky-500 text-left cursor-pointer"
                    >
                      <span
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black ${
                          i < 3 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-extrabold text-white truncate">{d.name}</span>
                        {teamOf?.[d.id] && <span className="block text-[11px] text-slate-500 truncate">{teamOf[d.id]}</span>}
                        <span className="block text-[11px] text-slate-400 mt-1">
                          <b className="text-slate-200">{d.wickets}</b> wickets · <b className="text-slate-200">{d.runs}</b> runs given in those matches
                        </span>
                      </span>
                      <span className="shrink-0 text-center min-w-[64px] px-2 py-1.5 rounded-xl bg-gradient-to-b from-blue-600 to-blue-900">
                        <span className="block text-2xl font-black italic leading-none text-white">{d.defends}</span>
                        <span className="block text-[9px] font-extrabold tracking-widest text-blue-200 mt-0.5">DEFENDS</span>
                      </span>
                    </button>
                  ))}
                  {shownDefenders.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-6">
                      {defenders.length === 0 ? 'No defended matches with ball-by-ball detail yet.' : 'Nothing found.'}
                    </div>
                  )}
                </div>
              </>
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
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};
