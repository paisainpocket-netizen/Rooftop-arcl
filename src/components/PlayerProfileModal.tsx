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

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  player,
  allMatches,
  teams,
  isDarkMode,
  onOpenLoginModal,
}) => {
  const [activeTab, setActiveTab] = useState<'statistics' | 'formats' | 'overview' | 'matches' | 'teams'>('statistics');
  const [statsSubTab, setStatsSubTab] = useState<'bat' | 'bowl' | 'field' | 'matchwise'>('bat');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormatKey>('all');
  const [copiedId, setCopiedId] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

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
    { key: 't10', label: 'T10 / T6 Rooftop', icon: '⚡', stats: player.formatStats?.t10 || emptyFormatStats() },
    { key: 't20', label: 'T20 (20 Overs)', icon: '🏏', stats: player.formatStats?.t20 || emptyFormatStats() },
    { key: 'club', label: 'Club & Terrace', icon: '🏠', stats: player.formatStats?.club || emptyFormatStats() },
    { key: 'test', label: 'Test Matches', icon: '⏳', stats: player.formatStats?.test || emptyFormatStats() },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div
          className={`w-full max-w-3xl max-h-[95vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Top Sticky App Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                🏏 ARCL Official Player Profile & Career Record
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  cricketAudio.playClick('Opening full screen player card');
                  setShowShareCard(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md cursor-pointer transition"
                title="Open Clean Full-Screen Screenshot Card"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📸 Share Card</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container so nothing is cut off */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {/* Compact Profile Header */}
            <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900">
              <div className="flex items-center gap-3.5">
                {/* Avatar Circle */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-800 flex items-center justify-center text-white text-xl font-black shadow-xl shrink-0">
                  {player.avatar ? (
                    <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{player.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Name + Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-white truncate">
                      {player.name}
                    </h2>
                    {player.jerseyNumber && (
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        #{player.jerseyNumber}
                      </span>
                    )}
                    {player.profileId === 'ARCL-001' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        👑 LEAGUE ADMIN
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 capitalize font-medium mt-0.5">
                    {player.role} • {player.battingStyle || 'Right Hand Bat'} • {player.bowlingStyle || 'Right Arm Med'}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <button
                      onClick={handleCopyProfileId}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold transition cursor-pointer"
                      title="Click to copy profile ID"
                    >
                      <span>ID: {player.profileId}</span>
                      {copiedId ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-70" />}
                    </button>

                    {onOpenLoginModal && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenLoginModal();
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-amber-400" />
                        <span>Account / PIN</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Overall Summary Ribbon */}
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Matches</span>
                  <span className="text-base sm:text-lg font-mono font-black text-white">{player.stats.matches}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{player.stats.innings} Innings</span>
                </div>

                <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col justify-between">
                  <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider">Runs</span>
                  <span className="text-base sm:text-lg font-mono font-black text-rose-300">{player.stats.runs}</span>
                  <span className="text-[9px] text-slate-400 font-mono">Avg {player.stats.battingAverage || '-'}</span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Wickets</span>
                  <span className="text-base sm:text-lg font-mono font-black text-emerald-300">{player.stats.wickets}</span>
                  <span className="text-[9px] text-slate-400 font-mono">Econ {player.stats.economy ? player.stats.economy.toFixed(1) : '-'}</span>
                </div>

                <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30 flex flex-col justify-between">
                  <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">Fielding</span>
                  <span className="text-base sm:text-lg font-mono font-black text-sky-300">{(player.stats.catches || 0) + (player.stats.runOuts || 0)}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{player.stats.catches || 0} Ct • {player.stats.runOuts || 0} RO</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 text-xs overflow-x-auto">
              {[
                { id: 'statistics', label: '📊 Career Stats' },
                { id: 'formats', label: '⚡ Format Matrix (T10/T20/Club/Test)' },
                { id: 'overview', label: '👤 Profile Info' },
                { id: 'matches', label: `🏏 Matches (${playerMatchHistory.length})` },
                { id: 'teams', label: `🛡️ Teams (${playerTeams.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    cricketAudio.playClick();
                  }}
                  className={`py-3 px-2 font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4">
              {/* TAB 1: DETAILED STATISTICS (WITH FORMAT SELECTOR AT TOP) */}
              {activeTab === 'statistics' && (
                <div className="space-y-4">
                  {/* Prominent Format Selector Filter */}
                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                      Select Match Format for Detailed Breakdown:
                    </span>
                    <div className="grid grid-cols-5 gap-1 text-xs">
                      {[
                        { id: 'all', label: '🌟 Overall', icon: '' },
                        { id: 't10', label: '⚡ T10 / T6', icon: '' },
                        { id: 't20', label: '🏏 T20', icon: '' },
                        { id: 'club', label: '🏠 Club / Terrace', icon: '' },
                        { id: 'test', label: '⏳ Test Match', icon: '' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => {
                            setSelectedFormat(fmt.id as MatchFormatKey);
                            cricketAudio.playClick(`Viewing ${fmt.label} stats`);
                          }}
                          className={`py-2 px-1 text-center rounded-xl font-black text-[11px] transition cursor-pointer ${
                            selectedFormat === fmt.id
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stat Sub-bar: BAT | BOWL | FIELD | MATCH-WISE */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['bat', 'bowl', 'field', 'matchwise'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatsSubTab(st);
                          cricketAudio.playClick();
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-black uppercase tracking-wider transition cursor-pointer ${
                          statsSubTab === st
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {st === 'bat'
                          ? '🏏 BATTING'
                          : st === 'bowl'
                          ? '🎯 BOWLING'
                          : st === 'field'
                          ? '🧤 FIELDING'
                          : '📋 MATCH-WISE'}
                      </button>
                    ))}
                  </div>

                  {/* BATTING STATS VIEW */}
                  {statsSubTab === 'bat' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Runs Scored</span>
                          <span className="text-xl font-black text-rose-400">{currentStats.runs}</span>
                          <span className="text-[10px] text-slate-500 font-sans">{currentStats.innings || currentStats.matches} Innings</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Batting Avg</span>
                          <span className="text-xl font-black text-emerald-400">{currentStats.battingAverage || '-'}</span>
                          <span className="text-[10px] text-slate-500 font-sans">Per Dismissal</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Strike Rate</span>
                          <span className="text-xl font-black text-cyan-400">
                            {currentStats.strikeRate ? currentStats.strikeRate.toFixed(1) : '0.0'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">Runs/100b</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Highest Score</span>
                          <span className="text-xl font-black text-amber-400">
                            {currentStats.highestScore}{currentStats.highestScoreNotOut ? '*' : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">Career Best</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">
                          Boundary & Milestone Breakdown ({selectedFormat.toUpperCase()})
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">Fours (4s)</span>
                            <span className="text-sm font-bold text-white">{currentStats.fours || 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">Sixes (6s)</span>
                            <span className="text-sm font-bold text-amber-400">{currentStats.sixes || 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">30s (Terrace)</span>
                            <span className="text-sm font-bold text-amber-300">{currentStats.thirties || 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">50s (Fifties)</span>
                            <span className="text-sm font-bold text-emerald-400">{currentStats.fifties || 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">100s (Centuries)</span>
                            <span className="text-sm font-bold text-purple-400">{currentStats.centuries || 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">Ducks (0s)</span>
                            <span className="text-sm font-bold text-rose-400">{currentStats.ducks || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOWLING STATS VIEW */}
                  {statsSubTab === 'bowl' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Wickets Taken</span>
                          <span className="text-xl font-black text-emerald-400">{currentStats.wickets}</span>
                          <span className="text-[10px] text-slate-500 font-sans">{currentStats.oversBowled || 0} Overs</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Economy Rate</span>
                          <span className="text-xl font-black text-cyan-400">
                            {currentStats.economy ? currentStats.economy.toFixed(1) : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">Runs/Over</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Bowling Average</span>
                          <span className="text-xl font-black text-amber-400">{currentStats.bowlingAverage || '-'}</span>
                          <span className="text-[10px] text-slate-500 font-sans">Runs/Wicket</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Best Figures</span>
                          <span className="text-xl font-black text-purple-400">
                            {currentStats.bestBowlingWickets}/{currentStats.bestBowlingRuns}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">BBI</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block">
                          Bowling Milestones & Extras ({selectedFormat.toUpperCase()})
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">3-Wicket Hauls</span>
                            <span className="text-sm font-bold text-emerald-300">{currentStats.threeWicketHauls || 0}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">5-Wicket Hauls</span>
                            <span className="text-sm font-bold text-purple-300">{currentStats.fiveWicketHauls || 0}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-sans">Bowling Style</span>
                            <span className="text-xs font-bold text-white font-sans truncate block">
                              {player.bowlingStyle || 'Right Arm Med'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FIELDING STATS VIEW */}
                  {statsSubTab === 'field' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Catches Taken</span>
                          <span className="text-2xl font-black text-sky-400">{currentStats.catches || 0}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Direct Run Outs</span>
                          <span className="text-2xl font-black text-amber-400">{currentStats.runOuts || 0}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Stumpings</span>
                          <span className="text-2xl font-black text-purple-400">{currentStats.stumpings || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MATCH-WISE BREAKDOWN TABLE */}
                  {statsSubTab === 'matchwise' && (
                    <div className="space-y-2">
                      {filteredMatches.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No match performance records available for format "{selectedFormat.toUpperCase()}".
                        </div>
                      ) : (
                        filteredMatches.map(({ match: m, oppTeam, batStat, bowlStat }) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">
                                vs {oppTeam?.name || 'Opponent'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {m.date || 'Recent'} • {m.settings?.matchType || 'Match'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                                <span className="text-[10px] text-slate-400 block font-sans">Batting</span>
                                <span className="font-bold text-rose-300">
                                  {batStat
                                    ? `${batStat.runs} runs (${batStat.balls}b, ${batStat.fours}x4, ${batStat.sixes}x6) ${
                                        batStat.isOut ? '' : '*'
                                      }`
                                    : 'Did not bat'}
                                </span>
                              </div>

                              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                                <span className="text-[10px] text-slate-400 block font-sans">Bowling</span>
                                <span className="font-bold text-emerald-300">
                                  {bowlStat
                                    ? `${bowlStat.wickets}/${bowlStat.runs} (${bowlStat.overs} ov)`
                                    : 'Did not bowl'}
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

              {/* TAB 2: FORMAT MATRIX (ESPNCRICINFO STYLE CAREER BREAKDOWN) */}
              {activeTab === 'formats' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                        All-Format Career Records & Averages
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Complete side-by-side performance comparison across all match types.
                      </p>
                    </div>
                    <span className="text-xl">🏆</span>
                  </div>

                  {/* Summary Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Format</th>
                          <th className="py-2.5 px-2 text-center">Mat</th>
                          <th className="py-2.5 px-2 text-center">Runs</th>
                          <th className="py-2.5 px-2 text-center">HS</th>
                          <th className="py-2.5 px-2 text-center">Avg</th>
                          <th className="py-2.5 px-2 text-center">SR</th>
                          <th className="py-2.5 px-2 text-center text-amber-400">30s</th>
                          <th className="py-2.5 px-2 text-center">50s/100s</th>
                          <th className="py-2.5 px-2 text-center">Wkts</th>
                          <th className="py-2.5 px-2 text-center">Econ</th>
                          <th className="py-2.5 px-2 text-center">Best</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                        {formatBreakdownList.map((f) => (
                          <tr key={f.key} className="hover:bg-slate-900/60 transition">
                            <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                              <span>{f.icon}</span>
                              <span>{f.label}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-300 font-bold">{f.stats.matches}</td>
                            <td className="py-2.5 px-2 text-center text-rose-400 font-black">{f.stats.runs}</td>
                            <td className="py-2.5 px-2 text-center text-amber-300 font-bold">{f.stats.highestScore}{f.stats.highestScoreNotOut ? '*' : ''}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{f.stats.battingAverage || '-'}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-400">{f.stats.strikeRate ? f.stats.strikeRate.toFixed(1) : '-'}</td>
                            <td className="py-2.5 px-2 text-center text-amber-300 font-bold">{f.stats.thirties || 0}</td>
                            <td className="py-2.5 px-2 text-center text-purple-300">{f.stats.fifties || 0}/{f.stats.centuries || 0}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-black">{f.stats.wickets}</td>
                            <td className="py-2.5 px-2 text-center text-cyan-300">{f.stats.economy ? f.stats.economy.toFixed(1) : '-'}</td>
                            <td className="py-2.5 px-2 text-center text-amber-400">{f.stats.bestBowlingWickets}/{f.stats.bestBowlingRuns}</td>
                          </tr>
                        ))}

                        {/* Total Career Row */}
                        <tr className="bg-emerald-950/20 font-black border-t-2 border-slate-700">
                          <td className="py-3 px-3 font-sans text-emerald-400 flex items-center gap-1.5">
                            <span>🌟</span>
                            <span>Total Career</span>
                          </td>
                          <td className="py-3 px-2 text-center text-white">{player.stats.matches}</td>
                          <td className="py-3 px-2 text-center text-rose-300 font-black">{player.stats.runs}</td>
                          <td className="py-3 px-2 text-center text-amber-300 font-black">{player.stats.highestScore}{player.stats.highestScoreNotOut ? '*' : ''}</td>
                          <td className="py-3 px-2 text-center text-emerald-300 font-black">{player.stats.battingAverage || '-'}</td>
                          <td className="py-3 px-2 text-center text-cyan-300">{player.stats.strikeRate ? player.stats.strikeRate.toFixed(1) : '-'}</td>
                          <td className="py-3 px-2 text-center text-amber-300 font-black">{player.stats.thirties || 0}</td>
                          <td className="py-3 px-2 text-center text-purple-300">{player.stats.fifties || 0}/{player.stats.centuries || 0}</td>
                          <td className="py-3 px-2 text-center text-emerald-300 font-black">{player.stats.wickets}</td>
                          <td className="py-3 px-2 text-center text-cyan-300">{player.stats.economy ? player.stats.economy.toFixed(1) : '-'}</td>
                          <td className="py-3 px-2 text-center text-amber-300">{player.stats.bestBowlingWickets}/{player.stats.bestBowlingRuns}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Format Cards for Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formatBreakdownList.map((f) => (
                      <div key={f.key} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{f.icon}</span> {f.label}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {f.stats.matches} Matches
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                          <div className="p-2 rounded-xl bg-slate-900">
                            <span className="text-[9px] text-slate-400 block font-sans">Runs (Avg)</span>
                            <span className="text-rose-300 font-bold">{f.stats.runs} ({f.stats.battingAverage || '-'})</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900">
                            <span className="text-[9px] text-slate-400 block font-sans">HS / SR</span>
                            <span className="text-amber-300 font-bold">{f.stats.highestScore} ({f.stats.strikeRate ? f.stats.strikeRate.toFixed(0) : '-'})</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-900">
                            <span className="text-[9px] text-slate-400 block font-sans">Wkts (Econ)</span>
                            <span className="text-emerald-300 font-bold">{f.stats.wickets} ({f.stats.economy ? f.stats.economy.toFixed(1) : '-'})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: OVERVIEW DETAILS */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                      Player Information
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Playing Role</span>
                        <span className="font-bold text-white capitalize">{player.role}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Batting Style</span>
                        <span className="font-bold text-white">{player.battingStyle || 'Right Hand Bat'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bowling Style</span>
                        <span className="font-bold text-white">{player.bowlingStyle || 'Right Arm Medium'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Appearances</span>
                        <span className="font-bold text-white font-mono">{player.stats.matches} Matches</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                      Player Identifier & Security
                    </span>
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Permanent ID</span>
                        <span className="font-bold text-emerald-400">{player.profileId}</span>
                      </div>
                      <button
                        onClick={handleCopyProfileId}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center gap-1"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MATCHES LIST */}
              {activeTab === 'matches' && (
                <div className="space-y-2">
                  {playerMatchHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No recorded match appearances yet.
                    </div>
                  ) : (
                    playerMatchHistory.map(({ match: m }) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">
                            {m.teamA.name} vs {m.teamB.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {m.venue} • {m.date}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {m.status === 'live' ? '🔴 Live' : 'Completed'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: TEAMS LIST */}
              {activeTab === 'teams' && (
                <div className="space-y-2">
                  {playerTeams.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Not currently registered in any club team squad.
                    </div>
                  ) : (
                    playerTeams.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shadow-sm">
                            {t.logoIcon || '🛡️'}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{t.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.players.length} Players Squad
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Screenshot Card Modal */}
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
