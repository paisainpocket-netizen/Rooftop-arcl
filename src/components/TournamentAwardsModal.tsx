import React, { useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TournamentPlayerStat } from '../utils/tournamentStats';

// Orange Cap / Purple Cap / MVP poster for one tournament.
// Uses only the stats the tournament screen already computed, so it reads
// nothing extra from Firebase.

interface TournamentAwardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TournamentPlayerStat[];
  tournamentName: string;
  season?: string;
}

const MIN_BALLS_FOR_SR = 20;

function pickAwards(stats: TournamentPlayerStat[]) {
  const list = stats || [];
  const orange = [...list]
    .filter((p) => p.ballsFaced > 0 && p.runs > 0)
    .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)[0];
  const purple = [...list]
    .filter((p) => p.legalBallsBowled > 0 && p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)[0];
  const mvp = [...list].filter((p) => p.mvpPoints > 0).sort((a, b) => b.mvpPoints - a.mvpPoints)[0];
  const sixes = [...list].filter((p) => p.sixes > 0).sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)[0];
  const sr = [...list]
    .filter((p) => p.ballsFaced >= MIN_BALLS_FOR_SR && p.strikeRate > 0)
    .sort((a, b) => b.strikeRate - a.strikeRate || b.runs - a.runs)[0];
  return { orange, purple, mvp, sixes, sr };
}

