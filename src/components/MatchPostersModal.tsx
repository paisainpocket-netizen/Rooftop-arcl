import React, { useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

// Two share posters for one finished match:
//  1) Run Graph  - how both teams' runs grew, with wickets marked
//  2) Scorecard  - result, both scores, top 3 batters and top 3 bowlers of each team
// Everything comes from the match that is already loaded, so making them reads
// nothing from Firebase.

interface MatchPostersModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: any;
  initialMode?: 'graph' | 'card';
}

const INNINGS_KEYS = ['innings1', 'innings2', 'innings3', 'innings4'];
const NOT_COUNTED_WICKET = ['retired_hurt'];

const n = (v: any): number => (typeof v === 'number' && isFinite(v) ? v : 0);

function makeBase() {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  const text = (t: string, px: number, py: number, f: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = f;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (t: string, px: number, py: number, mw: number, sp: number, w: string, col: string, al: CanvasTextAlign = 'center') => {
    let s = sp;
    x.font = `${w} ${s}px sans-serif`;
    while (x.measureText(t).width > mw && s > 14) {
      s -= 2;
      x.font = `${w} ${s}px sans-serif`;
    }
    text(t, px, py, `${w} ${s}px sans-serif`, col, al);
  };
  const SK = 14;
  const bar = (px: number, py: number, w: number, h: number, f: string | CanvasGradient, s: string) => {
    x.beginPath();
    x.moveTo(px + SK, py);
    x.lineTo(px + w, py);
    x.lineTo(px + w - SK, py + h);
    x.lineTo(px, py + h);
    x.closePath();
    x.fillStyle = f;
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = s;
    x.stroke();
  };
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#071a3d');
  g.addColorStop(0.55, '#0a1230');
  g.addColorStop(1, '#14082e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  let r = x.createRadialGradient(150, 260, 10, 150, 260, 620);
  r.addColorStop(0, 'rgba(37,99,235,.55)');
  r.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  r = x.createRadialGradient(950, 1100, 10, 950, 1100, 560);
  r.addColorStop(0, 'rgba(249,115,22,.4)');
  r.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  x.save();
  x.globalAlpha = 0.06;
  x.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.moveTo(-100 + i * 230, 0);
    x.lineTo(-40 + i * 230, 0);
    x.lineTo(-340 + i * 230, H);
    x.lineTo(-400 + i * 230, H);
    x.closePath();
    x.fill();
  }
  x.restore();
  const gold = x.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, '#f59e0b');
  gold.addColorStop(0.5, '#fde68a');
  gold.addColorStop(1, '#f59e0b');
  x.strokeStyle = gold;
  x.lineWidth = 4;
  x.strokeRect(30, 30, W - 60, H - 60);
  return { W, H, c, x, text, fit, bar, gold };
}

function headerBlock(o: ReturnType<typeof makeBase>, match: any) {
  const { W, text, fit, bar, gold } = o;
  const tag = [match?.name, match?.matchStage && match.matchStage !== 'league' ? String(match.matchStage).replace(/_/g, ' ') : match?.tournamentName ? 'League' : '']
    .filter(Boolean)
    .join('  ·  ');
  bar(60, 62, 170, 62, gold, 'rgba(0,0,0,0)');
  text('ARCL', 145, 107, '900 42px sans-serif', '#1a1203');
  bar(250, 62, W - 310, 62, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.18)');
  o.fit((tag || 'MATCH').toUpperCase(), 250 + (W - 310) / 2, 104, W - 350, 28, '800', '#fff');
  const sub = [match?.tournamentName, match?.totalOvers ? `${match.totalOvers} Overs` : ''].filter(Boolean).join('  ·  ');
  if (sub) fit(sub, W / 2, 168, 900, 26, '700', '#fbbf24');
  fit(String(match?.result?.summary || 'Match').toUpperCase(), W / 2, 250, 940, 52, '900', '#fff');
}

// ---------- data helpers ----------
function inningsList(match: any): any[] {
  return INNINGS_KEYS.map((k) => match?.[k]).filter((i) => i && (i.teamId || i.teamName));
}

