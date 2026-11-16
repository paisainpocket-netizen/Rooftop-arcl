import React, { useEffect, useMemo, useState } from 'react';
import { Player, Team } from '../types/cricket';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface PlayerShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  team?: Team;
}

type FmtKey = 'all' | 't10' | 't20' | 'club' | 'test';

const FORMATS: { id: FmtKey; label: string; badge: string }[] = [
  { id: 'all', label: 'Overall', badge: 'OVERALL CAREER' },
  { id: 't10', label: 'T10 / T6', badge: 'T10 / T6 CAREER' },
  { id: 't20', label: 'T20', badge: 'T20 CAREER' },
  { id: 'club', label: 'Club / Terrace', badge: 'CLUB / TERRACE CAREER' },
  { id: 'test', label: 'Test', badge: 'TEST CAREER' },
];

const num = (v: any): number => (typeof v === 'number' && isFinite(v) ? v : 0);

// Draws the share poster. Fixed size (1080 x 1350) no matter how many tournaments exist.
function drawCard(player: Player, team: Team | undefined, fmt: FmtKey, avatar: HTMLImageElement | null): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;

  const st: any = (fmt === 'all' ? player.stats : (player as any).formatStats?.[fmt]) || {};
  const matches = num(st.matches);
  const innings = num(st.innings);
  const runs = num(st.runs);
  const wickets = num(st.wickets);
  const outs = typeof st.timesOut === 'number' ? st.timesOut : null;
  const notOuts = outs === null ? null : Math.max(0, innings - outs);
  const hs = `${num(st.highestScore)}${st.highestScoreNotOut ? '*' : ''}`;
  const avg = st.battingAverage ? Number(st.battingAverage).toFixed(2) : '-';
  const sr = st.strikeRate ? Math.round(st.strikeRate) : '-';
  const econ = st.economy ? Number(st.economy).toFixed(1) : '-';
  const bestBowl = num(st.bestBowlingWickets) > 0 ? `${st.bestBowlingWickets}/${num(st.bestBowlingRuns)}` : '';

  const text = (t: string, px: number, py: number, font: string, col: string, align: CanvasTextAlign = 'center') => {
    x.font = font;
    x.fillStyle = col;
    x.textAlign = align;
    x.fillText(t, px, py);
  };
  const fitText = (t: string, px: number, py: number, maxW: number, startPx: number, weight: string, col: string) => {
    let s = startPx;
    x.font = `${weight} ${s}px sans-serif`;
    while (x.measureText(t).width > maxW && s > 28) {
      s -= 2;
      x.font = `${weight} ${s}px sans-serif`;
    }
    text(t, px, py, `${weight} ${s}px sans-serif`, col);
  };

  // Background
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04120d');
  g.addColorStop(0.5, '#0b1f19');
  g.addColorStop(1, '#050b12');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const r = x.createRadialGradient(W / 2, 260, 20, W / 2, 260, 600);
  r.addColorStop(0, 'rgba(16,185,129,.28)');
  r.addColorStop(1, 'rgba(16,185,129,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(212,175,55,.55)';
  x.lineWidth = 3;
  x.strokeRect(34, 34, W - 68, H - 68);

  // Header
  text('ARCL', W / 2, 104, '800 34px sans-serif', '#d4af37');
  const badge = FORMATS.find((f) => f.id === fmt)?.badge || 'CAREER';
  text(badge, W / 2, 148, '700 24px sans-serif', 'rgba(255,255,255,.6)');

  // Avatar
  const AY = 318;
  x.save();
  x.beginPath();
  x.arc(W / 2, AY, 116, 0, Math.PI * 2);
  x.closePath();
  x.fillStyle = '#14302a';
  x.fill();
  if (avatar) {
    x.clip();
    const s = Math.max(232 / avatar.width, 232 / avatar.height);
    const dw = avatar.width * s;
    const dh = avatar.height * s;
    x.drawImage(avatar, W / 2 - dw / 2, AY - dh / 2, dw, dh);
  }
  x.restore();
  x.beginPath();
  x.arc(W / 2, AY, 116, 0, Math.PI * 2);
  x.lineWidth = 7;
  x.strokeStyle = '#10b981';
  x.stroke();
  if (!avatar) text((player.name || '?').charAt(0).toUpperCase(), W / 2, AY + 42, '800 118px sans-serif', '#fff');

  // Name
  fitText((player.name || '').toUpperCase(), W / 2, 522, 900, 72, '800', '#fff');
  const sub = [player.role ? String(player.role).replace(/-/g, ' ') : '', team?.name || '']
    .filter(Boolean)
    .join('  ·  ');
  fitText(sub.replace(/\b\w/g, (c) => c.toUpperCase()), W / 2, 574, 900, 32, '500', 'rgba(255,255,255,.72)');

  // Main tiles
  const tiles: [string, string, string, string][] = [
    ['MATCHES', String(matches), `${innings} innings`, '#fff'],
    [
      'RUNS',
      String(runs),
      `Avg ${avg}${notOuts !== null ? ` · ${notOuts} Not Out${notOuts === 1 ? '' : 's'}` : ''}`,
      '#fcd34d',
    ],
    ['WICKETS', String(wickets), `Economy ${econ}`, '#6ee7b7'],
    ['HIGHEST', hs, `Strike Rate ${sr}`, '#fff'],
  ];
  tiles.forEach((t, i) => {
    const cx = 70 + (i % 2) * 470;
    const cy = 625 + Math.floor(i / 2) * 225;
    const w = 440;
    const h = 200;
    x.fillStyle = 'rgba(255,255,255,.05)';
    x.beginPath();
    x.roundRect(cx, cy, w, h, 26);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.12)';
    x.lineWidth = 2;
    x.stroke();
    text(t[0], cx + w / 2, cy + 48, '700 24px sans-serif', 'rgba(255,255,255,.55)');
    text(t[1], cx + w / 2, cy + 126, '800 82px sans-serif', t[3]);
    fitText(t[2], cx + w / 2, cy + 172, w - 30, 24, '500', 'rgba(255,255,255,.55)');
  });

  // Mini strip: 4s, 6s, 50s, Catches
  const mini: [string, number][] = [
    ['FOURS', num(st.fours)],
    ['SIXES', num(st.sixes)],
    ['FIFTIES', num(st.fifties)],
    ['CATCHES', num(st.catches)],
  ];
  mini.forEach((m, i) => {
    const cx = 70 + i * 238;
    x.fillStyle = 'rgba(255,255,255,.04)';
    x.beginPath();
    x.roundRect(cx, 1085, 224, 96, 18);
    x.fill();
    text(String(m[1]), cx + 112, 1138, '800 44px sans-serif', '#fff');
    text(m[0], cx + 112, 1168, '600 18px sans-serif', 'rgba(255,255,255,.5)');
  });

  // Best line
  if (bestBowl || num(st.highestScore) > 0) {
    const parts = [
      num(st.highestScore) > 0 ? `Best Bat ${hs}` : '',
      bestBowl ? `Best Bowl ${bestBowl}` : '',
    ].filter(Boolean);
    x.fillStyle = 'rgba(212,175,55,.12)';
    x.beginPath();
    x.roundRect(70, 1205, 940, 60, 18);
    x.fill();
    fitText(parts.join('   ·   '), W / 2, 1245, 880, 28, '700', '#fcd34d');
  }

  // Footer
  text(`ARCL AMRITSAR  ·  ${player.profileId || player.id}`, W / 2, 1298, '600 22px sans-serif', 'rgba(255,255,255,.4)');
  return canvas;
}

