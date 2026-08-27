import React, { useState, useMemo } from 'react';
import { Match, Team, Player } from '../types/cricket';
import { Plus, Play, Trophy, FileText, Settings, Trash2, Calendar, MapPin, Users, Clock, AlertTriangle, X, Eye, Edit3 } from 'lucide-react';
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
  isDarkMode: boolean;
  onOpenLoginModal?: () => void;
}

export const MatchesListView: React.FC<MatchesListViewProps> = ({
  matches,
  currentMatch,
  teams,
  loggedInPlayer,
  onSelectMatch,
  onOpenCreateMatch,
  onOpenMatchSquad,
  onOpenScorecard,
  onOpenMatchSettings,
  onDeleteMatch,
  onLoadOlderMatches,
  isLoadingOlderMatches = false,
  hasMoreOlderMatches = true,
  onEditCompletedMatch,
  isDarkMode,
  onOpenLoginModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'my' | 'fixtures' | 'live' | 'completed'>(() =>
    loggedInPlayer ? 'my' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isUserAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  // Combine currentMatch and saved matches without duplicates (memoized)
  const rawMatchesList = useMemo(() => {
    return matches || [];
  }, [matches]);

  // Private 'My Matches' filter list
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

  // Active list to filter based on tab
  const activeBaseList = useMemo(() => {
    if (filter === 'my' && loggedInPlayer) {
      return myMatchesList;
    }
    if (filter === 'fixtures') {
      // Scheduled ("setup") matches are private — only show fixtures the
      // current user is actually part of (creator/delegated/squad), or all
      // of them for Admin. They never leak into the general/all view.
      return isUserAdmin
        ? rawMatchesList.filter((m) => m.status === 'setup')
        : myMatchesList.filter((m) => m.status === 'setup');
    }
    // General/All/Live/Completed views never show scheduled matches to
    // everyone — a fixture stays private (visible only in "My Matches")
    // until it actually goes live.
    return rawMatchesList.filter((m) => m.status !== 'setup');
  }, [filter, loggedInPlayer, myMatchesList, rawMatchesList, isUserAdmin]);

  const filteredMatches = useMemo(() => {
    return activeBaseList.filter((m) => {
      if (filter === 'fixtures' && m.status !== 'setup') return false;
      if (filter === 'live' && m.status !== 'live') return false;
      if (filter === 'completed' && m.status !== 'completed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase() || '';
        const matchId = m.id?.toLowerCase() || '';
        const tourId = m.tournamentId?.toLowerCase() || '';
        const tourName = m.tournamentName?.toLowerCase() || '';
        const teamAName = m.teamA?.name?.toLowerCase() || '';
        const teamBName = m.teamB?.name?.toLowerCase() || '';
        const teamAId = m.teamA?.id?.toLowerCase() || '';
        const teamBId = m.teamB?.id?.toLowerCase() || '';
        const city = (m.venue || m.teamA?.city || m.teamB?.city || '').toLowerCase();
        return (
          matchName.includes(q) ||
          matchId.includes(q) ||
          tourId.includes(q) ||
          tourName.includes(q) ||
          teamAName.includes(q) ||
          teamBName.includes(q) ||
          teamAId.includes(q) ||
          teamBId.includes(q) ||
          city.includes(q)
        );
      }
      return true;
    });
  }, [activeBaseList, filter, searchQuery]);

  const handleConfirmDelete = () => {
    if (!matchToDelete) return;
    const deletedName = matchToDelete.name || `${matchToDelete.teamA.name} vs ${matchToDelete.teamB.name}`;
    onDeleteMatch(matchToDelete.id);
    cricketAudio.playClick('Match deleted');
    setMatchToDelete(null);
    setToastMessage(`"${deletedName}" successfully deleted!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-rose-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <Trash2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-xs uppercase font-black tracking-wider text-emerald-400">
              Matches Center
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Amritsar Rooftop Matches
          </h2>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Track live terrace matches, view past scorecards, and schedule new games.
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
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition cursor-pointer active:scale-95 flex-shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>+ Create New Match</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className={`flex items-center gap-1.5 p-1 rounded-2xl border flex-wrap ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {[
            { id: 'all', label: 'All Matches' },
            ...(loggedInPlayer ? [{ id: 'my', label: `👤 My Matches` }] : []),
            { id: 'fixtures', label: '📅 Fixtures' },
            { id: 'live', label: '🔴 Live' },
            { id: 'completed', label: '🏆 Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id as any);
                cricketAudio.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search matches by team, venue or tournament..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full sm:w-80 px-4 py-2 rounded-2xl border text-xs font-semibold ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-black placeholder-slate-400'
          }`}
        />
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No matches found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Start a new match to begin rooftop ball-by-ball scoring.</p>
            <button
              onClick={onOpenCreateMatch}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
            >
              + Create Match Now
            </button>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const isLive = m.status === 'live';
            const isCompleted = m.status === 'completed';
            const isScheduled = m.status === 'setup' || (!isLive && !isCompleted);

            return (
              <div
                key={m.id}
                className={`p-5 rounded-3xl border shadow-lg transition flex flex-col justify-between relative overflow-hidden ${
                  isLive
                    ? 'bg-slate-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : isScheduled
                    ? 'bg-slate-900/80 border-amber-500/30'
                    : isDarkMode
                    ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      isLive
                        ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 animate-pulse'
                        : isScheduled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono'
                        : isCompleted
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isLive
                        ? '🔴 LIVE IN PROGRESS'
                        : isScheduled
                        ? '📅 SCHEDULED FIXTURE'
                        : '🏆 MATCH FINISHED'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {m.settings?.matchType || 'Match'} ({m.totalOvers} Ov)
                    </span>
                  </div>

                  <h3 className="font-black text-base text-white">
                    {m.teamA.name} <span className="text-slate-500 font-sans">vs</span> {m.teamB.name}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {m.venue || 'Rooftop Arena'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      {m.date || 'Today'}
                    </span>
                    {m.tournamentName && (
                      <span className="text-amber-400 text-[10px] font-bold">
                        🏆 {m.tournamentName}
                      </span>
                    )}
                  </div>

                  {/* Scores Summary or Scheduled Fixture Info */}
                  {isScheduled ? (
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Match Format:</span>
                        <span className="font-bold text-amber-300">{m.totalOvers} Overs per side • {m.settings?.playersPerSide || 11} Players</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Scheduled Time:</span>
                        <span className="font-bold text-white flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {m.date || 'Upcoming'}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>👤 Created by: {m.creatorName || m.creatorProfileId || 'User'}</span>
                        <span className="text-emerald-400 font-bold">Ready to Play</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-300 font-sans">{m.innings1.teamName}:</span>
                        <span className="font-black text-emerald-400">
                          {m.innings1.totalRuns}/{m.innings1.totalWickets} ({m.innings1.oversCompleted}.{m.innings1.ballsInCurrentOver} ov)
                        </span>
                      </div>

                      {m.currentInningsNumber === 2 && (
                        <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-slate-800/80">
                          <span className="font-bold text-slate-300 font-sans">{m.innings2.teamName}:</span>
                          <span className="font-black text-cyan-400">
                            {m.innings2.totalRuns}/{m.innings2.totalWickets} ({m.innings2.oversCompleted}.{m.innings2.ballsInCurrentOver} ov)
                          </span>
                        </div>
                      )}

                      {m.result && (
                        <div className="pt-1.5 border-t border-slate-800 text-[11px] text-emerald-400 font-black">
                          🏆 {m.result.summary}
                        </div>
                      )}

                      {/* Creator & Delegated Scorer Info */}
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>👤 {m.creatorName || m.creatorProfileId ? `By ${m.creatorName || m.creatorProfileId}` : 'Public Match'}</span>
                        {m.delegatedScorerProfileId && (
                          <span className="text-amber-400 font-bold">🔋 Scorer: {m.delegatedScorerName || m.delegatedScorerProfileId}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                {(() => {
                  const isUserAdmin = Boolean(
                    loggedInPlayer &&
                    (loggedInPlayer.profileId === 'ARCL-001')
                  );
                  const isMatchCreator = Boolean(
                    loggedInPlayer &&
                    ((m.creatorId && m.creatorId === loggedInPlayer.id) ||
                     (m.creatorProfileId && m.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
                     isUserAdmin)
                  );
                  const isDelegatedScorer = Boolean(
                    loggedInPlayer &&
                    m.delegatedScorerProfileId &&
                    (m.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
                     m.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase())
                  );
                  const canScore = isMatchCreator || isDelegatedScorer || isUserAdmin;
                  const canUserDelete = isMatchCreator || isUserAdmin;

                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!isScheduled && (
                          <button
                            onClick={() => onOpenScorecard(m)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Scorecard</span>
                          </button>
                        )}
                        {canUserDelete && (
                          <button
                            onClick={() => onOpenMatchSettings(m)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
                            title="Match Settings (Creator Only)"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canUserDelete && (
                          <button
                            onClick={() => {
                              cricketAudio.playClick();
                              setMatchToDelete(m);
                            }}
                            className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 hover:text-rose-200 text-xs cursor-pointer transition"
                            title="Delete Match (Creator / Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canUserDelete && isCompleted && onEditCompletedMatch && (
                          <button
                            onClick={() => {
                              cricketAudio.playClick();
                              onEditCompletedMatch(m);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-400 hover:text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                            title="Fix a scoring mistake (Creator / Admin Only)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onSelectMatch(m);
                            cricketAudio.playClick();
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95 ${
                            isScheduled && canScore
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                              : canScore
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {isCompleted
                              ? 'View Scorecard'
                              : isScheduled && canScore
                              ? '▶ Start Match'
                              : isScheduled
                              ? 'View Fixture'
                              : canScore
                              ? 'Score Match'
                              : 'Watch Live'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Load Older Matches — one-time fetch, not part of the live sync feed.
          Only the most recent matches stay continuously live-synced (to keep
          Firestore usage low); older matches load on demand here. */}
      {onLoadOlderMatches && filteredMatches.length > 0 && hasMoreOlderMatches && (
        <div className="flex justify-center py-5">
          <button
            onClick={onLoadOlderMatches}
            disabled={isLoadingOlderMatches}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 disabled:opacity-50 cursor-pointer"
          >
            {isLoadingOlderMatches ? 'Loading...' : '⏳ Load Older Matches'}
          </button>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses browser iframe sandbox issues) */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Delete Match?</h3>
                  <p className="text-[11px] text-slate-400">Permanent Action</p>
                </div>
              </div>
              <button
                onClick={() => setMatchToDelete(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white text-sm">
                {matchToDelete.name || `${matchToDelete.teamA.name} vs ${matchToDelete.teamB.name}`}
              </p>
              <p className="text-slate-400">
                {matchToDelete.venue || 'Rooftop Arena'} • {matchToDelete.totalOvers} Overs
              </p>
              <p className="text-rose-300 pt-1 text-[11px] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>All ball-by-ball history and scorecards for this match will be erased.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Match</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
