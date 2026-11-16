import React, { useState } from 'react';
import { Player, Match, Team, PlayerStats } from '../types/cricket';
import {
  User,
  Trophy,
  Award,
  Flame,
  X,
  Shield,
  Star,
  Zap,
  Clock,
  Share2,
  Copy,
  Check,
  Edit3,
  Key,
  Camera,
  Target,
  Activity,
  Layers,
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { PlayerShareCardModal } from './PlayerShareCardModal';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  allMatches: Match[];
  teams: Team[];
  isDarkMode: boolean;
  onOpenLoginModal?: () => void;
  // When provided (only for the logged-in admin), a "Reset to 0" button
  // appears on each format card, letting the admin manually zero out just
  // that one format's stats for this player — without touching any other
  // format's numbers and without deleting any match.
  isAdmin?: boolean;
  onResetPlayerFormatStats?: (playerId: string, formatKey: 't10' | 't20' | 'club' | 'test') => void;
  // Admin only: rebuild every player's totals from all completed matches. Resolves to the
  // number of matches used (0 = could not reach the cloud, nothing changed).
  onRebuildAllStats?: () => Promise<number>;
}

type MatchFormatKey = 'all' | 't10' | 't20' | 'club' | 'test';

// A correctly zeroed-out PlayerStats object — used whenever a player has no
// recorded matches yet for a given format, so that tab honestly shows 0s
// instead of numbers borrowed/derived from a different format.
function emptyFormatStats(): PlayerStats {
  return {
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
    bowlingAverage: 0,
    threeWicketHauls: 0,
    fiveWicketHauls: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
    directRoofOuts: 0,
    momAwards: 0,
  };
}

// Not-out innings = innings batted minus innings in which the player was dismissed.
// "timesOut" is stored with the career stats; returns '-' for old records without it.
const notOutsOf = (st: PlayerStats): number | string => {
  const out = (st as any).timesOut;
  if (typeof out !== 'number') return '-';
  return Math.max(0, (st.innings || 0) - out);
};

// ---------- Small presentational helpers (look only, no data logic) ----------
const StatTile: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }> = ({
  label,
  value,
  sub,
  accent,
}) => (
  <div className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-2.5 text-center">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`mt-1 text-xl font-black font-mono leading-none ${accent || 'text-white'}`}>{value}</div>
    {sub ? <div className="mt-1 text-[10px] text-slate-500">{sub}</div> : null}
  </div>
);

