import React, { useMemo } from 'react';
import { Match, Tournament, Team, Player } from '../types/cricket';
import { 
  Play, Trophy, Sparkles, Plus, Eye, Radio, Flame, 
  MapPin, Calendar, Clock, ChevronRight, Activity, Users, Shield, User, ArrowRight
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface LiveFeedViewProps {
  currentMatch?: Match | null;
  savedMatches?: Match[];
  matches?: Match[];
  tournaments?: Tournament[];
  teams?: Team[];
  loggedInPlayer?: Player | null;
  onOpenScorecard?: (match: Match) => void;
  onWatchMatch?: (match: Match) => void;
  onOpenScorerConsole?: (match: Match) => void;
  onOpenScoring?: (match: Match) => void;
  onOpenCreateMatch?: () => void;
  onNewMatch?: () => void;
  onOpenLoginModal?: () => void;
  onSelectTournamentTab?: () => void;
  onOpenTournaments?: () => void;
  onSelectMatchesTab?: () => void;
  isDarkMode?: boolean;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  currentMatch = null,
  savedMatches = [],
  matches,
  tournaments = [],
  teams = [],
  loggedInPlayer = null,
  onOpenScorecard,
  onWatchMatch,
  onOpenScorerConsole,
  onOpenScoring,
  onOpenCreateMatch,
  onNewMatch,
  onOpenLoginModal = () => {},
  onSelectTournamentTab,
  onOpenTournaments,
  onSelectMatchesTab = () => {},
  isDarkMode = true,
}) => {
  const handleScorecard = onWatchMatch || onOpenScorecard || (() => {});
  const handleScoring = onOpenScoring || onOpenScorerConsole || (() => {});
  const handleCreateMatch = onNewMatch || onOpenCreateMatch || (() => {});
  const handleTournaments = onOpenTournaments || onSelectTournamentTab || (() => {});

  // Combine all matches and memoize safely
  const allMatches = useMemo(() => {
    if (matches && Array.isArray(matches)) {
      return matches;
    }
    const list: Match[] = [];
    const seen = new Set<string>();
    if (currentMatch) {
      list.push(currentMatch);
      seen.add(currentMatch.id);
    }
    (savedMatches || []).forEach((m) => {
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        list.push(m);
      }
    });
    return list;
  }, [currentMatch, savedMatches, matches]);

  // Extract live matches
  const liveMatches = useMemo(() => {
    return allMatches.filter((m) => m.status === 'live');
  }, [allMatches]);

  // Extract recent completed matches
  const recentCompletedMatches = useMemo(() => {
    return allMatches.filter((m) => m.status === 'completed').slice(0, 3);
  }, [allMatches]);

  const isUserAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Live Match Centre Hero Header */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-colors ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800 text-white' 
          : 'bg-gradient-to-br from-white via-slate-50 to-emerald-50/50 border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-xs uppercase font-black tracking-widest text-rose-500">
                Live Broadcast Feed
              </span>
              <span className="text-xs text-slate-500 font-bold">•</span>
              <span className="text-xs font-bold text-emerald-400">
                Amritsar Rooftop League
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Rooftop Match Centre
            </h1>
            <p className={`text-xs sm:text-sm max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Real-time ball-by-ball score updates, live rooftop tournament leaderboards, and instant player metrics.
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            {loggedInPlayer ? (
              <button
                onClick={() => {
                  handleCreateMatch();
                  cricketAudio.playClick();
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Start Live Match</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenLoginModal();
                  cricketAudio.playClick();
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Login with PIN to Score</span>
              </button>
            )}

            <button
              onClick={() => {
                onSelectMatchesTab();
                cricketAudio.playClick();
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-black transition cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>All Matches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Active Live Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-xl font-black tracking-tight">
              Live Matches In Progress
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {liveMatches.length} Active
            </span>
          </div>

          {liveMatches.length > 0 && (
            <span className="text-xs text-emerald-400 font-bold hidden sm:inline">
              ⚡ Real-time updates
            </span>
          )}
        </div>

        {liveMatches.length === 0 ? (
          /* Clean Empty State for Live Matches */
          <div className={`p-8 sm:p-12 rounded-3xl border border-dashed text-center space-y-4 ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
          }`}>
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🏏
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-black">No Live Matches In Progress</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                There are no rooftop matches being played right now. You can start a new match or check out tournament standings below!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              {loggedInPlayer ? (
                <button
                  onClick={() => {
                    handleCreateMatch();
                    cricketAudio.playClick();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Start New Match</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenLoginModal();
                    cricketAudio.playClick();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Login / Register with PIN</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Live Matches Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveMatches.map((m) => {
              const teamA = m.teamA || { id: 'team-a', name: 'Team A', shortName: 'TMA', color: '#10b981', players: [] };
              const teamB = m.teamB || { id: 'team-b', name: 'Team B', shortName: 'TMB', color: '#f59e0b', players: [] };
              const currentInnNum = m.currentInningsNumber || 1;
              const currentInn = currentInnNum === 1 ? m.innings1 : m.innings2;
              const isTeamABattingFirst =
                m.tossWinnerTeamId === teamA.id
                  ? m.tossDecision === 'bat'
                  : m.tossDecision === 'bowl';
              const battingTeam = (currentInnNum === 1)
                ? (isTeamABattingFirst ? teamA : teamB)
                : (isTeamABattingFirst ? teamB : teamA);
              const bowlingTeam = battingTeam.id === teamA.id ? teamB : teamA;

              // Striker and non-striker
              const strikerStat = currentInn.currentStrikerId ? currentInn.battingStats?.[currentInn.currentStrikerId] : null;
              const nonStrikerStat = currentInn.currentNonStrikerId ? currentInn.battingStats?.[currentInn.currentNonStrikerId] : null;
              const bowlerStat = currentInn.currentBowlerId ? currentInn.bowlingStats?.[currentInn.currentBowlerId] : null;

              // Run rates
              const totalOvers = currentInn.oversCompleted + currentInn.ballsInCurrentOver / 6;
              const crr = totalOvers > 0 ? (currentInn.totalRuns / totalOvers).toFixed(2) : '0.00';
              const target = currentInnNum === 2 ? m.innings1.totalRuns + 1 : null;
              const ballsRemaining = m.totalOvers * 6 - (currentInn.oversCompleted * 6 + currentInn.ballsInCurrentOver);
              const runsNeeded = target ? target - currentInn.totalRuns : 0;
              const rrr = target && ballsRemaining > 0 && runsNeeded > 0
                ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
                : '0.00';

              const recentBalls = [...currentInn.balls].slice(-6);

              // Scorer permission check
              const isCreatorOrScorer = Boolean(
                loggedInPlayer &&
                (isUserAdmin ||
                 m.creatorId === loggedInPlayer.id ||
                 m.creatorProfileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
                 m.delegatedScorerProfileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
              );

              return (
                <div
                  key={m.id}
                  className={`p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all hover:border-emerald-500/50 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {/* Top Bar: Tournament + Live Pill */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                        LIVE • INN {currentInnNum}
                      </span>
                      <span className="text-xs font-bold text-slate-400 truncate max-w-[180px]">
                        {m.tournamentName || 'ARCL Rooftop'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[120px]">{m.venue || 'Rooftop Arena'}</span>
                    </div>
                  </div>

                  {/* Team vs Team Header */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: battingTeam.color || '#10b981' }} />
                        <span className="font-black text-base truncate">{battingTeam.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Batting
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                          {currentInn.totalRuns}/{currentInn.wickets}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          ({currentInn.oversCompleted}.{currentInn.ballsInCurrentOver}/{m.totalOvers} ov)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-slate-300 truncate">{bowlingTeam.name}</span>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bowlingTeam.color || '#3b82f6' }} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {currentInnNum === 2 ? (
                          <span className="font-bold text-amber-400">
                            Target: {target} (Need {runsNeeded} off {ballsRemaining}b)
                          </span>
                        ) : (
                          <span>CRR: {crr} • Proj: {Math.round(Number(crr) * m.totalOvers)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live On-Pitch Snapshot */}
                  <div className="py-3 grid grid-cols-2 gap-2 text-xs">
                    {/* Batsmen */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Batting
                      </span>
                      {strikerStat ? (
                        <div className="font-bold truncate text-emerald-300">
                          🏏 {strikerStat.playerName}*: <span className="text-white">{strikerStat.runs} ({strikerStat.balls})</span>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">No striker</div>
                      )}
                      {nonStrikerStat && (
                        <div className="text-slate-300 truncate">
                          {nonStrikerStat.playerName}: <span className="text-white">{nonStrikerStat.runs} ({nonStrikerStat.balls})</span>
                        </div>
                      )}
                    </div>

                    {/* Bowler */}
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Bowling
                      </span>
                      {bowlerStat ? (
                        <div className="font-bold text-cyan-300 truncate">
                          🎯 {bowlerStat.playerName}
                          <div className="text-white font-bold">
                            {bowlerStat.wickets}/{bowlerStat.runsConceded} ({bowlerStat.oversBowled}.{bowlerStat.ballsInCurrentOver} ov)
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">No bowler selected</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Balls Bubble Strip */}
                  {recentBalls.length > 0 && (
                    <div className="pt-2 pb-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">This Over:</span>
                      {recentBalls.map((b, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                            b.isWicket
                              ? 'bg-rose-600 text-white'
                              : b.runsBat === 4
                              ? 'bg-blue-600 text-white'
                              : b.runsBat === 6
                              ? 'bg-purple-600 text-white'
                              : b.runsBat === 0 && b.extraType === 'none'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-700 text-white'
                          }`}
                        >
                          {b.isWicket ? 'W' : b.runsBat > 0 ? b.runsBat : b.extraType !== 'none' ? b.extraType.charAt(0).toUpperCase() : '•'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        handleScorecard(m);
                        cricketAudio.playClick();
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Live Scorecard</span>
                    </button>

                    {isCreatorOrScorer && (
                      <button
                        onClick={() => {
                          handleScoring(m);
                          cricketAudio.playClick();
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Open Scoring Console</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Public Tournaments & League Standings Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black tracking-tight">
              Tournaments & Championship Standings
            </h2>
          </div>

          <button
            onClick={() => {
              handleTournaments();
              cricketAudio.playClick();
            }}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Leaderboards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.slice(0, 3).map((tour) => {
            const tourMatches = allMatches.filter((m) => m.tournamentId === tour.id);
            const liveTourMatches = tourMatches.filter((m) => m.status === 'live');
            const completedTourMatches = tourMatches.filter((m) => m.status === 'completed');

            return (
              <div
                key={tour.id}
                onClick={() => {
                  handleTournaments();
                  cricketAudio.playClick();
                }}
                className={`p-5 rounded-3xl border shadow-lg transition-all hover:scale-[1.01] cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 hover:border-amber-500/40 text-white' 
                    : 'bg-white border-slate-200 hover:border-amber-500/40 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-black">
                    🏆
                  </div>
                  {liveTourMatches.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                      {liveTourMatches.length} Live
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h3 className="font-black text-base tracking-tight truncate">
                    {tour.name}
                  </h3>
                  <p className="text-xs text-amber-400 font-bold mt-0.5">
                    {tour.trophyName}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {tour.location} • {tour.season}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold">{tour.teams.length} Teams</span>
                  <span>{completedTourMatches.length} Matches Played</span>
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    Table <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Recent Match Results Feed */}
      {recentCompletedMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black tracking-tight">
                Recent Match Results
              </h2>
            </div>

            <button
              onClick={() => {
                onSelectMatchesTab();
                cricketAudio.playClick();
              }}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentCompletedMatches.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  handleScorecard(m);
                  cricketAudio.playClick();
                }}
                className={`p-4 rounded-2xl border shadow-md transition-all hover:border-emerald-500/40 cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-bold truncate">{m.tournamentName || 'ARCL League'}</span>
                  <span>{m.date}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-black">
                    <span className="truncate">{m.teamA.name}</span>
                    <span>{m.innings1.totalRuns}/{m.innings1.wickets}</span>
                  </div>
                  <div className="flex items-center justify-between font-black">
                    <span className="truncate">{m.teamB.name}</span>
                    <span>{m.innings2?.totalRuns || 0}/{m.innings2?.wickets || 0}</span>
                  </div>
                </div>

                {m.result && (
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] font-bold text-emerald-400 truncate">
                    🏆 {m.result.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
