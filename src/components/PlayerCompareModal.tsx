import React, { useEffect, useMemo, useState } from 'react';
import { Player } from '../types/cricket';
import { X, Share2, Download, Search } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface PlayerCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerA: Player;
  players: Player[];
}

type FmtKey = 'all' | 't10' | 't20' | 'club' | 'test';

const FORMATS: { id: FmtKey; label: string; badge: string }[] = [
  { id: 'all', label: 'Overall', badge: 'OVERALL' },
  { id: 't10', label: 'T10 / T6', badge: 'T10 / T6' },
  { id: 't20', label: 'T20', badge: 'T20' },
  { id: 'club', label: 'Club / Terrace', badge: 'CLUB / TERRACE' },
  { id: 'test', label: 'Test', badge: 'TEST' },
];

const num = (v: any): number => (typeof v === 'number' && isFinite(v) ? v : 0);

const statsOf = (p: Player, fmt: FmtKey): any =>
  (fmt === 'all' ? p.stats : (p as any).formatStats?.[fmt]) || {};

interface Row {
  label: string;
  value: (s: any) => number; // number used to decide who is ahead
  show: (s: any) => string; // text shown
  lowerIsBetter?: boolean;
}

const ROWS: Row[] = [
  { label: 'Matches', value: (s) => num(s.matches), show: (s) => String(num(s.matches)) },
  { label: 'Runs', value: (s) => num(s.runs), show: (s) => String(num(s.runs)) },
  {
    label: 'Average',
    value: (s) => num(s.battingAverage),
    show: (s) => (s.battingAverage ? Number(s.battingAverage).toFixed(2) : '-'),
  },
  {
    label: 'Strike Rate',
    value: (s) => num(s.strikeRate),
    show: (s) => (s.strikeRate ? Number(s.strikeRate).toFixed(1) : '-'),
  },
  {
    label: 'Highest',
    value: (s) => num(s.highestScore),
    show: (s) => `${num(s.highestScore)}${s.highestScoreNotOut ? '*' : ''}`,
  },
  { label: 'Fifties', value: (s) => num(s.fifties), show: (s) => String(num(s.fifties)) },
  { label: 'Sixes', value: (s) => num(s.sixes), show: (s) => String(num(s.sixes)) },
  { label: 'Wickets', value: (s) => num(s.wickets), show: (s) => String(num(s.wickets)) },
  {
    label: 'Economy',
    value: (s) => num(s.economy),
    show: (s) => (s.economy ? Number(s.economy).toFixed(1) : '-'),
    lowerIsBetter: true,
  },
  { label: 'Catches', value: (s) => num(s.catches), show: (s) => String(num(s.catches)) },
];

// 'a' / 'b' / null (tie or no data)
function leader(row: Row, sa: any, sb: any): 'a' | 'b' | null {
  const va = row.value(sa);
  const vb = row.value(sb);
  if (va === vb) return null;
  if (row.lowerIsBetter) {
    if (va === 0) return vb === 0 ? null : 'b';
    if (vb === 0) return 'a';
    return va < vb ? 'a' : 'b';
  }
  return va > vb ? 'a' : 'b';
}

function drawPoster(
  a: Player,
  b: Player,
  fmt: FmtKey,
  avA: HTMLImageElement | null,
  avB: HTMLImageElement | null
): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;
  const sa = statsOf(a, fmt);
  const sb = statsOf(b, fmt);

  const text = (t: string, px: number, py: number, font: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = font;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (t: string, px: number, py: number, maxW: number, start: number, weight: string, col: string) => {
    let s = start;
    x.font = `${weight} ${s}px sans-serif`;
    while (x.measureText(t).width > maxW && s > 20) {
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

  text('ARCL', W / 2, 100, '800 32px sans-serif', '#d4af37');
  text('HEAD TO HEAD', W / 2, 160, '800 54px sans-serif', '#fcd34d');
  const badge = FORMATS.find((f) => f.id === fmt)?.badge || '';
  text(`${badge} CAREER`, W / 2, 200, '600 22px sans-serif', 'rgba(255,255,255,.55)');

  // Avatars
  const avatar = (p: Player, img: HTMLImageElement | null, cx: number, ring: string) => {
    const cy = 320;
    x.save();
    x.beginPath();
    x.arc(cx, cy, 82, 0, Math.PI * 2);
    x.closePath();
    x.fillStyle = '#14302a';
    x.fill();
    if (img) {
      x.clip();
      const s = Math.max(164 / img.width, 164 / img.height);
      x.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    }
    x.restore();
    x.beginPath();
    x.arc(cx, cy, 82, 0, Math.PI * 2);
    x.lineWidth = 6;
    x.strokeStyle = ring;
    x.stroke();
    if (!img) text((p.name || '?').charAt(0).toUpperCase(), cx, cy + 30, '800 80px sans-serif', '#fff');
    fit((p.name || '').toUpperCase(), cx, 460, 400, 38, '800', '#fff');
  };
  avatar(a, avA, 250, '#10b981');
  avatar(b, avB, 830, '#f59e0b');
  text('VS', W / 2, 340, '800 46px sans-serif', 'rgba(255,255,255,.45)');

  // Rows
  const top = 500;
  const rowH = 66;
  let winsA = 0;
  let winsB = 0;
  ROWS.forEach((row, i) => {
    const y = top + i * rowH;
    const lead = leader(row, sa, sb);
    if (lead === 'a') winsA++;
    if (lead === 'b') winsB++;
    x.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)';
    x.beginPath();
    x.roundRect(70, y, 940, rowH - 8, 16);
    x.fill();
    text(row.show(sa), 250, y + 43, `800 36px sans-serif`, lead === 'a' ? '#6ee7b7' : 'rgba(255,255,255,.8)');
    text(row.show(sb), 830, y + 43, `800 36px sans-serif`, lead === 'b' ? '#fcd34d' : 'rgba(255,255,255,.8)');
    text(row.label.toUpperCase(), W / 2, y + 40, '700 20px sans-serif', 'rgba(255,255,255,.5)');
  });

  // Summary
  const sy = top + ROWS.length * rowH + 12;
  x.fillStyle = 'rgba(212,175,55,.10)';
  x.beginPath();
  x.roundRect(70, sy, 940, 64, 18);
  x.fill();
  const sum =
    winsA === winsB
      ? `Barabar: ${winsA} - ${winsB}`
      : `${winsA > winsB ? a.name : b.name} aage hai: ${Math.max(winsA, winsB)} - ${Math.min(winsA, winsB)}`;
  fit(sum, W / 2, sy + 42, 880, 30, '700', '#fcd34d');

  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1298, '600 20px sans-serif', 'rgba(255,255,255,.4)');
  return canvas;
}

