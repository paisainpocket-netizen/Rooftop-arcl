import React, { useMemo, useState } from 'react';
import { X, Share2, Download, Search } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TournamentPlayerStat } from '../utils/tournamentStats';

// Head to head between two players using ONLY this tournament's numbers.
// Everything is taken from the stats the tournament screen already computed,
// so opening this screen reads nothing extra from Firebase.

interface TournamentCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TournamentPlayerStat[];
  tournamentName: string;
  season?: string;
}

interface Row {
  label: string;
  value: (s: TournamentPlayerStat) => number;
  show: (s: TournamentPlayerStat) => string;
  lowerIsBetter?: boolean;
}

const ROWS: Row[] = [
  { label: 'Matches', value: (s) => s.matches, show: (s) => String(s.matches) },
  { label: 'Runs', value: (s) => s.runs, show: (s) => String(s.runs) },
  {
    label: 'Average',
    value: (s) => (s.innings > 0 ? s.battingAverage : 0),
    show: (s) => (s.innings > 0 ? s.battingAverage.toFixed(2) : '-'),
  },
  {
    label: 'Strike Rate',
    value: (s) => s.strikeRate,
    show: (s) => (s.ballsFaced > 0 ? s.strikeRate.toFixed(1) : '-'),
  },
  {
    label: 'Highest',
    value: (s) => s.highestScore,
    show: (s) => (s.innings > 0 ? `${s.highestScore}${s.highestScoreNotOut ? '*' : ''}` : '-'),
  },
  { label: 'Sixes', value: (s) => s.sixes, show: (s) => String(s.sixes) },
  { label: 'Wickets', value: (s) => s.wickets, show: (s) => String(s.wickets) },
  {
    label: 'Economy',
    value: (s) => (s.legalBallsBowled > 0 ? s.economy : 0),
    show: (s) => (s.legalBallsBowled > 0 ? s.economy.toFixed(1) : '-'),
    lowerIsBetter: true,
  },
  { label: 'Catches', value: (s) => s.catches, show: (s) => String(s.catches) },
  { label: 'MVP Points', value: (s) => s.mvpPoints, show: (s) => s.mvpPoints.toFixed(1) },
];

function leader(row: Row, a: TournamentPlayerStat, b: TournamentPlayerStat): 'a' | 'b' | null {
  const va = row.value(a);
  const vb = row.value(b);
  if (va === vb) return null;
  if (row.lowerIsBetter) {
    if (va === 0) return vb === 0 ? null : 'b';
    if (vb === 0) return 'a';
    return va < vb ? 'a' : 'b';
  }
  return va > vb ? 'a' : 'b';
}

function drawPoster(a: TournamentPlayerStat, b: TournamentPlayerStat, tournamentName: string, season?: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
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
  const fit = (t: string, px: number, py: number, maxW: number, start: number, weight: string, col: string) => {
    let s = start;
    x.font = `${weight} ${s}px sans-serif`;
    while (x.measureText(t).width > maxW && s > 18) {
      s -= 2;
      x.font = `${weight} ${s}px sans-serif`;
    }
    text(t, px, py, `${weight} ${s}px sans-serif`, col);
  };

  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04120d');
  g.addColorStop(0.5, '#0b1f19');
  g.addColorStop(1, '#050b12');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const r = x.createRadialGradient(W / 2, 260, 20, W / 2, 260, 620);
  r.addColorStop(0, 'rgba(212,175,55,.22)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(212,175,55,.55)';
  x.lineWidth = 3;
  x.strokeRect(34, 34, W - 68, H - 68);

  text('ARCL', W / 2, 98, '800 30px sans-serif', '#d4af37');
  text('HEAD TO HEAD', W / 2, 154, '800 52px sans-serif', '#fcd34d');
  fit(`${tournamentName}${season ? '  ·  ' + season : ''}`.toUpperCase(), W / 2, 194, 880, 24, '600', 'rgba(255,255,255,.6)');

  const avatar = (p: TournamentPlayerStat, cx: number, ring: string) => {
    const cy = 308;
    x.beginPath();
    x.arc(cx, cy, 78, 0, Math.PI * 2);
    x.fillStyle = '#14302a';
    x.fill();
    x.lineWidth = 6;
    x.strokeStyle = ring;
    x.stroke();
    text((p.playerName || '?').charAt(0).toUpperCase(), cx, cy + 28, '800 76px sans-serif', '#fff');
    fit((p.playerName || '').toUpperCase(), cx, 438, 400, 36, '800', '#fff');
    fit(p.teamName || '', cx, 476, 400, 24, '500', 'rgba(255,255,255,.6)');
  };
  avatar(a, 250, '#10b981');
  avatar(b, 830, '#f59e0b');
  text('VS', W / 2, 328, '800 44px sans-serif', 'rgba(255,255,255,.45)');

  const top = 510;
  const rowH = 64;
  let winsA = 0;
  let winsB = 0;
  ROWS.forEach((row, i) => {
    const y = top + i * rowH;
    const lead = leader(row, a, b);
    if (lead === 'a') winsA++;
    if (lead === 'b') winsB++;
    x.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)';
    x.beginPath();
    x.roundRect(70, y, 940, rowH - 8, 16);
    x.fill();
    text(row.show(a), 250, y + 41, '800 35px sans-serif', lead === 'a' ? '#6ee7b7' : 'rgba(255,255,255,.8)');
    text(row.show(b), 830, y + 41, '800 35px sans-serif', lead === 'b' ? '#fcd34d' : 'rgba(255,255,255,.8)');
    text(row.label.toUpperCase(), W / 2, y + 38, '700 20px sans-serif', 'rgba(255,255,255,.5)');
  });

  const sy = top + ROWS.length * rowH + 12;
  x.fillStyle = 'rgba(212,175,55,.10)';
  x.beginPath();
  x.roundRect(70, sy, 940, 62, 18);
  x.fill();
  const sum =
    winsA === winsB
      ? `Barabar: ${winsA} - ${winsB}`
      : `${winsA > winsB ? a.playerName : b.playerName} aage hai: ${Math.max(winsA, winsB)} - ${Math.min(winsA, winsB)}`;
  fit(sum, W / 2, sy + 41, 880, 30, '700', '#fcd34d');

  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1298, '600 20px sans-serif', 'rgba(255,255,255,.4)');
  return canvas;
}

