import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Match, Tournament, Team, Player } from '../types/cricket';
import { 
  Play, Trophy, Sparkles, Plus, Eye, Radio, Flame, 
  MapPin, Calendar, Clock, ChevronRight, Activity, Users, Shield, User, ArrowRight, Settings, Trash2, AlertTriangle
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
  onDeleteMatch?: (matchId: string) => void;
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
  onDeleteMatch,
  isDarkMode = true,
}) => {
  const handleScorecard = onWatchMatch || onOpenScorecard || (() => {});
  const handleScoring = onOpenScoring || onOpenScorerConsole || (() => {});
  const handleCreateMatch = onNewMatch || onOpenCreateMatch || (() => {});
  const handleTournaments = onOpenTournaments || onSelectTournamentTab || (() => {});

  const [openActionMatchId, setOpenActionMatchId] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Combine all matches and filter deleted ones
  const allMatches = useMemo(() => {
    let list: Match[] = [];
    if (matches && Array.isArray(matches)) {
      list = matches;
    } else {
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
    }
    return list.filter((m) => !deletedIds.has(m.id));
  }, [currentMatch, savedMatches, matches, deletedIds]);

  // Extract real live matches
  const liveMatches = useMemo(() => {
    return allMatches.filter((m) => m.status === 'live');
  }, [allMatches]);

  // Extract recent completed matches
  const recentCompletedMatches = useMemo(() => {
    return allMatches.filter((m) => m.status === 'completed').slice(0, 4);
  }, [allMatches]);

  const isUserAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const confirmDeleteMatch = () => {
    if (!matchToDelete) return;
    const id = matchToDelete.id;
    setDeletedIds((prev) => new Set([...prev, id]));
    if (onDeleteMatch) {
      onDeleteMatch(id);
    }
    cricketAudio.playClick('Match deleted');
    setMatchToDelete(null);
  };

  const previousBallCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    liveMatches.forEach((m) => {
      const currentInnNum = m.currentInningsNumber || 1;
      const currentInn = currentInnNum === 1 ? m.innings1 : m.innings2;
      if (!currentInn) return;

      const balls = currentInn.balls || [];
      const newCount = balls.length;
      const prevCount = previousBallCountsRef.current[m.id];

      if (prevCount !== undefined && newCount > prevCount) {
        const latestBall = balls[balls.length - 1];
        if (latestBall) {
          if (latestBall.isWicket) {
            cricketAudio.playWicket();
          } else if (latestBall.isSix || latestBall.runsBat === 6) {
            cricketAudio.playSix();
          } else if (latestBall.isFour || latestBall.runsBat === 4) {
            cricketAudio.playFour();
          } else if (latestBall.extraType === 'none') {
            cricketAudio.playBatHit();
          }

          let eventType:
            | 'dot' | 'single' | 'two' | 'three' | 'four' | 'six'
            | 'wicket' | 'wide' | 'noball' = 'dot';

          if (latestBall.isWicket) {
            eventType = 'wicket';
          } else if (latestBall.extraType === 'wide') {
            eventType = 'wide';
          } else if (latestBall.extraType === 'noBall') {
            eventType = 'noball';
          } else if (latestBall.runsBat === 6) {
            eventType = 'six';
          } else if (latestBall.runsBat === 4) {
            eventType = 'four';
          } else if (latestBall.runsBat === 3) {
            eventType = 'three';
          } else if (latestBall.runsBat === 2) {
            eventType = 'two';
          } else if (latestBall.runsBat === 1) {
            eventType = 'single';
          } else {
            eventType = 'dot';
          }

          cricketAudio.announceBallEvent({
            eventType,
            batterName: latestBall.strikerName || 'Batsman',
            bowlerName: latestBall.bowlerName,
            runs: latestBall.runsBat,
          });
        }
      }

      previousBallCountsRef.current[m.id] = newCount;
    });
  }, [liveMatches]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Top TV Broadcast Header */}
      <div className={`p-5 sm:p-7 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 text-white' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-[11px] uppercase font-black tracking-widest text-rose-500 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" /> ARCL Broadcast Hub
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Rooftop Match Centre
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Real-time ball-by-ball scorecards, tournament leaderboards, and live match coverage.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {loggedInPlayer ? (
              <button
                onClick={() => {
                  handleCreateMatch();
                  cricketAudio.playClick();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Start Live Match</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenLoginModal();
                  cricketAudio.playClick();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Login with PIN</span>
              </button>
            )}

            <button
              onClick={() => {
                onSelectMatchesTab();
                cricketAudio.playClick();
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>All Matches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Active Live Matches Feed */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h2 className="text-lg font-black tracking-tight text-white">
              Live Matches In Progress
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {liveMatches.length} Active
            </span>
          </div>
        </div>

        {liveMatches.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mx-auto">
              🏏
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-300">No Live Matches In Progress</h3>
              <p className="text-xs text-slate-500">
                No terrace match is currently underway. Start scoring a new match below!
              </p>
            </div>
            <div className="pt-1">
              <button
                onClick={() => {
                  if (loggedInPlayer) {
                    handleCreateMatch();
                  } else {
                    onOpenLoginModal();
                  }
                  cricketAudio.playClick();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Start Match</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {liveMatches.map((m) => {
              const teamA = m.teamA || { id: 'team-a', name: 'Team A', shortName: 'TMA' };
              const teamB = m.teamB || { id: 'team-b', name: 'Team B', shortName: 'TMB' };
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

              const strikerStat = currentInn?.currentStrikerId ? currentInn.battingStats?.[currentInn.currentStrikerId] : null;
              const nonStrikerStat = currentInn?.currentNonStrikerId ? currentInn.battingStats?.[currentInn.currentNonStrikerId] : null;
              const bowlerStat = currentInn?.currentBowlerId ? currentInn.bowlingStats?.[currentInn.currentBowlerId] : null;

              const totalOvers = (currentInn?.oversCompleted || 0) + (currentInn?.ballsInCurrentOver || 0) / 6;
              const crr = totalOvers > 0 ? ((currentInn?.totalRuns || 0) / totalOvers).toFixed(2) : '0.00';
              const target = currentInnNum === 2 ? (m.innings1?.totalRuns || 0) + 1 : null;
              const ballsRemaining = Math.max(0, m.totalOvers * 6 - ((currentInn?.oversCompleted || 0) * 6 + (currentInn?.ballsInCurrentOver || 0)));
              const runsNeeded = target ? Math.max(0, target - (currentInn?.totalRuns || 0)) : 0;

              const recentBalls = [...(currentInn?.balls || [])].slice(-6);
              const isActionOpen = openActionMatchId === m.id;

              return (
                <div
                  key={m.id}
                  className="rounded-3xl border border-amber-500/40 bg-slate-900 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/20 overflow-hidden flex flex-col justify-between relative"
                >
                  {/* Card Header Strip */}
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE • INN {currentInnNum}
                      </span>
                      <span className="text-xs font-black text-amber-400 truncate">
                        {m.tournamentName || m.name || `${teamA.name} vs ${teamB.name}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {m.totalOvers} Ov
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setOpenActionMatchId(isActionOpen ? null : m.id)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>

                        {isActionOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenActionMatchId(null)} />
                            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-40 overflow-hidden py-1">
                              <button
                                onClick={() => {
                                  setOpenActionMatchId(null);
                                  handleScoring(m);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
                              >
                                ⚡ Resume Scoring
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionMatchId(null);
                                  handleScorecard(m);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
                              >
                                📄 Scorecard
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionMatchId(null);
                                  setMatchToDelete(m);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 border-t border-slate-800 mt-1"
                              >
                                🗑 Delete Match
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scoreboard Body */}
                  <div className="p-4 space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="font-black text-sm text-white truncate">{battingTeam.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                            Batting
                          </span>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <span className="text-xl font-black text-emerald-400">
                            {currentInn?.totalRuns || 0}-{currentInn?.totalWickets || 0}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1 font-sans">
                            ({currentInn?.oversCompleted || 0}.{currentInn?.ballsInCurrentOver || 0}/{m.totalOvers} ov)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
                        <span className="truncate">Bowling: <strong className="text-slate-200">{bowlingTeam.name}</strong></span>
                        {currentInnNum === 2 && target ? (
                          <span className="font-mono text-amber-400 font-bold shrink-0">
                            Need {runsNeeded} off {ballsRemaining}b (Target: {target})
                          </span>
                        ) : (
                          <span className="font-mono text-slate-300 font-bold shrink-0">
                            CRR: {crr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Pitch Snapshot */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          Batters
                        </span>
                        <div className="font-bold truncate text-emerald-300 text-[11px]">
                          🏏 {strikerStat?.playerName || 'Striker'}* <span className="text-white font-mono font-black">{strikerStat?.runs || 0}</span> ({strikerStat?.balls || 0})
                        </div>
                        {nonStrikerStat && (
                          <div className="truncate text-slate-300 text-[11px]">
                            {nonStrikerStat.playerName} <span className="text-white font-mono">{nonStrikerStat.runs || 0}</span> ({nonStrikerStat.balls || 0})
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1 text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          Current Bowler
                        </span>
                        <div className="font-bold text-cyan-300 truncate text-[11px]">
                          🎯 {bowlerStat?.playerName || 'Bowler'}
                        </div>
                        <div className="text-white font-mono font-black text-[11px]">
                          {bowlerStat?.wickets || 0}/{bowlerStat?.runsConceded || 0} <span className="text-slate-400 font-sans font-normal">({bowlerStat?.oversBowled || 0}.{bowlerStat?.ballsInCurrentOver || 0} ov)</span>
                        </div>
                      </div>
                    </div>

                    {/* Ball By Ball Strip */}
                    {recentBalls.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">This Over:</span>
                        {recentBalls.map((b, i) => (
                          <span
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${
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
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        handleScorecard(m);
                        cricketAudio.playClick();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Scorecard</span>
                    </button>

                    <button
                      onClick={() => {
                        handleScoring(m);
                        cricketAudio.playClick();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Score Console</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Tournaments & League Preview */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-lg font-black tracking-tight text-white">
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
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                className="p-4 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-lg hover:border-amber-500/40 cursor-pointer transition text-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg font-black">
                    🏆
                  </div>
                  {liveTourMatches.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white animate-pulse">
                      {liveTourMatches.length} Live
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <h3 className="font-black text-sm tracking-tight truncate">
                    {tour.name}
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">
                    {tour.trophyName}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {tour.location} • {tour.season}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold">{tour.teams.length} Teams</span>
                  <span>{completedTourMatches.length} Played</span>
                  <span className="text-emerald-400 font-black flex items-center gap-0.5">
                    Table <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Recent Match Results Feed */}
      {recentCompletedMatches.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-black tracking-tight text-white">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentCompletedMatches.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  handleScorecard(m);
                  cricketAudio.playClick();
                }}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-md hover:border-slate-700 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span className="font-bold truncate max-w-[140px]">{m.tournamentName || m.name || 'ARCL Match'}</span>
                  <span>{m.date || 'Recent'}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-black">
                    <span className="truncate">{m.teamA.name}</span>
                    <span className="font-mono">{m.innings1?.totalRuns || 0}-{m.innings1?.totalWickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between font-black">
                    <span className="truncate">{m.teamB.name}</span>
                    <span className="font-mono">{m.innings2?.totalRuns || 0}-{m.innings2?.totalWickets || 0}</span>
                  </div>
                </div>

                {m.result && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-bold text-emerald-400 truncate">
                    🏆 {m.result.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-App Delete Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Delete Live Match?</h3>
                <p className="text-[10px] text-slate-400">Erase from live feed</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-bold text-white truncate">
                {matchToDelete.name || `${matchToDelete.teamA?.name} vs ${matchToDelete.teamB?.name}`}
              </p>
              <p className="text-rose-400 text-[11px] font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>This match will be permanently removed.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMatch}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
