import React, { useState, useMemo, useEffect } from 'react';
import { Tournament, Team, Match, PointsTableRow, Player, TeamTournamentStatus } from '../types/cricket';
import { 
  Plus, Trophy, Sparkles, Calendar, MapPin, Play, FileText, Settings, Edit3, 
  Image as ImageIcon, X, Check, Camera, Eye, Users, Shield, Copy, Hash, Award, 
  Flame, Zap, CheckCircle2, XCircle, Crown, Sliders, ChevronDown, BarChart3, 
  Target, Gem, Star, ArrowUpRight, Activity
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TeamProfileModal } from './TeamProfileModal';
import { calculateTournamentStats, TournamentPlayerStat, bestBowlingLabel } from '../utils/tournamentStats';

type StatsTab = 'points' | 'mvp' | 'runs' | 'wickets' | 'fielding' | 'boundaries' | 'dots' | 'ballsFaced';

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
    badgePill: 'bg-slate-800/80 text-slate-400 border-slate-700',
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
      <div className={`p-4 sm:p-5 ${bare ? '' : 'bg-slate-950/60 border-b border-slate-800'}`}>
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
                <th className="p-3">Pos & Player</th>
                {columns.map((col) => (
                  <th key={col.header} className="p-3 text-center">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.slice(0, 20).map((row, idx) => (
                <tr key={row.playerId} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-sans flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
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
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.teamColor || '#10b981' }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate text-xs">{row.playerName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{row.teamName}</div>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col.header} className="p-3 text-center text-slate-300">
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
  initialTournamentId?: string;
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
  initialTournamentId,
}) => {
  const [tabFilter, setTabFilter] = useState<'my' | 'all'>('all');
  const [selectedTourId, setSelectedTourId] = useState<string>(initialTournamentId || tournaments[0]?.id || '');
  const [statsTab, setStatsTab] = useState<StatsTab>('points');

  useEffect(() => {
    if (initialTournamentId) {
      setSelectedTourId(initialTournamentId);
      setTabFilter('all');
    }
  }, [initialTournamentId]);

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
      tournaments.find((t) => t.id === selectedTourId) ||
      displayedTournaments[0] ||
      tournaments[0]
    );
  }, [displayedTournaments, selectedTourId, tournaments]);

  const canEditSelectedTournament = Boolean(
    loggedInPlayer &&
    (isAdmin ||
     (selectedTournament?.creatorId && selectedTournament.creatorId === loggedInPlayer.id) ||
     (selectedTournament?.creatorProfileId && selectedTournament.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()))
  );

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

  const tournamentMatches = useMemo(() => {
    if (!selectedTournament?.id) return [];
    return (allMatches || []).filter((m) => m && m.tournamentId === selectedTournament.id);
  }, [allMatches, selectedTournament]);

  const liveMatchesCount = useMemo(() => {
    return tournamentMatches.filter((m) => m.status === 'live').length;
  }, [tournamentMatches]);

  const completedMatchesCount = useMemo(() => {
    return tournamentMatches.filter((m) => m.status === 'completed').length;
  }, [tournamentMatches]);

  const pointsTable = useMemo((): PointsTableRow[] => {
    if (!selectedTournament) return [];

    const tableMap: { [teamId: string]: PointsTableRow } = {};

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

                ([m.innings1, m.innings2, m.innings3, m.innings4] as const).forEach((inn) => {
          if (!inn) return;
          const battingTeamId = inn.teamId;
          if (!battingTeamId) return;
          const bowlingTeamId = battingTeamId === teamAId ? teamBId : battingTeamId === teamBId ? teamAId : undefined;
          
          // Actual overs khele gaye
          let actualOversFaced = (inn.oversCompleted || 0) + (inn.ballsInCurrentOver || 0) / 6;
          
          // NRR RULE: Agar team All-Out ho gayi (10 wickets) toh poore overs count honge
          // Note: Agar aapke type mein 'wickets' property hai toh use check karein
          const isAllOut = inn.isAllOut || inn.wickets === 10;let oversForNRR = isAllOut ? (m.totalOvers || actualOversFaced) : actualOversFaced;

          // Agar 0 overs hain toh calculation error se bachne ke liye thoda buffer (0.1) rakh lo ya exact oversForNRR rehne do
          if (oversForNRR === 0) oversForNRR = 0.166; // 1 ball at least if they somehow got out on 0 ball

          if (tableMap[battingTeamId]) {
            tableMap[battingTeamId].runsScored += inn.totalRuns || 0;
            tableMap[battingTeamId].oversFaced += oversForNRR;
          }
          if (bowlingTeamId && tableMap[bowlingTeamId]) {
            tableMap[bowlingTeamId].runsConceded += inn.totalRuns || 0;
            tableMap[bowlingTeamId].oversBowled += oversForNRR;
          }
        });
      }
    });

    return Object.values(tableMap)
      .map((row) => {
        const forRR = row.oversFaced > 0 ? row.runsScored / row.oversFaced : 0;
        const againstRR = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
        const nrr = row.played > 0 ? Number((forRR - againstRR).toFixed(3)) : 0.000;
        return { ...row, nrr };
      })
      .sort((a, b) => {
        // 1st Priority: Points
        if (b.points !== a.points) return b.points - a.points;
        // 2nd Priority: Wins (Jo team zyada match jeeti, woh upar)
        if (b.won !== a.won) return b.won - a.won;
        // 3rd Priority: Net Run Rate
        return b.nrr - a.nrr;
      });

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
  const mostDotsList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.dots > 0).sort((a, b) => b.dots - a.dots),
    [tournamentPlayerStats]
  );
  const mostBallsFacedList = useMemo(
    () => [...tournamentPlayerStats].filter((p) => p.ballsFaced > 0).sort((a, b) => b.ballsFaced - a.ballsFaced),
    [tournamentPlayerStats]
  );
  const mvpList = useMemo(
    () => [...tournamentPlayerStats].sort((a, b) => b.mvpPoints - a.mvpPoints),
    [tournamentPlayerStats]
  );

  const STATS_TABS: { key: StatsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'points', label: 'Points Table', icon: <Trophy className="w-3.5 h-3.5" /> },
    { key: 'mvp', label: 'MVP Leaderboard', icon: <Crown className="w-3.5 h-3.5" /> },
    { key: 'runs', label: 'Orange Cap (Runs)', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'wickets', label: 'Purple Cap (Wkts)', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'fielding', label: 'Fielding', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'boundaries', label: '4s & 6s', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'ballsFaced', label: 'Balls Faced', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'dots', label: 'Dot Balls', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Broadcast Header Hub */}
      <div className="p-5 sm:p-7 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-[11px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1">
              ARCL Championship Hub
            </span>
            {liveMatchesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                {liveMatchesCount} Match Live
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tournaments & Standings
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Live points tables, net run rates (NRR), MVP awards, and complete rooftop tournament fixtures.
          </p>
        </div>

        {loggedInPlayer && (
          <button
            onClick={() => {
              onOpenCreateTournament();
              cricketAudio.playClick();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create Tournament</span>
          </button>
        )}
      </div>

      {/* Tabs Filter (All vs My Tournaments) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              setTabFilter('all');
              cricketAudio.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              tabFilter === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>All Tournaments ({tournaments.length})</span>
          </button>

          {loggedInPlayer && (
            <button
              onClick={() => {
                setTabFilter('my');
                cricketAudio.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'my'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>My Tournaments ({myTournaments.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tournament Cards Carousel Strip */}
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
                className={`px-3.5 py-2 rounded-2xl border text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{t.name}</span>
              </button>
            );
          })
        )}
      </div>

      {selectedTournament && (
        <div className="space-y-6">
          {/* Selected Championship Hero Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden relative">
            {selectedTournament.bannerImage && (
              <div className="w-full h-36 sm:h-44 relative overflow-hidden bg-slate-950">
                <img
                  src={selectedTournament.bannerImage}
                  alt={selectedTournament.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              </div>
            )}

            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase">
                    {selectedTournament.season}
                  </span>
                  <button
                    onClick={() => handleCopyTournamentId(selectedTournament.tournamentId || 'TRN-001')}
                    className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
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
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {selectedTournament.location}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>🏆 {selectedTournament.trophyName || selectedTournament.name}</span>
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                  <span>Format: <strong className="text-slate-200">{selectedTournament.format}</strong></span>
                  <span>•</span>
                  <span>Overs: <strong className="text-amber-400">{selectedTournament.oversPerMatch} Ov</strong></span>
                  <span>•</span>
                  <span>Teams: <strong className="text-slate-200">{selectedTournament.teams.length}</strong></span>
                  <span>•</span>
                  <span>Matches: <strong className="text-slate-200">{completedMatchesCount} Played</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEditSelectedTournament ? (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(selectedTournament)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => onAddNewMatchForTournament(selectedTournament.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>+ Match</span>
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-bold flex items-center gap-1.5">
                    <span>👁️ View Only</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Points Table Hub */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-sm uppercase tracking-wider text-white">
                      Tournament Leaderboard & Stats
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Live standings across {selectedTournament.teams.length} teams
                    </span>
                  </div>
                </div>

                {canEditSelectedTournament && statsTab === 'points' && (
                  <button
                    onClick={() => setIsStatusManagerOpen((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border ${
                      isStatusManagerOpen
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isStatusManagerOpen ? 'Hide Controls' : '⚡ Manage Status (Q/SF/F)'}</span>
                  </button>
                )}
              </div>

              {/* Sub-tabs pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {STATS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      cricketAudio.playClick();
                      setStatsTab(tab.key);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border whitespace-nowrap ${
                      statsTab === tab.key
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab 1: Points Table */}
            {statsTab === 'points' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                    <tr>
                      <th className="p-3">Pos & Team</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">P</th>
                      <th className="p-3 text-center">W</th>
                      <th className="p-3 text-center">L</th>
                      <th className="p-3 text-center">T</th>
                      <th className="p-3 text-center">NRR</th>
                      <th className="p-3 text-center">Form</th>
                      <th className="p-3 text-right font-black">PTS</th>
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
                              ? 'bg-amber-950/20'
                              : currentStatus === 'final'
                              ? 'bg-cyan-950/15'
                              : currentStatus === 'semi_final'
                              ? 'bg-amber-950/10'
                              : currentStatus === 'qualified'
                              ? 'bg-emerald-950/20'
                              : currentStatus === 'eliminated'
                              ? 'bg-rose-950/15 opacity-75'
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
                            className="p-3 font-sans flex items-center gap-2.5 cursor-pointer group"
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950 font-black'
                                : 'text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: row.teamColor || '#10b981' }}
                            />
                            <span className="font-bold text-slate-100 group-hover:text-amber-400 transition truncate max-w-[130px] sm:max-w-[180px]">
                              {row.teamName}
                            </span>
                          </td>

                          <td className="p-3 text-center font-sans">
                            {canEditSelectedTournament ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (matchedTeam) {
                                    cricketAudio.playClick();
                                    setSelectedTeamForStatusModal(matchedTeam);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border transition cursor-pointer ${statusInfo.badgePill}`}
                              >
                                <span>{statusInfo.icon}</span>
                                <span>{statusInfo.badgeShort !== '—' ? statusInfo.badgeShort : 'Set'}</span>
                              </button>
                            ) : (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${statusInfo.badgePill}`}>
                                <span>{statusInfo.icon}</span>
                                <span>{statusInfo.badgeShort}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center text-slate-300">{row.played}</td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{row.won}</td>
                          <td className="p-3 text-center text-rose-400 font-bold">{row.lost}</td>
                          <td className="p-3 text-center text-amber-400">{row.tied}</td>
                          <td className={`p-3 text-center font-bold ${row.nrr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                          </td>
                          <td className="p-3 text-center font-sans">
                            <div className="flex items-center justify-center gap-0.5">
                              {row.form.slice(0, 5).map((f, fIdx) => (
                                <span
                                  key={fIdx}
                                  className={`w-3.5 h-3.5 rounded text-[8px] font-black flex items-center justify-center ${
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
                          <td className="p-3 text-right font-black text-sm text-amber-400">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {statsTab === 'mvp' && (
              <PlayerStatPanel
                title="MVP Leaderboard — Tournament MVP"
                subtitle="Ranked by total MVP points (Runs + Wickets + Fielding points)"
                emptyLabel="No MVP points recorded yet."
                rows={mvpList}
                columns={[
                  { header: 'MVP Pts', render: (p) => <span className="text-amber-400 font-black">{p.mvpPoints}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  { header: 'Wkts', render: (p) => <span>{p.wickets}</span> },
                  { header: 'Catches', render: (p) => <span>{p.catches}</span> },
                  { header: 'MOM', render: (p) => <span className="text-emerald-400 font-bold">{p.momAwards || '-'}</span> },
                ]}
              />
            )}

            {statsTab === 'runs' && (
              <PlayerStatPanel
                title="Orange Cap / Turban 🧢/👳‍♂️ - Most Runs
                subtitle="Leading run-scorers in this tournament"
                emptyLabel="No batting data recorded yet."
                rows={mostRunsList}
                columns={[
                  { header: 'Runs', render: (p) => <span className="text-amber-400 font-black">{p.runs}</span> },
                  { header: 'Inn', render: (p) => <span>{p.innings}</span> },
                  { header: 'HS', render: (p) => <span>{p.highestScore}{p.highestScoreNotOut ? '*' : ''}</span> },
                  { header: 'SR', render: (p) => <span>{p.strikeRate.toFixed(1)}</span> },
                  { header: '50s/100s', render: (p) => <span>{p.fifties}/{p.centuries}</span> },
                ]}
              />
            )}

            {statsTab === 'wickets' && (
              <PlayerStatPanel
                title="Purple Cap / Turban 🧢/👳‍♂️ - Most Wickets"

                subtitle="Leading wicket-takers in this tournament"
                emptyLabel="No bowling data recorded yet."
                rows={mostWicketsList}
                columns={[
                  { header: 'Wkts', render: (p) => <span className="text-amber-400 font-black">{p.wickets}</span> },
                  { header: 'Overs', render: (p) => <span>{p.oversBowled}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runsConceded}</span> },
                  { header: 'Econ', render: (p) => <span>{p.economy.toFixed(2)}</span> },
                  { header: 'Best', render: (p) => <span>{p.bestBowlingWickets ? `${p.bestBowlingWickets}/${p.bestBowlingRuns}` : '-'}</span> },

              />
            )}

            {statsTab === 'fielding' && (
              <PlayerStatPanel
                title="Best Fielders"
                subtitle="Catches, run outs, and stumpings"
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
                  title="Most Fours (4s)"
                  subtitle="Boundary count across all matches"
                  emptyLabel="No fours hit yet."
                  rows={mostFoursList}
                  bare
                  columns={[
                    { header: '4s', render: (p) => <span className="text-amber-400 font-black">{p.fours}</span> },
                    { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  ]}
                />
                <PlayerStatPanel
                  title="Most Sixes (6s)"
                  subtitle="Maximums hit out of the rooftop"
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

            {statsTab === 'ballsFaced' && (
              <PlayerStatPanel
                title="Most Balls Faced"
                subtitle="Batting time and resilience"
                emptyLabel="No batting data yet."
                rows={mostBallsFacedList}
                columns={[
                  { header: 'Balls', render: (p) => <span className="text-amber-400 font-black">{p.ballsFaced}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runs}</span> },
                  { header: 'SR', render: (p) => <span>{p.strikeRate.toFixed(1)}</span> },
                ]}
              />
            )}

            {statsTab === 'dots' && (
              <PlayerStatPanel
                title="Dot Balls Bowled"
                subtitle="Economic bowling pressure"
                emptyLabel="No bowling data yet."
                rows={mostDotsList}
                columns={[
                  { header: 'Dots', render: (p) => <span className="text-amber-400 font-black">{p.dots}</span> },
                  { header: 'Overs', render: (p) => <span>{p.oversBowled}</span> },
                  { header: 'Wkts', render: (p) => <span>{p.wickets}</span> },
                  { header: 'Econ', render: (p) => <span>{p.economy.toFixed(2)}</span> },
                ]}
              />
            )}
          </div>

          {/* Status Manager Panel (When Open) */}
          {isStatusManagerOpen && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-black text-white">
                    Playoff & Knockout Status Controls
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">Tap status to update instantly</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedTournament.teams || []).map((tId) => {
                  const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
                  if (!teamObj?.id) return null;
                  const currentStatus: TeamTournamentStatus =
                    (selectedTournament.teamStatuses && selectedTournament.teamStatuses[teamObj.id]) || 'none';
                  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['none'];

                  return (
                    <div key={teamObj.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: teamObj.color || '#10b981' }} />
                        <span className="font-bold text-xs text-white truncate">{teamObj.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(['qualified', 'semi_final', 'final', 'champion', 'eliminated'] as TeamTournamentStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateTeamStatus(teamObj.id, currentStatus === st ? 'none' : st)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                              currentStatus === st
                                ? STATUS_CONFIG[st].badgePill
                                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {STATUS_CONFIG[st].badgeShort}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Tournament Fixtures */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Tournament Fixtures & Matches ({tournamentMatches.length})</span>
              </span>
            </div>

            {tournamentMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800 text-xs">
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
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {m.status === 'live' ? (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black uppercase animate-pulse">
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {m.date || 'Fixtures'}
                            </span>
                          )}
                          <span className="font-black text-xs text-white truncate">
                            {m.teamA.name} vs {m.teamB.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {m.status === 'live' ? (
                            <span className="text-emerald-400 font-bold">Match in progress</span>
                          ) : m.result ? (
                            <span className="text-amber-400 font-bold">🏆 {m.result.summary}</span>
                          ) : (
                            <span>Scheduled • {m.totalOvers} Overs</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onOpenScorecard(m)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                          title="View Scorecard"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        <button
                          onClick={() => onSelectMatchToScore(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            m.status === 'completed'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : canScoreThisMatch
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black shadow-md'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold'
                          }`}
                        >
                          {m.status === 'completed' ? (
                            <span>Card</span>
                          ) : canScoreThisMatch ? (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Score</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Watch</span>
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
                <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 text-xl font-black">
                  🏆
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Edit Tournament</h3>
                  <p className="text-xs text-slate-400">Update trophy details and format</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingTournament(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTournamentEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tournament Banner Photo
                </label>
                {editBannerImage ? (
                  <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-slate-700 mb-2">
                    <img src={editBannerImage} alt="Banner" className="w-full h-full object-cover" />
                    <label className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/70 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                      <Camera className="w-3 h-3" />
                      <span>Change</span>
                      <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center gap-1 cursor-pointer">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-xs text-slate-300">Upload Banner Image</span>
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tournament ID</label>
                  <input
                    type="text"
                    value={editTournamentId}
                    onChange={(e) => setEditTournamentId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tournament Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Trophy Name</label>
                  <input
                    type="text"
                    value={editTrophyName}
                    onChange={(e) => setEditTrophyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Season</label>
                  <input
                    type="text"
                    value={editSeason}
                    onChange={(e) => setEditSeason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingTournament(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Status Selection Modal */}
      {selectedTeamForStatusModal && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-black text-white">
                Set Status: {selectedTeamForStatusModal.name}
              </h3>
              <button
                onClick={() => setSelectedTeamForStatusModal(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
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
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? `${cfg.badgePill} ring-1 ring-amber-400`
                        : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span>
                      <span className="text-xs font-bold">{cfg.label}</span>
                    </div>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Team Profile Inspector Modal */}
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
