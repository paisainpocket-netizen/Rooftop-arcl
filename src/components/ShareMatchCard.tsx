import React, { useState } from 'react';
import { Match } from '../types/cricket';
import { Share2, Copy, Check, X, Download, Sparkles } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface ShareMatchCardProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

// ---- Small canvas drawing helpers (poster look & feel lives here) --------

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = (hex || '#10b981').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [16, 185, 129];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Simple flat Instagram-style glyph, drawn with primitives (no image asset
// needed, so this stays 100% client-side / zero KB).
const drawInstagramIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size * 0.78, y + size * 0.22, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// Card with a soft drop shadow + rounded corners — used for every panel on
// the poster so score rows, squad boxes etc. all share one elevated style.
const drawElevatedPanel = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, radius: number,
  fill: string,
  shadowColor = 'rgba(0,0,0,0.45)'
) => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
};

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

    text += `\n📸 Follow @amritsarrooftopcricket\nScored live on Amritsar Rooftop Cricket League App! 🏏`;
    return text;
  };

  const handleCopy = () => {
    cricketAudio.playClick();
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Pure Client-Side HTML5 Canvas Poster (0 KB Firebase data/storage) —
  // redesigned for a cleaner, more premium broadcast look: team-color
  // accents pulled from each team's own color, soft card shadows instead of
  // flat borders everywhere, a tighter type scale, and an Instagram handle
  // in the footer for branding.
  const drawPosterCanvas = (): HTMLCanvasElement => {
    const W = 1080;
    const H = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const teamAColor = match.teamA.color || '#f59e0b';
    const teamBColor = match.teamB.color || '#38bdf8';

    // ---- Background: deep charcoal with dual team-color ambient glow ----
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);

    const glowA = ctx.createRadialGradient(180, 0, 40, 180, 0, 620);
    glowA.addColorStop(0, rgba(teamAColor, 0.28));
    glowA.addColorStop(1, 'transparent');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, W, 700);

    const glowB = ctx.createRadialGradient(W - 180, 60, 40, W - 180, 60, 620);
    glowB.addColorStop(0, rgba(teamBColor, 0.22));
    glowB.addColorStop(1, 'transparent');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, W, 700);

    // Subtle bottom vignette so the footer sits on a calm, readable base
    const bottomFade = ctx.createLinearGradient(0, H - 260, 0, H);
    bottomFade.addColorStop(0, 'transparent');
    bottomFade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, H - 260, W, 260);

    // Hairline outer frame — thin, not the heavy gold box from before
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    let y = 108;

    // ---- Brand row ----
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 26px sans-serif';
    ctx.save();
    ctx.letterSpacing = '4px';
    ctx.fillText('AMRITSAR ROOFTOP CRICKET LEAGUE', W / 2, y);
    ctx.restore();

    y += 40;
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 22px sans-serif';
    ctx.fillText((match.tournamentName || match.name || 'ROOFTOP CHAMPIONSHIP').toUpperCase(), W / 2, y);

    // ---- Status pill ----
    y += 58;
    const isLive = match.status === 'live';
    const pillText = isScheduled ? 'UPCOMING FIXTURE' : isLive ? 'LIVE' : 'MATCH RESULT';
    const pillColor = isScheduled ? '#d97706' : isLive ? '#e11d48' : '#059669';
    ctx.font = '900 20px sans-serif';
    const pillPadX = 34;
    const pillW = ctx.measureText(pillText).width + pillPadX * 2 + (isLive ? 26 : 0);
    const pillH = 52;
    const pillX = W / 2 - pillW / 2;
    drawElevatedPanel(ctx, pillX, y - pillH / 2, pillW, pillH, pillH / 2, pillColor, rgba(pillColor, 0.4));
    if (isLive) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pillX + 30, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.fillText(pillText, W / 2 + (isLive ? 13 : 0), y + 7);

    // ---- Team badges + VS ----
    y += 100;
    const badgeR = 62;
    const leftCx = 240;
    const rightCx = W - 240;

    const drawBadge = (cx: number, cy: number, color: string, initials: string) => {
      const grad = ctx.createLinearGradient(cx - badgeR, cy - badgeR, cx + badgeR, cy + badgeR);
      grad.addColorStop(0, rgba(color, 1));
      grad.addColorStop(1, rgba(color, 0.6));
      ctx.save();
      ctx.shadowColor = rgba(color, 0.55);
      ctx.shadowBlur = 30;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#05070d';
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(initials.slice(0, 3).toUpperCase(), cx, cy + 16);
    };

    drawBadge(leftCx, y, teamAColor, match.teamA.shortName || match.teamA.name.slice(0, 3));
    drawBadge(rightCx, y, teamBColor, match.teamB.shortName || match.teamB.name.slice(0, 3));

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '900 26px sans-serif';
    ctx.fillText('VS', W / 2, y + 10);

    y += badgeR + 46;
    ctx.font = '900 32px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    // Wrap long team names into the left/right columns instead of one
    // centered line, so long names don't collide with "VS".
    const drawTeamName = (cx: number, name: string) => {
      ctx.font = '900 30px sans-serif';
      const maxW = 340;
      let display = name.toUpperCase();
      while (ctx.measureText(display).width > maxW && display.length > 4) {
        display = display.slice(0, -1);
      }
      if (display !== name.toUpperCase()) display = display.trim() + '…';
      ctx.fillText(display, cx, y);
    };
    drawTeamName(leftCx, match.teamA.name);
    drawTeamName(rightCx, match.teamB.name);

    y += 28;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px sans-serif';
    ctx.fillText(`${match.totalOvers} Overs • Rooftop Turf Rules`, W / 2, y);

    y += 56;

    if (isScheduled) {
      // ---- SCHEDULED: squads, two elevated panels ----
      const panelY = y;
      const panelH = 660;
      const panelW = 464;
      const gap = 32;
      const leftX = W / 2 - gap / 2 - panelW;
      const rightX = W / 2 + gap / 2;

      [
        { x: leftX, color: teamAColor, name: match.teamA.name, names: squadANames },
        { x: rightX, color: teamBColor, name: match.teamB.name, names: squadBNames },
      ].forEach(({ x, color, name, names }) => {
        drawElevatedPanel(ctx, x, panelY, panelW, panelH, 26, 'rgba(15,23,42,0.9)');
        // Color accent strip at top of panel
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, panelY, panelW, 8, [26, 26, 0, 0]);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.font = '900 26px sans-serif';
        ctx.fillText(name.toUpperCase(), x + panelW / 2, panelY + 56);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 18px sans-serif';
        ctx.fillText(`${names.length} Player${names.length === 1 ? '' : 's'}`, x + panelW / 2, panelY + 84);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 21px sans-serif';
        names.slice(0, 13).forEach((n, i) => {
          ctx.fillText(`${i + 1}.  ${n}`, x + 32, panelY + 132 + i * 41);
        });
      });

      y = panelY + panelH + 60;
    } else {
      // ---- LIVE / COMPLETED: two elevated score rows ----
      const isTestMatch = match.matchFormat === 'test' || match.settings?.matchType?.includes('Test');
      const inn1 = match.innings1;
      const inn2 = match.innings2;
      const inn3 = match.innings3;
      const inn4 = match.innings4;
      const winnerId = match.result?.winnerTeamId;

      const rowH = 176;
      const rowW = W - 200;
      const rowX = 100;

      const scoreRow = (
        rowY: number,
        color: string,
        inn: typeof inn1,
        fallbackName: string,
        teamId: string,
        secondInnings: typeof inn3
      ) => {
        const isWinner = winnerId && winnerId === teamId;
        drawElevatedPanel(
          ctx, rowX, rowY, rowW, rowH, 26,
          isWinner ? rgba('#f59e0b', 0.12) : 'rgba(15,23,42,0.9)',
          isWinner ? rgba('#f59e0b', 0.35) : 'rgba(0,0,0,0.4)'
        );
        if (isWinner) {
          ctx.strokeStyle = 'rgba(245,158,11,0.6)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(rowX, rowY, rowW, rowH, 26);
          ctx.stroke();
        }
        // Team color accent strip on the left edge
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(rowX, rowY, 10, rowH, [26, 0, 0, 26]);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.font = '900 38px sans-serif';
        const teamLabel = (inn ? inn.teamName : fallbackName).toUpperCase();
        ctx.fillText(isWinner ? `🏆 ${teamLabel}` : teamLabel, rowX + 46, rowY + 68);

        ctx.textAlign = 'right';
        if (isTestMatch) {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '900 30px monospace';
          const first = inn ? `${inn.totalRuns}/${inn.totalWickets}` : '0/0';
          ctx.fillText(`1st: ${first}`, rowX + rowW - 40, rowY + 60);
          if (secondInnings) {
            ctx.fillStyle = rgba(color, 1);
            ctx.font = '900 30px monospace';
            ctx.fillText(`2nd: ${secondInnings.totalRuns}/${secondInnings.totalWickets}`, rowX + rowW - 40, rowY + 104);
          }
        } else {
          ctx.fillStyle = rgba(color, 1);
          ctx.font = '900 54px monospace';
          ctx.fillText(inn ? `${inn.totalRuns}/${inn.totalWickets}` : 'Yet to Bat', rowX + rowW - 40, rowY + 68);
          if (inn) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '700 22px sans-serif';
            ctx.fillText(`(${inn.oversCompleted}.${inn.ballsInCurrentOver} / ${match.totalOvers} ov)`, rowX + rowW - 40, rowY + 104);
          }
        }
      };

      scoreRow(y, teamAColor, inn1, match.teamA.name, match.teamA.id, match.currentInningsNumber >= 3 ? inn3 : undefined);
      y += rowH + 24;
      scoreRow(y, teamBColor, inn2, match.teamB.name, match.teamB.id, match.currentInningsNumber >= 4 ? inn4 : undefined);
      y += rowH + 40;

      // ---- Result / status banner ----
      const bannerH = match.result?.playerOfTheMatch ? 170 : 122;
      drawElevatedPanel(ctx, rowX, y, rowW, bannerH, 24, 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.25)');
      ctx.strokeStyle = 'rgba(245,158,11,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rowX, y, rowW, bannerH, 24);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 30px sans-serif';
      const resultSummary = match.result?.summary || (isLive ? 'Match in progress on rooftop arena!' : 'Match Scheduled');
      ctx.fillText(`🏆 ${resultSummary}`, W / 2, y + 54);

      if (match.result?.playerOfTheMatch) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 24px sans-serif';
        ctx.fillText(`⭐ Player of the Match: ${match.result.playerOfTheMatch.playerName}`, W / 2, y + 100);
      }

      y += bannerH + 44;
    }

    // ---- Venue / date ----
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(`📍 ${match.venue || 'Rooftop Arena'}   •   📅 ${match.date || '2026 Season'}`, W / 2, Math.min(y, H - 150));

    // ---- Footer: divider + Instagram handle + app credit ----
    const footerY = H - 96;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 200, footerY - 34);
    ctx.lineTo(W / 2 + 200, footerY - 34);
    ctx.stroke();

    ctx.font = '900 26px sans-serif';
    const igText = '@amritsarrooftopcricket';
    const igIconSize = 30;
    const igGap = 12;
    const igTextW = ctx.measureText(igText).width;
    const igTotalW = igIconSize + igGap + igTextW;
    const igStartX = W / 2 - igTotalW / 2;
    drawInstagramIcon(ctx, igStartX, footerY - igIconSize / 2 - 2, igIconSize, '#f8fafc');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(igText, igStartX + igIconSize + igGap, footerY + 9);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('ARCL ROOFTOP LEAGUE • OFFICIAL DIGITAL SCORECARD', W / 2, footerY + 44);

    return canvas;
  };

   const handleSharePoster = async () => {
    try {
      setIsGenerating(true);
      cricketAudio.playClick();
      
      const canvas = drawPosterCanvas();
      
      // Synchronous toDataURL taaki mobile Web Share API click token na khoye
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ARCL_Fixture_${match.id}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${match.teamA.name} vs ${match.teamB.name}`,
          text: generateWhatsAppText(),
        });
      } else {
        // Fallback for browsers that don't support sharing files
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ARCL_${match.teamA.name}_vs_${match.teamB.name}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error("Error sharing poster:", e);
      if (e?.name !== 'AbortError') {
        alert("Share cancel ho gaya ya fail ho gaya. Aap 'Save Poster' karke direct gallery se share kar sakte hain.");
      }
    } finally {
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
