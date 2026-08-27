import React, { useState, useMemo } from 'react';
import { Tournament, Team, Match, PointsTableRow, Player, TeamTournamentStatus } from '../types/cricket';
import { Plus, Trophy, Sparkles, Calendar, MapPin, Play, FileText, Settings, Edit3, Image as ImageIcon, X, Check, Camera, Eye, Users, Shield, Copy, Hash, Award, Flame, Zap, CheckCircle2, XCircle, Crown, Sliders, ChevronDown, BarChart3, Target, Gem, Star } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TeamProfileModal } from './TeamProfileModal';
import { calculateTournamentStats, TournamentPlayerStat, bestBowlingLabel } from '../utils/tournamentStats';

type StatsTab = 'points' | 'mvp' | 'runs' | 'wickets' | 'fielding' | 'boundaries';

export const STATUS_CONFIG: Record<
  TeamTournamentStatus,
  {
    label: string;
    punjabiLabel: string;
    badgeShort: string;
    badgePill: string;
    border: string;
    textColor: string;
    dotColor: string;
    icon: string;
    description: string;
  }
> = {
  none: {
    label: 'In Contention',
    punjabiLabel: 'ਖੇਡ ਰਹੇ ਹਨ',
    badgeShort: '—',
    badgePill: 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600',
    border: 'border-slate-700',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-500',
    icon: '🏏',
    description: 'League stage match in progress',
  },
  qualified: {
    label: 'Qualified (Q)',
    punjabiLabel: 'ਕੁਆਲੀਫਾਈ (Q)',
    badgeShort: 'Q',
    badgePill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10',
    border: 'border-emerald-500/60',
    textColor: 'text-emerald-400 font-black',
    dotColor: 'bg-emerald-400',
    icon: '🟢',
    description: 'Qualified for Playoffs / Knockouts',
  },
  semi_final: {
    label: 'Semi-Finalist (SF)',
    punjabiLabel: 'ਸੈਮੀ-ਫਾਈਨਲ (SF)',
    badgeShort: 'SF',
    badgePill: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10',
    border: 'border-amber-500/60',
    textColor: 'text-amber-400 font-black',
    dotColor: 'bg-amber-400',
    icon: '🟡',
    description: 'Advanced to Semi-Final Match',
  },
  final: {
    label: 'Finalist (F)',
    punjabiLabel: 'ਫਾਈਨਲਿਸਟ (F)',
    badgeShort: 'F',
    badgePill: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/10',
    border: 'border-cyan-500/60',
    textColor: 'text-cyan-400 font-black',
    dotColor: 'bg-cyan-400',
    icon: '🥈',
    description: 'Reformed into Championship Grand Final',
  },
  champion: {
    label: 'Champion 👑',
    punjabiLabel: 'ਚੈਂਪੀਅਨ / ਜੇਤੂ 👑',
    badgeShort: '🏆 WINNER',
    badgePill: 'bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 text-amber-200 border-amber-400/80 shadow-lg shadow-amber-500/20 font-black animate-pulse',
    border: 'border-amber-400',
    textColor: 'text-amber-300 font-black',
    dotColor: 'bg-yellow-400',
    icon: '👑',
    description: 'Official Tournament Champion',
  },
  eliminated: {
    label: 'Eliminated (E)',
    punjabiLabel: 'ਐਲੀਮੀਨੇਟ / ਬਾਹਰ (E)',
    badgeShort: 'E',
    badgePill: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10',
    border: 'border-rose-500/60',
    textColor: 'text-rose-400 font-black',
    dotColor: 'bg-rose-500',
    icon: '🔴',
    description: 'Knocked out from tournament',
  },
};

interface StatColumn {
  header: string;
  render: (row: TournamentPlayerStat) => React.ReactNode;
}

