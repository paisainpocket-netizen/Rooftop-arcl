import React, { useMemo, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { Match } from '../types/cricket';
import { TournamentPlayerStat } from '../utils/tournamentStats';

// Tournament Summary poster: the whole season on one picture (teams, matches, runs, wickets,
// boundaries, 50s / 100s, highest total, Orange / Purple Cap and the champion).
// Worked out from matches this phone already has, so it reads nothing from Firebase.

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[]; // matches of this tournament
  stats: TournamentPlayerStat[]; // player stats already computed by the tournament screen
  tournamentName: string;
  season?: string;
  championName?: string;
}

const INNINGS_KEYS = ['innings1', 'innings2', 'innings3', 'innings4'];

function computeTotals(matches: Match[]) {
  const teamIds = new Set<string>();
  let played = 0;
  let runs = 0;
  let wickets = 0;
  let fours = 0;
  let sixes = 0;
  let fifties = 0;
  let hundreds = 0;
  let highest = 0;
  (matches || []).forEach((m: any) => {
    if (!m) return;
    if (m.teamA?.id) teamIds.add(m.teamA.id);
    if (m.teamB?.id) teamIds.add(m.teamB.id);
    if (m.status !== 'completed') return;
    played += 1;
    INNINGS_KEYS.forEach((k) => {
      const inn = m[k];
      if (!inn) return;
      runs += Number(inn.totalRuns) || 0;
      wickets += Number(inn.totalWickets) || 0;
      if ((Number(inn.totalRuns) || 0) > highest) highest = Number(inn.totalRuns) || 0;
      Object.values(inn.battingStats || {}).forEach((b: any) => {
        fours += Number(b?.fours) || 0;
        sixes += Number(b?.sixes) || 0;
        const r = Number(b?.runs) || 0;
        if (r >= 100) hundreds += 1;
        else if (r >= 50) fifties += 1;
      });
    });
  });
  return { teams: teamIds.size, matches: played, runs, wickets, fours, sixes, fifties, hundreds, highestTotal: String(highest) };
}

