import React from 'react';

// Small achievement badges shown on a player's profile.
// Worked out from the player's saved career stats, so it reads nothing from Firebase.

const n = (v: any): number => (typeof v === 'number' && isFinite(v) ? v : 0);

interface Badge {
  icon: string;
  title: string;
  note: string;
  tone: string; // tailwind classes
}

export function earnedBadges(stats: any): Badge[] {
  const s = stats || {};
  const out: Badge[] = [];
  const gold = 'bg-amber-500/15 border-amber-500/40 text-amber-200';
  const green = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200';
  const blue = 'bg-sky-500/15 border-sky-500/40 text-sky-200';
  const purple = 'bg-violet-500/15 border-violet-500/40 text-violet-200';
  const orange = 'bg-orange-500/15 border-orange-500/40 text-orange-200';

  const centuries = n(s.centuries);
  if (centuries >= 1) out.push({ icon: '💯', title: 'Century Club', note: `${centuries} century${centuries === 1 ? '' : 'ies'}`, tone: gold });

  const fifties = n(s.fifties);
  if (fifties >= 5) out.push({ icon: '🔥', title: 'Fifty Maker', note: `${fifties} fifties`, tone: orange });

  const runs = n(s.runs);
  if (runs >= 1000) out.push({ icon: '🏏', title: '1000 Runs Club', note: `${runs} runs`, tone: gold });
  else if (runs >= 500) out.push({ icon: '🏏', title: '500 Runs Club', note: `${runs} runs`, tone: green });

  const sixes = n(s.sixes);
  if (sixes >= 50) out.push({ icon: '🚀', title: 'Six Machine', note: `${sixes} sixes`, tone: orange });
  else if (sixes >= 20) out.push({ icon: '🚀', title: 'Big Hitter', note: `${sixes} sixes`, tone: orange });

  const wickets = n(s.wickets);
  if (wickets >= 25) out.push({ icon: '🎯', title: 'Wicket Hunter', note: `${wickets} wickets`, tone: purple });
  else if (wickets >= 10) out.push({ icon: '🎯', title: 'Wicket Taker', note: `${wickets} wickets`, tone: purple });

  const five = n(s.fiveWicketHauls);
  if (five >= 1) out.push({ icon: '🖐️', title: 'Five-Wicket Haul', note: `${five} time${five === 1 ? '' : 's'}`, tone: purple });

  const catches = n(s.catches);
  if (catches >= 10) out.push({ icon: '🧤', title: 'Safe Hands', note: `${catches} catches`, tone: blue });

  if (runs >= 300 && wickets >= 15) out.push({ icon: '⚡', title: 'All-Rounder', note: `${runs} runs · ${wickets} wkts`, tone: green });

  const matches = n(s.matches);
  if (matches >= 50) out.push({ icon: '🛡️', title: 'Veteran', note: `${matches} matches`, tone: blue });
  else if (matches >= 20) out.push({ icon: '🛡️', title: 'Regular', note: `${matches} matches`, tone: blue });

  return out;
}

export const PlayerBadges: React.FC<{ stats: any }> = ({ stats }) => {
  const badges = earnedBadges(stats);
  if (badges.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">Badges</div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <div
            key={b.title}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-black ${b.tone}`}
          >
            <span className="text-sm leading-none">{b.icon}</span>
            <span className="leading-tight">
              {b.title}
              <span className="block text-[9px] font-semibold opacity-70">{b.note}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
