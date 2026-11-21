import React, { useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

// "Man of the Match" poster for one finished match.
// Everything comes from the match that is already loaded (result + innings),
// so making the poster reads nothing extra from Firebase.

interface MatchMomModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: any;
}

interface MomPerf {
  batted: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOut: boolean;
  bowled: boolean;
  wickets: number;
  runsConceded: number;
  legalBalls: number;
}

function getPerf(match: any, playerId: string): MomPerf {
  const p: MomPerf = {
    batted: false,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    notOut: false,
    bowled: false,
    wickets: 0,
    runsConceded: 0,
    legalBalls: 0,
  };
  [match?.innings1, match?.innings2, match?.innings3, match?.innings4].forEach((inn: any) => {
    if (!inn) return;
    const b = inn.battingStats?.[playerId];
    if (b && (b.balls > 0 || b.runs > 0 || b.isOut)) {
      p.batted = true;
      p.runs += b.runs || 0;
      p.balls += b.balls || 0;
      p.fours += b.fours || 0;
      p.sixes += b.sixes || 0;
      p.notOut = !b.isOut;
    }
    const w = inn.bowlingStats?.[playerId];
    if (w && ((w.overs || 0) > 0 || (w.balls || 0) > 0)) {
      p.bowled = true;
      p.wickets += w.wickets || 0;
      p.runsConceded += w.runs || 0;
      p.legalBalls += (w.overs || 0) * 6 + (w.balls || 0);
    }
  });
  return p;
}