interface SummaryData{name:string;season?:string;format?:string;teams:number;matches:number;runs:number;wickets:number;fours:number;sixes:number;fifties:number;hundreds:number;highestTotal:string;orange?:{name:string;value:number};purple?:{name:string;value:number};champion?:string}
function drawSummary(d:SummaryData):HTMLCanvasElement{
  const W=1080,H=1350;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d') as CanvasRenderingContext2D;
  const text=(t:string,px:number,py:number,f:string,col:string,al:CanvasTextAlign='center')=>{x.font=f;x.fillStyle=col;x.textAlign=al;x.fillText(t,px,py)};
  const fit=(t:string,px:number,py:number,mw:number,sp:number,w:string,col:string)=>{let s=sp;x.font=`${w} ${s}px sans-serif`;while(x.measureText(t).width>mw&&s>16){s-=2;x.font=`${w} ${s}px sans-serif`}text(t,px,py,`${w} ${s}px sans-serif`,col)};
  const SK=14;const bar=(px:number,py:number,w:number,h:number,f:any,s:string)=>{x.beginPath();x.moveTo(px+SK,py);x.lineTo(px+w,py);x.lineTo(px+w-SK,py+h);x.lineTo(px,py+h);x.closePath();x.fillStyle=f;x.fill();x.lineWidth=2;x.strokeStyle=s;x.stroke()};
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#071a3d');g.addColorStop(.55,'#0a1230');g.addColorStop(1,'#14082e');x.fillStyle=g;x.fillRect(0,0,W,H);
  let r=x.createRadialGradient(150,260,10,150,260,620);r.addColorStop(0,'rgba(37,99,235,.55)');r.addColorStop(1,'rgba(37,99,235,0)');x.fillStyle=r;x.fillRect(0,0,W,H);
  r=x.createRadialGradient(950,1100,10,950,1100,560);r.addColorStop(0,'rgba(249,115,22,.4)');r.addColorStop(1,'rgba(249,115,22,0)');x.fillStyle=r;x.fillRect(0,0,W,H);
  x.save();x.globalAlpha=.06;x.fillStyle='#fff';for(let i=0;i<6;i++){x.beginPath();x.moveTo(-100+i*230,0);x.lineTo(-40+i*230,0);x.lineTo(-340+i*230,H);x.lineTo(-400+i*230,H);x.closePath();x.fill()}x.restore();
  const gold=x.createLinearGradient(0,0,W,0);gold.addColorStop(0,'#f59e0b');gold.addColorStop(.5,'#fde68a');gold.addColorStop(1,'#f59e0b');
  x.strokeStyle=gold;x.lineWidth=4;x.strokeRect(30,30,W-60,H-60);
  bar(60,62,170,62,gold,'rgba(0,0,0,0)');text('ARCL',145,107,'900 42px sans-serif','#1a1203');
  bar(250,62,W-310,62,'rgba(255,255,255,.08)','rgba(255,255,255,.18)');text('TOURNAMENT SUMMARY',250+(W-310)/2,104,'800 28px sans-serif','#fff');
  // trophy
  x.beginPath();x.arc(W/2,255,92,0,7);x.fillStyle='#10234f';x.fill();x.lineWidth=8;const ring=x.createLinearGradient(W/2-100,160,W/2+100,350);ring.addColorStop(0,'#fde68a');ring.addColorStop(1,'#f97316');x.strokeStyle=ring;x.stroke();
  text('🏆',W/2,292,'90px sans-serif','#fff');
  fit(d.name.toUpperCase(),W/2,420,920,70,'900','#fff');
  const sub=[d.season,d.format].filter(Boolean).join('  ·  ');
  if(sub) fit(sub,W/2,466,900,30,'700','#fbbf24');
  // hero tiles
  const hero=(px:number,py:number,label:string,val:string,c1:string,c2:string,nc:string)=>{const hg=x.createLinearGradient(px,py,px+455,py+150);hg.addColorStop(0,c1);hg.addColorStop(1,c2);bar(px,py,455,150,hg,'rgba(255,255,255,.28)');text(label,px+227,py+40,'800 24px sans-serif','rgba(255,255,255,.85)');text(val,px+227,py+120,'900 84px sans-serif',nc)};
  hero(60,505,'TEAMS',String(d.teams),'rgba(37,99,235,.65)','rgba(30,64,175,.35)','#fff');
  hero(565,505,'MATCHES',String(d.matches),'rgba(37,99,235,.65)','rgba(30,64,175,.35)','#fff');
  hero(60,670,'TOTAL RUNS',String(d.runs),'rgba(234,88,12,.65)','rgba(154,52,18,.35)','#fde68a');
  hero(565,670,'TOTAL WICKETS',String(d.wickets),'rgba(234,88,12,.65)','rgba(154,52,18,.35)','#fff');
  // small boxes
  const row=(py:number,items:[string,string,boolean][])=>{const n=items.length,gap=14,w=(940-gap*(n-1))/n;items.forEach((m,i)=>{const px=70+i*(w+gap);bar(px,py,w,100,m[2]?'rgba(251,191,36,.22)':'rgba(255,255,255,.07)',m[2]?'rgba(251,191,36,.8)':'rgba(255,255,255,.16)');text(m[1],px+w/2,py+56,'900 42px sans-serif',m[2]?'#fde68a':'#fff');text(m[0],px+w/2,py+86,'700 19px sans-serif',m[2]?'#fbbf24':'rgba(255,255,255,.62)')})};
  row(845,[['FOURS',String(d.fours),false],['SIXES',String(d.sixes),false],['FIFTIES',String(d.fifties),false],['HUNDREDS',String(d.hundreds),d.hundreds>0],['HIGHEST TOTAL',d.highestTotal,false]]);
  // caps
  const cap=(px:number,label:string,p:{name:string;value:number}|undefined,unit:string,c1:string,c2:string)=>{bar(px,975,455,120,'rgba(255,255,255,.07)',c1);text(label,px+227,1010,'800 22px sans-serif',c1);if(p){fit(p.name.toUpperCase(),px+227,1058,400,36,'900','#fff');text(`${p.value} ${unit}`,px+227,1086,'800 24px sans-serif',c2)}else text('-',px+227,1065,'900 40px sans-serif','#fff')};
  cap(60,'ORANGE CAP',d.orange,'RUNS','#fb923c','#fdba74');
  cap(565,'PURPLE CAP',d.purple,'WICKETS','#a78bfa','#c4b5fd');
  if(d.champion){bar(70,1130,940,110,gold,'rgba(0,0,0,0)');text('CHAMPIONS',W/2,1170,'800 24px sans-serif','#1a1203');fit(d.champion.toUpperCase(),W/2,1220,860,46,'900','#1a1203')}
  text('ARCL AMRITSAR',W/2,1300,'700 22px sans-serif','rgba(255,255,255,.5)');
  return c;
}

export const TournamentSummaryModal: React.FC<TournamentSummaryModalProps> = ({
  isOpen,
  onClose,
  matches,
  stats,
  tournamentName,
  season,
  championName,
}) => {
  const [busy, setBusy] = useState(false);

  const dataUrl = useMemo(() => {
    if (!isOpen) return '';
    try {
      const t = computeTotals(matches);
      const list = stats || [];
      const orange = [...list]
        .filter((p) => p.ballsFaced > 0 && p.runs > 0)
        .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)[0];
      const purple = [...list]
        .filter((p) => p.legalBallsBowled > 0 && p.wickets > 0)
        .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)[0];
      return drawSummary({
        name: tournamentName,
        season,
        ...t,
        orange: orange ? { name: orange.playerName, value: orange.runs } : undefined,
        purple: purple ? { name: purple.playerName, value: purple.wickets } : undefined,
        champion: championName,
      }).toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }, [isOpen, matches, stats, tournamentName, season, championName]);

  if (!isOpen) return null;

  const fileName = `ARCL_${tournamentName.replace(/\s+/g, '_')}_Summary.png`;

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
        await nav.share({ files: [file], title: `${tournamentName} - Summary` });
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
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Tournament Summary</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {dataUrl ? (
          <img src={dataUrl} alt="Tournament summary poster" className="w-full rounded-2xl border border-slate-700 shadow-2xl" />
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
      </div>
    </div>
  );
};
