import React, { useState, useMemo } from 'react';
import { Match, Team, Player } from '../types/cricket';
import { 
  Plus, 
  Play, 
  Trophy, 
  Settings, 
  Trash2, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Radio, 
  Zap, 
  Activity,
  Flame,
  BatteryMedium
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface MatchesListViewProps {
  matches: Match[];
  currentMatch: Match | null;
  teams: Team[];
  loggedInPlayer?: Player | null;
  onSelectMatch: (match: Match) => void;
  onOpenCreateMatch: () => void;
  onOpenMatchSquad: (match: Match) => void;
  onOpenScorecard: (match: Match) => void;
  onOpenMatchSettings: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  onLoadOlderMatches?: () => void;
  isLoadingOlderMatches?: boolean;
  hasMoreOlderMatches?: boolean;
  onEditCompletedMatch?: (match: Match) => void;
  onOpenTournament?: (tournamentId: string) => void;
  isDarkMode: boolean;
  onOpenLoginModal?: () => void;
}

export const MatchesListView: React.FC<MatchesListViewProps> = ({
  matches,
  teams,
  loggedInPlayer,
  onSelectMatch,
  onOpenCreateMatch,
  onOpenScorecard,
  onOpenMatchSettings,
  onDeleteMatch,
  onLoadOlderMatches,
  isLoadingOlderMatches = false,
  hasMoreOlderMatches = true,
  onEditCompletedMatch,
  onOpenTournament,
  isDarkMode,
  onOpenLoginModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'my' | 'fixtures' | 'live' | 'completed'>(() =>
    loggedInPlayer ? 'my' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openActionsForMatchId, setOpenActionsForMatchId] = useState<string | null>(null);

  const isUserAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const rawMatchesList = useMemo(() => {
    return (matches || []).filter(m => !deletedIds.has(m.id));
  }, [matches, deletedIds]);

  const myMatchesList = useMemo(() => {
    if (!loggedInPlayer) return [];
    const pid = loggedInPlayer.id;
    const profId = loggedInPlayer.profileId?.toLowerCase();
    const phone = loggedInPlayer.phoneNumber?.toLowerCase();
    const pName = loggedInPlayer.name?.toLowerCase();

    return rawMatchesList.filter((m) => {
      if (isUserAdmin) return true;
      const isCreator = Boolean(
        (m.creatorId && m.creatorId === pid) ||
        (m.creatorProfileId && profId && m.creatorProfileId.toLowerCase() === profId) ||
        (m.creatorProfileId && phone && m.creatorProfileId.toLowerCase() === phone) ||
        (m.creatorName && pName && m.creatorName.toLowerCase() === pName) ||
        (!m.creatorId && !m.creatorProfileId)
      );
      const isDelegated = Boolean(
        (m.delegatedScorerProfileId && profId && m.delegatedScorerProfileId.toLowerCase() === profId) ||
        (m.delegatedScorerProfileId && phone && m.delegatedScorerProfileId.toLowerCase() === phone)
      );
      const inSquadA = m.playingSquadA?.includes(pid);
      const inSquadB = m.playingSquadB?.includes(pid);
      const inTeamA = m.teamA?.players?.some((p) => p.id === pid || (profId && p.profileId?.toLowerCase() === profId));
      const inTeamB = m.teamB?.players?.some((p) => p.id === pid || (profId && p.profileId?.toLowerCase() === profId));
      const inStats = Boolean(
        m.innings1?.battingStats?.[pid] ||
        m.innings1?.bowlingStats?.[pid] ||
        m.innings2?.battingStats?.[pid] ||
        m.innings2?.bowlingStats?.[pid]
      );

      return isCreator || isDelegated || inSquadA || inSquadB || inTeamA || inTeamB || inStats;
    });
  }, [rawMatchesList, loggedInPlayer, isUserAdmin]);

  const activeBaseList = useMemo(() => {
    if (filter === 'my' && loggedInPlayer) {
      return myMatchesList;
    }
    if (filter === 'fixtures') {
      return isUserAdmin
        ? rawMatchesList.filter((m) => m.status === 'setup')
        : myMatchesList.filter((m) => m.status === 'setup');
    }
    return rawMatchesList.filter((m) => m.status !== 'setup');
  }, [filter, loggedInPlayer, myMatchesList, rawMatchesList, isUserAdmin]);

  const filteredMatches = useMemo(() => {
    return activeBaseList.filter((m) => {
      if (filter === 'fixtures' && m.status !== 'setup') return false;
      if (filter === 'live' && m.status !== 'live') return false;
      if (filter === 'completed' && m.status !== 'completed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (m.name || '').toLowerCase().includes(q) ||
          (m.id || '').toLowerCase().includes(q) ||
          (m.tournamentName || '').toLowerCase().includes(q) ||
          (m.teamA?.name || '').toLowerCase().includes(q) ||
          (m.teamB?.name || '').toLowerCase().includes(q) ||
          (m.venue || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeBaseList, filter, searchQuery]);

  const handleConfirmDelete = () => {
    if (!matchToDelete) return;
    const mId = matchToDelete.id;
    const deletedName = matchToDelete.name || `${matchToDelete.teamA.name} vs ${matchToDelete.teamB.name}`;

    setDeletedIds((prev) => new Set([...prev, mId]));
    onDeleteMatch(mId);
    cricketAudio.playClick('Match deleted');
    setMatchToDelete(null);
    setToastMessage(`"${deletedName}" deleted successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getMatchBattingDetails = (m: Match) => {
    const isTeamABattingFirst =
      m?.tossWinnerTeamId === m.teamA.id
        ? m?.tossDecision === 'bat'
        : m?.tossDecision === 'bowl';
    
    const innNum = m.currentInningsNumber || 1;
    const isTeamABatting = innNum % 2 !== 0 ? isTeamABattingFirst : !isTeamABattingFirst;
    const activeInnings = innNum === 1 ? m.innings1 : innNum === 2 ? m.innings2 : innNum === 3 ? m.innings3 : m.innings4;

    return {
      currentBattingTeamId: isTeamABatting ? m.teamA.id : m.teamB.id,
      activeInnings
    };
  };

  const buildScoreLine = (m: Match, teamId: string): { runs: number; wickets: number; overs: string; isBattingNow: boolean } | null => {
    const inningsList = [m.innings1, m.innings2, m.innings3, m.innings4].filter(
      (inn): inn is NonNullable<typeof inn> => Boolean(inn) && inn!.teamId === teamId
    );
    const reached = inningsList.filter((inn) => (inn.balls?.length || 0) > 0 || m.status === 'completed');
    if (reached.length === 0) return null;
    
    const latestInn = reached[reached.length - 1];
    const { currentBattingTeamId } = getMatchBattingDetails(m);

    return {
      runs: latestInn.totalRuns,
      wickets: latestInn.totalWickets,
      overs: `${latestInn.oversCompleted}.${latestInn.ballsInCurrentOver}`,
      isBattingNow: m.status === 'live' && currentBattingTeamId === teamId
    };
  };

  return (
    <div className="space-y-4 relative select-none">
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-rose-400 animate-in fade-in duration-200">
          <Trash2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Broadcast Header Banner */}
      <div className={`p-4 sm:p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-[11px] uppercase font-black tracking-widest text-rose-500 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 inline" /> ARCL Broadcast Feed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Rooftop Cricket Matches</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live terrace ball-by-ball scorecards, fixtures, and local championships.
          </p>
        </div>

        <button
          onClick={() => {
            if (!loggedInPlayer) {
              alert('Please login first to create and score a match.');
              if (onOpenLoginModal) onOpenLoginModal();
              return;
            }
            onOpenCreateMatch();
            cricketAudio.playClick();
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-orange-500/20 transition cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Match</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-slate-800 bg-slate-950 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Matches' },
            ...(loggedInPlayer ? [{ id: 'my', label: 'My Matches' }] : []),
            { id: 'live', label: '🔴 Live Now' },
            { id: 'fixtures', label: '📅 Fixtures' },
            { id: 'completed', label: '🏆 Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id as any);
                cricketAudio.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by team, venue or tournament..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Broadcast Styled Match Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No matches found in this view</h3>
            <p className="text-xs text-slate-500">Create a new match to start live broadcast scoring.</p>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const isLive = m.status === 'live';
            const isCompleted = m.status === 'completed';
            const isScheduled = m.status === 'setup';

            const isCreator = Boolean(
              loggedInPlayer &&
              ((m.creatorId && m.creatorId === loggedInPlayer.id) ||
               (m.creatorProfileId && m.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
               isUserAdmin)
            );
            const isDelegated = Boolean(
              loggedInPlayer &&
              m.delegatedScorerProfileId &&
              (m.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
               m.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase())
            );
            const canScore = isCreator || isDelegated || isUserAdmin;
            const canUserDelete = isCreator || isUserAdmin;

            const scoreA = buildScoreLine(m, m.teamA.id);
            const scoreB = buildScoreLine(m, m.teamB.id);
            const actionsOpen = openActionsForMatchId === m.id;
            const cardTitle = m.tournamentName || m.name || `${m.teamA.name} vs ${m.teamB.name}`;

            const inn1Total = m.innings1?.totalRuns || 0;
            const inn2Total = m.innings2?.totalRuns || 0;
            const targetRuns = m.targetRuns || (m.innings1 ? m.innings1.totalRuns + 1 : null);
            const currentInnNum = m.currentInningsNumber || 1;
            const liveInnings = currentInnNum === 1 ? m.innings1 : m.innings2;

            const totalLegalBalls = (liveInnings?.oversCompleted || 0) * 6 + (liveInnings?.ballsInCurrentOver || 0);
            const totalOversDec = (liveInnings?.oversCompleted || 0) + (liveInnings?.ballsInCurrentOver || 0) / 6;
            const crr = totalOversDec > 0 ? ((liveInnings?.totalRuns || 0) / totalOversDec).toFixed(2) : '0.00';

            return (
              <div
                key={m.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xl relative ${
                  isLive
                    ? 'bg-slate-900 border-amber-500/40 shadow-amber-500/5 ring-1 ring-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                {/* TV Graphic Top Bar */}
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isLive 
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                      {isLive ? 'LIVE ON AIR' : isCompleted ? 'RESULT' : 'UPCOMING'}
                    </span>
                    <span className="text-xs font-black text-amber-400 truncate max-w-[190px] sm:max-w-xs">
                      {cardTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {m.totalOvers} Ov Match
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => {
                          cricketAudio.playClick();
                          setOpenActionsForMatchId(actionsOpen ? null : m.id);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      {actionsOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenActionsForMatchId(null)} />
                          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-40 overflow-hidden py-1">
                            <button
                              onClick={() => {
                                setOpenActionsForMatchId(null);
                                onSelectMatch(m);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
                            >
                              {canScore ? '⚡ Resume Scoring' : '👁 Watch Live'}
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsForMatchId(null);
                                onOpenScorecard(m);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
                            >
                              📄 View Scorecard
                            </button>
                            {canUserDelete && (
                              <button
                                onClick={() => {
                                  setOpenActionsForMatchId(null);
                                  onOpenMatchSettings(m);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900"
                              >
                                ⚙️ Match Settings
                              </button>
                            )}
                            {canUserDelete && (
                              <button
                                onClick={() => {
                                  setOpenActionsForMatchId(null);
                                  setMatchToDelete(m);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 border-t border-slate-800 mt-1"
                              >
                                🗑 Delete Match
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scoreboard Body */}
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    {/* Team A Row */}
                    <div className={`p-2.5 rounded-2xl flex items-center justify-between transition ${
                      scoreA?.isBattingNow ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-950/60'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xs font-black text-emerald-300 shrink-0">
                          {m.teamA.shortName || m.teamA.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-black text-white block truncate">{m.teamA.name}</span>
                          {scoreA?.isBattingNow && (
                            <span className="text-[9px] font-black uppercase text-amber-400 font-mono tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Batting
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        {scoreA ? (
                          <>
                            <span className="text-base font-black text-white">{scoreA.runs}-{scoreA.wickets}</span>
                            <span className="text-[11px] text-slate-400 block font-sans">({scoreA.overs} ov)</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Yet to bat</span>
                        )}
                      </div>
                    </div>

                    {/* Team B Row */}
                    <div className={`p-2.5 rounded-2xl flex items-center justify-between transition ${
                      scoreB?.isBattingNow ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-950/60'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-xs font-black text-cyan-300 shrink-0">
                          {m.teamB.shortName || m.teamB.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-black text-white block truncate">{m.teamB.name}</span>
                          {scoreB?.isBattingNow && (
                            <span className="text-[9px] font-black uppercase text-amber-400 font-mono tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Batting
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        {scoreB ? (
                          <>
                            <span className="text-base font-black text-white">{scoreB.runs}-{scoreB.wickets}</span>
                            <span className="text-[11px] text-slate-400 block font-sans">({scoreB.overs} ov)</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Yet to bat</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Situation Context Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400 truncate">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{m.venue || 'Rooftop Arena'}</span>
                    </div>

                    {isLive && currentInnNum === 2 && targetRuns ? (
                      <span className="font-mono font-bold text-amber-400 shrink-0">
                        Target: {targetRuns} (CRR: {crr})
                      </span>
                    ) : isLive ? (
                      <span className="font-mono font-bold text-emerald-400 shrink-0">
                        CRR: {crr}
                      </span>
                    ) : isCompleted && m.result ? (
                      <span className="font-bold text-emerald-400 truncate shrink-0">
                        🏆 {m.result.summary}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">{m.date || 'Today'}</span>
                    )}
                  </div>
                </div>

                {/* Bottom CTA Action Button */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {m.delegatedScorerProfileId ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <BatteryMedium className="w-3 h-3" /> Scorer: {m.delegatedScorerName || m.delegatedScorerProfileId}
                      </span>
                    ) : (
                      <span>By {m.creatorName || m.creatorProfileId || 'Official'}</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onSelectMatch(m);
                      cricketAudio.playClick();
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer active:scale-95 shrink-0 ${
                      canScore && !isCompleted
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-orange-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCompleted ? 'Scorecard' : canScore ? 'Score' : 'Watch'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Older Matches Pagination Button */}
      {onLoadOlderMatches && filteredMatches.length > 0 && hasMoreOlderMatches && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadOlderMatches}
            disabled={isLoadingOlderMatches}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            {isLoadingOlderMatches ? 'Loading Matches...' : 'Load Older Matches'}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Delete Match?</h3>
                <p className="text-[10px] text-slate-400">Realtime deletion</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-bold text-white truncate">
                {matchToDelete.name || `${matchToDelete.teamA.name} vs ${matchToDelete.teamB.name}`}
              </p>
              <p className="text-rose-400 text-[11px] font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Scorecard data will be permanently erased.</span>
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
                onClick={handleConfirmDelete}
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