function scoreText(match: any, teamId: string): { score: string; overs: string } {
  const list = inningsList(match).filter((i) => i.teamId === teamId && (n(i.totalRuns) > 0 || (i.balls || []).length > 0 || n(i.oversCompleted) > 0));
  if (list.length === 0) return { score: 'Yet to bat', overs: '' };
  const last = list[list.length - 1];
  return {
    score: list.map((i) => `${n(i.totalRuns)}-${n(i.totalWickets)}`).join(' & '),
    overs: `${n(last.oversCompleted)}.${n(last.ballsInCurrentOver)} overs`,
  };
}

function topBatters(match: any, teamId: string) {
  const map = new Map<string, { name: string; runs: number; balls: number; out: boolean }>();
  inningsList(match)
    .filter((i) => i.teamId === teamId)
    .forEach((i) => {
      Object.entries(i.battingStats || {}).forEach(([id, b]: [string, any]) => {
        if (!b || !(n(b.balls) > 0 || n(b.runs) > 0)) return;
        const cur = map.get(id) || { name: b.playerName || 'Player', runs: 0, balls: 0, out: false };
        cur.runs += n(b.runs);
        cur.balls += n(b.balls);
        cur.out = !!b.isOut;
        map.set(id, cur);
      });
    });
  return Array.from(map.values())
    .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
    .slice(0, 3);
}

function topBowlers(match: any, teamId: string) {
  // this team's bowlers bowled in the innings where the OTHER team batted
  const map = new Map<string, { name: string; wkts: number; runs: number; balls: number }>();
  inningsList(match)
    .filter((i) => i.teamId !== teamId)
    .forEach((i) => {
      Object.entries(i.bowlingStats || {}).forEach(([id, w]: [string, any]) => {
        if (!w) return;
        const legal = n(w.overs) * 6 + n(w.balls);
        if (legal === 0 && n(w.wickets) === 0) return;
        const cur = map.get(id) || { name: w.playerName || 'Player', wkts: 0, runs: 0, balls: 0 };
        cur.wkts += n(w.wickets);
        cur.runs += n(w.runs !== undefined ? w.runs : w.runsConceded);
        cur.balls += legal;
        map.set(id, cur);
      });
    });
  return Array.from(map.values())
    .sort((a, b) => b.wkts - a.wkts || a.runs - b.runs)
    .slice(0, 3);
}

