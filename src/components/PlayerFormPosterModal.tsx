import React, { useEffect, useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Player } from '../types/cricket';

// "Recent Form" poster (1080 x 1350, IPL look): last 5 batting innings and last 5 bowling spells.
// Drawn on a canvas inside the phone. Nothing is saved and nothing is read from Firebase.

export interface FormBat {
  runs: number;
  notOut: boolean;
}
export interface FormBowl {
  wk: number;
  runs: number;
}

interface PlayerFormPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  teamName?: string;
  bat: FormBat[];
  bowl: FormBowl[];
}

const W = 1080;
const H = 1350;
const F = 'sans-serif';

function drawBase(x: CanvasRenderingContext2D) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#040a22');
  g.addColorStop(0.55, '#07123a');
  g.addColorStop(1, '#030617');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const gl = x.createRadialGradient(170, 330, 10, 170, 330, 560);
  gl.addColorStop(0, 'rgba(37,99,235,.55)');
  gl.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = gl;
  x.fillRect(0, 0, W, H);
  const gr = x.createRadialGradient(910, 330, 10, 910, 330, 560);
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
}

function drawPoster(
  player: Player,
  teamName: string | undefined,
  bat: FormBat[],
  bowl: FormBowl[],
  img: HTMLImageElement | null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;

  const T = (t: string, px: number, py: number, font: string, col: string, al: CanvasTextAlign = 'center') => {
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
    x.font = `${style}${weight} ${s}px ${F}`;
    while (x.measureText(t).width > maxW && s > 14) {
      s -= 2;
      x.font = `${style}${weight} ${s}px ${F}`;
    }
    T(t, px, py, `${style}${weight} ${s}px ${F}`, col, al);
  };
  const skew = (cy: number, fn: () => void) => {
    x.save();
    x.transform(1, 0, -0.22, 1, 0.22 * cy, 0);
    fn();
    x.restore();
  };
  const avatar = (cx: number, cy: number, R: number) => {
    x.save();
    x.shadowColor = '#3b82f6';
    x.shadowBlur = 40;
    x.beginPath();
    x.arc(cx, cy, R + 8, 0, Math.PI * 2);
    x.fillStyle = '#3b82f6';
    x.fill();
    x.restore();
    x.beginPath();
    x.arc(cx, cy, R + 8, 0, Math.PI * 2);
    const rg = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, '#3b82f6');
    rg.addColorStop(1, '#1d4ed8');
    x.fillStyle = rg;
    x.fill();
    x.save();
    x.beginPath();
    x.arc(cx, cy, R - 4, 0, Math.PI * 2);
    x.closePath();
    const ig = x.createRadialGradient(cx, cy - 20, 10, cx, cy, R);
    ig.addColorStop(0, '#16296b');
    ig.addColorStop(1, '#070f2e');
    x.fillStyle = ig;
    x.fill();
    if (img) {
      x.clip();
      const d = (R - 4) * 2;
      const s = Math.max(d / img.width, d / img.height);
      x.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    }
    x.restore();
    if (!img) T((player.name || '?').charAt(0).toUpperCase(), cx, cy + R * 0.34, `italic 900 ${Math.round(R)}px ${F}`, '#fff');
  };

  drawBase(x);
  x.fillStyle = 'rgba(251,191,36,.7)';
  x.fillRect(70, 70, 150, 3);
  x.fillRect(W - 220, 70, 150, 3);
  T('ARCL AMRITSAR', 540, 80, `700 22px ${F}`, '#fbbf24');
  T('RECENT FORM', 540, 168, `italic 900 92px ${F}`, '#fff');

  avatar(540, 330, 96);
  fit((player.name || '').toUpperCase(), 540, 500, 900, 54, '900', '#fff');
  if (teamName) {
    skew(536, () => {
      x.fillStyle = '#1d4ed8';
      x.fillRect(360, 514, 360, 34);
    });
    fit(teamName.toUpperCase(), 540, 539, 320, 19, '800', '#fff', '');
  }

  const batColor = (r: number) =>
    r >= 50 ? '#f59e0b' : r >= 30 ? '#22c55e' : r === 0 ? '#ef4444' : r < 10 ? '#475569' : '#3b82f6';
  const bowlColor = (w: number) => (w >= 3 ? '#f59e0b' : w === 2 ? '#22c55e' : w === 1 ? '#3b82f6' : '#475569');

  const row = (
    title: string,
    sub: string,
    y: number,
    items: { label: string; color: string; dark?: boolean }[],
    R: number
  ) => {
    T(title, 100, y, `800 26px ${F}`, '#fde68a', 'left');
    T(sub, 980, y, `700 20px ${F}`, 'rgba(255,255,255,.6)', 'right');
    const n = Math.max(items.length, 1);
    const gap = (W - 200 - n * R * 2) / Math.max(n - 1, 1);
    items.forEach((it, i) => {
      const cx = n === 1 ? 540 : 100 + R + i * (R * 2 + gap);
      const cy = y + 34 + R;
      x.save();
      x.shadowColor = it.color;
      x.shadowBlur = 24;
      x.beginPath();
      x.arc(cx, cy, R, 0, Math.PI * 2);
      x.fillStyle = it.color;
      x.fill();
      x.restore();
      x.beginPath();
      x.arc(cx, cy, R, 0, Math.PI * 2);
      x.lineWidth = 3;
      x.strokeStyle = 'rgba(255,255,255,.35)';
      x.stroke();
      fit(it.label, cx, cy + R * 0.2, R * 1.6, Math.round(R * 0.62), '900', it.dark ? '#111827' : '#fff');
    });
  };

  // ---------- batting ----------
  const totalRuns = bat.reduce((a, b) => a + b.runs, 0);
  const outs = bat.filter((b) => !b.notOut).length;
  const avg = outs > 0 ? (totalRuns / outs).toFixed(1) : bat.length > 0 ? String(totalRuns) : '-';
  const fifties = bat.filter((b) => b.runs >= 50).length;
  if (bat.length > 0) {
    row(
      'BATTING',
      `Last ${bat.length} innings · latest first`,
      620,
      bat.map((b) => ({ label: `${b.runs}${b.notOut ? '*' : ''}`, color: batColor(b.runs), dark: b.runs >= 50 })),
      72
    );
    const stats: [string, string][] = [
      ['RUNS', String(totalRuns)],
      ['AVERAGE', avg],
      ['50+ SCORES', String(fifties)],
    ];
    stats.forEach((s, i) => {
      const px = 80 + i * 310;
      x.fillStyle = 'rgba(255,255,255,.07)';
      x.beginPath();
      x.roundRect(px, 826, 290, 96, 20);
      x.fill();
      x.strokeStyle = 'rgba(251,191,36,.45)';
      x.lineWidth = 2;
      x.stroke();
      T(s[1], px + 145, 874, `italic 900 46px ${F}`, '#fff');
      T(s[0], px + 145, 908, `800 17px ${F}`, '#fde68a');
    });
  }

  // ---------- bowling ----------
  const totalWk = bowl.reduce((a, b) => a + b.wk, 0);
  const totalRunsGiven = bowl.reduce((a, b) => a + b.runs, 0);
  const best = bowl.reduce<FormBowl | null>(
    (a, b) => (!a || b.wk > a.wk || (b.wk === a.wk && b.runs < a.runs) ? b : a),
    null
  );
  if (bowl.length > 0) {
    row(
      'BOWLING',
      `Last ${bowl.length} spells · latest first`,
      bat.length > 0 ? 974 : 620,
      bowl.map((b) => ({ label: `${b.wk}/${b.runs}`, color: bowlColor(b.wk), dark: b.wk >= 3 })),
      64
    );
    const stats: [string, string][] = [
      ['WICKETS', String(totalWk)],
      ['RUNS GIVEN', String(totalRunsGiven)],
      ['BEST', best ? `${best.wk}/${best.runs}` : '-'],
    ];
    const by = bat.length > 0 ? 1152 : 800;
    stats.forEach((s, i) => {
      const px = 80 + i * 310;
      x.fillStyle = 'rgba(255,255,255,.07)';
      x.beginPath();
      x.roundRect(px, by, 290, 96, 20);
      x.fill();
      x.strokeStyle = 'rgba(251,191,36,.45)';
      x.lineWidth = 2;
      x.stroke();
      T(s[1], px + 145, by + 48, `italic 900 46px ${F}`, '#fff');
      T(s[0], px + 145, by + 82, `800 17px ${F}`, '#fde68a');
    });
  }

  T('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', 540, 1312, `700 20px ${F}`, 'rgba(255,255,255,.55)');
  return canvas;
}

