import React, { useState } from 'react';
import { Match } from '../types/cricket';
import { Share2, Copy, Check, X, Trophy } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface ShareMatchCardProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

export const ShareMatchCard: React.FC<ShareMatchCardProps> = ({ isOpen, onClose, match }) => {
  const [copied, setCopied] = useState(false);
  // Lets the person choose whether to include the Playing XI/squad lists in
  // the shared message — defaults to on since sharing squads (whatever size
  // was actually saved for this match) was the main ask.
  const [includeSquads, setIncludeSquads] = useState(true);

  if (!isOpen) return null;

  // Builds a squad list from whatever players were actually saved as the
  // playing squad for this match — 5, 7, 11, whatever the real saved count
  // is. Never assumes or pads to a fixed number.
  const getSquadNames = (squadIds: string[] | undefined, teamPlayers: typeof match.teamA.players): string[] => {
    if (!squadIds || squadIds.length === 0) return [];
    return squadIds
      .map((id) => teamPlayers.find((p) => p.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  };

  const generateWhatsAppText = () => {
    const isLive = match.status === 'live';
    const isCompleted = match.status === 'completed';
    const inningsOrdinals = ['1st', '2nd', '3rd', '4th'];

    let text = `🏏 *ARCL Rooftop Cricket League*\n`;
    text += `🏆 *${match.name}*\n`;
    text += `📍 ${match.venue}\n\n`;

    // Include every innings that has actually been reached — up to 4 for a
    // Test match, not just the first two. While live, only show innings up
    // to the current one; once completed, show every innings that exists.
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

    if (includeSquads) {
      const squadA = getSquadNames(match.playingSquadA, match.teamA.players);
      const squadB = getSquadNames(match.playingSquadB, match.teamB.players);
      if (squadA.length > 0 || squadB.length > 0) {
        text += `\n👥 *Playing Squads*\n`;
        if (squadA.length > 0) {
          text += `*${match.teamA.name}* (${squadA.length}): ${squadA.join(', ')}\n`;
        }
        if (squadB.length > 0) {
          text += `*${match.teamB.name}* (${squadB.length}): ${squadB.join(', ')}\n`;
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl">
              📤
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Share Match Score</h2>
              <p className="text-xs text-slate-400">Copy formatted text for WhatsApp & social groups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Scorecard Preview Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/30 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between font-sans">
            <span className="text-[11px] font-black uppercase text-emerald-400">
              🏏 ARCL Live Rooftop Score
            </span>
            <span className="text-[10px] text-slate-400">{match.date}</span>
          </div>

          <div className="font-sans font-black text-sm text-white">
            {match.teamA.name} vs {match.teamB.name}
          </div>

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
          </div>

          {match.result && (
            <div className="pt-2 border-t border-slate-800 font-sans font-bold text-amber-300 text-[11px]">
              🏆 {match.result.summary}
            </div>
          )}
        </div>

        {/* Include Playing XI toggle */}
        <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
          <span className="text-xs font-bold text-slate-200">
            👥 Include Playing Squads ({(match.playingSquadA?.length || 0)} + {(match.playingSquadB?.length || 0)} players)
          </span>
          <input
            type="checkbox"
            checked={includeSquads}
            onChange={(e) => setIncludeSquads(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer"
          />
        </label>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied WhatsApp Message!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Score for WhatsApp</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