function oversText(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

// ---------- scorecard poster ----------
function drawCard(match: any): HTMLCanvasElement {
  const o = makeBase();
  const { W, x, text, fit, bar, gold } = o;
  headerBlock(o, match);
  const tA = match.teamA || { id: '', name: 'Team A' };
  const tB = match.teamB || { id: '', name: 'Team B' };
  // team that batted first on top
  const first = inningsList(match)[0];
  const order = first && first.teamId === tB.id ? [tB, tA] : [tA, tB];
  const cols = ['#60a5fa', '#fb923c'];

  const block = (py: number, col: string, t: any) => {
    const sc = scoreText(match, t.id);
    bar(70, py, 940, 92, 'rgba(255,255,255,.08)', col);
    fit(String(t.name || '').toUpperCase(), 100, py + 58, 520, 38, '900', '#fff', 'left');
    text(sc.score, 985, py + 60, '900 48px sans-serif', '#fde68a', 'right');
    if (sc.overs) text(sc.overs, 985, py + 84, '700 18px sans-serif', 'rgba(255,255,255,.6)', 'right');
    text('BATTING', 75, py + 130, '800 20px sans-serif', col, 'left');
    text('BOWLING', 560, py + 130, '800 20px sans-serif', col, 'left');
    const bats = topBatters(match, t.id);
    const bowls = topBowlers(match, t.id);
    if (bats.length === 0) text('-', 75, py + 170, '800 28px sans-serif', 'rgba(255,255,255,.4)', 'left');
    bats.forEach((b, i) => {
      const y = py + 170 + i * 52;
      fit(b.name, 75, y, 250, 28, '800', '#fff', 'left');
      text(`${b.runs}${b.out ? '' : '*'}`, 400, y, '900 30px sans-serif', '#fde68a', 'right');
      text(`(${b.balls})`, 425, y, '600 20px sans-serif', 'rgba(255,255,255,.55)', 'left');
    });
    if (bowls.length === 0) text('-', 560, py + 170, '800 28px sans-serif', 'rgba(255,255,255,.4)', 'left');
    bowls.forEach((b, i) => {
      const y = py + 170 + i * 52;
      fit(b.name, 560, y, 200, 28, '800', '#fff', 'left');
      text(`(${oversText(b.balls)})`, 830, y, '600 20px sans-serif', 'rgba(255,255,255,.55)', 'right');
      text(`${b.wkts}/${b.runs}`, 985, y, '900 30px sans-serif', '#fde68a', 'right');
    });
  };
  block(285, cols[0], order[0]);
  block(615, cols[1], order[1]);

  const mom = match?.result?.playerOfTheMatch;
  bar(70, 965, 940, 100, 'rgba(251,191,36,.18)', 'rgba(251,191,36,.7)');
  if (mom?.playerName) {
    text('PLAYER OF THE MATCH', W / 2, 1002, '800 22px sans-serif', '#fbbf24');
    fit(String(mom.playerName).toUpperCase(), W / 2, 1046, 860, 40, '900', '#fff');
  } else {
    text('MATCH', W / 2, 1002, '800 22px sans-serif', '#fbbf24');
    fit(`${tA.name} vs ${tB.name}`.toUpperCase(), W / 2, 1046, 860, 36, '900', '#fff');
  }

  // toss / venue
  const tossTeam = [tA, tB].find((t) => t.id && t.id === match?.tossWinnerTeamId);
  const tossLine =
    tossTeam && match?.tossDecision
      ? `TOSS: ${String(tossTeam.name).toUpperCase()} WON, CHOSE TO ${match.tossDecision === 'bat' ? 'BAT' : 'BOWL'}`
      : String(match?.venue || 'ARCL AMRITSAR').toUpperCase();
  bar(70, 1100, 940, 64, gold, 'rgba(0,0,0,0)');
  fit(tossLine, W / 2, 1144, 860, 28, '900', '#1a1203');
  if (match?.venue || match?.date) {
    fit([match.venue, match.date].filter(Boolean).join('  ·  '), W / 2, 1210, 900, 24, '600', 'rgba(255,255,255,.65)');
  }
  text('ARCL AMRITSAR', W / 2, 1308, '700 20px sans-serif', 'rgba(255,255,255,.5)');
  void x;
  return o.c;
}

// ---------- run graph poster ----------
interface Series {
  name: string;
  pts: [number, number][]; // [overs, cumulative runs]
  wk: [number, number][]; // wicket positions
  score: string;
  splits: [number, number][]; // where a later innings of the same team starts (Test matches)
}

// One line per TEAM. In a Test match the team's 2nd innings continues the same line
// (overs and runs keep adding up), with a small dotted marker where it starts.
function buildSeries(match: any): { a: Series; b: Series; maxOvers: number; bestOver: number } | null {
  const inns = inningsList(match).filter((i) => (i.balls || []).length > 0);
  if (inns.length < 2) return null;
  const teamOrder: string[] = [];
  inns.forEach((i) => {
    if (!teamOrder.includes(i.teamId)) teamOrder.push(i.teamId);
  });
  if (teamOrder.length < 2) return null;
  let bestOver = 0;
  const make = (teamId: string): Series => {
    const mine = inns.filter((i) => i.teamId === teamId);
    const pts: [number, number][] = [[0, 0]];
    const wk: [number, number][] = [];
    const splits: [number, number][] = [];
    let runs = 0;
    let legal = 0;
    mine.forEach((inn, idx) => {
      if (idx > 0) splits.push([legal / 6, runs]);
      const overRuns: Record<number, number> = {};
      let innLegal = 0;
      (inn.balls || []).forEach((b: any) => {
        const r = n(b.runsBat) + n(b.extraRuns);
        runs += r;
        overRuns[Math.floor(innLegal / 6)] = (overRuns[Math.floor(innLegal / 6)] || 0) + r;
        if (b.isLegalDelivery) {
          legal += 1;
          innLegal += 1;
        }
        const ov = legal / 6;
        pts.push([ov, runs]);
        if (b.isWicket && !NOT_COUNTED_WICKET.includes(b.wicketType)) wk.push([ov, runs]);
      });
      Object.values(overRuns).forEach((v) => {
        if (v > bestOver) bestOver = v;
      });
    });
    return {
      name: mine[0]?.teamName || 'Team',
      pts,
      wk,
      splits,
      score: mine.map((i) => `${n(i.totalRuns)}-${n(i.totalWickets)}`).join(' & '),
    };
  };
  const a = make(teamOrder[0]);
  const b = make(teamOrder[1]);
  const seen = Math.max(a.pts[a.pts.length - 1][0], b.pts[b.pts.length - 1][0]);
  const isTest = inns.length > 2;
  const maxOvers = Math.max(n(match.totalOvers) * (isTest ? 2 : 1), Math.ceil(seen), 1);
  return { a, b, maxOvers, bestOver };
}

function bestPerformers(match: any) {
  let bat = { name: '', runs: -1 };
  let bowl = { name: '', wkts: -1, runs: 0 };
  let fours = 0;
  let sixes = 0;
  inningsList(match).forEach((i) => {
    Object.values(i.battingStats || {}).forEach((b: any) => {
      if (n(b?.runs) > bat.runs) bat = { name: b.playerName || '', runs: n(b.runs) };
      fours += n(b?.fours);
      sixes += n(b?.sixes);
    });
    Object.values(i.bowlingStats || {}).forEach((w: any) => {
      const r = n(w?.runs !== undefined ? w.runs : w?.runsConceded);
      if (n(w?.wickets) > bowl.wkts || (n(w?.wickets) === bowl.wkts && r < bowl.runs)) {
        bowl = { name: w?.playerName || '', wkts: n(w?.wickets), runs: r };
      }
    });
  });
  return { bat, bowl, boundaries: fours + sixes };
}

function drawGraph(match: any): HTMLCanvasElement {
  const o = makeBase();
  const { W, x, text, fit, bar, gold } = o;
  headerBlock(o, match);
  const data = buildSeries(match);
  if (!data) throw new Error('no ball data');
  const { a, b, maxOvers, bestOver } = data;

  const chip = (px: number, col: string, name: string, sc: string) => {
    bar(px, 290, 455, 100, 'rgba(255,255,255,.07)', col);
    fit(name.toUpperCase(), px + 227, 328, 420, 26, '800', col);
    text(sc, px + 227, 378, '900 46px sans-serif', '#fff');
  };
  chip(60, '#60a5fa', a.name, a.score);
  chip(565, '#fb923c', b.name, b.score);

  const L = 120;
  const R = 1010;
  const T = 480;
  const B = 1000;
  bar(70, 420, 940, 630, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.14)');
  const topRuns = Math.max(a.pts[a.pts.length - 1][1], b.pts[b.pts.length - 1][1], 20);
  const step = topRuns > 200 ? 50 : topRuns > 100 ? 20 : 10;
  const maxR = Math.ceil(topRuns / step) * step;
  x.strokeStyle = 'rgba(255,255,255,.12)';
  x.lineWidth = 1;
  for (let i = 0; i <= maxR; i += step) {
    const y = B - ((B - T) * i) / maxR;
    x.beginPath();
    x.moveTo(L, y);
    x.lineTo(R, y);
    x.stroke();
    text(String(i), L - 14, y + 6, '600 18px sans-serif', 'rgba(255,255,255,.5)', 'right');
  }
  const xStep = maxOvers > 25 ? 5 : maxOvers > 12 ? 2 : 1;
  for (let i = 0; i <= maxOvers; i += xStep) {
    text(String(i), L + ((R - L) * i) / maxOvers, B + 30, '600 18px sans-serif', 'rgba(255,255,255,.5)');
  }
  text('OVERS', (L + R) / 2, B + 58, '700 18px sans-serif', 'rgba(255,255,255,.45)');

  const px = (ov: number) => L + ((R - L) * ov) / maxOvers;
  const py = (r: number) => B - ((B - T) * r) / maxR;
  const line = (s: Series, col: string) => {
    x.save();
    x.shadowColor = col;
    x.shadowBlur = 14;
    x.strokeStyle = col;
    x.lineWidth = 6;
    x.lineJoin = 'round';
    x.beginPath();
    s.pts.forEach((p, i) => (i ? x.lineTo(px(p[0]), py(p[1])) : x.moveTo(px(p[0]), py(p[1]))));
    x.stroke();
    x.restore();
    s.wk.forEach((p) => {
      x.beginPath();
      x.arc(px(p[0]), py(p[1]), 10, 0, Math.PI * 2);
      x.fillStyle = '#ef4444';
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = '#fff';
      x.stroke();
    });
  };
  const splitMark = (sr: Series, col: string) => {
    sr.splits.forEach((p) => {
      x.save();
      x.setLineDash([8, 8]);
      x.strokeStyle = col;
      x.globalAlpha = 0.55;
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(px(p[0]), py(p[1]));
      x.lineTo(px(p[0]), B);
      x.stroke();
      x.restore();
      text('INN 2', px(p[0]), B - 10, '700 16px sans-serif', col);
    });
  };
  splitMark(a, '#60a5fa');
  splitMark(b, '#fb923c');
  line(a, '#60a5fa');
  line(b, '#fb923c');
  x.beginPath();
  x.arc(960, 445, 8, 0, Math.PI * 2);
  x.fillStyle = '#ef4444';
  x.fill();
  text('WICKET', 945, 452, '700 18px sans-serif', 'rgba(255,255,255,.7)', 'right');

  const best = bestPerformers(match);
  const stats: [string, string, boolean][] = [
    ['TOP SCORER', best.bat.runs >= 0 && best.bat.name ? `${best.bat.name} ${best.bat.runs}` : '-', false],
    ['BEST BOWLER', best.bowl.wkts >= 0 && best.bowl.name ? `${best.bowl.name} ${best.bowl.wkts}/${best.bowl.runs}` : '-', false],
    ['HIGHEST OVER', `${bestOver} runs`, true],
    ['BOUNDARIES', String(best.boundaries), false],
  ];
  stats.forEach((s, i) => {
    const w = 220;
    const sx = 70 + i * (w + 20);
    bar(sx, 1085, w, 104, s[2] ? 'rgba(251,191,36,.22)' : 'rgba(255,255,255,.07)', s[2] ? 'rgba(251,191,36,.8)' : 'rgba(255,255,255,.16)');
    fit(s[1], sx + w / 2, 1146, w - 40, 40, '900', s[2] ? '#fde68a' : '#fff');
    text(s[0], sx + w / 2, 1176, '700 18px sans-serif', s[2] ? '#fbbf24' : 'rgba(255,255,255,.62)');
  });

  const mom = match?.result?.playerOfTheMatch;
  bar(70, 1215, 940, 64, gold, 'rgba(0,0,0,0)');
  fit(mom?.playerName ? `PLAYER OF THE MATCH: ${String(mom.playerName).toUpperCase()}` : `${a.name} vs ${b.name}`.toUpperCase(), W / 2, 1259, 860, 30, '900', '#1a1203');
  text('ARCL AMRITSAR', W / 2, 1308, '700 20px sans-serif', 'rgba(255,255,255,.5)');
  return o.c;
}

export const MatchPostersModal: React.FC<MatchPostersModalProps> = ({ isOpen, onClose, match, initialMode = 'graph' }) => {
  const [mode, setMode] = useState<'graph' | 'card'>(initialMode);
  const [busy, setBusy] = useState(false);

  const canGraph = useMemo(() => (isOpen ? buildSeries(match) !== null : false), [isOpen, match]);

  const dataUrl = useMemo(() => {
    if (!isOpen || !match) return '';
    try {
      if (mode === 'graph') {
        return canGraph ? drawGraph(match).toDataURL('image/png') : '';
      }
      return drawCard(match).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, match, mode, canGraph]);

  if (!isOpen || !match) return null;

  const base = `${match?.teamA?.name || 'A'}_vs_${match?.teamB?.name || 'B'}`.replace(/\s+/g, '_');
  const fileName = `ARCL_${base}_${mode === 'graph' ? 'RunGraph' : 'Scorecard'}.png`;

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
        await nav.share({ files: [file], title: `${match?.teamA?.name || ''} vs ${match?.teamB?.name || ''}` });
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

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Match Posters</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              cricketAudio.playClick();
              setMode('graph');
            }}
            className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${mode === 'graph' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            📈 Run Graph
          </button>
          <button
            onClick={() => {
              cricketAudio.playClick();
              setMode('card');
            }}
            className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${mode === 'card' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🧾 Scorecard
          </button>
        </div>

        {dataUrl ? (
          <img src={dataUrl} alt="Match poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">
            {mode === 'graph' && !canGraph
              ? 'Is match ka ball-by-ball detail is phone mein nahi hai, isliye graph nahi ban sakta.'
              : 'Poster nahi ban paya.'}
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
      </div>
    </div>
  );
};