export const PlayerShareCardModal: React.FC<PlayerShareCardModalProps> = ({ isOpen, onClose, player, team }) => {
  const [fmt, setFmt] = useState<FmtKey>('all');
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);

  // Try to load the player's photo; if it can't be used on a canvas we just show the initial.
  useEffect(() => {
    setAvatarImg(null);
    if (!player.avatar) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setAvatarImg(img);
    img.onerror = () => setAvatarImg(null);
    img.src = player.avatar;
  }, [player.avatar]);

  const dataUrl = useMemo(() => {
    if (!isOpen) return '';
    try {
      return drawCard(player, team, fmt, avatarImg).toDataURL('image/png');
    } catch (e) {
      // Photo blocked the canvas (cross-origin) -> draw without photo
      try {
        return drawCard(player, team, fmt, null).toDataURL('image/png');
      } catch (e2) {
        return '';
      }
    }
  }, [isOpen, player, team, fmt, avatarImg]);

  if (!isOpen) return null;

  const fileName = `ARCL_${(player.name || 'Player').replace(/\s+/g, '_')}_${fmt.toUpperCase()}.png`;

  const makeFile = (): File => {
    const b64 = dataUrl.split(',')[1] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], fileName, { type: 'image/png' });
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    try {
      setBusy(true);
      cricketAudio.playClick();
      const file = makeFile(); // built without waiting, so the phone keeps the tap permission
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: `${player.name} - ARCL`,
          text: `${player.name} (${player.profileId || ''}) - ARCL Rooftop Cricket League`,
        });
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
      <div className="w-full max-w-sm flex flex-col items-center space-y-3 py-2">
        <div className="w-full flex items-center justify-between px-1 text-white">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Share Card</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format picker */}
        <div className="w-full flex gap-1.5 overflow-x-auto pb-0.5">
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

        {/* Preview (this exact image is what gets shared) */}
        {dataUrl ? (
          <img src={dataUrl} alt="Player card" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
        ) : (
          <div className="w-full aspect-[4/5] rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-slate-500">
            Card ban nahi paya
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-2">
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
