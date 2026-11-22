import React, { useMemo, useState } from 'react';
import { X, Share2, Download, Search, ChevronLeft } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Match } from '../types/cricket';
import { computePartnerships, PairStat, PARTNERSHIP_TIERS, tierFor, nextTier } from '../utils/partnerships';

// Partnerships list (all pairs, most runs first) + a share poster for any pair.
// All numbers come from ball-by-ball data this phone already has: no Firebase reads.

interface PartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[]; // matches of this tournament
  allMatches: Match[]; // every match known on this phone
  tournamentName: string;
  season?: string;
}

function drawPoster(scopeLine: string, p: PairStat, rank: number): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  const text = (t: string, px: number, py: number, f: string, col: string, al: CanvasTextAlign = 'center') => {
    x.font = f;
    x.fillStyle = col;
    x.textAlign = al;
    x.fillText(t, px, py);
  };
  const fit = (t: string, px: number, py: number, mw: number, sp: number, w: string, col: string) => {
    let s = sp;
    x.font = `${w} ${s}px sans-serif`;
    while (x.measureText(t).width > mw && s > 16) {
      s -= 2;
      x.font = `${w} ${s}px sans-serif`;
    }
    text(t, px, py, `${w} ${s}px sans-serif`, col);
  };
  const SK = 14;
  const bar = (px: number, py: number, w: number, h: number, f: string | CanvasGradient, s: string) => {
    x.beginPath();
    x.moveTo(px + SK, py);
    x.lineTo(px + w, py);
    x.lineTo(px + w - SK, py + h);
    x.lineTo(px, py + h);
    x.closePath();
    x.fillStyle = f;
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = s;
    x.stroke();
  };

  const tier = tierFor(p.runs);
  const accent = tier ? tier.color : '#fbbf24';

  // background
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#071a3d');
  g.addColorStop(0.55, '#0a1230');
  g.addColorStop(1, '#14082e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  let r = x.createRadialGradient(150, 260, 10, 150, 260, 620);
  r.addColorStop(0, 'rgba(37,99,235,.55)');
  r.addColorStop(1, 'rgba(37,99,235,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
  r = x.createRadialGradient(950, 1100, 10, 950, 1100, 560);
  r.addColorStop(0, 'rgba(249,115,22,.4)');
  r.addColorStop(1, 'rgba(249,115,22,0)');
  x.fillStyle = r;
  x.fillRect(0, 0, W, H);
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
  const gold = x.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, '#f59e0b');
  gold.addColorStop(0.5, '#fde68a');
  gold.addColorStop(1, '#f59e0b');
  x.strokeStyle = tier ? accent : gold;
  x.lineWidth = 4;
  x.strokeRect(30, 30, W - 60, H - 60);

  // header
  bar(60, 62, 170, 62, gold, 'rgba(0,0,0,0)');
  text('ARCL', 145, 107, '900 42px sans-serif', '#1a1203');
  bar(250, 62, W - 310, 62, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.18)');
  fit(scopeLine.toUpperCase(), 250 + (W - 310) / 2, 104, W - 350, 28, '800', '#fff');
  text('PARTNERSHIP', W / 2, 215, '900 68px sans-serif', '#fff');
  text(rank === 1 ? 'TOP PAIR' : `PAIR #${rank}`, W / 2, 258, '800 26px sans-serif', accent);

  // players
  const ring = x.createLinearGradient(0, 0, 200, 200);
  ring.addColorStop(0, '#fde68a');
  ring.addColorStop(1, '#f97316');
  const av = (cx: number, cy: number, name: string, col: string) => {
    x.beginPath();
    x.arc(cx, cy, 92, 0, Math.PI * 2);
    x.fillStyle = col;
    x.fill();
    x.lineWidth = 7;
    x.strokeStyle = ring;
    x.stroke();
    text((name || '?').charAt(0).toUpperCase(), cx, cy + 34, '900 96px sans-serif', '#fff');
  };
  av(230, 430, p.aName, '#1d4ed8');
  av(850, 430, p.bName, '#c2410c');
  text(String(p.runs), W / 2, 462, '900 150px sans-serif', '#fde68a');
  text('COMBINED RUNS', W / 2, 505, '800 26px sans-serif', 'rgba(255,255,255,.8)');
  fit((p.aName || '').toUpperCase(), 230, 572, 330, 40, '900', '#fff');
  fit((p.bName || '').toUpperCase(), 850, 572, 330, 40, '900', '#fff');

  // split bar
  const tot = Math.max(1, p.aRuns + p.bRuns);
  const bw = 940;
  const aw = Math.min(bw - 130, Math.max(130, Math.round((bw * p.aRuns) / tot)));
  bar(70, 610, aw, 78, '#2563eb', 'rgba(255,255,255,.3)');
  bar(70 + aw, 610, bw - aw, 78, '#ea580c', 'rgba(255,255,255,.3)');
  text(String(p.aRuns), 70 + aw / 2, 662, '900 44px sans-serif', '#fff');
  text(String(p.bRuns), 70 + aw + (bw - aw) / 2, 662, '900 44px sans-serif', '#fff');
  fit(`${(p.aName || '').toUpperCase()}'S RUNS`, 70 + aw / 2, 712, aw - 20, 22, '700', 'rgba(255,255,255,.7)');
  fit(`${(p.bName || '').toUpperCase()}'S RUNS`, 70 + aw + (bw - aw) / 2, 712, bw - aw - 20, 22, '700', 'rgba(255,255,255,.7)');

  // stats
  const stats: [string, string, boolean][] = [
    ['PARTNERSHIPS', String(p.stands), false],
    ['HIGHEST STAND', String(p.best), true],
    ['BALLS', String(p.balls), false],
    ['RUN RATE', (p.balls ? (p.runs * 6) / p.balls : 0).toFixed(1), false],
  ];
  stats.forEach((s, i) => {
    const w = 220;
    const px = 70 + i * (w + 20);
    bar(px, 745, w, 112, s[2] ? 'rgba(251,191,36,.22)' : 'rgba(255,255,255,.07)', s[2] ? 'rgba(251,191,36,.8)' : 'rgba(255,255,255,.16)');
    text(s[1], px + w / 2, 808, '900 52px sans-serif', s[2] ? '#fde68a' : '#fff');
    text(s[0], px + w / 2, 841, '700 19px sans-serif', s[2] ? '#fbbf24' : 'rgba(255,255,255,.62)');
  });

  // milestone badge + progress to next
  const nt = nextTier(p.runs);
  if (tier) {
    bar(70, 905, 940, 120, accent, 'rgba(0,0,0,0)');
    text(tier.label, W / 2, 975, '900 62px sans-serif', tier.text);
    text('PARTNERSHIP MILESTONE', W / 2, 1008, '800 22px sans-serif', tier.text);
  } else {
    bar(70, 905, 940, 120, 'rgba(255,255,255,.07)', 'rgba(255,255,255,.16)');
    text('MILESTONE', W / 2, 962, '800 24px sans-serif', 'rgba(255,255,255,.6)');
    text('Next: 100 CLUB', W / 2, 1002, '900 40px sans-serif', '#fff');
  }
  if (nt && tier) {
    bar(70, 1050, 940, 80, 'rgba(255,255,255,.07)', 'rgba(255,255,255,.16)');
    fit(`NEXT: ${nt.label}  ·  ${nt.min - p.runs} RUNS TO GO`, W / 2, 1102, 880, 32, '800', '#fff');
  } else if (nt) {
    bar(70, 1050, 940, 80, 'rgba(255,255,255,.07)', 'rgba(255,255,255,.16)');
    fit(`${100 - p.runs} RUNS TO GO`, W / 2, 1102, 880, 32, '800', '#fbbf24');
  }

  bar(70, 1215, 940, 64, gold, 'rgba(0,0,0,0)');
  fit(`${(p.aName || '').toUpperCase()}  +  ${(p.bName || '').toUpperCase()}`, W / 2, 1259, 860, 30, '900', '#1a1203');
  text('ARCL AMRITSAR', W / 2, 1303, '700 20px sans-serif', 'rgba(255,255,255,.5)');
  return c;
}