export const TournamentCompareModal: React.FC<TournamentCompareModalProps> = ({
  isOpen,
  onClose,
  stats,
  tournamentName,
  season,
}) => {
  const [pa, setPa] = useState<TournamentPlayerStat | null>(null);
  const [pb, setPb] = useState<TournamentPlayerStat | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // only people who actually played in this tournament, best run-scorers first
  const pool = useMemo(
    () =>
      [...(stats || [])]
        .filter((s) => s.matches > 0)
        .sort((x, y) => y.runs - x.runs || y.wickets - x.wickets),
    [stats]
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((s) => (!pa || s.playerId !== pa.playerId) && (!pb || s.playerId !== pb.playerId))
      .filter((s) => !q || s.playerName.toLowerCase().includes(q) || (s.teamName || '').toLowerCase().includes(q))
      .slice(0, 50);
  }, [pool, query, pa, pb]);

  const dataUrl = useMemo(() => {
    if (!isOpen || !pa || !pb) return '';
    try {
      return drawPoster(pa, pb, tournamentName, season).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, pa, pb, tournamentName, season]);

  if (!isOpen) return null;

  const fileName = `ARCL_${(pa?.playerName || 'A').replace(/\s+/g, '_')}_vs_${(pb?.playerName || 'B').replace(/\s+/g, '_')}.png`;

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
        await nav.share({ files: [file], title: `${pa?.playerName} vs ${pb?.playerName} - ${tournamentName}` });
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

  const needPick = !pa || !pb;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Head to Head</span>
            <span className="text-[10px] text-slate-500 truncate block">{tournamentName} · sirf is tournament ke numbers</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(pa || pb) && (
          <div className="grid grid-cols-2 gap-2">
            {[pa, pb].map((p, i) => (
              <div
                key={i}
                className={`rounded-xl border px-3 py-2 min-h-[48px] flex items-center justify-between gap-2 ${
                  i === 0 ? 'border-emerald-700/60 bg-emerald-950/30' : 'border-amber-700/60 bg-amber-950/20'
                }`}
              >
                <div className="min-w-0">
                  <span className="block text-xs font-black text-white truncate">{p ? p.playerName : 'Chuno...'}</span>
                  {p && <span className="block text-[10px] text-slate-400 truncate">{p.teamName}</span>}
                </div>
                {p && (
                  <button
                    onClick={() => (i === 0 ? setPa(null) : setPb(null))}
                    className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {needPick ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-3">
            <p className="text-xs text-slate-300">{!pa ? 'Pehla khiladi chuno' : 'Dusra khiladi chuno'}</p>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Khiladi ya team ka naam likho"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {candidates.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">Is tournament mein koi khiladi nahi mila.</div>
              )}
              {candidates.map((s) => (
                <button
                  key={s.playerId}
                  onClick={() => {
                    cricketAudio.playClick();
                    setQuery('');
                    if (!pa) setPa(s);
                    else setPb(s);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white truncate">{s.playerName}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{s.teamName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {s.runs} runs · {s.wickets} wkts
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              {ROWS.map((row) => {
                const lead = leader(row, pa!, pb!);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 border-b border-slate-800/60 last:border-0"
                  >
                    <span className={`font-mono text-sm font-black ${lead === 'a' ? 'text-emerald-300' : 'text-slate-300'}`}>
                      {row.show(pa!)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 px-2">{row.label}</span>
                    <span
                      className={`font-mono text-sm font-black text-right ${lead === 'b' ? 'text-amber-300' : 'text-slate-300'}`}
                    >
                      {row.show(pb!)}
                    </span>
                  </div>
                );
              })}
            </div>

            {dataUrl && (
              <img src={dataUrl} alt="Tournament head to head poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
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
          </>
        )}
      </div>
    </div>
  );
};
