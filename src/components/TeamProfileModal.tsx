import React, { useState, useMemo } from 'react';
import { Team, Match, Player } from '../types/cricket';
import {
  X,
  Shield,
  Trophy,
  Swords,
  TrendingUp,
  Percent,
  Flame,
  Calendar,
  ChevronRight,
  Copy,
  Check,
  Award,
  Users,
  Target,
  Sparkles,
  Search,
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { calculateTeamAnalytics, calculateHeadToHead, FormBadge } from '../utils/teamAnalytics';

interface TeamProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  allTeams: Team[];
  allMatches: Match[];
  onViewPlayerProfile?: (player: Player) => void;
  onOpenScorecard?: (match: Match) => void;
  isDarkMode?: boolean;
}

export const TeamProfileModal: React.FC<TeamProfileModalProps> = ({
  isOpen,
  onClose,
  team,
  allTeams = [],
  allMatches = [],
  onViewPlayerProfile,
  onOpenScorecard,
  isDarkMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'last20' | 'h2h' | 'squad'>('overview');
  const [copiedId, setCopiedId] = useState(false);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');

  // Analytics for the selected team
  const analytics = useMemo(() => {
    if (!team) return null;
    return calculateTeamAnalytics(team, allMatches);
  }, [team, allMatches]);

  // Other opponent teams for H2H
  const otherTeams = useMemo(() => {
    if (!team) return [];
    return allTeams.filter((t) => t.id !== team.id && t.teamId !== team.teamId);
  }, [team, allTeams]);

  // Set default opponent when list changes
  React.useEffect(() => {
    if (otherTeams.length > 0 && (!selectedOpponentId || !otherTeams.some((t) => t.id === selectedOpponentId))) {
      setSelectedOpponentId(otherTeams[0].id);
    }
  }, [otherTeams, selectedOpponentId]);

  const selectedOpponent = useMemo(() => {
    return allTeams.find((t) => t.id === selectedOpponentId) || otherTeams[0] || null;
  }, [allTeams, selectedOpponentId, otherTeams]);

  const h2hStats = useMemo(() => {
    if (!team || !selectedOpponent) return null;
    return calculateHeadToHead(team, selectedOpponent, allMatches);
  }, [team, selectedOpponent, allMatches]);

  if (!isOpen || !team || !analytics) return null;

  const teamCode = team.teamId || team.profileId || 'TEAM-001';

  const handleCopyId = () => {
    cricketAudio.playClick('Copied');
    navigator.clipboard.writeText(teamCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header & Team Banner */}
        <div className="relative p-5 sm:p-7 border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Team Logo / Badge */}
            <div
              className="w-18 h-18 sm:w-22 sm:h-22 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl font-black shadow-xl shrink-0 border-2 border-white/10 overflow-hidden"
              style={{ backgroundColor: team.color || '#10b981' }}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span>{team.logoIcon || '🏏'}</span>
              )}
            </div>

            {/* Team Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                  {team.name}
                </h2>
                {team.shortName && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-300">
                    {team.shortName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                {/* Team ID Badge */}
                <button
                  onClick={handleCopyId}
                  title="Click to copy Team ID"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black hover:bg-emerald-500/25 transition cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{teamCode}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>

                <span className="text-slate-400 flex items-center gap-1">
                  📍 <span>{team.city || 'Amritsar'}</span>
                </span>

                <span className="text-slate-400 flex items-center gap-1">
                  👥 <span>{team.players?.length || 0} Registered Players</span>
                </span>

                {analytics.overall.currentStreak && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-slate-800 text-amber-300 font-bold border border-amber-500/20">
                    {analytics.overall.currentStreak}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Matches</span>
                <span className="text-lg font-black text-white">{analytics.totalMatches}</span>
              </div>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Win Ratio</span>
                <span className="text-lg font-black text-emerald-400">{analytics.overall.winPercentage}%</span>
              </div>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bat 1st Wins</span>
                <span className="text-lg font-black text-cyan-400">
                  {analytics.batFirst.won}/{analytics.batFirst.matches} ({analytics.batFirst.winPercentage}%)
                </span>
              </div>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chase Wins</span>
                <span className="text-lg font-black text-indigo-400">
                  {analytics.chaseFirst.won}/{analytics.chaseFirst.matches} ({analytics.chaseFirst.winPercentage}%)
                </span>
              </div>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('overview');
              cricketAudio.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Last 20 Matches & Analysis</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('h2h');
              cricketAudio.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'h2h'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>⚔️ Head to Head</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('last20');
              cricketAudio.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'last20'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Match History ({analytics.last20Matches.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('squad');
              cricketAudio.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'squad'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Squad ({team.players?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & LAST 20 ANALYSIS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Form Guide (Badges) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Last 20 Matches Form Guide (Recent → Past)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {analytics.overall.won}W - {analytics.overall.lost}L - {analytics.overall.tied}T
                  </span>
                </div>

                {analytics.overall.form.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {analytics.overall.form.map((badge, idx) => (
                      <div
                        key={`${badge.matchId}-${idx}`}
                        title={`${badge.result === 'W' ? 'Won' : badge.result === 'L' ? 'Lost' : 'Tied'} vs ${
                          badge.opponentName
                        } | ${badge.scoreText}`}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex flex-col items-center justify-center font-black text-xs transition shadow-md cursor-pointer hover:scale-110 ${
                          badge.result === 'W'
                            ? 'bg-emerald-600 text-white border border-emerald-400/40 shadow-emerald-900/30'
                            : badge.result === 'L'
                            ? 'bg-rose-600 text-white border border-rose-400/40 shadow-rose-900/30'
                            : 'bg-amber-600 text-white border border-amber-400/40'
                        }`}
                      >
                        <span>{badge.result}</span>
                        <span className="text-[8px] opacity-80 font-mono">
                          {badge.batFirst ? '1st' : '2nd'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    No completed matches recorded yet. Play or finish a match to see automatic form streaks!
                  </p>
                )}
              </div>

              {/* Bat First vs Chasing Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Batting First (Defending) */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-cyan-500/20 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-base">
                        🏏
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Batting First (Defending)</h4>
                        <span className="text-[10px] text-cyan-400 font-bold">1st Innings Records</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-cyan-400">{analytics.batFirst.winPercentage}% Win</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Played</span>
                      <span className="text-sm font-black text-white">{analytics.batFirst.matches}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Won / Lost</span>
                      <span className="text-sm font-black text-emerald-400">
                        {analytics.batFirst.won} / {analytics.batFirst.lost}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Avg Score</span>
                      <span className="text-sm font-black text-cyan-400">{analytics.batFirst.averageScore}</span>
                    </div>
                  </div>

                  {analytics.batFirst.highestDefendedOrChased && (
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Highest Defended:</span>
                      <span className="font-mono font-black text-cyan-300">
                        {analytics.batFirst.highestDefendedOrChased} Runs
                      </span>
                    </div>
                  )}
                </div>

                {/* Bowling First (Chasing) */}
                <div className="p-5 rounded-3xl bg-slate-950 border border-indigo-500/20 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base">
                        🎯
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Bowling First (Chasing)</h4>
                        <span className="text-[10px] text-indigo-400 font-bold">2nd Innings Target Hunt</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-indigo-400">{analytics.chaseFirst.winPercentage}% Win</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Played</span>
                      <span className="text-sm font-black text-white">{analytics.chaseFirst.matches}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Won / Lost</span>
                      <span className="text-sm font-black text-emerald-400">
                        {analytics.chaseFirst.won} / {analytics.chaseFirst.lost}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Avg Score</span>
                      <span className="text-sm font-black text-indigo-400">{analytics.chaseFirst.averageScore}</span>
                    </div>
                  </div>

                  {analytics.chaseFirst.highestDefendedOrChased && (
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Highest Target Chased:</span>
                      <span className="font-mono font-black text-indigo-300">
                        {analytics.chaseFirst.highestDefendedOrChased} Runs
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Toss & Benchmark Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Toss Impact */}
                <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    🪙 Toss Impact
                  </span>
                  <div className="text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tosses Won:</span>
                      <span className="font-bold text-white">
                        {analytics.toss.tossesWon} / {analytics.overall.matches}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Toss Win → Match Win:</span>
                      <span className="font-bold text-emerald-400">{analytics.toss.tossWinConversionRate}%</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Elected Bat: {analytics.toss.choseBatCount}</span>
                      <span>Elected Bowl: {analytics.toss.choseBowlCount}</span>
                    </div>
                  </div>
                </div>

                {/* Scoring Highs */}
                <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                    ⚡ Highest Total
                  </span>
                  {analytics.benchmarks.highestTotal ? (
                    <div>
                      <div className="text-lg font-mono font-black text-emerald-400">
                        {analytics.benchmarks.highestTotal.score}/{analytics.benchmarks.highestTotal.wickets}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        vs {analytics.benchmarks.highestTotal.opponent} ({analytics.benchmarks.highestTotal.overs} ov)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">No data yet</span>
                  )}
                </div>

                {/* Boundary & Run Rate */}
                <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                    💥 Boundary Count & CRR
                  </span>
                  <div className="text-xs text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Sixes (6s):</span>
                      <span className="font-bold text-amber-400">🚀 {analytics.benchmarks.totalSixes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Fours (4s):</span>
                      <span className="font-bold text-blue-400">🎯 {analytics.benchmarks.totalFours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Run Rate:</span>
                      <span className="font-bold text-purple-400">{analytics.benchmarks.averageRunRate} RPO</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HEAD TO HEAD (H2H) */}
          {activeTab === 'h2h' && (
            <div className="space-y-6">
              {/* Opponent Selector */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Swords className="w-4 h-4 text-cyan-400" />
                    <span>Select Opponent for Head-to-Head Comparison</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compare historical win-loss ratios and batting records against any franchise
                  </p>
                </div>

                {otherTeams.length > 0 ? (
                  <select
                    value={selectedOpponentId}
                    onChange={(e) => {
                      setSelectedOpponentId(e.target.value);
                      cricketAudio.playClick();
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs cursor-pointer min-w-[200px]"
                  >
                    {otherTeams.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.name} ({opp.teamId || opp.shortName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-500">Create at least 2 teams to enable Head-to-Head</span>
                )}
              </div>

              {selectedOpponent && h2hStats ? (
                <div className="space-y-6">
                  {/* H2H Faceoff Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 text-center space-y-4 shadow-xl">
                    <div className="flex items-center justify-center gap-6 sm:gap-12">
                      {/* Team A */}
                      <div className="flex flex-col items-center space-y-2 max-w-[120px] sm:max-w-[160px]">
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg"
                          style={{ backgroundColor: team.color || '#10b981' }}
                        >
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            team.logoIcon || '🏏'
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-white truncate">{team.name}</span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
                          {h2hStats.teamAWins} Wins
                        </span>
                      </div>

                      {/* VS Divider */}
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">VS</span>
                        <div className="px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-300">
                          {h2hStats.totalMatches} Matches
                        </div>
                        {h2hStats.ties > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold">({h2hStats.ties} Tied)</span>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex flex-col items-center space-y-2 max-w-[120px] sm:max-w-[160px]">
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg"
                          style={{ backgroundColor: selectedOpponent.color || '#3b82f6' }}
                        >
                          {selectedOpponent.logoUrl ? (
                            <img
                              src={selectedOpponent.logoUrl}
                              alt={selectedOpponent.name}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            selectedOpponent.logoIcon || '🦁'
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-white truncate">{selectedOpponent.name}</span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-cyan-400">
                          {h2hStats.teamBWins} Wins
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Comparison */}
                    {h2hStats.totalMatches > 0 && (
                      <div className="space-y-1 max-w-md mx-auto">
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 transition-all duration-500"
                            style={{ width: `${h2hStats.teamAWinPercentage}%` }}
                          />
                          <div
                            className="bg-cyan-500 transition-all duration-500"
                            style={{ width: `${h2hStats.teamBWinPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
                          <span className="text-emerald-400">{h2hStats.teamAWinPercentage}%</span>
                          <span className="text-cyan-400">{h2hStats.teamBWinPercentage}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* H2H Breakdown Table */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Head to Head Situation Breakdown
                    </h4>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Bat 1st Wins</span>
                        <div className="flex justify-around font-black">
                          <span className="text-emerald-400">{h2hStats.teamABatFirstWins}</span>
                          <span className="text-slate-600">:</span>
                          <span className="text-cyan-400">{h2hStats.teamBBatFirstWins}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Chase Wins</span>
                        <div className="flex justify-around font-black">
                          <span className="text-emerald-400">{h2hStats.teamAChaseWins}</span>
                          <span className="text-slate-600">:</span>
                          <span className="text-cyan-400">{h2hStats.teamBChaseWins}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Highest H2H Score</span>
                        <div className="flex justify-around font-black font-mono">
                          <span className="text-emerald-400">{h2hStats.teamAHighestScore || '-'}</span>
                          <span className="text-slate-600">:</span>
                          <span className="text-cyan-400">{h2hStats.teamBHighestScore || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direct Matches List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      All Matches Between {team.name} & {selectedOpponent.name} ({h2hStats.matches.length})
                    </h4>

                    {h2hStats.matches.length > 0 ? (
                      h2hStats.matches.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => onOpenScorecard && onOpenScorecard(m)}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                              <span>{m.tournamentName || 'ARCL Rooftop Match'}</span>
                              <span className="text-[10px] text-slate-500">• {m.date || 'Recent'}</span>
                            </div>
                            <div className="text-xs font-mono text-slate-300">
                              {m.teamA.name} ({m.innings1?.totalRuns || 0}/{m.innings1?.totalWickets || 0}) vs{' '}
                              {m.teamB.name} ({m.innings2?.totalRuns || 0}/{m.innings2?.totalWickets || 0})
                            </div>
                            <span className="text-[11px] text-emerald-400 font-semibold block">
                              🏆 {m.result?.summary || 'Match Completed'}
                            </span>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-3 text-center">
                        No direct matches recorded between these two teams yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">Select an opponent to see head to head analysis.</p>
              )}
            </div>
          )}

          {/* TAB 3: MATCH HISTORY (UP TO 20 MATCHES) */}
          {activeTab === 'last20' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Last 20 Matches Detailed History
                </h3>
                <span className="text-xs text-slate-400">Total: {analytics.last20Matches.length} matches</span>
              </div>

              {analytics.last20Matches.length > 0 ? (
                analytics.last20Matches.map((m, idx) => {
                  const isTeamA = m.teamA?.id === team.id || m.teamA?.name === team.name;
                  const opponent = isTeamA ? m.teamB : m.teamA;
                  const isWin =
                    m.result?.winnerTeamId === team.id || m.result?.winnerTeamName?.toLowerCase() === team.name?.toLowerCase();
                  const isTie = Boolean(m.result?.isTie);

                  return (
                    <div
                      key={m.id || idx}
                      onClick={() => onOpenScorecard && onOpenScorecard(m)}
                      className="p-4 rounded-3xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                              isWin ? 'bg-emerald-500/20 text-emerald-400' : isTie ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isWin ? 'WON' : isTie ? 'TIED' : 'LOST'}
                          </span>
                          <span className="text-xs font-bold text-white">vs {opponent?.name || 'Opponent'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({m.date || 'Recent'})</span>
                        </div>

                        <div className="text-xs font-mono text-slate-300 flex items-center gap-3">
                          <span>
                            {m.teamA?.shortName || m.teamA?.name}: {m.innings1?.totalRuns || 0}/{m.innings1?.totalWickets || 0} (
                            {m.innings1?.oversCompleted || 0}.{m.innings1?.ballsInCurrentOver || 0} ov)
                          </span>
                          <span className="text-slate-600">vs</span>
                          <span>
                            {m.teamB?.shortName || m.teamB?.name}: {m.innings2?.totalRuns || 0}/{m.innings2?.totalWickets || 0} (
                            {m.innings2?.oversCompleted || 0}.{m.innings2?.ballsInCurrentOver || 0} ov)
                          </span>
                        </div>

                        <p className="text-[11px] text-emerald-400 font-semibold">{m.result?.summary || 'Completed'}</p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-[11px] text-slate-400 font-bold hover:underline">View Scorecard</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No completed matches available for this team yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SQUAD LIST */}
          {activeTab === 'squad' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Registered Team Squad ({team.players?.length || 0} Players)
                </h3>
              </div>

              {team.players && team.players.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.players.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onViewPlayerProfile && onViewPlayerProfile(p)}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          #{p.jerseyNumber || 18}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-white truncate">{p.name}</h5>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-mono text-emerald-400 font-bold">{p.profileId || 'ARCL-001'}</span>
                            <span>•</span>
                            <span className="capitalize">{p.role}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No players registered in this team yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
