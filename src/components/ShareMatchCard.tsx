import React, { useState, useRef } from 'react';
import { Match } from '../types/cricket';
import { Share2, Copy, Check, X, Download, Sparkles } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface ShareMatchCardProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

export const ShareMatchCard: React.FC<ShareMatchCardProps> = ({ isOpen, onClose, match }) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeSquads, setIncludeSquads] = useState(true);

  if (!isOpen) return null;

  const isScheduled = match.status !== 'live' && match.status !== 'completed';

  const getSquadNames = (squadIds: string[] | undefined, teamPlayers: typeof match.teamA.players): string[] => {
    if (!squadIds || squadIds.length === 0) {
      // If no explicit playing squad chosen yet, fallback to team's default players
      return (teamPlayers || []).map((p) => p.name);
    }
    return squadIds
      .map((id) => teamPlayers?.find((p) => p.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  };

  const squadANames = getSquadNames(match.playingSquadA, match.teamA.players);
  const squadBNames = getSquadNames(match.playingSquadB, match.teamB.players);

  const generateWhatsAppText = () => {
    const isLive = match.status === 'live';
    const isCompleted = match.status === 'completed';
    const inningsOrdinals = ['1st', '2nd', '3rd', '4th'];

    let text = `🏏 *ARCL Rooftop Cricket League*\n`;
    text += `🏆 *${match.tournamentName || match.name || 'ARCL Championship'}*\n`;
    text += `📍 ${match.venue || 'Rooftop Arena'} • 📅 ${match.date || 'Today'}\n\n`;

    if (isScheduled) {
      text += `⚡ *UPCOMING MATCH FIXTURE*\n`;
      text += `⚔️ *${match.teamA.name}* VS *${match.teamB.name}*\n`;
      text += `⏱️ Overs: *${match.totalOvers} Overs*\n\n`;
    } else {
      ([1, 2, 3, 4] as const).forEach((n) => {
        const inn = (match as any)[`innings${n}`];
        if (!inn) return;
        const reached = isCompleted ? true : n <= match.currentInningsNumber;
        if (!reached) return;
        text += `📊 *${inningsOrdinals[n - 1]} Innings*: ${inn.teamName} ${inn.totalRuns}/${inn.totalWickets} (${inn.oversCompleted}.${inn.ballsInCurrentOver}/${match.totalOvers} ov)\n`;
      });

      if (match.result) {
        text += `\n🎉 *Result*: ${match.result.summary}\n`;
      } else if (isLive) {
        text += `\n🔴 *Match Status*: Live in progress!\n`;
      }
    }

    if (includeSquads || isScheduled) {
      if (squadANames.length > 0 || squadBNames.length > 0) {
        text += `\n👥 *Playing Squad Lineups*\n`;
        if (squadANames.length > 0) {
          text += `*${match.teamA.name}* (${squadANames.length}):\n${squadANames.map((n) => `• ${n}`).join('\n')}\n\n`;
        }
        if (squadBNames.length > 0) {
          text += `*${match.teamB.name}* (${squadBNames.length}):\n${squadBNames.map((n) => `• ${n}`).join('\n')}\n`;
        }
      }
    }

    text += `\nScored live on Amritsar Rooftop Cricket League App! 🏏`;
    return text;
  };

  const handleCopy = () => {
    cricketAudio.playClick();
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Pure Client-Side HTML5 Canvas Poster (0 KB Firebase data/storage)
  const drawPosterCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Dark Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1450);
    bgGradient.addColorStop(0, '#020617');
    bgGradient.addColorStop(0.5, '#0b0f19');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1450);

    // Warm Ambient Top Glow
    const glowTop = ctx.createRadialGradient(540, 0, 50, 540, 0, 650);
    glowTop.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    glowTop.addColorStop(1, 'transparent');
    ctx.fillStyle = glowTop;
    ctx.fillRect(0, 0, 1080, 650);

    // Gold Outer Broadcast Frame
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 1020, 1390);

    // Inner Glass Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(60, 60, 960, 1330, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // League Badge Top
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMRITSAR ROOFTOP CRICKET LEAGUE', 540, 135);

    // Tournament Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 24px sans-serif';
    ctx.fillText((match.tournamentName || match.name || 'ROOFTOP CHAMPIONSHIP').toUpperCase(), 540, 180);

    // Status Pill
    const isLive = match.status === 'live';
    const pillText = isScheduled
      ? '📅 OFFICIAL FIXTURE & LINEUPS'
      : isLive
      ? '🔴 LIVE BROADCAST'
      : 'MATCH RESULT';
    
    ctx.fillStyle = isScheduled ? '#d97706' : isLive ? '#e11d48' : '#059669';
    ctx.beginPath();
    ctx.roundRect(330, 215, 420, 50, 25);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 21px sans-serif';
    ctx.fillText(pillText, 540, 248);

    // Teams Header Strip
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(100, 295, 880, 140, 24);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${match.teamA.name}   VS   ${match.teamB.name}`, 540, 365);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(`Format: ${match.totalOvers} Overs • Rooftop Turf Rules`, 540, 405);

    if (isScheduled) {
      // SCHEDULED SQUADS LAYOUT
      ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;

      // Team A Squad Box
      ctx.beginPath();
      ctx.roundRect(100, 465, 425, 680, 24);
      ctx.fill();
      ctx.stroke();

      // Team B Squad Box
      ctx.beginPath();
      ctx.roundRect(555, 465, 425, 680, 24);
      ctx.fill();
      ctx.stroke();

      // Team A Header
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(match.teamA.name.toUpperCase(), 312, 520);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 18px sans-serif';
      ctx.fillText(`Squad (${squadANames.length} Players)`, 312, 550);

      // Team A Players List
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '700 22px sans-serif';
      squadANames.slice(0, 12).forEach((name, i) => {
        ctx.fillText(`${i + 1}. ${name}`, 135, 605 + i * 44);
      });

      // Team B Header
      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(match.teamB.name.toUpperCase(), 767, 520);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 18px sans-serif';
      ctx.fillText(`Squad (${squadBNames.length} Players)`, 767, 550);

      // Team B Players List
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '700 22px sans-serif';
      squadBNames.slice(0, 12).forEach((name, i) => {
        ctx.fillText(`${i + 1}. ${name}`, 590, 605 + i * 44);
      });
    } else {
      // LIVE / COMPLETED SCORES LAYOUT
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(100, 465, 880, 180, 24);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(match.teamA.name, 140, 555);

      ctx.fillStyle = '#34d399';
      ctx.font = '900 52px monospace';
      ctx.textAlign = 'right';
      const inn1 = match.innings1;
      const inn1Score = inn1 ? `${inn1.totalRuns}/${inn1.totalWickets}` : 'Yet to Bat';
      ctx.fillText(inn1Score, 940, 555);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(100, 675, 880, 180, 24);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(match.teamB.name, 140, 765);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 52px monospace';
      ctx.textAlign = 'right';
      const inn2 = match.innings2;
      const inn2Score = inn2 ? `${inn2.totalRuns}/${inn2.totalWickets}` : 'Yet to Bat';
      ctx.fillText(inn2Score, 940, 765);

      // Result Box
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(100, 885, 880, 140, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 30px sans-serif';
      ctx.textAlign = 'center';
      const resultSummary = match.result?.summary || (isLive ? 'Match in progress on rooftop arena!' : 'Match Scheduled');
      ctx.fillText(`🏆 ${resultSummary}`, 540, 965);
    }

    // Venue & Date Info Strip
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${match.venue || 'Rooftop Arena'} • 📅 ${match.date || '2026 Season'}`, 540, 1220);

    // Footer Watermark
    ctx.fillStyle = '#475569';
    ctx.font = '800 20px monospace';
    ctx.fillText('ARCL ROOFTOP LEAGUE APP • OFFICIAL DIGITAL SCORECARD', 540, 1340);

    return canvas;
  };

  const handleSharePoster = async () => {
    try {
      setIsGenerating(true);
      cricketAudio.playClick();
      const canvas = drawPosterCanvas();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }

        const file = new File([blob], `ARCL_Fixture_${match.id}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${match.teamA.name} vs ${match.teamB.name}`,
            text: generateWhatsAppText(),
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ARCL_${match.teamA.name}_vs_${match.teamB.name}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsGenerating(false);
      }, 'image/png');
    } catch (e: any) {
      console.error(e);
      if (e?.name !== 'AbortError') {
        alert('Share nahi ho paaya, "Save Poster" try karo.');
      }
      setIsGenerating(false);
    }
  };

  const handleDownloadPosterOnly = () => {
    cricketAudio.playClick();
    const canvas = drawPosterCanvas();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARCL_Poster_${match.teamA.name}_vs_${match.teamB.name}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-md">
              {isScheduled ? '👥' : '📸'}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {isScheduled ? 'Share Match Lineup & Poster' : 'Share Match Card'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isScheduled ? 'Squad lineup poster for WhatsApp status' : 'TV Poster & scorecard'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/40 space-y-3 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between font-sans">
            <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {isScheduled ? 'Upcoming Lineup Card' : 'ARCL Broadcast Poster'}
            </span>
            <span className="text-[10px] text-slate-400">{match.date || 'Today'}</span>
          </div>

          <div className="font-sans font-black text-sm text-white">
            {match.teamA.name} vs {match.teamB.name}
          </div>

          {isScheduled ? (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-sans">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-black text-amber-400 block text-xs">{match.teamA.name}</span>
                <span className="text-[10px] text-slate-400 block mb-1">Squad: {squadANames.length} players</span>
                <div className="text-[11px] text-slate-300 line-clamp-3">
                  {squadANames.join(', ') || 'Captains yet to select'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-black text-cyan-400 block text-xs">{match.teamB.name}</span>
                <span className="text-[10px] text-slate-400 block mb-1">Squad: {squadBNames.length} players</span>
                <div className="text-[11px] text-slate-300 line-clamp-3">
                  {squadBNames.join(', ') || 'Captains yet to select'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              {([1, 2, 3, 4] as const).map((n) => {
                const inn = (match as any)[`innings${n}`];
                if (!inn) return null;
                const reached = match.status === 'completed' ? true : n <= match.currentInningsNumber;
                if (!reached) return null;
                return (
                  <div key={n} className="flex items-center justify-between">
                    <span className="text-slate-300 font-sans">{inn.teamName}:</span>
                    <span className="font-black text-emerald-400">
                      {inn.totalRuns}/{inn.totalWickets} ({inn.oversCompleted}.{inn.ballsInCurrentOver} ov)
                    </span>
                  </div>
                );
              })}
              {match.result && (
                <div className="pt-2 border-t border-slate-800 font-sans font-bold text-amber-300 text-[11px]">
                  🏆 {match.result.summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1-Tap Share to WhatsApp */}
        <button
          onClick={handleSharePoster}
          disabled={isGenerating}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Share2 className="w-4 h-4" />
          <span>
            {isGenerating
              ? 'Generating HD Poster...'
              : isScheduled
              ? 'Share Squad Poster to WhatsApp'
              : 'Share Poster to WhatsApp'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Download Image */}
          <button
            onClick={handleDownloadPosterOnly}
            className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Poster</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Text!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy Text</span>
              </>
            )}
          </button>
        </div>

        {/* Squad Toggle */}
        <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
          <span className="text-[11px] font-bold text-slate-300">
            Include Playing Lineups in WhatsApp summary
          </span>
          <input
            type="checkbox"
            checked={includeSquads}
            onChange={(e) => setIncludeSquads(e.target.checked)}
            className="w-4 h-4 accent-amber-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