export const PlayerCompareModal: React.FC<PlayerCompareModalProps> = ({ isOpen, onClose, playerA, players }) => {
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [query, setQuery] = useState('');
  const [fmt, setFmt] = useState<FmtKey>('all');
  const [avA, setAvA] = useState<HTMLImageElement | null>(null);
  const [avB, setAvB] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);

  const loadImg = (src: string | undefined, set: (i: HTMLImageElement | null) => void) => {
    set(null);
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => set(img);
    img.onerror = () => set(null);
    img.src = src;
  };
  useEffect(() => loadImg(playerA.avatar, setAvA), [playerA.avatar]);
  useEffect(() => loadImg(playerB?.avatar, setAvB), [playerB?.avatar]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (players || [])
      .filter((p) => p && p.id !== playerA.id)
      .filter((p) => !q || (p.name || '').toLowerCase().includes(q) || (p.profileId || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [players, playerA.id, query]);

  const dataUrl = useMemo(() => {
    if (!isOpen || !playerB) return '';
    try {
      return drawPoster(playerA, playerB, fmt, avA, avB).toDataURL('image/png');
    } catch (e) {
      try {
        return drawPoster(playerA, playerB, fmt, null, null).toDataURL('image/png');
      } catch (e2) {
        return '';
      }
    }
  }, [isOpen, playerA, playerB, fmt, avA, avB]);

  if (!isOpen) return null;

  const fileName = `ARCL_${(playerA.name || 'A').replace(/\s+/g, '_')}_vs_${(playerB?.name || 'B').replace(/\s+/g, '_')}.png`;

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
        await nav.share({ files: [file], title: `${playerA.name} vs ${playerB?.name} - ARCL` });
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

  const sa = statsOf(playerA, fmt);
  const sb = playerB ? statsOf(playerB, fmt) : {};

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Head to Head</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!playerB ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-3">
            <p className="text-xs text-slate-300">
              <span className="font-bold text-white">{playerA.name}</span> ke saath kisse compare karna hai?
            </p>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Khiladi ka naam ya ID likho"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {candidates.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">Koi khiladi nahi mila.</div>
              )}
              {candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    cricketAudio.playClick();
                    setPlayerB(p);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600 text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-sm font-black text-white shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (p.name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white truncate">{p.name}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">{p.profileId}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFmt(f.id);
                    cricketAudio.playClick();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    fmt === f.id
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Live table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-black">
                <span className="text-emerald-300 truncate">{playerA.name}</span>
                <button
                  onClick={() => setPlayerB(null)}
                  className="px-2 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                  title="Dusra khiladi chuno"
                >
                  Change
                </button>
                <span className="text-amber-300 truncate text-right">{playerB.name}</span>
              </div>
              {ROWS.map((row) => {
                const lead = leader(row, sa, sb);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 border-b border-slate-800/60 last:border-0"
                  >
                    <span className={`font-mono text-sm font-black ${lead === 'a' ? 'text-emerald-300' : 'text-slate-300'}`}>
                      {row.show(sa)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 px-2">{row.label}</span>
                    <span
                      className={`font-mono text-sm font-black text-right ${lead === 'b' ? 'text-amber-300' : 'text-slate-300'}`}
                    >
                      {row.show(sb)}
                    </span>
                  </div>
                );
              })}
            </div>

            {dataUrl && <img src={dataUrl} alt="Head to head poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />}

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