function drawPoster(match: any): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const F = 'sans-serif';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d') as CanvasRenderingContext2D;

  const mom = match?.result?.playerOfTheMatch || {};
  const name: string = mom.playerName || 'Player';
  const teamName: string = mom.teamName || '';
  const perf = getPerf(match, mom.playerId);

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

  // background
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050a24');
  g.addColorStop(0.5, '#0a1440');
  g.addColorStop(1, '#030617');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // sun rays behind the player
  const cx = 540;
  const cy = 440;
  x.save();
  x.translate(cx, cy);
  for (let i = 0; i < 28; i++) {
    const a0 = (i / 28) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / 56;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a0) * 1100, Math.sin(a0) * 1100);
    x.lineTo(Math.cos(a1) * 1100, Math.sin(a1) * 1100);
    x.closePath();
    x.fillStyle = 'rgba(251,191,36,.07)';
    x.fill();
  }
  x.restore();
  const glow = x.createRadialGradient(cx, cy, 20, cx, cy, 560);
  glow.addColorStop(0, 'rgba(251,191,36,.55)');
  glow.addColorStop(0.5, 'rgba(249,115,22,.18)');
  glow.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  const tg = x.createLinearGradient(0, 0, W, 0);
  tg.addColorStop(0, '#2563eb');
  tg.addColorStop(0.5, '#fbbf24');
  tg.addColorStop(1, '#f97316');
  x.fillStyle = tg;
  x.fillRect(0, 0, W, 12);
  x.fillRect(0, H - 12, W, 12);

  // header
  const topLine = [match?.tournamentName || `${match?.teamA?.name || ''} vs ${match?.teamB?.name || ''}`, match?.name || '']
    .filter(Boolean)
    .join('  ·  ');
  x.fillStyle = 'rgba(251,191,36,.7)';
  x.fillRect(70, 70, 150, 3);
  x.fillRect(W - 220, 70, 150, 3);
  fit(topLine.toUpperCase(), W / 2, 78, 600, 22, '700', '#fbbf24', '');

  // title
  x.save();
  x.shadowColor = 'rgba(251,191,36,.8)';
  x.shadowBlur = 34;
  const tt = x.createLinearGradient(0, 110, 0, 190);
  tt.addColorStop(0, '#fff7d6');
  tt.addColorStop(1, '#fbbf24');
  x.font = `italic 900 82px ${F}`;
  let ts = 82;
  while (x.measureText('MAN OF THE MATCH').width > 940 && ts > 40) {
    ts -= 2;
    x.font = `italic 900 ${ts}px ${F}`;
  }
  x.fillStyle = tt;
  x.textAlign = 'center';
  x.fillText('MAN OF THE MATCH', W / 2, 172);
  x.restore();

  // avatar
  x.save();
  x.shadowColor = '#fbbf24';
  x.shadowBlur = 60;
  x.beginPath();
  x.arc(cx, cy + 20, 168, 0, Math.PI * 2);
  x.fillStyle = '#fbbf24';
  x.fill();
  x.restore();
  const ring = x.createLinearGradient(cx - 170, cy - 150, cx + 170, cy + 190);
  ring.addColorStop(0, '#fff7d6');
  ring.addColorStop(0.5, '#fbbf24');
  ring.addColorStop(1, '#b45309');
  x.beginPath();
  x.arc(cx, cy + 20, 168, 0, Math.PI * 2);
  x.fillStyle = ring;
  x.fill();
  const inner = x.createRadialGradient(cx, cy - 20, 10, cx, cy + 20, 150);
  inner.addColorStop(0, '#1b2f7a');
  inner.addColorStop(1, '#070f2e');
  x.beginPath();
  x.arc(cx, cy + 20, 152, 0, Math.PI * 2);
  x.fillStyle = inner;
  x.fill();
  text((name || '?').charAt(0).toUpperCase(), cx, cy + 90, `italic 900 200px ${F}`, '#fff');
  // star badge
  x.save();
  x.shadowColor = '#fbbf24';
  x.shadowBlur = 24;
  x.beginPath();
  x.arc(cx + 120, cy + 150, 46, 0, Math.PI * 2);
  x.fillStyle = '#fbbf24';
  x.fill();
  x.restore();
  text('★', cx + 120, cy + 170, `900 58px ${F}`, '#7c2d12');

  // name and team
  x.save();
  x.shadowColor = 'rgba(0,0,0,.6)';
  x.shadowBlur = 14;
  fit(name.toUpperCase(), W / 2, 728, 940, 88, '900', '#ffffff');
  x.restore();
  if (teamName) {
    x.save();
    const pw = 360;
    x.transform(1, 0, -0.22, 1, 0.22 * 770, 0);
    const pg = x.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0);
    pg.addColorStop(0, '#f97316');
    pg.addColorStop(1, '#ea580c');
    x.fillStyle = pg;
    x.fillRect(cx - pw / 2, 746, pw, 46);
    x.restore();
    fit(teamName.toUpperCase(), W / 2, 779, pw - 40, 24, '800', '#fff', '');
  }

  // performance cards
  const card = (px: number, w: number, label: string, big: string, sub: string, c1: string, c2: string) => {
    const y = 830;
    const h = 250;
    const gc = x.createLinearGradient(px, y, px + w, y + h);
    gc.addColorStop(0, c1);
    gc.addColorStop(1, c2);
    x.save();
    x.shadowColor = c1;
    x.shadowBlur = 26;
    x.fillStyle = gc;
    x.beginPath();
    x.roundRect(px, y, w, h, 28);
    x.fill();
    x.restore();
    x.fillStyle = 'rgba(0,0,0,.25)';
    x.beginPath();
    x.roundRect(px, y, w, h, 28);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)';
    x.lineWidth = 2;
    x.stroke();
    text(label, px + w / 2, y + 48, `900 24px ${F}`, 'rgba(255,255,255,.9)');
    text(big, px + w / 2, y + 150, `italic 900 112px ${F}`, '#fff');
    fit(sub, px + w / 2, y + 205, w - 40, 26, '700', 'rgba(255,255,255,.9)', '');
  };

  const batSub = `${perf.balls} balls  ·  ${perf.fours} fours  ·  ${perf.sixes} sixes`;
  const bowlOvers = `${Math.floor(perf.legalBalls / 6)}${perf.legalBalls % 6 ? '.' + (perf.legalBalls % 6) : ''}`;
  const econ = perf.legalBalls > 0 ? (perf.runsConceded / (perf.legalBalls / 6)).toFixed(1) : '-';
  const bowlSub = `${bowlOvers} overs  ·  Econ ${econ}`;

  if (perf.batted && perf.bowled) {
    card(60, 460, 'BATTING', `${perf.runs}${perf.notOut ? '*' : ''}`, batSub, '#2563eb', '#1e3a8a');
    card(560, 460, 'BOWLING', `${perf.wickets}/${perf.runsConceded}`, bowlSub, '#f97316', '#9a3412');
  } else if (perf.batted) {
    card(60, 960, 'BATTING', `${perf.runs}${perf.notOut ? '*' : ''}`, batSub, '#2563eb', '#1e3a8a');
  } else if (perf.bowled) {
    card(60, 960, 'BOWLING', `${perf.wickets}/${perf.runsConceded}`, bowlSub, '#f97316', '#9a3412');
  } else {
    card(60, 960, 'PERFORMANCE', '★', String(mom.reason || 'Match winning performance'), '#7c3aed', '#4c1d95');
  }

  // result band
  const summary: string = match?.result?.summary || '';
  if (summary) {
    const bg = x.createLinearGradient(60, 0, 1020, 0);
    bg.addColorStop(0, '#fde68a');
    bg.addColorStop(1, '#f59e0b');
    x.fillStyle = bg;
    x.beginPath();
    x.roundRect(60, 1120, 960, 110, 26);
    x.fill();
    text('RESULT', W / 2, 1156, `900 20px ${F}`, '#78350f');
    fit(summary, W / 2, 1203, 900, 38, '900', '#1c1917');
  }

  text('ARCL AMRITSAR  ·  ROOFTOP CRICKET LEAGUE', W / 2, 1318, `700 20px ${F}`, 'rgba(255,255,255,.45)');
  return canvas;
}

export const MatchMomModal: React.FC<MatchMomModalProps> = ({ isOpen, onClose, match }) => {
  const [busy, setBusy] = useState(false);

  const dataUrl = useMemo(() => {
    if (!isOpen || !match?.result?.playerOfTheMatch) return '';
    try {
      return drawPoster(match).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, match]);

  if (!isOpen) return null;

  const momName: string = match?.result?.playerOfTheMatch?.playerName || 'Player';
  const fileName = `ARCL_MoM_${momName.replace(/\s+/g, '_')}.png`;

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
        await nav.share({ files: [file], title: `Man of the Match - ${momName}` });
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
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Man of the Match</span>
            <span className="text-[10px] text-slate-500 truncate block">{momName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {dataUrl ? (
          <img src={dataUrl} alt="Man of the Match poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">
            Is match mein Man of the Match abhi chuna nahi gaya.
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