const SectionCard: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5">
    <div className="flex items-baseline justify-between gap-2 mb-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>
      {hint ? <span className="text-[10px] text-slate-500">{hint}</span> : null}
    </div>
    {children}
  </div>
);

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  player,
  allMatches,
  teams,
  isDarkMode,
  onOpenLoginModal,
  isAdmin,
  onResetPlayerFormatStats,
  onRebuildAllStats,
}) => {
  const [activeTab, setActiveTab] = useState<'statistics' | 'formats' | 'overview' | 'matches' | 'teams'>('statistics');
  const [statsSubTab, setStatsSubTab] = useState<'bat' | 'bowl' | 'field' | 'matchwise'>('bat');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormatKey>('all');
  const [copiedId, setCopiedId] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState('');

  if (!isOpen) return null;

  const playerTeams = teams.filter((t) =>
    t.players.some((p) => p.id === player.id || p.profileId === player.profileId)
  );
  const primaryTeam = playerTeams[0];

  // Find matches where player participated and extract detailed performance
  const playerMatchHistory = allMatches
    .map((m) => {
      const isTeamA = m.teamA.players.some((p) => p.id === player.id) || m.playingSquadA?.includes(player.id);
      const isTeamB = m.teamB.players.some((p) => p.id === player.id) || m.playingSquadB?.includes(player.id);
      const myTeam = isTeamA ? m.teamA : isTeamB ? m.teamB : null;
      const oppTeam = isTeamA ? m.teamB : isTeamB ? m.teamA : null;

      const bat1 = m.innings1?.battingStats?.[player.id];
      const bat2 = m.innings2?.battingStats?.[player.id];
      const batStat = bat1 || bat2 || null;

      const bowl1 = m.innings1?.bowlingStats?.[player.id];
      const bowl2 = m.innings2?.bowlingStats?.[player.id];
      const bowlStat = bowl1 || bowl2 || null;

      const played = Boolean(isTeamA || isTeamB || batStat || bowlStat);
      
      // Determine format
      const matchFmt = (m.settings?.matchType || m.format || '').toLowerCase();
      let formatKey: MatchFormatKey = 't10';
      if (matchFmt.includes('test') || m.matchFormat === 'test') formatKey = 'test';
      else if (matchFmt.includes('20') || m.totalOvers >= 20) formatKey = 't20';
      else if (matchFmt.includes('club') || matchFmt.includes('terrace')) formatKey = 'club';
      else formatKey = 't10';

      return { match: m, myTeam, oppTeam, batStat, bowlStat, played, formatKey };
    })
    .filter((item) => item.played);

  // Active stats for current selected format
  const currentStats: PlayerStats = (() => {
    if (selectedFormat === 'all') return player.stats;
    // IMPORTANT: only ever show this player's REAL stats for that specific
    // format. Previously this fell back to the player's overall `stats`
    // (their combined T10/T20/Club/Test totals) whenever formatStats for the
    // selected format hadn't been recorded yet — which made the Test tab (or
    // any tab without real data) look identical to "All Formats" / other
    // formats. If there's no real data for this format, show an honest
    // zeroed-out stat line instead of borrowed numbers from another format.
    return player.formatStats?.[selectedFormat] || emptyFormatStats();
  })();

  // Filtered match history for active format
  const filteredMatches = selectedFormat === 'all'
    ? playerMatchHistory
    : playerMatchHistory.filter((pm) => pm.formatKey === selectedFormat);

  const handleCopyProfileId = () => {
    cricketAudio.playClick();
    navigator.clipboard.writeText(player.profileId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper format summary data — each format tab now shows ONLY that
  // format's real recorded stats (player.formatStats.<key>), never a
  // percentage-guess derived from the player's combined overall stats. A
  // format the player hasn't played yet correctly shows 0 matches instead of
  // a fabricated number that happened to look the same as other tabs.
  const formatBreakdownList: { key: MatchFormatKey; label: string; icon: string; stats: PlayerStats }[] = [
    { key: 't10', label: 'T10 / T6', icon: '', stats: player.formatStats?.t10 || emptyFormatStats() },
    { key: 't20', label: 'T20', icon: '', stats: player.formatStats?.t20 || emptyFormatStats() },
    { key: 'club', label: 'Club / Terrace', icon: '', stats: player.formatStats?.club || emptyFormatStats() },
    { key: 'test', label: 'Test', icon: '', stats: player.formatStats?.test || emptyFormatStats() },
  ];


  const styleLine = [player.battingStyle, player.bowlingStyle].filter(Boolean).join('  ·  ');
  const fmtName = selectedFormat === 'all' ? 'Overall' : selectedFormat === 't10' ? 'T10 / T6' : selectedFormat === 't20' ? 'T20' : selectedFormat === 'club' ? 'Club / Terrace' : 'Test';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div
          className={`w-full max-w-3xl max-h-[95vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Player Profile</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  cricketAudio.playClick('Opening full screen player card');
                  setShowShareCard(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition"
                title="Open share card"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Card</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Hero */}
            <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden ring-2 ring-emerald-500/70 ring-offset-2 ring-offset-slate-950 bg-slate-800 flex items-center justify-center text-white text-2xl font-black shrink-0">
                  {player.avatar ? (
                    <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{player.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-white truncate">{player.name}</h2>
                    {player.jerseyNumber && (
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        #{player.jerseyNumber}
                      </span>
                    )}
                    {player.profileId === 'ARCL-001' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        League Admin
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 capitalize font-medium mt-1 truncate">
                    {[player.role, primaryTeam?.name].filter(Boolean).join('  ·  ')}
                  </p>
                  {styleLine && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{styleLine}</p>}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      onClick={handleCopyProfileId}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono font-bold transition cursor-pointer"
                      title="Copy profile ID"
                    >
                      <span>{player.profileId}</span>
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                    </button>
                    {onOpenLoginModal && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenLoginModal();
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-amber-400" />
                        <span>Account / PIN</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Career summary */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <StatTile label="Matches" value={player.stats.matches} sub={`${player.stats.innings} Inns`} />
                <StatTile label="Runs" value={player.stats.runs} sub={`Avg ${player.stats.battingAverage || '-'}`} accent="text-amber-300" />
                <StatTile label="Wickets" value={player.stats.wickets} sub={`Econ ${player.stats.economy ? player.stats.economy.toFixed(1) : '-'}`} accent="text-emerald-300" />
                <StatTile label="Fielding" value={(player.stats.catches || 0) + (player.stats.runOuts || 0)} sub={`${player.stats.catches || 0} Ct · ${player.stats.runOuts || 0} RO`} />
              </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-0 z-10 flex border-b border-slate-800 bg-slate-950/95 backdrop-blur-md text-xs overflow-x-auto">
              {[
                { id: 'statistics', label: 'Career' },
                { id: 'formats', label: 'Formats' },
                { id: 'matches', label: `Matches (${playerMatchHistory.length})` },
                { id: 'teams', label: `Teams (${playerTeams.length})` },
                { id: 'overview', label: 'Info' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    cricketAudio.playClick();
                  }}
                  className={`flex-1 py-3 px-3 font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {/* CAREER */}
              {activeTab === 'statistics' && (
                <div className="space-y-4">
                  {/* Format filter */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { id: 'all', label: 'Overall' },
                      { id: 't10', label: 'T10 / T6' },
                      { id: 't20', label: 'T20' },
                      { id: 'club', label: 'Club / Terrace' },
                      { id: 'test', label: 'Test' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => {
                          setSelectedFormat(fmt.id as MatchFormatKey);
                          cricketAudio.playClick(`Viewing ${fmt.label} stats`);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                          selectedFormat === fmt.id
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['bat', 'bowl', 'field', 'matchwise'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatsSubTab(st);
                          cricketAudio.playClick();
                        }}
                        className={`flex-1 py-2 rounded-lg font-bold transition cursor-pointer ${
                          statsSubTab === st ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {st === 'bat' ? 'Batting' : st === 'bowl' ? 'Bowling' : st === 'field' ? 'Fielding' : 'Match-wise'}
                      </button>
                    ))}
                  </div>

                  {/* BATTING */}
                  {statsSubTab === 'bat' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <StatTile label="Innings" value={currentStats.innings || currentStats.matches || 0} />
                        <StatTile label="Not Outs" value={notOutsOf(currentStats)} />
                        <StatTile label="Runs" value={currentStats.runs} accent="text-amber-300" />
                        <StatTile label="Average" value={currentStats.battingAverage || '-'} accent="text-emerald-300" />
                        <StatTile label="Strike Rate" value={currentStats.strikeRate ? currentStats.strikeRate.toFixed(1) : '-'} />
                        <StatTile
                          label="Highest"
                          value={`${currentStats.highestScore}${currentStats.highestScoreNotOut ? '*' : ''}`}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 -mt-1 px-1">
                        Average = Runs ÷ times dismissed. Not Outs = innings in which the player was not dismissed.
                      </p>

                      <SectionCard title="Boundaries & Milestones" hint={fmtName}>
                        <div className="grid grid-cols-3 gap-2">
                          <StatTile label="Fours" value={currentStats.fours || 0} />
                          <StatTile label="Sixes" value={currentStats.sixes || 0} accent="text-amber-300" />
                          <StatTile label="30s" value={currentStats.thirties || 0} />
                          <StatTile label="50s" value={currentStats.fifties || 0} />
                          <StatTile label="100s" value={currentStats.centuries || 0} />
                          <StatTile label="Ducks" value={currentStats.ducks || 0} />
                        </div>
                      </SectionCard>
                    </div>
                  )}

                  {/* BOWLING */}
                  {statsSubTab === 'bowl' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatTile label="Wickets" value={currentStats.wickets} sub={`${currentStats.oversBowled || 0} Overs`} accent="text-emerald-300" />
                        <StatTile label="Economy" value={currentStats.economy ? currentStats.economy.toFixed(1) : '-'} sub="Runs / over" />
                        <StatTile label="Average" value={currentStats.bowlingAverage || '-'} sub="Runs / wicket" />
                        <StatTile label="Best" value={`${currentStats.bestBowlingWickets}/${currentStats.bestBowlingRuns}`} accent="text-amber-300" />
                      </div>
                      <SectionCard title="Milestones" hint={fmtName}>
                        <div className="grid grid-cols-3 gap-2">
                          <StatTile label="3 Wkt Hauls" value={currentStats.threeWicketHauls || 0} />
                          <StatTile label="5 Wkt Hauls" value={currentStats.fiveWicketHauls || 0} />
                          <StatTile label="Maidens" value={currentStats.maidens || 0} />
                        </div>
                      </SectionCard>
                    </div>
                  )}

                  {/* FIELDING */}
                  {statsSubTab === 'field' && (
                    <div className="grid grid-cols-3 gap-2">
                      <StatTile label="Catches" value={currentStats.catches || 0} />
                      <StatTile label="Run Outs" value={currentStats.runOuts || 0} />
                      <StatTile label="Stumpings" value={currentStats.stumpings || 0} />
                    </div>
                  )}

                  {/* MATCH-WISE */}
                  {statsSubTab === 'matchwise' && (
                    <div className="space-y-2">
                      {filteredMatches.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No match records for {fmtName}.
                        </div>
                      ) : (
                        filteredMatches.map(({ match: m, oppTeam, batStat, bowlStat }) => (
                          <div key={m.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-white truncate">vs {oppTeam?.name || 'Opponent'}</span>
                              <span className="text-[11px] text-slate-500 font-mono shrink-0">{m.date || 'Recent'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Batting</span>
                                <span className="font-bold font-mono text-white">
                                  {batStat
                                    ? `${batStat.runs}${batStat.isOut ? '' : '*'} (${batStat.balls}) · ${batStat.fours}×4 · ${batStat.sixes}×6`
                                    : 'Did not bat'}
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Bowling</span>
                                <span className="font-bold font-mono text-white">
                                  {bowlStat ? `${bowlStat.wickets}/${bowlStat.runs} (${bowlStat.overs} ov)` : 'Did not bowl'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FORMATS */}
              {activeTab === 'formats' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Format</th>
                          <th className="py-2.5 px-2 text-center">Mat</th>
                          <th className="py-2.5 px-2 text-center">Not Out</th>
                          <th className="py-2.5 px-2 text-center">Runs</th>
                          <th className="py-2.5 px-2 text-center">HS</th>
                          <th className="py-2.5 px-2 text-center">Avg</th>
                          <th className="py-2.5 px-2 text-center">SR</th>
                          <th className="py-2.5 px-2 text-center">30s</th>
                          <th className="py-2.5 px-2 text-center">50s/100s</th>
                          <th className="py-2.5 px-2 text-center">Wkts</th>
                          <th className="py-2.5 px-2 text-center">Econ</th>
                          <th className="py-2.5 px-2 text-center">Best</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                        {formatBreakdownList.map((f) => (
                          <tr key={f.key} className="hover:bg-slate-900/60 transition">
                            <td className="py-2.5 px-3 font-sans font-bold text-white">{f.label}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{f.stats.matches}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{notOutsOf(f.stats)}</td>
                            <td className="py-2.5 px-2 text-center text-amber-300 font-bold">{f.stats.runs}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.highestScore}{f.stats.highestScoreNotOut ? '*' : ''}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.battingAverage || '-'}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.strikeRate ? f.stats.strikeRate.toFixed(1) : '-'}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.thirties || 0}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.fifties || 0}/{f.stats.centuries || 0}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-300 font-bold">{f.stats.wickets}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.economy ? f.stats.economy.toFixed(1) : '-'}</td>
                            <td className="py-2.5 px-2 text-center text-slate-200">{f.stats.bestBowlingWickets}/{f.stats.bestBowlingRuns}</td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-950/20 font-black border-t-2 border-slate-700">
                          <td className="py-3 px-3 font-sans text-emerald-400">Total Career</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.matches}</td>
                          <td className="py-3 px-2 text-center text-white">{notOutsOf(player.stats)}</td>
                          <td className="py-3 px-2 text-center text-amber-300">{player.stats.runs}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.highestScore}{player.stats.highestScoreNotOut ? '*' : ''}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.battingAverage || '-'}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.strikeRate ? player.stats.strikeRate.toFixed(1) : '-'}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.thirties || 0}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.fifties || 0}/{player.stats.centuries || 0}</td>
                          <td className="py-3 px-2 text-center text-emerald-300">{player.stats.wickets}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.economy ? player.stats.economy.toFixed(1) : '-'}</td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.bestBowlingWickets}/{player.stats.bestBowlingRuns}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formatBreakdownList.map((f) => (
                      <div key={f.key} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{f.label}</span>
                          <span className="text-[11px] font-mono text-slate-400">{f.stats.matches} Matches</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <StatTile label="Runs" value={f.stats.runs} sub={`Avg ${f.stats.battingAverage || '-'}`} accent="text-amber-300" />
                          <StatTile label="HS" value={`${f.stats.highestScore}${f.stats.highestScoreNotOut ? '*' : ''}`} sub={`SR ${f.stats.strikeRate ? f.stats.strikeRate.toFixed(0) : '-'}`} />
                          <StatTile label="Wkts" value={f.stats.wickets} sub={`Econ ${f.stats.economy ? f.stats.economy.toFixed(1) : '-'}`} accent="text-emerald-300" />
                        </div>
                        {isAdmin && onResetPlayerFormatStats && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Reset ${player.name}'s ${f.label} stats to 0? Other formats (including Test) are not affected. This cannot be undone.`)) {
                                onResetPlayerFormatStats(player.id, f.key as 't10' | 't20' | 'club' | 'test');
                              }
                            }}
                            className="w-full py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[10px] font-bold uppercase tracking-wide hover:bg-rose-900/40 cursor-pointer"
                          >
                            Reset {f.label} to 0
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MATCHES */}
              {activeTab === 'matches' && (
                <div className="space-y-2">
                  {playerMatchHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No recorded match appearances yet.</div>
                  ) : (
                    playerMatchHistory.map(({ match: m }) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">
                            {m.teamA.name} vs {m.teamB.name}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {[m.venue, m.date].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            m.status === 'live'
                              ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                              : 'text-slate-300 bg-slate-800/60 border-slate-700'
                          }`}
                        >
                          {m.status === 'live' ? 'Live' : 'Completed'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TEAMS */}
              {activeTab === 'teams' && (
                <div className="space-y-2">
                  {playerTeams.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">Not registered in any team squad.</div>
                  ) : (
                    playerTeams.map((t) => (
                      <div key={t.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {t.logoIcon || '🛡️'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">{t.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{t.players.length} players</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* INFO */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  <SectionCard title="Player Information">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Playing Role</span>
                        <span className="font-bold text-white capitalize">{player.role || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Batting Style</span>
                        <span className="font-bold text-white">{player.battingStyle || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bowling Style</span>
                        <span className="font-bold text-white">{player.bowlingStyle || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Appearances</span>
                        <span className="font-bold text-white font-mono">{player.stats.matches} Matches</span>
                      </div>
                    </div>
                  </SectionCard>

                  {isAdmin && onRebuildAllStats && (
                    <SectionCard title="Admin" hint="All players">
                      <p className="text-[11px] text-slate-400 mb-2.5">
                        If totals look lower than the matches played, this recalculates every player's career
                        (Overall, T10, T20, Club, Test) from all completed matches saved in the cloud.
                      </p>
                      <button
                        type="button"
                        disabled={rebuilding}
                        onClick={async () => {
                          if (!window.confirm('Sabhi players ke stats saare completed matches se dobara banenge. Karein?')) return;
                          setRebuilding(true);
                          setRebuildMsg('');
                          try {
                            const n = await onRebuildAllStats();
                            setRebuildMsg(n > 0 ? `Done: ${n} matches se sabhi players ke stats dobara bane.` : 'Cloud se matches nahi mile, kuch change nahi hua.');
                          } catch (e) {
                            setRebuildMsg('Kuch gadbad hui, stats change nahi hue.');
                          } finally {
                            setRebuilding(false);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                      >
                        {rebuilding ? 'Rebuilding...' : 'Rebuild all player stats'}
                      </button>
                      {rebuildMsg && <p className="text-[11px] text-emerald-400 mt-2">{rebuildMsg}</p>}
                    </SectionCard>
                  )}

                  <SectionCard title="Player ID">
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-bold text-emerald-400">{player.profileId}</span>
                      <button
                        onClick={handleCopyProfileId}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showShareCard && (
        <PlayerShareCardModal
          isOpen={showShareCard}
          onClose={() => setShowShareCard(false)}
          player={player}
          team={primaryTeam}
        />
      )}
    </>
  );
};