// Generic ranked player-leaderboard table used for MVP / Most Runs / Most
// Wickets / Fielding / Boundaries tabs — keeps each tab's markup tiny while
// sharing the same rank badges, player/team styling, and empty-state.
const PlayerStatPanel: React.FC<{
  title: string;
  subtitle: string;
  emptyLabel: string;
  rows: TournamentPlayerStat[];
  columns: StatColumn[];
  bare?: boolean;
}> = ({ title, subtitle, emptyLabel, rows, columns, bare }) => {
  return (
    <div>
      <div className={`p-4 sm:p-5 ${bare ? '' : 'bg-slate-950/50 border-b border-slate-800'}`}>
        <span className="font-black text-xs uppercase tracking-wider text-white">{title}</span>
        <span className="text-[11px] text-slate-400 block">{subtitle}</span>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs font-medium">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
              <tr>
                <th className="p-3.5">Pos & Player</th>
                {columns.map((col) => (
                  <th key={col.header} className="p-3.5 text-center">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.slice(0, 25).map((row, idx) => (
                <tr key={row.playerId} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-sans flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : idx === 2
                          ? 'bg-orange-700/70 text-white font-black'
                          : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.teamColor || '#10b981' }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{row.playerName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{row.teamName}</div>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col.header} className="p-3.5 text-center text-slate-300">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface TournamentManagerProps {
  tournaments: Tournament[];
  teams: Team[];
  allMatches: Match[];
  onOpenCreateTournament: () => void;
  onOpenMatchSettings: (match: Match) => void;
  onOpenScorecard: (match: Match) => void;
  onAddNewMatchForTournament: (tournamentId: string) => void;
  onSelectMatchToScore: (match: Match) => void;
  onUpdateTournament?: (tournament: Tournament) => void;
  loggedInPlayer?: Player | null;
  onOpenLoginModal?: () => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({
  tournaments,
  teams,
  allMatches,
  onOpenCreateTournament,
  onOpenMatchSettings,
  onOpenScorecard,
  onAddNewMatchForTournament,
  onSelectMatchToScore,
  onUpdateTournament,
  loggedInPlayer = null,
  onOpenLoginModal,
}) => {
  const [tabFilter, setTabFilter] = useState<'my' | 'all'>('all');
  const [selectedTourId, setSelectedTourId] = useState<string>(tournaments[0]?.id || '');
  const [statsTab, setStatsTab] = useState<StatsTab>('points');

  const isAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const myTournaments = useMemo(() => {
    if (!loggedInPlayer) return [];
    return tournaments.filter((t) => {
      return (
        isAdmin ||
        (t.creatorId && t.creatorId === loggedInPlayer.id) ||
        (t.creatorProfileId && t.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
      );
    });
  }, [tournaments, loggedInPlayer, isAdmin]);

  const displayedTournaments = useMemo(() => {
    if (tabFilter === 'my' && loggedInPlayer) {
      return myTournaments;
    }
    return tournaments;
  }, [tabFilter, loggedInPlayer, myTournaments, tournaments]);

  const selectedTournament = useMemo(() => {
    return (
      displayedTournaments.find((t) => t.id === selectedTourId) ||
      displayedTournaments[0] ||
      tournaments[0]
    );
  }, [displayedTournaments, selectedTourId, tournaments]);

  const isMasterAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  // STRICT CREATOR CHECK: Only the tournament creator or Master Admin can edit or change team qualification / playoff statuses
  const canEditSelectedTournament = Boolean(
    loggedInPlayer &&
    (isMasterAdmin ||
     (selectedTournament?.creatorId && selectedTournament.creatorId === loggedInPlayer.id) ||
     (selectedTournament?.creatorProfileId && selectedTournament.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()))
  );

  // Edit Tournament Modal State
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [inspectedTeam, setInspectedTeam] = useState<Team | null>(null);
  const [selectedTeamForStatusModal, setSelectedTeamForStatusModal] = useState<Team | null>(null);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [copiedTourId, setCopiedTourId] = useState(false);
  const [editTournamentId, setEditTournamentId] = useState('');
  const [editName, setEditName] = useState('');
  const [editTrophyName, setEditTrophyName] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editOvers, setEditOvers] = useState<number>(6);
  const [editFormat, setEditFormat] = useState<'Round Robin + Knockout' | 'League' | 'Knockout'>('Round Robin + Knockout');
  const [editBannerImage, setEditBannerImage] = useState<string>('');

  const handleUpdateTeamStatus = (teamId: string, status: TeamTournamentStatus) => {
    if (!selectedTournament) return;
    if (!canEditSelectedTournament) {
      if (!loggedInPlayer && onOpenLoginModal) {
        onOpenLoginModal();
      } else {
        alert('Permission Denied: Only the Tournament Creator or Master Admin can update team playoff status.');
      }
      return;
    }
    const currentStatuses = selectedTournament.teamStatuses || {};
    const updatedStatuses: { [key: string]: TeamTournamentStatus } = {
      ...currentStatuses,
      [teamId]: status,
    };
    const updatedTour: Tournament = {
      ...selectedTournament,
      teamStatuses: updatedStatuses,
    };
    if (onUpdateTournament) {
      onUpdateTournament(updatedTour);
    }
    const label = STATUS_CONFIG[status]?.label || status;
    cricketAudio.playClick(`Status set to ${label}`);
  };

  const handleCopyTournamentId = (tourId: string) => {
    navigator.clipboard.writeText(tourId);
    setCopiedTourId(true);
    cricketAudio.playClick('Tournament ID copied');
    setTimeout(() => setCopiedTourId(false), 2000);
  };

  const handleOpenEditModal = (tour: Tournament) => {
    cricketAudio.playClick();
    setEditTournamentId(tour.tournamentId || 'TRN-001');
    setEditName(tour.name);
    setEditTrophyName(tour.trophyName);
    setEditSeason(tour.season);
    setEditLocation(tour.location);
    setEditOvers(tour.oversPerMatch);
    setEditFormat(tour.format);
    setEditBannerImage(tour.bannerImage || '');
    setIsEditingTournament(true);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Image file size should be under 2.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditBannerImage(event.target.result as string);
        cricketAudio.playClick('Photo loaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTournamentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !editName.trim()) return;

    if (!canEditSelectedTournament) {
      alert('Only tournament creator or Master Admin can edit this tournament.');
      return;
    }

    const updatedTour: Tournament = {
      ...selectedTournament,
      tournamentId: editTournamentId.trim().toUpperCase() || selectedTournament.tournamentId || 'TRN-001',
      name: editName.trim(),
      trophyName: editTrophyName.trim() || `${editName.trim()} Trophy`,
      season: editSeason.trim() || 'Season 1',
      location: editLocation.trim() || 'Amritsar Rooftop Arena',
      oversPerMatch: editOvers,
      format: editFormat,
      bannerImage: editBannerImage || undefined,
    };

    if (onUpdateTournament) {
      onUpdateTournament(updatedTour);
    }
    cricketAudio.playClick('Tournament updated');
    setIsEditingTournament(false);
  };

  // Calculate dynamic Points Table for selected tournament (memoized)
  const tournamentMatches = useMemo(() => {
    if (!selectedTournament?.id) return [];
    return (allMatches || []).filter((m) => m && m.tournamentId === selectedTournament.id);
  }, [allMatches, selectedTournament]);

  const pointsTable = useMemo((): PointsTableRow[] => {
    if (!selectedTournament) return [];

    const tableMap: { [teamId: string]: PointsTableRow } = {};

    // Initialize for all tournament teams
    (selectedTournament?.teams || []).forEach((tId) => {
      const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
      if (teamObj?.id) {
        tableMap[teamObj.id] = {
          teamId: teamObj.id,
          teamName: teamObj.name || 'Team',
          teamShortName: teamObj.shortName || 'TM',
          teamColor: teamObj.color || '#10b981',
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          noResult: 0,
          points: 0,
          nrr: 0,
          runsScored: 0,
          oversFaced: 0,
          runsConceded: 0,
          oversBowled: 0,
          form: [],
        };
      }
    });

    // Process completed and live matches
    (tournamentMatches || []).forEach((m) => {
      if (m && m.status === 'completed' && m.result) {
        const teamAId = m.teamA?.id;
        const teamBId = m.teamB?.id;

        if (teamAId && tableMap[teamAId]) tableMap[teamAId].played += 1;
        if (teamBId && tableMap[teamBId]) tableMap[teamBId].played += 1;

        if (m.result.isTie) {
          if (teamAId && tableMap[teamAId]) {
            tableMap[teamAId].tied += 1;
            tableMap[teamAId].points += 1;
            tableMap[teamAId].form.unshift('T');
          }
          if (teamBId && tableMap[teamBId]) {
            tableMap[teamBId].tied += 1;
            tableMap[teamBId].points += 1;
            tableMap[teamBId].form.unshift('T');
          }
        } else if (m.result.winnerTeamId) {
          const winnerId = m.result.winnerTeamId;
          const loserId = teamAId && teamBId ? (winnerId === teamAId ? teamBId : teamAId) : '';

          if (tableMap[winnerId]) {
            tableMap[winnerId].won += 1;
            tableMap[winnerId].points += 2;
            tableMap[winnerId].form.unshift('W');
          }
          if (loserId && tableMap[loserId]) {
            tableMap[loserId].lost += 1;
            tableMap[loserId].form.unshift('L');
          }
        }

        // Add runs and overs for NRR
        const inn1 = m.innings1;
        const inn2 = m.innings2;
        if (inn1 && inn2) {
          const inn1TeamId = inn1.teamId;
          const inn2TeamId = inn2.teamId;

          const inn1Overs = (inn1.oversCompleted || 0) + (inn1.ballsInCurrentOver || 0) / 6;
          const inn2Overs = (inn2.oversCompleted || 0) + (inn2.ballsInCurrentOver || 0) / 6;

          if (inn1TeamId && tableMap[inn1TeamId]) {
            tableMap[inn1TeamId].runsScored += inn1.totalRuns || 0;
            tableMap[inn1TeamId].oversFaced += Math.max(1, inn1Overs);
            tableMap[inn1TeamId].runsConceded += inn2.totalRuns || 0;
            tableMap[inn1TeamId].oversBowled += Math.max(1, inn2Overs);
          }

          if (inn2TeamId && tableMap[inn2TeamId]) {
            tableMap[inn2TeamId].runsScored += inn2.totalRuns || 0;
            tableMap[inn2TeamId].oversFaced += Math.max(1, inn2Overs);
            tableMap[inn2TeamId].runsConceded += inn1.totalRuns || 0;
            tableMap[inn2TeamId].oversBowled += Math.max(1, inn1Overs);
          }
        }
      }
    });

    // Compute NRR
    return Object.values(tableMap)
      .map((row) => {
        const forRR = row.oversFaced > 0 ? row.runsScored / row.oversFaced : 0;
        const againstRR = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
        const nrr = Number((forRR - againstRR).toFixed(3));
        return { ...row, nrr };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.nrr - a.nrr;
      });
  }, [selectedTournament, teams, tournamentMatches]);

  // Full tournament-wide player stats (Most Runs, Most Wickets, Fielding,
  // Boundaries, MVP) — replayed from every completed match of this
  // tournament across all 14 (or however many) participating teams.
  const tournamentPlayerStats = useMemo((): TournamentPlayerStat[] => {
    return calculateTournamentStats(tournamentMatches);
  }, [tournamentMatches]);

  const mostRunsList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.ballsFaced > 0).sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate),
    [tournamentPlayerStats]
  );
  const mostWicketsList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.legalBallsBowled > 0).sort((a, b) => b.wickets - a.wickets || a.economy - b.economy),
    [tournamentPlayerStats]
  );
  const mostFieldingList = useMemo(
    () =>
      [...tournamentPlayerStats]
        .filter((p) => p.fieldingDismissals > 0)
        .sort((a, b) => b.fieldingDismissals - a.fieldingDismissals || b.catches - a.catches),
    [tournamentPlayerStats]
  );
  const mostFoursList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.fours > 0).sort((a, b) => b.fours - a.fours),
    [tournamentPlayerStats]
  );
  const mostSixesList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.sixes > 0).sort((a, b) => b.sixes - a.sixes),
    [tournamentPlayerStats]
  );
  const mvpList = useMemo(
    () => [...tournamentPlayerStats].sort((a, b) => b.mvpPoints - a.mvpPoints),
    [tournamentPlayerStats]
  );

  const STATS_TABS: { key: StatsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'points', label: 'Points Table', icon: <Trophy className="w-3.5 h-3.5" /> },
    { key: 'mvp', label: 'MVP Ranking', icon: <Crown className="w-3.5 h-3.5" /> },
    { key: 'runs', label: 'Most Runs', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'wickets', label: 'Most Wickets', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'fielding', label: 'Fielding', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'boundaries', label: '4s / 6s', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider text-amber-400">
              League Leaderboard & Standings
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Tournaments & Points Table
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time NRR calculation, standings, form streaks, and scheduled rooftop fixtures.
          </p>
        </div>

        {loggedInPlayer && (
          <button
            onClick={() => {
              onOpenCreateTournament();
              cricketAudio.playClick();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ Create Tournament</span>
          </button>
        )}
      </div>

      {/* Segment Filter: All Tournaments vs My Tournaments */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              setTabFilter('all');
              cricketAudio.playClick();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              tabFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>🌐 All Tournaments ({tournaments.length})</span>
          </button>

          {loggedInPlayer && (
            <button
              onClick={() => {
                setTabFilter('my');
                cricketAudio.playClick();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'my'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>👤 My Tournaments ({myTournaments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tournament Selector Pill bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {displayedTournaments.length === 0 ? (
          <div className="text-xs text-slate-500 py-2">
            {tabFilter === 'my' ? "You haven't created any tournaments yet." : "No tournaments available."}
          </div>
        ) : (
          displayedTournaments.map((t) => {
            const isSelected = t.id === selectedTournament?.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTourId(t.id);
                  cricketAudio.playClick();
                }}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>{t.name}</span>
              </button>
            );
          })
        )}
      </div>

      {selectedTournament && (
        <div className="space-y-6">
          {/* Tournament Overview Card with Banner Photo */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
            {selectedTournament.bannerImage && (
              <div className="w-full h-36 sm:h-48 relative overflow-hidden bg-slate-950">
                <img
                  src={selectedTournament.bannerImage}
                  alt={selectedTournament.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
              </div>
            )}

            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase">
                    {selectedTournament.season}
                  </span>
                  <button
                    onClick={() => handleCopyTournamentId(selectedTournament.tournamentId || 'TRN-001')}
                    className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                    title="Click to copy Tournament ID"
                  >
                    <Hash className="w-3 h-3 text-amber-400" />
                    <span>{selectedTournament.tournamentId || 'TRN-001'}</span>
                    {copiedTourId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {selectedTournament.location}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                  <span>🏆 {selectedTournament.trophyName}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  League: <strong className="text-amber-400 font-bold">{selectedTournament.name}</strong> • Format: <strong className="text-slate-200">{selectedTournament.format}</strong> • <strong className="text-slate-200">{selectedTournament.oversPerMatch} Overs</strong> per match • {selectedTournament.teams.length} Teams
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEditSelectedTournament ? (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(selectedTournament)}
                      className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer active:scale-95"
                      title="Edit Tournament Name, Trophy & Photo"
                    >
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      <span>Edit Tournament</span>
                    </button>

                    <button
                      onClick={() => onAddNewMatchForTournament(selectedTournament.id)}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+ Schedule Match</span>
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-bold flex items-center gap-1.5">
                    <span>👁️ View Only Mode</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Stats & Leaderboard — Interactive Tabs */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                    Full Tournament Stats & Leaderboard
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Combined data across all {selectedTournament.teams.length} teams in {selectedTournament.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      cricketAudio.playClick();
                      setStatsTab(tab.key);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border active:scale-95 ${
                      statsTab === tab.key
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {statsTab === 'points' && (
            <>
            <div className="p-4 sm:p-5 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-black text-xs uppercase tracking-wider text-white">
                  Points Table & Standings
                </span>
                <span className="text-[11px] text-slate-400 block">
                  ARCL Playoff Progression (Q = Qualified, E = Eliminated, SF = Semi-Final, F = Final, 👑 = Champion)
                </span>
              </div>

              {canEditSelectedTournament && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatusManagerOpen((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border ${
                      isStatusManagerOpen
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isStatusManagerOpen ? 'Hide Status Manager' : '⚡ Manage ARCL Team Status'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Pos & Team</th>
                    <th className="p-3.5 text-center">ARCL Status</th>
                    <th className="p-3.5 text-center">P</th>
                    <th className="p-3.5 text-center">W</th>
                    <th className="p-3.5 text-center">L</th>
                    <th className="p-3.5 text-center">T</th>
                    <th className="p-3.5 text-center">NRR</th>
                    <th className="p-3.5 text-center">Form</th>
                    <th className="p-3.5 text-right font-black">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {pointsTable.map((row, idx) => {
                    const matchedTeam = (teams || []).find((t) => t && (t.id === row?.teamId || t.name?.toLowerCase() === row?.teamName?.toLowerCase()));
                    const currentStatus: TeamTournamentStatus =
                      (selectedTournament?.teamStatuses && row?.teamId && selectedTournament.teamStatuses[row.teamId]) || 'none';
                    const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['none'];

                    return (
                    <tr
                      key={row.teamId}
                      className={`hover:bg-slate-800/40 transition ${
                        currentStatus === 'champion'
                          ? 'bg-amber-950/30'
                          : currentStatus === 'final'
                          ? 'bg-cyan-950/20'
                          : currentStatus === 'semi_final'
                          ? 'bg-amber-950/15'
                          : currentStatus === 'qualified'
                          ? 'bg-emerald-950/25'
                          : currentStatus === 'eliminated'
                          ? 'bg-rose-950/15 opacity-80'
                          : idx < 2
                          ? 'bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      <td 
                        onClick={() => {
                          if (matchedTeam) {
                            cricketAudio.playClick();
                            setInspectedTeam(matchedTeam);
                          }
                        }}
                        className="p-3.5 font-sans flex items-center gap-2.5 cursor-pointer group"
                        title="Click to view Team Profile & Last 20 Matches"
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950 font-black'
                            : 'text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.teamColor || '#10b981' }}
                        />
                        <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition underline-offset-2 group-hover:underline">
                          {row.teamName}
                        </span>
                        {matchedTeam?.teamId && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                            {matchedTeam.teamId}
                          </span>
                        )}
                      </td>

                      {/* ARCL Status Badge Column with Creator-only selector vs Visitor view badge */}
                      <td className="p-3.5 text-center font-sans">
                        {canEditSelectedTournament ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (matchedTeam) {
                                cricketAudio.playClick();
                                setSelectedTeamForStatusModal(matchedTeam);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border transition cursor-pointer active:scale-95 ${statusInfo.badgePill}`}
                            title="Click to change team status (Creator only)"
                          >
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.badgeShort !== '—' ? statusInfo.badgeShort : 'Set Status'}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                          </button>
                        ) : (
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${statusInfo.badgePill}`}
                            title={statusInfo.description}
                          >
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.badgeShort}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-center text-slate-300">{row.played}</td>
                      <td className="p-3.5 text-center text-emerald-400 font-bold">{row.won}</td>
                      <td className="p-3.5 text-center text-rose-400 font-bold">{row.lost}</td>
                      <td className="p-3.5 text-center text-amber-400">{row.tied}</td>
                      <td className={`p-3.5 text-center font-bold ${
                        row.nrr >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          {row.form.slice(0, 5).map((f, fIdx) => (
                            <span
                              key={fIdx}
                              className={`w-4 h-4 rounded-md text-[9px] font-black flex items-center justify-center ${
                                f === 'W'
                                    ? 'bg-emerald-600 text-white'
                                    : f === 'L'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {f}
                            </span>
                          ))}
                          {row.form.length === 0 && <span className="text-slate-600">-</span>}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-amber-400">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            </>
            )}

            {statsTab === 'mvp' && (
              <PlayerStatPanel
                title="MVP Ranking — Most Valuable Players"
                subtitle="Ranked by total MVP points (Batting + Bowling + Fielding) across the whole tournament"
                emptyLabel="No MVP points recorded yet — matches need to be completed first."
                rows={mvpList}
                columns={[
                  { header: 'MVP Pts', render: (p) => <span className="text-amber-400 font-black">{p.mvpPoints}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  { header: 'Wkts', render: (p) => <span>{p.wickets}</span> },
                  { header: 'Catches/RO/St', render: (p) => <span>{p.catches}/{p.runOuts}/{p.stumpings}</span> },
                  { header: 'MOM', render: (p) => <span className="text-emerald-400 font-bold">{p.momAwards || '-'}</span> },
                ]}
              />
            )}

            {statsTab === 'runs' && (
              <PlayerStatPanel
                title="Most Runs"
                subtitle="Batting leaderboard across every completed match of this tournament"
                emptyLabel="No batting data yet — matches need to be completed first."
                rows={mostRunsList}
                columns={[
                  { header: 'Runs', render: (p) => <span className="text-amber-400 font-black">{p.runs}</span> },
                  { header: 'Inn', render: (p) => <span>{p.innings}</span> },
                  { header: 'HS', render: (p) => <span>{p.highestScore}{p.highestScoreNotOut ? '*' : ''}</span> },
                  { header: 'Avg', render: (p) => <span>{p.battingAverage.toFixed(2)}</span> },
                  { header: 'SR', render: (p) => <span>{p.strikeRate.toFixed(1)}</span> },
                  { header: '50s/100s', render: (p) => <span>{p.fifties}/{p.centuries}</span> },
                ]}
              />
            )}

            {statsTab === 'wickets' && (
              <PlayerStatPanel
                title="Most Wickets"
                subtitle="Bowling leaderboard across every completed match of this tournament"
                emptyLabel="No bowling data yet — matches need to be completed first."
                rows={mostWicketsList}
                columns={[
                  { header: 'Wkts', render: (p) => <span className="text-amber-400 font-black">{p.wickets}</span> },
                  { header: 'Overs', render: (p) => <span>{p.oversBowled}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runsConceded}</span> },
                  { header: 'Econ', render: (p) => <span>{p.economy.toFixed(2)}</span> },
                  { header: 'Best', render: (p) => <span>{bestBowlingLabel(p.bestBowlingWickets, p.bestBowlingRuns)}</span> },
                  { header: '3W+', render: (p) => <span>{p.threeWicketHauls || '-'}</span> },
                ]}
              />
            )}

            {statsTab === 'fielding' && (
              <PlayerStatPanel
                title="Most Catches & Fielding Stats"
                subtitle="Catches, run outs and stumpings across every completed match of this tournament"
                emptyLabel="No fielding dismissals recorded yet."
                rows={mostFieldingList}
                columns={[
                  { header: 'Total', render: (p) => <span className="text-amber-400 font-black">{p.fieldingDismissals}</span> },
                  { header: 'Catches', render: (p) => <span>{p.catches}</span> },
                  { header: 'Run Outs', render: (p) => <span>{p.runOuts}</span> },
                  { header: 'Stumpings', render: (p) => <span>{p.stumpings}</span> },
                ]}
              />
            )}

            {statsTab === 'boundaries' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                <PlayerStatPanel
                  title="Most Fours"
                  subtitle="Boundary count across every completed match of this tournament"
                  emptyLabel="No fours hit yet."
                  rows={mostFoursList}
                  bare
                  columns={[
                    { header: '4s', render: (p) => <span className="text-amber-400 font-black">{p.fours}</span> },
                    { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  ]}
                />
                <PlayerStatPanel
                  title="Most Sixes"
                  subtitle="Boundary count across every completed match of this tournament"
                  emptyLabel="No sixes hit yet."
                  rows={mostSixesList}
                  bare
                  columns={[
                    { header: '6s', render: (p) => <span className="text-amber-400 font-black">{p.sixes}</span> },
                    { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  ]}
                />
              </div>
            )}
          </div>

          {/* ARCL Playoff & Knockout Stage Status Manager Panel */}
          {isStatusManagerOpen && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <span>ARCL Playoff Status & Progression Manager</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Manual Control
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select status next to each team: <strong className="text-emerald-400">Q (Qualified)</strong>, <strong className="text-rose-400">E (Eliminated)</strong>, <strong className="text-amber-400">SF (Semi-Final)</strong>, <strong className="text-cyan-400">F (Final)</strong>, <strong className="text-yellow-300">👑 Champion</strong>.
                    </p>
                  </div>
                </div>

                {/* Summary Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['qualified', 'semi_final', 'final', 'champion', 'eliminated'] as TeamTournamentStatus[]).map((st) => {
                    const count = Object.values(selectedTournament.teamStatuses || {}).filter((v) => v === st).length;
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <span
                        key={st}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${cfg.badgePill}`}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.badgeShort}: {count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Team list with direct 1-click status pills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedTournament.teams || []).map((tId) => {
                  const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
                  if (!teamObj?.id) return null;
                  const currentStatus: TeamTournamentStatus =
                    (selectedTournament.teamStatuses && selectedTournament.teamStatuses[teamObj.id]) || 'none';
                  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['none'];

                  return (
                    <div
                      key={teamObj.id}
                      className={`p-4 rounded-2xl border transition ${
                        currentStatus === 'champion'
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-md shadow-amber-500/10'
                          : currentStatus === 'final'
                          ? 'bg-cyan-950/20 border-cyan-500/40'
                          : currentStatus === 'semi_final'
                          ? 'bg-amber-950/15 border-amber-500/30'
                          : currentStatus === 'qualified'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : currentStatus === 'eliminated'
                          ? 'bg-rose-950/15 border-rose-500/30 opacity-75'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: teamObj.color || '#10b981' }}
                          />
                          <div>
                            <span className="font-black text-sm text-white block">
                              {teamObj.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {teamObj.teamId || teamObj.city} • {teamObj.players?.length || 0} Players
                            </span>
                          </div>
                        </div>

                        {/* Current Status Pill */}
                        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-black flex items-center gap-1.5 ${activeConfig.badgePill}`}>
                          <span>{activeConfig.icon}</span>
                          <span>{activeConfig.label}</span>
                        </div>
                      </div>

                      {/* 1-Click Status Selector Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-500 uppercase mr-0.5">Set:</span>
                        
                        {/* None / Reset */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'none')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'none'
                              ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                          }`}
                        >
                          ⚪ Reset (-)
                        </button>

                        {/* Qualified (Q) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'qualified')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'qualified'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60'
                          }`}
                          title="Qualify for Playoffs"
                        >
                          🟢 Q (Qualify)
                        </button>

                        {/* Semi Final (SF) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'semi_final')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'semi_final'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/60'
                          }`}
                          title="Semi-Finalist"
                        >
                          🟡 SF (Semi-Final)
                        </button>

                        {/* Final (F) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'final')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'final'
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                              : 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border-cyan-800/60'
                          }`}
                          title="Finalist"
                        >
                          🔵 F (Final)
                        </button>

                        {/* Champion 👑 */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'champion')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'champion'
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-yellow-300 shadow-lg shadow-amber-500/30'
                              : 'bg-amber-950/40 hover:bg-amber-900/50 text-yellow-300 border-amber-700/60'
                          }`}
                          title="Champion Winner"
                        >
                          👑 Winner
                        </button>

                        {/* Eliminated (E) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateTeamStatus(teamObj.id, 'eliminated')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            currentStatus === 'eliminated'
                              ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/20'
                              : 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-800/60'
                          }`}
                          title="Eliminate from tournament"
                        >
                          🔴 E (Eliminated)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tournament Fixtures & Past Matches */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Tournament Fixtures & Matches ({tournamentMatches.length})</span>
              </span>
            </div>

            {tournamentMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800">
                No matches scheduled for this tournament yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tournamentMatches.map((m) => {
                  const isCreator = Boolean(
                    loggedInPlayer &&
                    (m.creatorId === loggedInPlayer.id ||
                     (m.creatorProfileId && m.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()))
                  );
                  const isDelegated = Boolean(
                    loggedInPlayer &&
                    m.delegatedScorerProfileId &&
                    m.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()
                  );
                  const canScoreThisMatch = isCreator || isDelegated || isAdmin;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-sm text-white block">
                          {m.teamA.name} vs {m.teamB.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {m.status === 'live' ? '🔴 Live' : m.result ? m.result.summary : 'Scheduled'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenScorecard(m)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="View Full Scorecard"
                        >
                          <FileText className="w-4 h-4 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => onSelectMatchToScore(m)}
                          className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition ${
                            m.status === 'completed'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : canScoreThisMatch
                              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30'
                              : 'bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/30'
                          }`}
                        >
                          {m.status === 'completed' ? (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              <span>Scorecard</span>
                            </>
                          ) : canScoreThisMatch ? (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Score Match</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Watch Live</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {isEditingTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 text-xl font-black">
                  🏆
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Edit Tournament</h3>
                  <p className="text-xs text-slate-400">Update name, banner photo, trophy, and overs</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingTournament(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTournamentEdit} className="space-y-4">
              {/* Banner Photo Upload */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Tournament Photo / Banner</span>
                  {editBannerImage && (
                    <button
                      type="button"
                      onClick={() => setEditBannerImage('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </label>

                {editBannerImage ? (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-700 mb-2">
                    <img src={editBannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                    <label className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-sm">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change</span>
                      <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">Click to Upload Tournament Photo / Banner</span>
                    <span className="text-[10px] text-slate-500">Supports JPG, PNG, WebP (Max 2.5MB)</span>
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Tournament ID</span>
                    <span className="text-[10px] text-amber-400 font-mono">ID</span>
                  </label>
                  <input
                    type="text"
                    value={editTournamentId}
                    onChange={(e) => setEditTournamentId(e.target.value.toUpperCase())}
                    placeholder="e.g. TRN-001"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Amritsar Rooftop Premier League"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Trophy / Cup Title
                  </label>
                  <input
                    type="text"
                    value={editTrophyName}
                    onChange={(e) => setEditTrophyName(e.target.value)}
                    placeholder="e.g. ARCL Gold Cup"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Season
                  </label>
                  <input
                    type="text"
                    value={editSeason}
                    onChange={(e) => setEditSeason(e.target.value)}
                    placeholder="e.g. Season 2026"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Amritsar Rooftop Arena"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Overs Per Match
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editOvers}
                    onChange={(e) => setEditOvers(parseInt(e.target.value, 10) || 6)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingTournament(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  Save Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Team IPL Status Selector Modal */}
      {selectedTeamForStatusModal && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md"
                  style={{ backgroundColor: selectedTeamForStatusModal.color || '#10b981' }}
                >
                  🏏
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>{selectedTeamForStatusModal.name}</span>
                    {selectedTeamForStatusModal.teamId && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                        {selectedTeamForStatusModal.teamId}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ARCL Knockout / Playoff Progression Status
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamForStatusModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Options */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">
                Select Team Status (ਟੀਮ ਦਾ ਸਟੇਟਸ ਚੁਣੋ):
              </p>

              {(['none', 'qualified', 'semi_final', 'final', 'champion', 'eliminated'] as TeamTournamentStatus[]).map((statusKey) => {
                const cfg = STATUS_CONFIG[statusKey];
                const isCurrent = (selectedTournament.teamStatuses?.[selectedTeamForStatusModal.id] || 'none') === statusKey;

                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => {
                      handleUpdateTeamStatus(selectedTeamForStatusModal.id, statusKey);
                      setSelectedTeamForStatusModal(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition cursor-pointer active:scale-[0.98] ${
                      isCurrent
                        ? `${cfg.badgePill} ring-2 ring-amber-400`
                        : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-xl">{cfg.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black ${isCurrent ? cfg.textColor : 'text-white'}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({cfg.punjabiLabel})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {cfg.description}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeamForStatusModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Profile Inspection Modal */}
      {inspectedTeam && (
        <TeamProfileModal
          isOpen={Boolean(inspectedTeam)}
          onClose={() => setInspectedTeam(null)}
          team={inspectedTeam}
          allTeams={teams}
          allMatches={allMatches}
          onOpenScorecard={onOpenScorecard}
          isDarkMode={true}
        />
      )}
    </div>
  );
};
