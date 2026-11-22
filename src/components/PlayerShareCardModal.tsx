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

  // ---------- IPL style look ----------
  const SK = 14; // slant of the bars
  const slant = (px: number, py: number, w: number, h: number) => {
    x.beginPath();
    x.moveTo(px + SK, py);
    x.lineTo(px + w, py);
    x.lineTo(px + w - SK, py + h);
    x.lineTo(px, py + h);
    x.closePath();
  };
  const bar = (px: number, py: number, w: number, h: number, fill: string | CanvasGradient, stroke: string) => {
    slant(px, py, w, h);
    x.fillStyle = fill;
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = stroke;
    x.stroke();
  };

  // Background
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#071a3d');
  g.addColorStop(0.55, '#0a1230');
  g.addColorStop(1, '#14082e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const g1 = x.createRadialGradient(150, 220, 10, 150, 220, 620);
  g1.addColorStop(0, 'rgba(37,99,235,.55)');
  g1.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = g1;
  x.fillRect(0, 0, W, H);
  const g2 = x.createRadialGradient(950, 1180, 10, 950, 1180, 560);
  g2.addColorStop(0, 'rgba(249,115,22,.40)');
  g2.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = g2;
  x.fillRect(0, 0, W, H);
  // diagonal light streaks
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
  // gold frame
  const gold = x.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, '#f59e0b');
  gold.addColorStop(0.5, '#fde68a');
  gold.addColorStop(1, '#f59e0b');
  x.strokeStyle = gold;
  x.lineWidth = 4;
  x.strokeRect(30, 30, W - 60, H - 60);

  // Header: gold ARCL tag + format tag
  const badge = FORMATS.find((f) => f.id === fmt)?.badge || 'CAREER';
  bar(60, 62, 170, 62, gold, 'rgba(0,0,0,0)');
  text('ARCL', 60 + 85, 107, '900 42px sans-serif', '#1a1203');
  bar(250, 62, W - 310, 62, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.18)');
  text(badge, 250 + (W - 310) / 2, 104, '800 28px sans-serif', '#fff');

  // Avatar
  const AY = 290;
  const ring = x.createLinearGradient(W / 2 - 130, AY - 130, W / 2 + 130, AY + 130);
  ring.addColorStop(0, '#fde68a');
  ring.addColorStop(1, '#f97316');
  x.beginPath();
  x.arc(W / 2, AY, 134, 0, Math.PI * 2);
  x.fillStyle = 'rgba(253,230,138,.12)';
  x.fill();
  x.save();
  x.beginPath();
  x.arc(W / 2, AY, 112, 0, Math.PI * 2);
  x.closePath();
  x.fillStyle = '#10234f';
  x.fill();
  if (avatar) {
    x.clip();
    const s = Math.max(224 / avatar.width, 224 / avatar.height);
    const dw = avatar.width * s;
    const dh = avatar.height * s;
    x.drawImage(avatar, W / 2 - dw / 2, AY - dh / 2, dw, dh);
  }
  x.restore();
  x.beginPath();
  x.arc(W / 2, AY, 112, 0, Math.PI * 2);
  x.lineWidth = 8;
  x.strokeStyle = ring;
  x.stroke();
  if (!avatar) text((player.name || '?').charAt(0).toUpperCase(), W / 2, AY + 42, '900 118px sans-serif', '#fff');

  // Name + role/team
  fitText((player.name || '').toUpperCase(), W / 2, 492, 900, 80, '900', '#fff');
  const sub = [player.role ? String(player.role).replace(/-/g, ' ') : '', team?.name || '']
    .filter(Boolean)
    .join('  ·  ');
  fitText(sub.replace(/\b\w/g, (c) => c.toUpperCase()), W / 2, 540, 900, 32, '700', '#fbbf24');

  // Hero panels: RUNS and WICKETS
  const hero = (px: number, label: string, val: string, c1: string, c2: string, numCol: string) => {
    const hg = x.createLinearGradient(px, 575, px + 455, 765);
    hg.addColorStop(0, c1);
    hg.addColorStop(1, c2);
    bar(px, 575, 455, 185, hg, 'rgba(255,255,255,.28)');
    text(label, px + 455 / 2, 625, '800 28px sans-serif', 'rgba(255,255,255,.85)');
    text(val, px + 455 / 2, 725, '900 108px sans-serif', numCol);
  };
  hero(60, 'RUNS', String(runs), 'rgba(37,99,235,.65)', 'rgba(30,64,175,.35)', '#fde68a');
  hero(565, 'WICKETS', String(wickets), 'rgba(234,88,12,.65)', 'rgba(154,52,18,.35)', '#fff');

  // Stat bars
  const row = (py: number, h: number, gap: number, items: [string, string, boolean][], vSize: number, lSize: number) => {
    const n = items.length;
    const w = (940 - gap * (n - 1)) / n;
    items.forEach((m, i) => {
      const px = 70 + i * (w + gap);
      const hl = m[2];
      bar(px, py, w, h, hl ? 'rgba(251,191,36,.22)' : 'rgba(255,255,255,.07)', hl ? 'rgba(251,191,36,.8)' : 'rgba(255,255,255,.16)');
      text(m[1], px + w / 2, py + h * 0.56, `900 ${vSize}px sans-serif`, hl ? '#fde68a' : '#fff');
      text(m[0], px + w / 2, py + h * 0.86, `700 ${lSize}px sans-serif`, hl ? '#fbbf24' : 'rgba(255,255,255,.62)');
    });
  };
  row(785, 112, 18, [
    ['MATCHES', String(matches), false],
    ['INNINGS', String(innings), false],
    ['NOT OUTS', notOuts === null ? '-' : String(notOuts), true],
    ['HIGHEST', hs, false],
  ], 52, 22);
  row(915, 112, 18, [
    ['AVERAGE', String(avg), false],
    ['STRIKE RATE', String(sr), false],
    ['ECONOMY', String(econ), false],
  ], 52, 22);
  row(1045, 100, 14, [
    ['FOURS', String(num(st.fours)), false],
    ['SIXES', String(num(st.sixes)), false],
    ['FIFTIES', String(num(st.fifties)), false],
    ['HUNDREDS', String(num(st.centuries)), num(st.centuries) > 0],
    ['CATCHES', String(num(st.catches)), false],
  ], 42, 19);

  // Best line
  if (bestBowl || num(st.highestScore) > 0) {
    const parts = [
      num(st.highestScore) > 0 ? `BEST BAT ${hs}` : '',
      bestBowl ? `BEST BOWL ${bestBowl}` : '',
    ].filter(Boolean);
    bar(70, 1170, 940, 70, gold, 'rgba(0,0,0,0)');
    fitText(parts.join('     |     '), W / 2, 1219, 860, 32, '900', '#1a1203');
  }

  // Footer
  text(`ARCL AMRITSAR  ·  ${player.profileId || player.id}`, W / 2, 1292, '700 22px sans-serif', 'rgba(255,255,255,.5)');
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
