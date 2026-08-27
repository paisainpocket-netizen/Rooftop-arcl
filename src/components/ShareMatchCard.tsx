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

  if (!isOpen) return null;

  const generateWhatsAppText = () => {
    const isLive = match.status === 'live';
    const inn1 = match.innings1;
    const inn2 = match.innings2;

    let text = `🏏 *ARCL Rooftop Cricket League*\n`;
    text += `🏆 *${match.name}*\n`;
    text += `📍 ${match.venue}\n\n`;
    text += `📊 *1st Innings*: ${inn1.teamName} ${inn1.totalRuns}/${inn1.totalWickets} (${inn1.oversCompleted}.${inn1.ballsInCurrentOver}/${match.totalOvers} ov)\n`;

    if (match.currentInningsNumber === 2 || match.status === 'completed') {
      text += `📊 *2nd Innings*: ${inn2.teamName} ${inn2.totalRuns}/${inn2.totalWickets} (${inn2.oversCompleted}.${inn2.ballsInCurrentOver}/${match.totalOvers} ov)\n`;
    }

    if (match.result) {
      text += `\n🎉 *Result*: ${match.result.summary}\n`;
    } else if (isLive) {
      text += `\n🔴 *Match Status*: Live in progress!\n`;
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
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-sans">{match.innings1.teamName}:</span>
              <span className="font-black text-emerald-400">
                {match.innings1.totalRuns}/{match.innings1.totalWickets} ({match.innings1.oversCompleted}.{match.innings1.ballsInCurrentOver} ov)
              </span>
            </div>

            {match.currentInningsNumber === 2 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">{match.innings2.teamName}:</span>
                <span className="font-black text-cyan-400">
                  {match.innings2.totalRuns}/{match.innings2.totalWickets} ({match.innings2.oversCompleted}.{match.innings2.ballsInCurrentOver} ov)
                </span>
              </div>
            )}
          </div>

          {match.result && (
            <div className="pt-2 border-t border-slate-800 font-sans font-bold text-amber-300 text-[11px]">
              🏆 {match.result.summary}
            </div>
          )}
        </div>

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
