import React, { useEffect, useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Player } from '../types/cricket';
import { SeasonRow } from '../utils/seasonStats';

// Season posters (1080 x 1350, IPL look), drawn on a canvas inside the phone.
//  - season given  -> "Season Report" for that one tournament
//  - season = null -> "Season by Season" for all tournaments
// Nothing is saved and nothing is read from Firebase.

interface SeasonPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  season: SeasonRow | null;
  seasons: SeasonRow[];
  fmtName: string;
  limit?: number; // how many seasons fit on the "all seasons" poster
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
  season: SeasonRow | null,
  seasons: SeasonRow[],
  fmtName: string,
  img: HTMLImageElement | null,
  limit = 7
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
  const pname = (player.name || '').toUpperCase();
  const fmtTag = fmtName.toUpperCase();

  if (season) {
    // ---------- one season ----------
    fit(`ARCL  ·  ${season.name.toUpperCase()}`, W / 2, 78, 640, 22, '700', '#fbbf24', '');
    x.save();
    x.shadowColor = 'rgba(249,115,22,.7)';
    x.shadowBlur = 30;
    T('SEASON REPORT', W / 2, 170, `italic 900 92px ${F}`, '#fff');
    x.restore();
    avatar(540, 350, 104);
    fit(pname, 540, 520, 900, 54, '900', '#fff');
    skew(566, () => {
      x.fillStyle = '#1d4ed8';
      x.fillRect(380, 544, 320, 36);
    });
    T(`${season.matches} ${season.matches === 1 ? 'MATCH' : 'MATCHES'}  ·  ${fmtTag}`, 540, 570, `800 19px ${F}`, '#fff');

    const hero = (px: number, label: string, val: string, sub: string, c1: string, c2: string) => {
      skew(740, () => {
        const g = x.createLinearGradient(px, 0, px + 440, 0);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        x.fillStyle = g;
        x.fillRect(px, 640, 440, 200);
      });
      T(label, px + 215, 684, `800 22px ${F}`, 'rgba(255,255,255,.85)');
      T(val, px + 215, 790, `italic 900 104px ${F}`, '#fff');
      T(sub, px + 215, 828, `700 20px ${F}`, 'rgba(255,255,255,.8)');
    };
    const hs = season.innings ? `${season.highest}${season.highestNotOut ? '*' : ''}` : '-';
    const avg = season.innings ? season.average.toFixed(1) : '-';
    const best = season.wickets > 0 ? `${season.bestW}/${season.bestR}` : '-';
    const econ = season.legalBalls ? season.economy.toFixed(1) : '-';
    hero(50, 'RUNS', String(season.runs), `HIGHEST ${hs}  ·  AVG ${avg}`, '#1d4ed8', '#3b82f6');
    hero(590, 'WICKETS', String(season.wickets), `BEST ${best}  ·  ECON ${econ}`, '#ea580c', '#fb923c');

    const rows: [string, string][] = [
      ['MATCHES', String(season.matches)],
      ['INNINGS', String(season.innings)],
      ['STRIKE RATE', season.balls ? season.strikeRate.toFixed(1) : '-'],
      ['FOURS', String(season.fours)],
      ['SIXES', String(season.sixes)],
      ['FIFTIES / HUNDREDS', `${season.fifties} / ${season.hundreds}`],
    ];
    let y = 880;
    rows.forEach((r) => {
      const bh = 54;
      const cy = y + bh / 2;
      skew(cy, () => {
        x.fillStyle = '#0b1a4d';
        x.fillRect(80, y, 500, bh);
        x.strokeStyle = 'rgba(251,191,36,.55)';
        x.lineWidth = 2;
        x.strokeRect(80, y, 500, bh);
        const g = x.createLinearGradient(590, 0, 1000, 0);
        g.addColorStop(0, 'rgba(59,130,246,.9)');
        g.addColorStop(1, 'rgba(59,130,246,.45)');
        x.fillStyle = g;
        x.fillRect(590, y, 400, bh);
        x.fillStyle = '#fbbf24';
        x.fillRect(582, y, 8, bh);
      });
      T(r[0], 110, cy + 8, `800 22px ${F}`, '#fde68a', 'left');
      T(r[1], 960, cy + 14, `italic 900 42px ${F}`, '#fff', 'right');
      y += 64;
    });
  } else {
    // ---------- all seasons ----------
    fit(`ARCL  ·  ${fmtTag} CAREER`, W / 2, 78, 640, 22, '700', '#fbbf24', '');
    x.save();
    x.shadowColor = 'rgba(249,115,22,.7)';
    x.shadowBlur = 30;
    T('SEASON BY SEASON', W / 2, 170, `italic 900 80px ${F}`, '#fff');
    x.restore();
    avatar(200, 330, 86);
    fit(pname, 320, 320, 700, 50, '900', '#fff', 'italic ', 'left');
    const totalMatches = seasons.reduce((a, s) => a + s.matches, 0);
    T(
      `${seasons.length} ${seasons.length === 1 ? 'SEASON' : 'SEASONS'}  ·  ${totalMatches} ${totalMatches === 1 ? 'MATCH' : 'MATCHES'}`,
      320, 372, `800 24px ${F}`, '#fbbf24', 'left'
    );

    const MAXROWS = limit;
    const shown = seasons.slice(0, MAXROWS);
    const extra = seasons.length - shown.length;
    let y = 470;
    T('SEASON', 110, y, `800 20px ${F}`, '#fde68a', 'left');
    T('MAT', 610, y, `800 20px ${F}`, '#fde68a');
    T('RUNS', 725, y, `800 20px ${F}`, '#fde68a');
    T('WKTS', 845, y, `800 20px ${F}`, '#fde68a');
    T('BEST', 950, y, `800 20px ${F}`, '#fde68a');

    const maxRuns = Math.max(0, ...seasons.map((s) => s.runs));
    const maxW = Math.max(0, ...seasons.map((s) => s.wickets));
    const step = Math.min(98, Math.floor(570 / Math.max(shown.length, 1)));
    const bh = step - 14;
    y = 490;
    shown.forEach((s) => {
      const cy = y + bh / 2;
      const hiR = maxRuns > 0 && s.runs === maxRuns;
      const hiW = maxW > 0 && s.wickets === maxW;
      skew(cy, () => {
        const g = x.createLinearGradient(60, 0, 1020, 0);
        g.addColorStop(0, 'rgba(59,130,246,.22)');
        g.addColorStop(1, 'rgba(249,115,22,.2)');
        x.fillStyle = '#0b1a4d';
        x.fillRect(60, y, 960, bh);
        x.fillStyle = g;
        x.fillRect(60, y, 960, bh);
        x.strokeStyle = 'rgba(251,191,36,.45)';
        x.lineWidth = 2;
        x.strokeRect(60, y, 960, bh);
        if (hiR) {
          x.fillStyle = '#2563eb';
          x.fillRect(655, y + 6, 140, bh - 12);
        }
        if (hiW) {
          x.fillStyle = '#ea580c';
          x.fillRect(795, y + 6, 100, bh - 12);
        }
      });
      const big = Math.round(bh * 0.5);
      fit(s.name.toUpperCase(), 100, cy + big * 0.3, 440, Math.round(bh * 0.36), '900', '#fff', 'italic ', 'left');
      T(String(s.matches), 610, cy + big * 0.3, `italic 900 ${Math.round(big * 0.8)}px ${F}`, 'rgba(255,255,255,.85)');
      T(String(s.runs), 725, cy + big * 0.34, `italic 900 ${big}px ${F}`, '#fff');
      T(String(s.wickets), 845, cy + big * 0.34, `italic 900 ${big}px ${F}`, '#fff');
      T(
        s.innings ? `${s.highest}${s.highestNotOut ? '*' : ''}` : '-',
        950, cy + big * 0.3, `italic 900 ${Math.round(big * 0.78)}px ${F}`, 'rgba(255,255,255,.85)'
      );
      y += step;
    });
    if (extra > 0) {
      T(`+ ${extra} more ${extra === 1 ? 'season' : 'seasons'}`, W / 2, y + 6, `600 20px ${F}`, 'rgba(255,255,255,.5)');
    }

    // total band
    const tr = seasons.reduce((a, s) => a + s.runs, 0);
    const tw = seasons.reduce((a, s) => a + s.wickets, 0);
    const by = 1076;
    skew(by + 60, () => {
      const g = x.createLinearGradient(60, 0, 1020, 0);
      g.addColorStop(0, '#fde68a');
      g.addColorStop(1, '#f59e0b');
      x.fillStyle = g;
      x.fillRect(60, by, 960, 120);
    });
    T('TOTAL', 110, by + 52, `900 26px ${F}`, '#07123a', 'left');
    T(`${tr} RUNS   ·   ${tw} WICKETS   ·   ${totalMatches} MATCHES`, 110, by + 92, `800 26px ${F}`, '#07123a', 'left');
    T('Blue = best batting season    Orange = best bowling season', W / 2, by + 168, `600 20px ${F}`, 'rgba(255,255,255,.5)');
  }

  T('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1318, `700 20px ${F}`, 'rgba(255,255,255,.45)');
  return canvas;
}

export const SeasonPosterModal: React.FC<SeasonPosterModalProps> = ({
  isOpen,
  onClose,
  player,
  season,
  seasons,
  fmtName,
  limit = 7,
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
      return drawPoster(player, season, seasons, fmtName, img, limit).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, ready, img, player, season, seasons, fmtName, limit]);

  if (!isOpen) return null;

  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  const fileName = season
    ? `ARCL_${safe(player.name)}_${safe(season.name)}.png`
    : `ARCL_${safe(player.name)}_Seasons.png`;

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
        await nav.share({ files: [file], title: `${player.name} - ${season ? season.name : 'Seasons'}` });
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
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {season ? 'Season Report' : 'Season by Season'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {dataUrl ? (
          <img src={dataUrl} alt="Season poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
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
      </div>
    </div>
  );
};
