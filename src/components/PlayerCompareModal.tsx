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

interface PosterSide {
  name: string;
  team?: string;
  img?: HTMLImageElement | null;
}
interface PosterRow {
  label: string;
  a: string;
  b: string;
  lead: 'a' | 'b' | null;
}

// IPL style poster (1080 x 1350). Pure canvas drawing, no network.
function drawIplPoster(topLine: string, left: PosterSide, right: PosterSide, rows: PosterRow[]): HTMLCanvasElement {
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
  const gl = x.createRadialGradient(170, 400, 10, 170, 400, 560);
  gl.addColorStop(0, 'rgba(37,99,235,.55)');
  gl.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = gl;
  x.fillRect(0, 0, W, H);
  const gr = x.createRadialGradient(910, 400, 10, 910, 400, 560);
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
  fit(topLine.toUpperCase(), W / 2, 78, 600, 22, '700', '#fbbf24', '');
  x.save();
  x.shadowColor = 'rgba(249,115,22,.7)';
  x.shadowBlur = 30;
  text('HEAD TO HEAD', W / 2, 170, `italic 900 92px ${F}`, '#ffffff');
  x.restore();

  // players
  const cy0 = 395;
  const R0 = 118;
  const side = (p: PosterSide, cx: number, c1: string, c2: string) => {
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 50;
    x.beginPath();
    x.arc(cx, cy0, R0 + 8, 0, Math.PI * 2);
    x.fillStyle = c1;
    x.fill();
    x.restore();
    x.beginPath();
    x.arc(cx, cy0, R0 + 8, 0, Math.PI * 2);
    const rg = x.createLinearGradient(cx - R0, cy0 - R0, cx + R0, cy0 + R0);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, c1);
    rg.addColorStop(1, c2);
    x.fillStyle = rg;
    x.fill();
    x.save();
    x.beginPath();
    x.arc(cx, cy0, R0 - 4, 0, Math.PI * 2);
    x.closePath();
    const ig = x.createRadialGradient(cx, cy0 - 30, 10, cx, cy0, R0);
    ig.addColorStop(0, '#16296b');
    ig.addColorStop(1, '#070f2e');
    x.fillStyle = ig;
    x.fill();
    if (p.img) {
      x.clip();
      const d = (R0 - 4) * 2;
      const s = Math.max(d / p.img.width, d / p.img.height);
      x.drawImage(p.img, cx - (p.img.width * s) / 2, cy0 - (p.img.height * s) / 2, p.img.width * s, p.img.height * s);
    }
    x.restore();
    if (!p.img) text((p.name || '?').charAt(0).toUpperCase(), cx, cy0 + 40, `italic 900 120px ${F}`, '#fff');
    fit((p.name || '').toUpperCase(), cx, 578, 410, 44, '900', '#fff');
    if (p.team) {
      skew(612, () => {
        x.fillStyle = c2;
        x.fillRect(cx - 125, 590, 250, 36);
      });
      fit(p.team.toUpperCase(), cx, 616, 220, 19, '800', '#fff', '');
    }
  };
  side(left, 230, '#3b82f6', '#1d4ed8');
  side(right, 850, '#fb923c', '#ea580c');

  // VS badge
  x.save();
  x.shadowColor = '#fbbf24';
  x.shadowBlur = 35;
  x.beginPath();
  x.arc(540, cy0, 52, 0, Math.PI * 2);
  const vg = x.createLinearGradient(490, 350, 590, 450);
  vg.addColorStop(0, '#fde68a');
  vg.addColorStop(1, '#f59e0b');
  x.fillStyle = vg;
  x.fill();
  x.restore();
  text('VS', 540, cy0 + 18, `italic 900 52px ${F}`, '#07123a');

  // rows
  const n = Math.max(rows.length, 1);
  const rowH = Math.min(69, Math.floor(610 / n));
  const bh = rowH - 14;
  const vf = Math.round(bh * 0.73);
  let y = 660;
  rows.forEach((row) => {
    const lead = row.lead;
    const cy = y + bh / 2;
    skew(cy, () => {
      const lg = x.createLinearGradient(60, 0, 400, 0);
      if (lead === 'a') {
        lg.addColorStop(0, '#1d4ed8');
        lg.addColorStop(1, '#3b82f6');
      } else {
        lg.addColorStop(0, 'rgba(59,130,246,.14)');
        lg.addColorStop(1, 'rgba(59,130,246,.06)');
      }
      x.fillStyle = lg;
      x.fillRect(60, y, 340, bh);
      const rg2 = x.createLinearGradient(680, 0, 1020, 0);
      if (lead === 'b') {
        rg2.addColorStop(0, '#fb923c');
        rg2.addColorStop(1, '#ea580c');
      } else {
        rg2.addColorStop(0, 'rgba(249,115,22,.06)');
        rg2.addColorStop(1, 'rgba(249,115,22,.14)');
      }
      x.fillStyle = rg2;
      x.fillRect(680, y, 340, bh);
      x.fillStyle = '#0b1a4d';
      x.fillRect(410, y, 260, bh);
      x.strokeStyle = 'rgba(251,191,36,.55)';
      x.lineWidth = 2;
      x.strokeRect(410, y, 260, bh);
      x.fillStyle = '#fbbf24';
      if (lead === 'a') x.fillRect(392, y, 8, bh);
      if (lead === 'b') x.fillRect(680, y, 8, bh);
    });
    text(row.label.toUpperCase(), 540, cy + 7, `800 20px ${F}`, '#fde68a');
    text(row.a, 350, cy + vf * 0.34, `italic 900 ${vf}px ${F}`, lead === 'a' ? '#fff' : 'rgba(255,255,255,.6)', 'right');
    text(row.b, 730, cy + vf * 0.34, `italic 900 ${vf}px ${F}`, lead === 'b' ? '#fff' : 'rgba(255,255,255,.6)', 'left');
    y += rowH;
  });

  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1318, `700 20px ${F}`, 'rgba(255,255,255,.45)');
  return canvas;
}

function drawPoster(
  a: Player,
  b: Player,
  fmt: FmtKey,
  avA: HTMLImageElement | null,
  avB: HTMLImageElement | null
): HTMLCanvasElement {
  const sa = statsOf(a, fmt);
  const sb = statsOf(b, fmt);
  const badge = FORMATS.find((f) => f.id === fmt)?.badge || '';
  const rows: PosterRow[] = ROWS.map((row) => ({
    label: row.label,
    a: row.show(sa),
    b: row.show(sb),
    lead: leader(row, sa, sb),
  }));
  return drawIplPoster(
    `ARCL  ·  ${badge} CAREER`,
    { name: a.name || '', img: avA },
    { name: b.name || '', img: avB },
    rows
  );
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
