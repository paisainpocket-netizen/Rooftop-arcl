import React, { useRef, useState } from 'react';
import { Player, Team } from '../types/cricket';
import { X, Camera, Award, Trophy, Sparkles, Shield, Flame, Target } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface PlayerShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  team?: Team;
}

export const PlayerShareCardModal: React.FC<PlayerShareCardModalProps> = ({
  isOpen,
  onClose,
  player,
  team,
}) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const stats = player.stats || {
    matches: 0,
    innings: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    thirties: 0,
    fifties: 0,
    centuries: 0,
    ducks: 0,
    highestScore: 0,
    highestScoreNotOut: false,
    strikeRate: 0,
    battingAverage: 0,
    oversBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    economy: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
    momAwards: 0,
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center space-y-3">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between px-2 text-white">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
            <Camera className="w-4 h-4" />
            <span>📸 Official Player Card</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Official Screenshot Player Card (Fits 100% in viewport without scroll) */}
        <div
          ref={cardRef}
          className="w-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-emerald-500/50 shadow-2xl p-4 text-white relative overflow-hidden space-y-3"
        >
          {/* Subtle Background Watermark */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-36 h-36 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

          {/* Card Header: League Brand & ID */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center text-sm font-black shadow-md">
                🏏
              </div>
              <div>
                <span className="font-black text-xs tracking-tight text-white block">
                  ARCL AMRITSAR
                </span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold tracking-wider">
                  ROOFTOP CRICKET LEAGUE
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-black text-xs block">
                {player.profileId || player.id}
              </span>
            </div>
          </div>

          {/* Player Photo + Name Section */}
          <div className="flex items-center gap-3.5 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-800 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg">
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span>{player.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base text-white truncate">{player.name}</h3>
                {player.jerseyNumber && (
                  <span className="text-amber-400 font-mono font-black text-xs">
                    #{player.jerseyNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wide">
                {player.role} • {player.battingStyle.includes('Right') ? 'RHB' : 'LHB'}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium truncate">
                {team ? `Team: ${team.name}` : 'Free Agent'}
              </p>
            </div>
          </div>

          {/* Key Milestones Ribbon: 30s, 50s, 100s, Ducks */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded-xl bg-slate-900 border border-amber-500/30">
              <span className="text-[9px] text-amber-400 font-bold block uppercase">30s (Terrace)</span>
              <span className="text-sm font-black font-mono text-white">{stats.thirties || 0}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-900 border border-emerald-500/30">
              <span className="text-[9px] text-emerald-400 font-bold block uppercase">50s (Fifties)</span>
              <span className="text-sm font-black font-mono text-white">{stats.fifties || 0}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-900 border border-purple-500/30">
              <span className="text-[9px] text-purple-400 font-bold block uppercase">100s (Tons)</span>
              <span className="text-sm font-black font-mono text-white">{stats.centuries || 0}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-900 border border-rose-500/30">
              <span className="text-[9px] text-rose-400 font-bold block uppercase">Ducks (0s)</span>
              <span className="text-sm font-black font-mono text-white">{stats.ducks || 0}</span>
            </div>
          </div>

          {/* Main Batting Stats */}
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-1">
              <span>🏏 Batting Record</span>
              <span>{stats.matches} Matches • {stats.innings} Innings</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block">RUNS</span>
                <span className="text-sm font-black text-white">{stats.runs}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">HS</span>
                <span className="text-sm font-black text-emerald-400">
                  {stats.highestScore}{stats.highestScoreNotOut ? '*' : ''}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">S/R</span>
                <span className="text-sm font-black text-amber-400">
                  {stats.strikeRate ? stats.strikeRate.toFixed(1) : '0.0'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">4s / 6s</span>
                <span className="text-xs font-black text-purple-400">
                  {stats.fours}/{stats.sixes}
                </span>
              </div>
            </div>
          </div>

          {/* Main Bowling & Fielding Stats */}
          <div className="grid grid-cols-2 gap-2">
            {/* Bowling */}
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 block border-b border-slate-800 pb-1">
                🎯 Bowling
              </span>
              <div className="grid grid-cols-2 gap-1 text-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block">WKTS</span>
                  <span className="text-xs font-black text-white">{stats.wickets}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">ECON</span>
                  <span className="text-xs font-black text-emerald-400">
                    {stats.economy ? stats.economy.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">MDNS</span>
                  <span className="text-xs font-black text-white">{stats.maidens}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">BEST</span>
                  <span className="text-xs font-black text-amber-400">
                    {stats.bestBowlingWickets > 0 ? `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fielding & Awards */}
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 block border-b border-slate-800 pb-1">
                🧤 Fielding & MVP
              </span>
              <div className="grid grid-cols-2 gap-1 text-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block">CATCHES</span>
                  <span className="text-xs font-black text-white">{stats.catches || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">RUN OUTS</span>
                  <span className="text-xs font-black text-white">{stats.runOuts || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">ROOF OUTS</span>
                  <span className="text-xs font-black text-rose-400">{stats.directRoofOuts || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">POTM 🏆</span>
                  <span className="text-xs font-black text-amber-400">{stats.momAwards || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-1 border-t border-slate-800 text-[9px] text-slate-500 font-mono">
            ARCL Amritsar • Verified Club Profile • {new Date().getFullYear()}
          </div>
        </div>

        {/* Screenshot / Share Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(
                  `🏏 ${player.name} (ARCL ID: ${player.profileId})\nRuns: ${stats.runs} | HS: ${stats.highestScore} | Wickets: ${stats.wickets} | 50s: ${stats.fifties || 0} | 30s: ${stats.thirties || 0}\nTracked on ARCL Rooftop Cricket League!`
                );
                setCopied(true);
                cricketAudio.playClick('Player stats copied to clipboard');
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs cursor-pointer text-center"
          >
            {copied ? '✓ Stats Copied!' : 'Copy Stats Text'}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer text-center shadow-lg shadow-emerald-600/30"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