export const PlayerFormPosterModal: React.FC<PlayerFormPosterModalProps> = ({
  isOpen,
  onClose,
  player,
  teamName,
  bat,
  bowl,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(!player.avatar);
  const [busy, setBusy] = useState(false);

  // Load the player's photo once (if any), then draw the poster with it
  useEffect(() => {
    if (!isOpen) return;
    if (!player.avatar) {
      setImg(null);
      setReady(true);
      return;
    }
    setReady(false);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setReady(true);
    };
    im.onerror = () => {
      setImg(null);
      setReady(true);
    };
    im.src = player.avatar;
  }, [isOpen, player.avatar]);

  const dataUrl = useMemo(() => {
    if (!isOpen || !ready) return '';
    try {
      return drawPoster(player, teamName, bat, bowl, img).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, ready, img, player, teamName, bat, bowl]);

  if (!isOpen) return null;

  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  const fileName = `ARCL_${safe(player.name)}_Form.png`;

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
        await nav.share({ files: [file], title: `${player.name} - Recent Form` });
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
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-stretch space-y-3 py-2">
        <div className="flex items-center justify-between px-1 text-white">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Recent Form</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {dataUrl ? (
          <img src={dataUrl} alt="Form poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">
            {ready ? 'Poster nahi ban paya.' : 'Poster ban raha hai...'}
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
          onClick={onClose}
          className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-sky-300 font-black text-sm cursor-pointer"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};
