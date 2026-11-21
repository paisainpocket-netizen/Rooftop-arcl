import React, { useMemo, useState } from 'react';
import { X, Share2, Download, Search } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Match } from '../types/cricket';

// Batter vs Bowler: how many runs one batter scored off one bowler, balls, fours,
// sixes, dots and how many times the bowler got him out.
// Worked out from the ball-by-ball records of matches this phone ALREADY has, so
// choosing players / making posters never reads anything from Firebase.

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
const NOT_BOWLER_OUT = ['runout', 'retired_hurt', 'retired_out', 'timed_out', 'obstructing_field'];

interface BatterRow {
  id: string;
  name: string;
  runs: number;
  balls: number;
}
interface BowlerRow {
  id: string;
  name: string;
  runs: number;
  balls: number;
  outs: number;
}
interface Matchup {
  balls: number;
  runs: number;
  fours: number;
  sixes: number;
  dots: number;
  outs: number;
  matches: number;
}

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

function drawPoster(
  scopeLine: string,
  batter: { name: string; team?: string },
  bowler: { name: string; team?: string },
  r: Matchup,
  basedOn: number
): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const F = 'sans-serif';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;

  const text = (t: string, px: number, py: number, font: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = font;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (t: string, px: number, py: number, maxW: number, start: number, weight: string, col: string, style = 'italic ') => {
    let s = start;
    x.font = `${style}${weight} ${s}px ${F}`;
    while (x.measureText(t).width > maxW && s > 14) {
      s -= 2;
      x.font = `${style}${weight} ${s}px ${F}`;
    }
    text(t, px, py, `${style}${weight} ${s}px ${F}`, col);
  };
  const skew = (cy: number, fn: () => void) => {
    x.save();
    x.transform(1, 0, -0.22, 1, 0.22 * cy, 0);
    fn();
    x.restore();
  };

  // background
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#040a22');
  g.addColorStop(0.55, '#07123a');
  g.addColorStop(1, '#030617');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const gl = x.createRadialGradient(170, 380, 10, 170, 380, 540);
  gl.addColorStop(0, 'rgba(37,99,235,.55)');
  gl.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = gl;
  x.fillRect(0, 0, W, H);
  const gr = x.createRadialGradient(910, 380, 10, 910, 380, 540);
  gr.addColorStop(0, 'rgba(249,115,22,.5)');
  gr.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, W, H);
  x.save();
  x.rotate(-0.35);
  for (let i = -6; i < 22; i++) {
    x.fillStyle = `rgba(255,255,255,${i % 3 === 0 ? 0.045 : 0.02})`;
    x.fillRect(-300 + i * 90, -200, 26, 1900);
  }
  x.restore();
  const tg = x.createLinearGradient(0, 0, W, 0);
  tg.addColorStop(0, '#2563eb');
  tg.addColorStop(0.5, '#fbbf24');
  tg.addColorStop(1, '#f97316');
  x.fillStyle = tg;
  x.fillRect(0, 0, W, 12);
  x.fillRect(0, H - 12, W, 12);

  // header
  x.fillStyle = 'rgba(251,191,36,.7)';
  x.fillRect(70, 70, 150, 3);
  x.fillRect(W - 220, 70, 150, 3);
  fit(scopeLine.toUpperCase(), W / 2, 78, 600, 22, '700', '#fbbf24', '');
  x.save();
  x.shadowColor = 'rgba(249,115,22,.7)';
  x.shadowBlur = 30;
  fit('BATTER VS BOWLER', W / 2, 165, 940, 80, '900', '#ffffff');
  x.restore();

  // the two players
  const cy0 = 370;
  const R0 = 100;
  const side = (p: { name: string; team?: string }, cx: number, c1: string, c2: string, tag: string) => {
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 45;
    x.beginPath();
    x.arc(cx, cy0, R0 + 8, 0, Math.PI * 2);
    x.fillStyle = c1;
    x.fill();
    x.restore();
    const rg = x.createLinearGradient(cx - R0, cy0 - R0, cx + R0, cy0 + R0);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, c1);
    rg.addColorStop(1, c2);
    x.beginPath();
    x.arc(cx, cy0, R0 + 8, 0, Math.PI * 2);
    x.fillStyle = rg;
    x.fill();
    const ig = x.createRadialGradient(cx, cy0 - 25, 10, cx, cy0, R0);
    ig.addColorStop(0, '#16296b');
    ig.addColorStop(1, '#070f2e');
    x.beginPath();
    x.arc(cx, cy0, R0 - 4, 0, Math.PI * 2);
    x.fillStyle = ig;
    x.fill();
    text((p.name || '?').charAt(0).toUpperCase(), cx, cy0 + 36, `italic 900 104px ${F}`, '#fff');
    fit((p.name || '').toUpperCase(), cx, 545, 410, 40, '900', '#fff');
    skew(578, () => {
      x.fillStyle = c2;
      x.fillRect(cx - 125, 556, 250, 36);
    });
    fit((p.team ? p.team : tag).toUpperCase(), cx, 582, 220, 19, '800', '#fff', '');
    text(tag, cx, 628, `800 18px ${F}`, 'rgba(255,255,255,.55)');
  };
  side(batter, 230, '#3b82f6', '#1d4ed8', 'BATTER');
  side(bowler, 850, '#fb923c', '#ea580c', 'BOWLER');

  // VS badge
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
  text('VS', 540, cy0 + 16, `italic 900 48px ${F}`, '#07123a');

  // two big cards: runs scored / times out
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
    text(label, px + 230, y + 44, `900 22px ${F}`, 'rgba(255,255,255,.9)');
    text(value, px + 230, y + 148, `italic 900 110px ${F}`, '#fff');
    text(sub, px + 230, y + 190, `700 22px ${F}`, 'rgba(255,255,255,.88)');
  };
  big(60, 'RUNS SCORED', String(r.runs), `off ${r.balls} ball${r.balls === 1 ? '' : 's'}`, '#2563eb', '#1e3a8a');
  big(560, 'TIMES OUT', String(r.outs), r.outs === 1 ? 'bowler got him once' : 'bowler got him', '#f97316', '#9a3412');

  // small stats
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
    text(m[1], px + 150, py + 70, `italic 900 62px ${F}`, '#fff');
    text(m[0], px + 150, py + 104, `800 18px ${F}`, '#fde68a');
  });

  text(`Based on ${basedOn} match${basedOn === 1 ? '' : 'es'} with ball-by-ball detail`, W / 2, 1240, `600 20px ${F}`, 'rgba(255,255,255,.55)');
  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1318, `700 20px ${F}`, 'rgba(255,255,255,.45)');
  return canvas;
}

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
  const [batterId, setBatterId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const pool = useMemo(
    () => uniqueMatches(scope === 'all' ? allMatches : matches),
    [scope, allMatches, matches]
  );

  const missing = useMemo(() => countMissingDetail(pool), [pool]);

  const batters = useMemo<BatterRow[]>(() => {
    const map = new Map<string, BatterRow>();
    forEachBall(pool, (b) => {
      if (!b.strikerId) return;
      const row = map.get(b.strikerId) || { id: b.strikerId, name: b.strikerName || 'Player', runs: 0, balls: 0 };
      row.runs += b.runsBat || 0;
      if (b.isLegalDelivery) row.balls += 1;
      map.set(b.strikerId, row);
    });
    return Array.from(map.values()).sort((a, b) => b.runs - a.runs || b.balls - a.balls);
  }, [pool]);

  const bowlers = useMemo<BowlerRow[]>(() => {
    if (!batterId) return [];
    const map = new Map<string, BowlerRow>();
    forEachBall(pool, (b) => {
      if (b.strikerId !== batterId || !b.bowlerId) return;
      const row = map.get(b.bowlerId) || { id: b.bowlerId, name: b.bowlerName || 'Bowler', runs: 0, balls: 0, outs: 0 };
      row.runs += b.runsBat || 0;
      if (b.isLegalDelivery) row.balls += 1;
      if (b.isWicket && b.dismissedPlayerId === batterId && !NOT_BOWLER_OUT.includes(b.wicketType)) row.outs += 1;
      map.set(b.bowlerId, row);
    });
    return Array.from(map.values()).sort((a, b) => b.balls - a.balls || b.runs - a.runs);
  }, [pool, batterId]);

  const result = useMemo<Matchup | null>(() => {
    if (!batterId || !bowlerId) return null;
    const r: Matchup = { balls: 0, runs: 0, fours: 0, sixes: 0, dots: 0, outs: 0, matches: 0 };
    const seen = new Set<string>();
    forEachBall(pool, (b, m) => {
      if (b.strikerId !== batterId || b.bowlerId !== bowlerId) return;
      seen.add(m.id);
      r.runs += b.runsBat || 0;
      if (b.isLegalDelivery) {
        r.balls += 1;
        if (!b.runsBat && !b.extraRuns) r.dots += 1;
      }
      if (b.isFour || b.runsBat === 4) r.fours += 1;
      if (b.isSix || b.runsBat === 6) r.sixes += 1;
      if (b.isWicket && b.dismissedPlayerId === batterId && !NOT_BOWLER_OUT.includes(b.wicketType)) r.outs += 1;
    });
    r.matches = seen.size;
    return r;
  }, [pool, batterId, bowlerId]);

  const batterName = batters.find((b) => b.id === batterId)?.name || '';
  const bowlerName = bowlers.find((b) => b.id === bowlerId)?.name || '';

  const dataUrl = useMemo(() => {
    if (!isOpen || !result || result.balls + result.outs === 0) return '';
    try {
      const scopeLine = scope === 'all' ? 'All Tournaments' : `${tournamentName}${season ? '  ·  ' + season : ''}`;
      const basedOn = Math.max(0, pool.length - missing);
      return drawPoster(
        scopeLine,
        { name: batterName, team: teamOf?.[batterId] },
        { name: bowlerName, team: teamOf?.[bowlerId] },
        result,
        basedOn
      ).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, result, scope, tournamentName, season, batterName, bowlerName, batterId, bowlerId, teamOf, pool.length, missing]);

  if (!isOpen) return null;

  const step: 'batter' | 'bowler' | 'result' = !batterId ? 'batter' : !bowlerId ? 'bowler' : 'result';
  const fileName = `ARCL_${batterName.replace(/\s+/g, '_')}_vs_${bowlerName.replace(/\s+/g, '_')}.png`;

  const changeScope = (s: 'tournament' | 'all') => {
    cricketAudio.playClick();
    setScope(s);
    setBatterId('');
    setBowlerId('');
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
        await nav.share({ files: [file], title: `${batterName} vs ${bowlerName}` });
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

  const needle = q.trim().toLowerCase();
  const batterList = batters.filter((b) => !needle || b.name.toLowerCase().includes(needle));
  const bowlerList = bowlers.filter((b) => !needle || b.name.toLowerCase().includes(needle));

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Batter vs Bowler</span>
            <span className="text-[10px] text-slate-500 truncate block">
              {step === 'batter' ? 'Pehle batsman chuno' : step === 'bowler' ? `${batterName} ke samne kaun?` : `${batterName} vs ${bowlerName}`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => changeScope('tournament')}
            className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
              scope === 'tournament' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Is Tournament
          </button>
          <button
            onClick={() => changeScope('all')}
            className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
              scope === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sab Tournaments
          </button>
        </div>

        {missing > 0 && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-snug">
            {missing} match ka ball-by-ball detail is phone mein nahi hai, wo hisaab mein nahi judega.
          </div>
        )}

        {step !== 'result' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={step === 'batter' ? 'Batsman ka naam dhoondo' : 'Bowler ka naam dhoondo'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
              />
            </div>

            {step === 'bowler' && (
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setBatterId('');
                  setQ('');
                }}
                className="text-[11px] font-bold text-sky-300 cursor-pointer"
              >
                ← Dusra batsman chuno
              </button>
            )}

            <div className="max-h-[60vh] overflow-y-auto space-y-1.5 pr-0.5">
              {step === 'batter' &&
                batterList.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      cricketAudio.playClick();
                      setBatterId(b.id);
                      setQ('');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-white truncate">{b.name}</span>
                      {teamOf?.[b.id] && <span className="block text-[10px] text-slate-500 truncate">{teamOf[b.id]}</span>}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300 shrink-0">
                      {b.runs} runs · {b.balls} balls
                    </span>
                  </button>
                ))}
              {step === 'bowler' &&
                bowlerList.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      cricketAudio.playClick();
                      setBowlerId(b.id);
                      setQ('');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-orange-500 text-left cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-white truncate">{b.name}</span>
                      {teamOf?.[b.id] && <span className="block text-[10px] text-slate-500 truncate">{teamOf[b.id]}</span>}
                    </span>
                    <span className="text-[11px] font-bold text-orange-300 shrink-0">
                      {b.runs} runs · {b.balls} balls · {b.outs} out
                    </span>
                  </button>
                ))}
              {step === 'batter' && batterList.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-6">Is tournament mein ball-by-ball detail abhi nahi mili.</div>
              )}
              {step === 'bowler' && bowlerList.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-6">Koi bowler nahi mila.</div>
              )}
            </div>
          </div>
        )}

        {step === 'result' && (
          <>
            {dataUrl ? (
              <img src={dataUrl} alt="Batter vs Bowler poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">
                In dono ke beech koi ball nahi mili.
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setBowlerId('');
                  setQ('');
                }}
                className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-orange-300 cursor-pointer"
              >
                Dusra bowler
              </button>
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setBatterId('');
                  setBowlerId('');
                  setQ('');
                }}
                className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-sky-300 cursor-pointer"
              >
                Dusra batsman
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