export const PartnershipModal: React.FC<PartnershipModalProps> = ({ isOpen, onClose, matches, allMatches, tournamentName, season }) => {
  const [scope, setScope] = useState<'tournament' | 'all'>('tournament');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const result = useMemo(
    () => (isOpen ? computePartnerships(scope === 'all' ? allMatches : matches) : { pairs: [], matchesUsed: 0, matchesWithoutPartnerInfo: 0 }),
    [isOpen, scope, matches, allMatches]
  );

  const pickedPair = result.pairs.find((p) => p.key === picked) || null;
  const pickedRank = pickedPair ? result.pairs.findIndex((p) => p.key === picked) + 1 : 0;
  const scopeLine = scope === 'all' ? 'All Tournaments' : `${tournamentName}${season ? '  ·  ' + season : ''}`;

  const dataUrl = useMemo(() => {
    if (!isOpen || !pickedPair) return '';
    try {
      return drawPoster(scopeLine, pickedPair, pickedRank).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, pickedPair, pickedRank, scopeLine]);

  if (!isOpen) return null;

  const needle = q.trim().toLowerCase();
  const list = result.pairs
    .map((p, i) => ({ p, rank: i + 1 }))
    .filter(({ p }) => !needle || p.aName.toLowerCase().includes(needle) || p.bName.toLowerCase().includes(needle));

  const fileName = pickedPair
    ? `ARCL_${pickedPair.aName.replace(/\s+/g, '_')}_${pickedPair.bName.replace(/\s+/g, '_')}_Partnership.png`
    : 'ARCL_Partnership.png';

  const makeFile = (): File => {
    const bin = atob(dataUrl.split(',')[1] || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], fileName, { type: 'image/png' });
  };

  const handleShare = async () => {
    if (!dataUrl || !pickedPair) return;
    try {
      setBusy(true);
      cricketAudio.playClick();
      const file = makeFile();
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `${pickedPair.aName} + ${pickedPair.bName} - Partnership` });
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
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 block">Partnerships</span>
            <span className="text-[10px] text-slate-500 truncate block">{scopeLine}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!pickedPair && (
          <>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setScope('tournament');
                }}
                className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
                  scope === 'tournament' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Is Tournament
              </button>
              <button
                onClick={() => {
                  cricketAudio.playClick();
                  setScope('all');
                }}
                className={`py-2 rounded-lg text-[11px] font-black cursor-pointer ${
                  scope === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sab Tournaments
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PARTNERSHIP_TIERS.slice()
                .reverse()
                .map((t) => (
                  <span
                    key={t.label}
                    className="px-2 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: t.color, color: t.text }}
                  >
                    {t.min}+ {t.label.replace(' CLUB', '')}
                  </span>
                ))}
            </div>

            {result.matchesWithoutPartnerInfo > 0 && (
              <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-snug">
                {result.matchesWithoutPartnerInfo} match mein batsmen ki jodi ka record nahi hai, wo hisaab mein nahi judega.
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Player ka naam dhoondo"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-[62vh] overflow-y-auto space-y-2 pr-0.5">
              {list.map(({ p, rank }) => {
                const t = tierFor(p.runs);
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      cricketAudio.playClick();
                      setPicked(p.key);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900 border text-left cursor-pointer hover:brightness-125"
                    style={{
                      borderColor: t ? t.color : '#1e293b',
                      borderLeftWidth: 5,
                      background: t ? `linear-gradient(90deg, ${t.color}2e, #0f172a 70%)` : undefined,
                    }}
                  >
                    <span className="w-6 text-center text-lg font-black text-amber-400">{rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-white truncate">
                        {p.aName} + {p.bName}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {p.stands} partnership{p.stands > 1 ? 's' : ''}
                        </span>
                        {t && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: t.color, color: t.text }}>
                            {t.label}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-2xl font-black leading-none text-amber-200">{p.runs}</span>
                      <span className="block text-[9px] font-bold text-slate-400 mt-0.5">TOTAL RUNS</span>
                    </span>
                  </button>
                );
              })}
              {list.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-8">
                  {result.pairs.length === 0 ? 'Abhi koi jodi ka record nahi mila.' : 'Is naam ki koi jodi nahi mili.'}
                </div>
              )}
            </div>
          </>
        )}

        {pickedPair && (
          <>
            <button
              onClick={() => {
                cricketAudio.playClick();
                setPicked('');
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-sky-300 cursor-pointer self-start"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Poori list
            </button>
            {dataUrl ? (
              <img src={dataUrl} alt="Partnership poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-xs text-slate-400">Poster nahi ban paya.</div>
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