function drawPoster(stats: TournamentPlayerStat[], tournamentName: string, season?: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const F = 'sans-serif';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;
  const { orange, purple, mvp, sixes, sr } = pickAwards(stats);

  const text = (t: string, px: number, py: number, font: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = font;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (
    t: string,
    px: number,
    py: number,
    maxW: number,
    start: number,
    weight: string,
    col: string,
    al: CanvasTextAlign = 'center',
    style = 'italic '
  ) => {
    let s = start;
    x.font = `${style}${weight} ${s}px ${F}`;
    while (x.measureText(t).width > maxW && s > 14) {
      s -= 2;
      x.font = `${style}${weight} ${s}px ${F}`;
    }
    text(t, px, py, `${style}${weight} ${s}px ${F}`, col, al);
  };

  // background
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#040a22');
  g.addColorStop(0.55, '#07123a');
  g.addColorStop(1, '#030617');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const gl = x.createRadialGradient(170, 330, 10, 170, 330, 560);
  gl.addColorStop(0, 'rgba(249,115,22,.40)');
  gl.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = gl;
  x.fillRect(0, 0, W, H);
  const gr = x.createRadialGradient(910, 800, 10, 910, 800, 560);
  gr.addColorStop(0, 'rgba(124,58,237,.45)');
  gr.addColorStop(1, 'rgba(124,58,237,0)');
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
  tg.addColorStop(0, '#f97316');
  tg.addColorStop(0.5, '#fbbf24');
  tg.addColorStop(1, '#7c3aed');
  x.fillStyle = tg;
  x.fillRect(0, 0, W, 12);
  x.fillRect(0, H - 12, W, 12);

  // header
  x.fillStyle = 'rgba(251,191,36,.7)';
  x.fillRect(70, 70, 150, 3);
  x.fillRect(W - 220, 70, 150, 3);
  fit(`${tournamentName}${season ? '  ·  ' + season : ''}`.toUpperCase(), W / 2, 78, 600, 22, '700', '#fbbf24', 'center', '');
  x.save();
  x.shadowColor = 'rgba(251,191,36,.6)';
  x.shadowBlur = 30;
  text('TOURNAMENT AWARDS', W / 2, 160, `italic 900 76px ${F}`, '#ffffff');
  x.restore();

  // big cap cards
  const bigCard = (
    y: number,
    label: string,
    p: TournamentPlayerStat | undefined,
    value: string,
    unit: string,
    sub: string,
    c1: string,
    c2: string
  ) => {
    const h = 320;
    const gcard = x.createLinearGradient(60, y, 1020, y + h);
    gcard.addColorStop(0, c1);
    gcard.addColorStop(1, c2);
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 30;
    x.fillStyle = gcard;
    x.beginPath();
    x.roundRect(60, y, 960, h, 30);
    x.fill();
    x.restore();
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath();
    x.roundRect(60, y, 960, h, 30);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)';
    x.lineWidth = 2;
    x.stroke();

    // label tag
    x.fillStyle = 'rgba(255,255,255,.95)';
    x.beginPath();
    x.roundRect(90, y + 28, 250, 44, 22);
    x.fill();
    text(label, 215, y + 59, `900 24px ${F}`, c2);

    if (!p) {
      text('Abhi koi nahi', 540, y + 190, `italic 800 52px ${F}`, 'rgba(255,255,255,.6)');
      return;
    }
    // avatar with initial
    x.beginPath();
    x.arc(180, y + 175, 72, 0, Math.PI * 2);
    x.fillStyle = 'rgba(0,0,0,.35)';
    x.fill();
    x.lineWidth = 6;
    x.strokeStyle = '#fff';
    x.stroke();
    text((p.playerName || '?').charAt(0).toUpperCase(), 180, y + 205, `italic 900 84px ${F}`, '#fff');

    fit((p.playerName || '').toUpperCase(), 280, y + 160, 440, 56, '900', '#fff', 'left');
    fit((p.teamName || '').toUpperCase(), 280, y + 205, 440, 28, '700', 'rgba(255,255,255,.8)', 'left', '');

    text(value, 1000, y + 190, `italic 900 128px ${F}`, '#fff', 'right');
    text(unit, 1000, y + 232, `800 26px ${F}`, 'rgba(255,255,255,.85)', 'right');

    x.fillStyle = 'rgba(255,255,255,.25)';
    x.fillRect(90, y + 262, 900, 2);
    fit(sub, 540, y + 300, 880, 26, '700', 'rgba(255,255,255,.92)', 'center', '');
  };

  const bestBowl = purple && purple.bestBowlingWickets > 0 ? `Best ${purple.bestBowlingWickets}/${purple.bestBowlingRuns}` : '';
  bigCard(
    210,
    'ORANGE CAP',
    orange,
    orange ? String(orange.runs) : '-',
    'RUNS',
    orange
      ? `Avg ${orange.innings > 0 ? orange.battingAverage.toFixed(1) : '-'}   ·   SR ${orange.strikeRate.toFixed(1)}   ·   HS ${orange.highestScore}${orange.highestScoreNotOut ? '*' : ''}   ·   ${orange.matches} Matches`
      : '',
    '#f97316',
    '#c2410c'
  );
  bigCard(
    560,
    'PURPLE CAP',
    purple,
    purple ? String(purple.wickets) : '-',
    'WICKETS',
    purple
      ? `Econ ${purple.economy.toFixed(1)}   ·   ${bestBowl}   ·   ${purple.matches} Matches`.replace(/\s+·\s+·\s+/g, '   ·   ')
      : '',
    '#8b5cf6',
    '#5b21b6'
  );

  // small cards
  const mini = (
    cx: number,
    label: string,
    p: TournamentPlayerStat | undefined,
    value: string,
    unit: string,
    c1: string,
    c2: string
  ) => {
    const y = 910;
    const w = 300;
    const h = 270;
    const gm = x.createLinearGradient(cx, y, cx + w, y + h);
    gm.addColorStop(0, c1);
    gm.addColorStop(1, c2);
    x.fillStyle = gm;
    x.beginPath();
    x.roundRect(cx, y, w, h, 26);
    x.fill();
    x.fillStyle = 'rgba(0,0,0,.30)';
    x.beginPath();
    x.roundRect(cx, y, w, h, 26);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.3)';
    x.lineWidth = 2;
    x.stroke();
    text(label, cx + w / 2, y + 48, `900 22px ${F}`, '#fff');
    if (!p) {
      text('-', cx + w / 2, y + 150, `italic 900 80px ${F}`, 'rgba(255,255,255,.6)');
      return;
    }
    text(value, cx + w / 2, y + 128, `italic 900 76px ${F}`, '#fff');
    text(unit, cx + w / 2, y + 160, `700 18px ${F}`, 'rgba(255,255,255,.8)');
    fit((p.playerName || '').toUpperCase(), cx + w / 2, y + 212, w - 30, 30, '900', '#fff');
    fit((p.teamName || '').toUpperCase(), cx + w / 2, y + 245, w - 30, 18, '700', 'rgba(255,255,255,.75)', 'center', '');
  };
  mini(60, 'MVP', mvp, mvp ? mvp.mvpPoints.toFixed(1) : '', 'POINTS', '#eab308', '#a16207');
  mini(390, 'MOST SIXES', sixes, sixes ? String(sixes.sixes) : '', 'SIXES', '#2563eb', '#1e3a8a');
  mini(720, 'BEST STRIKE RATE', sr, sr ? sr.strikeRate.toFixed(1) : '', `MIN ${MIN_BALLS_FOR_SR} BALLS`, '#0d9488', '#134e4a');

  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1318, `700 20px ${F}`, 'rgba(255,255,255,.45)');
  return canvas;
}

export const TournamentAwardsModal: React.FC<TournamentAwardsModalProps> = ({
  isOpen,
  onClose,
  stats,
  tournamentName,
  season,
}) => {
  const [busy, setBusy] = useState(false);

  const dataUrl = useMemo(() => {
    if (!isOpen) return '';
    try {
      return drawPoster(stats, tournamentName, season).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, stats, tournamentName, season]);

  if (!isOpen) return null;

  const fileName = `ARCL_Awards_${(tournamentName || 'Tournament').replace(/\s+/g, '_')}.png`;

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
        await nav.share({ files: [file], title: `${tournamentName} Awards` });
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
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Tournament Awards</span>
            <span className="text-[10px] text-slate-500 truncate block">{tournamentName} · Orange Cap, Purple Cap, MVP</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {dataUrl && <img src={dataUrl} alt="Tournament awards poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />}

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
