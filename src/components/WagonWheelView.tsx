import React, { useState } from 'react';
import { BallOutcome, ShotZone } from '../types/cricket';
import { Target, Filter, Sparkles } from 'lucide-react';

interface WagonWheelViewProps {
  balls: BallOutcome[];
  batterId?: string;
  batterName?: string;
  isDarkMode?: boolean;
}

const ZONE_ANGLES: Record<ShotZone, number> = {
  straight: 0,
  long_on: 45,
  mid_wicket: 90,
  square_leg: 135,
  fine_leg: 180,
  third_man: 225,
  point: 270,
  cover: 315,
  long_off: 340,
};

export const WagonWheelView: React.FC<WagonWheelViewProps> = ({
  balls,
  batterId,
  batterName,
  isDarkMode = true,
}) => {
  const [filter, setFilter] = useState<'all' | 'boundaries' | 'sixes' | 'fours' | 'singles'>('all');

  // Filter balls
  const relevantBalls = balls.filter((b) => {
    if (batterId && b.strikerId !== batterId) return false;
    if (filter === 'sixes') return b.isSix;
    if (filter === 'fours') return b.isFour;
    if (filter === 'boundaries') return b.isFour || b.isSix;
    if (filter === 'singles') return b.runsBat === 1 || b.runsBat === 2 || b.runsBat === 3;
    return b.runsBat > 0 || b.isWicket;
  });

  const totalRuns = relevantBalls.reduce((acc, b) => acc + b.runsBat, 0);
  const totalSixes = relevantBalls.filter((b) => b.isSix).length;
  const totalFours = relevantBalls.filter((b) => b.isFour).length;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl space-y-4 ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white">
              {batterName ? `${batterName}'s Wagon Wheel` : 'Match Shot Wagon Wheel'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {relevantBalls.length} Shots Plotted • {totalRuns} Runs ({totalFours}x4, {totalSixes}x6)
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
          {(['all', 'boundaries', 'sixes', 'fours', 'singles'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                filter === f
                  ? 'bg-emerald-600 text-white font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Wagon Wheel */}
      <div className="relative w-full max-w-[320px] aspect-square mx-auto flex items-center justify-center">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Ground Outfield */}
          <circle cx="150" cy="150" r="140" fill="#064e3b" stroke="#10b981" strokeWidth="3" opacity="0.8" />
          
          {/* Inner 30-yard Ring */}
          <circle cx="150" cy="150" r="85" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          
          {/* Pitch */}
          <rect x="144" y="130" width="12" height="40" rx="2" fill="#d97706" opacity="0.9" />
          <line x1="144" y1="135" x2="156" y2="135" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="144" y1="165" x2="156" y2="165" stroke="#ffffff" strokeWidth="1.5" />

          {/* Sector Guideline Rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x2 = 150 + 138 * Math.cos(rad);
            const y2 = 150 + 138 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1="150"
                y1="150"
                x2={x2}
                y2={y2}
                stroke="#ffffff"
                strokeWidth="0.5"
                strokeOpacity="0.15"
              />
            );
          })}

          {/* Shot Rays */}
          {relevantBalls.map((b, idx) => {
            const defaultZone: ShotZone = b.isSix ? 'mid_wicket' : b.isFour ? 'cover' : 'straight';
            const zone = b.shotZone || defaultZone;
            const baseAngle = ZONE_ANGLES[zone] || 0;
            // Add subtle random jitter (+- 15 degrees) so multiple shots in same zone don't overlap completely
            const jitter = ((idx * 17) % 30) - 15;
            const angle = baseAngle + jitter;
            const rad = ((angle - 90) * Math.PI) / 180;

            const distanceRadius = b.isSix ? 138 : b.isFour ? 132 : b.runsBat >= 2 ? 100 : 75;
            const x2 = 150 + distanceRadius * Math.cos(rad);
            const y2 = 150 + distanceRadius * Math.sin(rad);

            let strokeColor = '#06b6d4'; // 1-2 runs (cyan)
            if (b.isSix) strokeColor = '#a855f7'; // six (purple)
            else if (b.isFour) strokeColor = '#10b981'; // four (emerald)
            else if (b.isWicket) strokeColor = '#f43f5e'; // wicket (rose)

            return (
              <g key={b.id || idx}>
                <line
                  x1="150"
                  y1="150"
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={b.isSix ? 2.5 : b.isFour ? 2 : 1.2}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={b.isSix ? 4.5 : b.isFour ? 3.5 : 2}
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}

          {/* Field Labels */}
          <text x="150" y="24" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">Straight</text>
          <text x="270" y="153" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">Mid Wicket</text>
          <text x="150" y="285" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">Fine Leg</text>
          <text x="30" y="153" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">Cover</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-300">6s (Sixes)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">4s (Fours)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">1s & 2s (Singles)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-300">Wickets</span>
        </div>
      </div>
    </div>
  );
};
