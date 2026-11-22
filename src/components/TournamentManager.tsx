import React, { useState, useMemo, useEffect } from 'react';
import { Tournament, Team, Match, PointsTableRow, Player, TeamTournamentStatus } from '../types/cricket';
import { 
  Plus, Trophy, Sparkles, Calendar, MapPin, Play, FileText, Settings, Edit3, 
  Image as ImageIcon, X, Check, Camera, Eye, Users, Shield, Copy, Hash, Award, 
  Flame, Zap, CheckCircle2, XCircle, Crown, Sliders, ChevronDown, BarChart3, 
  Target, Gem, Star, ArrowUpRight, Activity, Share2, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TeamProfileModal } from './TeamProfileModal';
import { TournamentCompareModal } from './TournamentCompareModal';
import { TournamentAwardsModal } from './TournamentAwardsModal';
import { BatterVsBowlerModal } from './BatterVsBowlerModal';
import { PartnershipModal } from './PartnershipModal';
import { calculateTournamentStats, TournamentPlayerStat, bestBowlingLabel } from '../utils/tournamentStats';

type StatsTab = 'points' | 'mvp' | 'runs' | 'wickets' | 'fielding' | 'boundaries' | 'dots' | 'ballsFaced';

// Tournament stages a team can be marked with. The first six are the original ones;
// quarter_final and runner_up are new (kept as plain strings so older data still works).
export type StatusKey = TeamTournamentStatus | 'quarter_final' | 'runner_up';

export const STATUS_ORDER: StatusKey[] = [
  'none', 'qualified', 'quarter_final', 'semi_final', 'final', 'champion', 'runner_up', 'eliminated',
];

export const STATUS_CONFIG: Record<
  string,
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
    posterLabel: string;
    posterColor: string;
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
    posterLabel: '',
    posterColor: '#64748b',
  },
  qualified: {
    label: 'Qualified',
    punjabiLabel: 'ਕੁਆਲੀਫਾਈ',
    badgeShort: 'Q',
    badgePill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10',
    border: 'border-emerald-500/60',
    textColor: 'text-emerald-400 font-black',
    dotColor: 'bg-emerald-400',
    icon: '✅',
    description: 'Qualified for Playoffs / Knockouts',
    posterLabel: 'QUALIFIED',
    posterColor: '#10b981',
  },
  quarter_final: {
    label: 'Quarter-Finalist',
    punjabiLabel: 'ਕੁਆਰਟਰ-ਫਾਈਨਲ',
    badgeShort: 'QF',
    badgePill: 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-sm shadow-violet-500/10',
    border: 'border-violet-500/60',
    textColor: 'text-violet-400 font-black',
    dotColor: 'bg-violet-400',
    icon: '🔷',
    description: 'Advanced to Quarter-Final Match',
    posterLabel: 'QUARTER-FINALIST',
    posterColor: '#8b5cf6',
  },
  semi_final: {
    label: 'Semi-Finalist',
    punjabiLabel: 'ਸੈਮੀ-ਫਾਈਨਲ',
    badgeShort: 'SF',
    badgePill: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10',
    border: 'border-amber-500/60',
    textColor: 'text-amber-400 font-black',
    dotColor: 'bg-amber-400',
    icon: '🔶',
    description: 'Advanced to Semi-Final Match',
    posterLabel: 'SEMI-FINALIST',
    posterColor: '#f59e0b',
  },
  final: {
    label: 'Finalist',
    punjabiLabel: 'ਫਾਈਨਲਿਸਟ',
    badgeShort: 'F',
    badgePill: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/10',
    border: 'border-cyan-500/60',
    textColor: 'text-cyan-400 font-black',
    dotColor: 'bg-cyan-400',
    icon: '⚔️',
    description: 'Reached the Championship Grand Final',
    posterLabel: 'FINALIST',
    posterColor: '#06b6d4',
  },
  champion: {
    label: 'Champion 👑',
    punjabiLabel: 'ਚੈਂਪੀਅਨ / ਜੇਤੂ 👑',
    badgeShort: '🏆 WINNER',
    badgePill: 'bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 text-amber-200 border-amber-400/80 shadow-lg shadow-amber-500/20 font-black',
    border: 'border-amber-400',
    textColor: 'text-amber-300 font-black',
    dotColor: 'bg-yellow-400',
    icon: '👑',
    description: 'Official Tournament Champion',
    posterLabel: 'CHAMPION',
    posterColor: '#fbbf24',
  },
  runner_up: {
    label: 'Runner-up',
    punjabiLabel: 'ਉਪ-ਜੇਤੂ',
    badgeShort: 'RU',
    badgePill: 'bg-slate-300/15 text-slate-200 border-slate-300/50 shadow-sm shadow-slate-300/10',
    border: 'border-slate-300/60',
    textColor: 'text-slate-200 font-black',
    dotColor: 'bg-slate-300',
    icon: '🥈',
    description: 'Lost the Grand Final',
    posterLabel: 'RUNNER-UP',
    posterColor: '#cbd5e1',
  },
  eliminated: {
    label: 'Eliminated',
    punjabiLabel: 'ਬਾਹਰ',
    badgeShort: 'E',
    badgePill: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10',
    border: 'border-rose-500/60',
    textColor: 'text-rose-400 font-black',
    dotColor: 'bg-rose-500',
    icon: '❌',
    description: 'Knocked out from tournament',
    posterLabel: 'ELIMINATED',
    posterColor: '#f43f5e',
  },
};

// ---- Points Table poster: canvas drawing helpers (pure client-side, no
// Firebase storage involved — the PNG is generated in-browser and only
// ever touches the device's own share sheet / downloads). --------------

const hexToRgbPT = (hex: string): [number, number, number] => {
  const clean = (hex || '#10b981').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [16, 185, 129];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const rgbaPT = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgbPT(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawInstagramIconPT = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size * 0.78, y + size * 0.22, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawElevatedPanelPT = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, radius: number,
  fill: string,
  shadowColor = 'rgba(0,0,0,0.4)'
) => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
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
                  <td className="p-3 font-sans">
                    <div className="flex items-center gap-2.5">
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
  // Which tournament's own page is open (null = show the tournament list)
  const [openTournamentId, setOpenTournamentId] = useState<string | null>(initialTournamentId || null);
  const [statsTab, setStatsTab] = useState<StatsTab>('points');
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAwardsOpen, setIsAwardsOpen] = useState(false);
  const [isBvbOpen, setIsBvbOpen] = useState(false);
  const [isPartnershipOpen, setIsPartnershipOpen] = useState(false);
  const [boundarySort, setBoundarySort] = useState<'twos' | 'fours' | 'sixes' | 'runs'>('twos');
  // Phone-only: which points-table row is expanded to show Status / Ties / Form
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [isGeneratingTablePoster, setIsGeneratingTablePoster] = useState(false);

  useEffect(() => {
    if (initialTournamentId) {
      setSelectedTourId(initialTournamentId);
      setOpenTournamentId(initialTournamentId);
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
  const [editGroups, setEditGroups] = useState<{ [teamId: string]: string }>({});
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editTeamSearch, setEditTeamSearch] = useState('');

  const handleUpdateTeamStatus = (teamId: string, status: StatusKey) => {
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
      [teamId]: status as TeamTournamentStatus,
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
    setEditGroups(((tour as any).teamGroups as { [teamId: string]: string }) || {});
    setEditTeamIds([...(tour.teams || [])]);
    setEditTeamSearch('');
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

    const cleanGroups: { [teamId: string]: string } = {};
    editTeamIds.forEach((id) => {
      if (editGroups[id]) cleanGroups[id] = editGroups[id];
    });
    if (editTeamIds.length < 2) {
      alert('Tournament mein kam se kam 2 teams honi chahiye.');
      return;
    }
    const updatedTour = {
      ...selectedTournament,
      teams: editTeamIds,
      teamGroups: cleanGroups,
      tournamentId: editTournamentId.trim().toUpperCase() || selectedTournament.tournamentId || 'TRN-001',
      name: editName.trim(),
      trophyName: editTrophyName.trim() || `${editName.trim()} Trophy`,
      season: editSeason.trim() || 'Season 1',
      location: editLocation.trim() || 'Amritsar Rooftop Arena',
      oversPerMatch: editOvers,
      format: editFormat,
      bannerImage: editBannerImage || undefined,
    } as Tournament;

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
          const isAllOut = inn.isAllOut || inn.wickets === 10;
          let oversForNRR = isAllOut ? (m.totalOvers || actualOversFaced) : actualOversFaced;

          // Agar 0 overs hain toh calculation error se bachne ke liye thoda buffer rakh lo
          if (oversForNRR === 0) oversForNRR = 0.166;

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
  }, [tournamentMatches, teams]);

  // Points table split by group (only when the tournament has groups assigned).
  const pointsGroups = useMemo((): { label: string | null; rows: PointsTableRow[] }[] => {
    const tg = ((selectedTournament as any)?.teamGroups || {}) as { [teamId: string]: string };
    const labels = Array.from(new Set(Object.values(tg).filter(Boolean))).sort();
    if (labels.length === 0) return [{ label: null, rows: pointsTable }];
    const out = labels.map((g) => ({
      label: `Group ${g}`,
      rows: pointsTable.filter((r) => tg[r.teamId] === g),
    }));
    const others = pointsTable.filter((r) => !tg[r.teamId]);
    if (others.length > 0) out.push({ label: 'Other Teams', rows: others });
    return out;
  }, [pointsTable, selectedTournament]);

  // ---- Points Table poster: builds a shareable PNG entirely on-device.
  // Uses the same `pointsTable` array already computed above for the on-
  // screen table, so the shared image always matches what's on screen —
  // no separate calculation, no server round-trip.
  const drawPointsTablePoster = (): HTMLCanvasElement => {
    const W = 1080;
    const rowH = 112;
    const colHeadH = 64;
    const groupHeadH = 74;
    const groupGap = 44;
    const headerBlockH = 500;
    const footerH = 200;

    const canvas = document.createElement('canvas');
    const t = selectedTournament;
    const groups = pointsGroups.filter((g) => g.rows.length > 0);
    const statuses = ((t && t.teamStatuses) || {}) as { [id: string]: string };
    const championRow = pointsTable.find((r) => statuses[r.teamId] === 'champion');
    const bannerH = championRow ? 170 : 0;
    let bodyH = 0;
    groups.forEach((g) => {
      bodyH += (g.label ? groupHeadH : 0) + colHeadH + g.rows.length * rowH + groupGap;
    });
    const H = headerBlockH + bannerH + bodyH + footerH;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx || !t) return canvas;

    const fit = (text: string, maxW: number): string => {
      if (ctx.measureText(text).width <= maxW) return text;
      let d = text;
      while (d.length > 3 && ctx.measureText(d + '…').width > maxW) d = d.slice(0, -1);
      return d.trim() + '…';
    };
    const goldGrad = (x1: number, x2: number) => {
      const g = ctx.createLinearGradient(x1, 0, x2, 0);
      g.addColorStop(0, '#fde68a');
      g.addColorStop(0.5, '#f59e0b');
      g.addColorStop(1, '#fde68a');
      return g;
    };

    // ---- Background: deep navy, golden crown glow, fine diagonal pinstripes ----
    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 0, 30, W / 2, 0, 820);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.30)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 900);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.022)';
    ctx.lineWidth = 2;
    for (let x = -H; x < W; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H * 0.58, H);
      ctx.stroke();
    }
    ctx.restore();
    const bottomFade = ctx.createLinearGradient(0, H - 300, 0, H);
    bottomFade.addColorStop(0, 'transparent');
    bottomFade.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, H - 300, W, 300);

    // ---- Double frame (gold outer, faint inner) ----
    ctx.strokeStyle = 'rgba(245,158,11,0.55)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // ---- Header ----
    ctx.textAlign = 'center';
    let y = 116;
    ctx.save();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 24px sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('AMRITSAR ROOFTOP CRICKET LEAGUE', W / 2, y);
    ctx.restore();
    ctx.strokeStyle = 'rgba(245,158,11,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(90, y + 26); ctx.lineTo(W / 2 - 60, y + 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 60, y + 26); ctx.lineTo(W - 90, y + 26); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 22px sans-serif';
    ctx.fillText('🏆', W / 2, y + 36);

    // Tournament name: biggest size that fits
    y += 130;
    let size = 84;
    const tname = (t.name || 'TOURNAMENT').toUpperCase();
    ctx.font = `900 ${size}px sans-serif`;
    while (ctx.measureText(tname).width > W - 150 && size > 34) {
      size -= 2;
      ctx.font = `900 ${size}px sans-serif`;
    }
    ctx.save();
    ctx.shadowColor = 'rgba(245,158,11,0.55)';
    ctx.shadowBlur = 34;
    ctx.fillStyle = goldGrad(W / 2 - 300, W / 2 + 300);
    ctx.fillText(tname, W / 2, y);
    ctx.restore();

    y += 52;
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 26px sans-serif';
    ctx.fillText(fit((t.trophyName || '').toUpperCase(), W - 160), W / 2, y);

    y += 40;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(fit(`${t.season || ''}  •  ${t.location || ''}  •  ${t.oversPerMatch} Overs`, W - 160), W / 2, y);

    // Two pills: POINTS TABLE + matches played
    y += 62;
    const played = completedMatchesCount;
    const pills = [
      { text: 'POINTS TABLE', fill: '#059669', glow: 'rgba(5,150,105,0.45)' },
      { text: `AFTER ${played} MATCH${played === 1 ? '' : 'ES'}`, fill: '#b45309', glow: 'rgba(180,83,9,0.45)' },
    ];
    ctx.font = '900 20px sans-serif';
    const pillH = 52;
    const pillWs = pills.map((p) => ctx.measureText(p.text).width + 64);
    const pillGap = 18;
    let px = W / 2 - (pillWs[0] + pillWs[1] + pillGap) / 2;
    pills.forEach((p, i) => {
      drawElevatedPanelPT(ctx, px, y - pillH / 2, pillWs[i], pillH, pillH / 2, p.fill, p.glow);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, px + pillWs[i] / 2, y + 7);
      px += pillWs[i] + pillGap;
    });

    y = headerBlockH;

    // ---- Champion banner ----
    if (championRow) {
      const bx = 56;
      const bw = W - 112;
      const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bg.addColorStop(0, 'rgba(245,158,11,0.30)');
      bg.addColorStop(0.5, 'rgba(253,224,71,0.18)');
      bg.addColorStop(1, 'rgba(245,158,11,0.30)');
      drawElevatedPanelPT(ctx, bx, y, bw, bannerH - 26, 28, bg as any, 'rgba(245,158,11,0.4)');
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(bx, y, bw, bannerH - 26, 28); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde68a';
      ctx.font = '900 24px sans-serif';
      ctx.save();
      ctx.letterSpacing = '8px';
      ctx.fillText('CHAMPIONS', W / 2, y + 48);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 54px sans-serif';
      ctx.fillText(fit(`👑 ${championRow.teamName.toUpperCase()}`, bw - 80), W / 2, y + 112);
      y += bannerH;
    }

    // ---- Tables (one per group, or one overall) ----
    const tableX = 56;
    const tableW = W - 112;
    const rankColors = ['#f59e0b', '#cbd5e1', '#c2410c'];
    const nameX = tableX + 170;
    const pColX = tableX + tableW * 0.585;
    const wColX = tableX + tableW * 0.66;
    const lColX = tableX + tableW * 0.735;
    const nrrColX = tableX + tableW * 0.825;
    const ptsRight = tableX + tableW - 26;

    groups.forEach((g) => {
      if (g.label) {
        drawElevatedPanelPT(ctx, tableX, y, tableW, groupHeadH - 14, 18, 'rgba(245,158,11,0.10)', 'rgba(0,0,0,0.3)');
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.roundRect(tableX, y, 10, groupHeadH - 14, [18, 0, 0, 18]); ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 32px sans-serif';
        ctx.save();
        ctx.letterSpacing = '4px';
        ctx.fillText(g.label.toUpperCase(), tableX + 34, y + 42);
        ctx.restore();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 20px sans-serif';
        ctx.fillText(`${g.rows.length} TEAMS`, tableX + tableW - 28, y + 40);
        y += groupHeadH;
      }

      // Column header
      const hy = y + colHeadH / 2 + 7;
      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('TEAM', nameX, hy);
      ctx.textAlign = 'center';
      ctx.fillText('P', pColX, hy);
      ctx.fillText('W', wColX, hy);
      ctx.fillText('L', lColX, hy);
      ctx.fillText('NRR', nrrColX, hy);
      ctx.textAlign = 'right';
      ctx.fillText('PTS', ptsRight, hy);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tableX, y + colHeadH - 4); ctx.lineTo(tableX + tableW, y + colHeadH - 4); ctx.stroke();
      y += colHeadH;

      g.rows.forEach((row, idx) => {
        const st = statuses[row.teamId] || 'none';
        const cfg = STATUS_CONFIG[st] || STATUS_CONFIG['none'];
        const isTop3 = idx < 3;
        const isChamp = st === 'champion';
        const isOut = st === 'eliminated';
        const rh = rowH - 12;
        const cy = y + rh / 2;

        ctx.save();
        if (isOut) ctx.globalAlpha = 0.6;

        const bgFill = isChamp
          ? 'rgba(245,158,11,0.16)'
          : isTop3
          ? rgbaPT(rankColors[idx], 0.09)
          : idx % 2 === 0
          ? 'rgba(15,23,42,0.80)'
          : 'rgba(15,23,42,0.55)';
        drawElevatedPanelPT(ctx, tableX, y, tableW, rh, 20, bgFill, 'rgba(0,0,0,0.3)');
        if (isChamp) {
          ctx.strokeStyle = 'rgba(251,191,36,0.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.roundRect(tableX, y, tableW, rh, 20); ctx.stroke();
        }
        // team colour stripe on the left edge
        ctx.fillStyle = row.teamColor || '#10b981';
        ctx.beginPath(); ctx.roundRect(tableX, y, 9, rh, [20, 0, 0, 20]); ctx.fill();

        // rank medal
        ctx.beginPath();
        ctx.fillStyle = isTop3 ? rankColors[idx] : 'rgba(255,255,255,0.08)';
        ctx.arc(tableX + 52, cy, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isTop3 ? '#05070d' : '#94a3b8';
        ctx.font = '900 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), tableX + 52, cy + 9);

        // team badge (initials on team colour)
        const bx = tableX + 118;
        const bgd = ctx.createLinearGradient(bx - 30, cy - 30, bx + 30, cy + 30);
        bgd.addColorStop(0, rgbaPT(row.teamColor || '#10b981', 1));
        bgd.addColorStop(1, rgbaPT(row.teamColor || '#10b981', 0.55));
        ctx.save();
        ctx.shadowColor = rgbaPT(row.teamColor || '#10b981', 0.55);
        ctx.shadowBlur = 16;
        ctx.fillStyle = bgd;
        ctx.beginPath(); ctx.arc(bx, cy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx, cy, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#05070d';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((row.teamShortName || row.teamName).slice(0, 3).toUpperCase(), bx, cy + 7);

        // team name
        const maxNameW = pColX - 40 - nameX;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        let nameSize = 29;
        ctx.font = `900 ${nameSize}px sans-serif`;
        while (ctx.measureText(row.teamName).width > maxNameW && nameSize > 21) {
          nameSize -= 1;
          ctx.font = `900 ${nameSize}px sans-serif`;
        }
        ctx.fillText(fit(row.teamName, maxNameW), nameX, cy - 8);

        // second line: status chip + last 5 results
        let sx = nameX;
        const sy = cy + 16;
        if (st !== 'none' && cfg.posterLabel) {
          ctx.font = '900 14px sans-serif';
          const chipW = ctx.measureText(cfg.posterLabel).width + 26;
          ctx.fillStyle = rgbaPT(cfg.posterColor, 0.2);
          ctx.beginPath(); ctx.roundRect(sx, sy - 14, chipW, 26, 13); ctx.fill();
          ctx.strokeStyle = rgbaPT(cfg.posterColor, 0.75);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(sx, sy - 14, chipW, 26, 13); ctx.stroke();
          ctx.fillStyle = cfg.posterColor;
          ctx.textAlign = 'center';
          ctx.fillText(cfg.posterLabel, sx + chipW / 2, sy + 5);
          sx += chipW + 12;
        }
        const form = row.form.slice(0, 5).slice().reverse();
        form.forEach((f, i) => {
          const fx = sx + i * 30;
          ctx.fillStyle = f === 'W' ? '#059669' : f === 'L' ? '#e11d48' : '#d97706';
          ctx.beginPath(); ctx.roundRect(fx, sy - 13, 25, 25, 7); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f, fx + 12.5, sy + 5);
        });

        // numbers
        ctx.textAlign = 'center';
        ctx.font = '800 27px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(String(row.played), pColX, cy + 9);
        ctx.fillStyle = '#34d399';
        ctx.fillText(String(row.won), wColX, cy + 9);
        ctx.fillStyle = '#fb7185';
        ctx.fillText(String(row.lost), lColX, cy + 9);
        ctx.fillStyle = row.nrr >= 0 ? '#34d399' : '#fb7185';
        ctx.font = '900 22px monospace';
        ctx.fillText((row.nrr > 0 ? '+' : '') + row.nrr.toFixed(3), nrrColX, cy + 8);

        // points pill
        const ptsW = 82;
        ctx.fillStyle = 'rgba(245,158,11,0.14)';
        ctx.beginPath(); ctx.roundRect(ptsRight - ptsW + 4, cy - 29, ptsW, 58, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(245,158,11,0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(ptsRight - ptsW + 4, cy - 29, ptsW, 58, 16); ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 36px sans-serif';
        ctx.fillText(String(row.points), ptsRight - ptsW / 2 + 4, cy + 13);

        ctx.restore();
        y += rowH;
      });
      y += groupGap;
    });

    // ---- Footer ----
    const footerY = H - 100;
    ctx.strokeStyle = 'rgba(245,158,11,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 240, footerY - 40);
    ctx.lineTo(W / 2 + 240, footerY - 40);
    ctx.stroke();

    ctx.font = '900 28px sans-serif';
    const igText = '@amritsarrooftopcricket';
    const igIconSize = 32;
    const igGap = 12;
    const igTextW = ctx.measureText(igText).width;
    const igStartX = W / 2 - (igIconSize + igGap + igTextW) / 2;
    drawInstagramIconPT(ctx, igStartX, footerY - igIconSize / 2 - 2, igIconSize, '#f8fafc');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(igText, igStartX + igIconSize + igGap, footerY + 10);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '700 18px sans-serif';
    const upd = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    ctx.fillText(`ARCL ROOFTOP LEAGUE  •  OFFICIAL POINTS TABLE  •  UPDATED ${upd}`, W / 2, footerY + 48);

    return canvas;
  };

  const handleSharePointsTable = async () => {
    if (!selectedTournament || pointsTable.length === 0) return;
    try {
      setIsGeneratingTablePoster(true);
      cricketAudio.playClick();
      const canvas = drawPointsTablePoster();
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ARCL_Points_Table_${selectedTournament.id}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${selectedTournament.name} — Points Table`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ARCL_Points_Table_${selectedTournament.name}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('Error sharing points table:', e);
      if (e?.name !== 'AbortError') {
        alert("Share cancel ho gaya ya fail ho gaya. Neeche 'Save' se seedha gallery mein download kar sakte hain.");
      }
    } finally {
      setIsGeneratingTablePoster(false);
    }
  };

  const handleDownloadPointsTable = () => {
    if (!selectedTournament || pointsTable.length === 0) return;
    cricketAudio.playClick();
    const canvas = drawPointsTablePoster();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARCL_Points_Table_${selectedTournament.name}.png`;
    a.click();
  };

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
  // One combined 2s / 4s / 6s table. 2s are counted from ball data (bat scored exactly 2,
  // not a boundary); 4s and 6s come from the normal tournament stats.
  type BoundaryRow = TournamentPlayerStat & { twos: number; boundaryRuns: number };
  const boundaryRows = useMemo((): BoundaryRow[] => {
    const twosMap: { [pid: string]: { n: number; name: string; teamId?: string } } = {};
    (tournamentMatches || []).forEach((m) => {
      ([m?.innings1, m?.innings2, m?.innings3, m?.innings4] as const).forEach((inn) => {
        if (!inn || !Array.isArray(inn.balls)) return;
        inn.balls.forEach((b) => {
          if (!b || b.runsBat !== 2 || b.isFour || b.isSix || !b.strikerId) return;
          const c = twosMap[b.strikerId] || (twosMap[b.strikerId] = { n: 0, name: b.strikerName || 'Player', teamId: inn.teamId });
          c.n += 1;
        });
      });
    });
    const out: BoundaryRow[] = [];
    const seen = new Set<string>();
    tournamentPlayerStats.forEach((p) => {
      seen.add(p.playerId);
      const twos = twosMap[p.playerId]?.n || 0;
      if (twos + (p.fours || 0) + (p.sixes || 0) === 0) return;
      out.push({ ...p, twos, boundaryRuns: twos * 2 + (p.fours || 0) * 4 + (p.sixes || 0) * 6 });
    });
    Object.keys(twosMap).forEach((pid) => {
      if (seen.has(pid)) return;
      const teamObj = (teams || []).find((t) => t && t.id === twosMap[pid].teamId);
      out.push({
        playerId: pid,
        playerName: twosMap[pid].name,
        teamName: teamObj?.name || '',
        teamColor: teamObj?.color || '#10b981',
        runs: 0,
        fours: 0,
        sixes: 0,
        twos: twosMap[pid].n,
        boundaryRuns: twosMap[pid].n * 2,
      } as unknown as BoundaryRow);
    });
    return out;
  }, [tournamentMatches, tournamentPlayerStats, teams]);

  const boundarySortedRows = useMemo(() => {
    const val = (r: BoundaryRow) =>
      boundarySort === 'twos' ? r.twos : boundarySort === 'fours' ? r.fours : boundarySort === 'sixes' ? r.sixes : r.boundaryRuns;
    return [...boundaryRows].sort((a, b) => val(b) - val(a) || b.boundaryRuns - a.boundaryRuns || b.runs - a.runs);
  }, [boundaryRows, boundarySort]);

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
    { key: 'boundaries', label: '2s, 4s & 6s', icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'ballsFaced', label: 'Balls Faced', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'dots', label: 'Dot Balls', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {!openTournamentId && (<>
      {/* Broadcast Header Hub */}
      <div className="p-4 sm:p-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 shadow-xl flex flex-row items-center justify-between gap-3">
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
        </div>

        {loggedInPlayer && (
          <button
            onClick={() => {
              onOpenCreateTournament();
              cricketAudio.playClick();
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create</span>
          </button>
        )}
      </div>

      {/* Tabs Filter (All vs My Tournaments) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800 max-w-full overflow-x-auto">
          <button
            onClick={() => {
              setTabFilter('all');
              cricketAudio.playClick();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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

      {/* Tournament list: compact rows, tap one to open its own page */}
      <div className="space-y-2">
        {displayedTournaments.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center rounded-2xl border border-slate-800 bg-slate-900">
            {tabFilter === 'my' ? "You haven't created any tournaments yet." : "No tournaments available."}
          </div>
        ) : (
          displayedTournaments.map((t) => {
            const tMatches = (allMatches || []).filter((m) => m && m.tournamentId === t.id);
            const completed = tMatches.filter((m) => m.status === 'completed');
            const played = completed.length;
            const liveNow = tMatches.filter((m) => m.status === 'live').length;
            const progressPct = tMatches.length > 0 ? Math.min(100, (played / tMatches.length) * 100) : 0;

            // Leader (league points: win 2, tie 1)
            const pts: { [id: string]: { name: string; points: number; wins: number } } = {};
            completed.forEach((m) => {
              if (!m.result) return;
              [m.teamA, m.teamB].forEach((tm) => {
                if (tm?.id && !pts[tm.id]) pts[tm.id] = { name: tm.name, points: 0, wins: 0 };
              });
              if (m.result.isTie) {
                [m.teamA?.id, m.teamB?.id].forEach((id) => { if (id && pts[id]) pts[id].points += 1; });
              } else if (m.result.winnerTeamId && pts[m.result.winnerTeamId]) {
                pts[m.result.winnerTeamId].points += 2;
                pts[m.result.winnerTeamId].wins += 1;
              }
            });
            const leader = Object.values(pts).sort((x, y) => y.points - x.points || y.wins - x.wins)[0];
            const championTeam = (teams || []).find((tm) => tm?.id && t.teamStatuses?.[tm.id] === 'champion');

            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTourId(t.id);
                  setOpenTournamentId(t.id);
                  setStatsTab('points');
                  cricketAudio.playClick();
                }}
                className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-lg hover:border-amber-400/60 transition cursor-pointer active:scale-[0.99] overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {liveNow > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                      ● {liveNow} LIVE
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 overflow-hidden">
                      {t.bannerImage ? (
                        <img src={t.bannerImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-amber-400 leading-snug break-words">{t.name}</h3>
                      <div className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5 break-words">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{t.location}</span>
                      </div>
                    </div>
                  </div>

                  {championTeam ? (
                    <div className="text-xs font-black text-amber-300">👑 Champion: {championTeam.name}</div>
                  ) : leader ? (
                    <div className="text-xs font-bold text-emerald-400">🥇 {leader.name} leading • {leader.points} pts</div>
                  ) : (
                    <div className="text-xs font-bold text-slate-500">Matches yet to start</div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Teams', value: (t.teams || []).length },
                      { label: 'Played', value: played },
                      { label: 'Total Matches', value: tMatches.length },
                    ].map((x) => (
                      <div key={x.label} className="rounded-xl bg-slate-950/70 border border-slate-800 py-2 text-center">
                        <div className="text-base font-black text-white leading-none">{x.value}</div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wide">{x.label}</div>
                      </div>
                    ))}
                  </div>

                  {tMatches.length > 0 && (
                    <div className="h-1.5 rounded-full overflow-hidden bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 font-mono truncate">
                    {t.creatorName ? `By ${t.creatorName}` : t.tournamentId || ''}
                  </span>
                  <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Open Tournament</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>)}

      {openTournamentId && selectedTournament && (
        <div className="space-y-6">
          {/* Back to the tournament list */}
          <button
            onClick={() => {
              setOpenTournamentId(null);
              cricketAudio.playClick();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-black transition cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>All Tournaments</span>
          </button>

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

            <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

                <div className="flex items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-400 flex-wrap pt-0.5">
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
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => onAddNewMatchForTournament(selectedTournament.id)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Match</span>
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
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-sm uppercase tracking-wider text-white">
                      Tournament Leaderboard & Stats
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Live standings across {selectedTournament.teams.length} teams
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {statsTab === 'points' && pointsTable.length > 0 && (
                    <button
                      onClick={handleSharePointsTable}
                      disabled={isGeneratingTablePoster}
                      className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/40 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isGeneratingTablePoster ? 'Generating...' : 'Share'}</span>
                    </button>
                  )}

                  {tournamentPlayerStats.length > 1 && (
                    <button
                      onClick={() => {
                        cricketAudio.playClick();
                        setIsCompareOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Compare</span>
                    </button>
                  )}

                  {tournamentPlayerStats.length > 0 && (
                    <button
                      onClick={() => {
                        cricketAudio.playClick();
                        setIsAwardsOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border bg-gradient-to-r from-orange-500 to-violet-600 border-orange-400/40 text-white shadow-md"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Awards</span>
                    </button>
                  )}

                  {tournamentMatches.length > 0 && (
                    <button
                      onClick={() => {
                        cricketAudio.playClick();
                        setIsBvbOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border bg-gradient-to-r from-blue-600 to-orange-500 border-blue-400/40 text-white shadow-md"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Bat vs Ball</span>
                    </button>
                  )}

                  {tournamentMatches.length > 0 && (
                    <button
                      onClick={() => {
                        cricketAudio.playClick();
                        setIsPartnershipOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400/40 text-white shadow-md"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Partnership</span>
                    </button>
                  )}

                  {canEditSelectedTournament && statsTab === 'points' && (
                    <button
                      onClick={() => setIsStatusManagerOpen((prev) => !prev)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border ${
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
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer border whitespace-nowrap ${
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

            {/* Tab 1: Points Table
                Phone: Team, P, W, L, NRR, PTS (big text). Tap the arrow on a row to see Status / Ties / Form.
                Large screens (lg+): full table with every column. */}
            {statsTab === 'points' && (
              <div className="space-y-5">
              {pointsGroups.map((grp) => (
              <div key={grp.label || 'all'}>
                {grp.label && (
                  <div className="px-4 py-2 bg-slate-950/80 border-y border-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">{grp.label}</span>
                  </div>
                )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm lg:text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] lg:text-[10px] font-sans border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 lg:p-3">Team</th>
                      <th className="hidden lg:table-cell p-3 text-center">Status</th>
                      <th className="p-2.5 lg:p-3 text-center">P</th>
                      <th className="p-2.5 lg:p-3 text-center">W</th>
                      <th className="p-2.5 lg:p-3 text-center">L</th>
                      <th className="hidden lg:table-cell p-3 text-center">T</th>
                      <th className="p-2.5 lg:p-3 text-center">NRR</th>
                      <th className="hidden lg:table-cell p-3 text-center">Form</th>
                      <th className="p-2.5 lg:p-3 text-right font-black">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {grp.rows.map((row, idx) => {
                      const matchedTeam = (teams || []).find((t) => t && (t.id === row?.teamId || t.name?.toLowerCase() === row?.teamName?.toLowerCase()));
                      const currentStatus: StatusKey =
                        (selectedTournament?.teamStatuses && row?.teamId && selectedTournament.teamStatuses[row.teamId]) || 'none';
                      const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['none'];
                      const isExpanded = expandedTeamId === row.teamId;

                      return (
                        <React.Fragment key={row.teamId}>
                        <tr
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
                          <td className="p-2.5 lg:p-3 font-sans">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-6 h-6 lg:w-5 lg:h-5 rounded-full flex items-center justify-center font-bold text-[11px] lg:text-[10px] shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : idx === 1
                                  ? 'bg-slate-300 text-slate-950 font-black'
                                  : 'text-slate-500'
                              }`}>
                                {idx + 1}
                              </span>
                              <div
                                onClick={() => {
                                  if (matchedTeam) {
                                    cricketAudio.playClick();
                                    setInspectedTeam(matchedTeam);
                                  }
                                }}
                                className="flex items-center gap-2 min-w-0 cursor-pointer group"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: row.teamColor || '#10b981' }}
                                />
                                <span className="font-bold text-slate-100 group-hover:text-amber-400 transition truncate max-w-[110px] sm:max-w-[200px] lg:max-w-[180px]">
                                  {row.teamName}
                                </span>
                              </div>
                              {/* Phone only: tiny status letter + expand arrow */}
                              {currentStatus !== 'none' && (
                                <span className={`lg:hidden shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-black border ${statusInfo.badgePill}`}>
                                  {statusInfo.badgeShort === '🏆 WINNER' ? '🏆' : statusInfo.badgeShort}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  cricketAudio.playClick();
                                  setExpandedTeamId(isExpanded ? null : row.teamId);
                                }}
                                className="lg:hidden shrink-0 p-1 rounded-lg text-slate-400 hover:text-white"
                                title="Show status, ties and form"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>

                          <td className="hidden lg:table-cell p-3 text-center font-sans">
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

                          <td className="p-2.5 lg:p-3 text-center text-slate-300">{row.played}</td>
                          <td className="p-2.5 lg:p-3 text-center text-emerald-400 font-bold">{row.won}</td>
                          <td className="p-2.5 lg:p-3 text-center text-rose-400 font-bold">{row.lost}</td>
                          <td className="hidden lg:table-cell p-3 text-center text-amber-400">{row.tied}</td>
                          <td className={`p-2.5 lg:p-3 text-center font-bold ${row.nrr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                          </td>
                          <td className="hidden lg:table-cell p-3 text-center font-sans">
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
                          <td className="p-2.5 lg:p-3 text-right font-black text-base lg:text-sm text-amber-400">
                            {row.points}
                          </td>
                        </tr>

                        {/* Phone only: expanded details row */}
                        {isExpanded && (
                          <tr className="lg:hidden bg-slate-950/70">
                            <td colSpan={6} className="px-3 py-3 font-sans">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] uppercase font-bold text-slate-500">Form</span>
                                  <div className="flex items-center gap-1">
                                    {row.form.slice(0, 5).map((f, fIdx) => (
                                      <span
                                        key={fIdx}
                                        className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${
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
                                    {row.form.length === 0 && <span className="text-slate-600 text-sm">-</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] uppercase font-bold text-slate-500">Tied</span>
                                  <span className="text-sm font-black text-amber-400">{row.tied}</span>
                                </div>

                                {canEditSelectedTournament ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (matchedTeam) {
                                        cricketAudio.playClick();
                                        setSelectedTeamForStatusModal(matchedTeam);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition cursor-pointer ${statusInfo.badgePill}`}
                                  >
                                    <span>{statusInfo.icon}</span>
                                    <span>{currentStatus === 'none' ? 'Set Status' : statusInfo.label}</span>
                                  </button>
                                ) : (
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${statusInfo.badgePill}`}>
                                    <span>{statusInfo.icon}</span>
                                    <span>{statusInfo.label}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
              ))}
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
                title="Orange Cap / Turban 🧢/ 👳 - Most Runs"
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
                title="Purple Cap / Turban 🧢/ 👳 - Most Wickets"
                subtitle="Leading wicket-takers in this tournament"
                emptyLabel="No bowling data recorded yet."
                rows={mostWicketsList}
                columns={[
                  { header: 'Wkts', render: (p) => <span className="text-amber-400 font-black">{p.wickets}</span> },
                  { header: 'Overs', render: (p) => <span>{p.oversBowled}</span> },
                  { header: 'Runs', render: (p) => <span>{p.runsConceded}</span> },
                  { header: 'Econ', render: (p) => <span>{p.economy.toFixed(2)}</span> },
                  { header: 'Best', render: (p) => <span>{p.bestBowlingWickets}/{p.bestBowlingRuns}</span> }
                ]}
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
              <div>
                <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-1.5 flex-wrap bg-slate-950/60 border-b border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1">Rank by</span>
                  {([
                    ['twos', '2s'],
                    ['fours', '4s'],
                    ['sixes', '6s'],
                    ['runs', 'Runs'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setBoundarySort(key);
                        cricketAudio.playClick();
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition cursor-pointer ${
                        boundarySort === key
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <PlayerStatPanel
                  title="Scoring Shots"
                  subtitle="2s, 4s and 6s per player. Runs = runs scored from these shots"
                  emptyLabel="No 2s, 4s or 6s recorded yet."
                  rows={boundarySortedRows}
                  bare
                  columns={[
                    {
                      header: '2s',
                      render: (p) => (
                        <span className={boundarySort === 'twos' ? 'text-amber-400 font-black' : ''}>{(p as BoundaryRow).twos}</span>
                      ),
                    },
                    {
                      header: '4s',
                      render: (p) => <span className={boundarySort === 'fours' ? 'text-amber-400 font-black' : ''}>{p.fours}</span>,
                    },
                    {
                      header: '6s',
                      render: (p) => <span className={boundarySort === 'sixes' ? 'text-amber-400 font-black' : ''}>{p.sixes}</span>,
                    },
                    {
                      header: 'Runs',
                      render: (p) => (
                        <span className={boundarySort === 'runs' ? 'text-amber-400 font-black' : ''}>{(p as BoundaryRow).boundaryRuns}</span>
                      ),
                    },
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {(selectedTournament.teams || []).map((tId) => {
                  const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
                  if (!teamObj?.id) return null;
                  const currentStatus: StatusKey =
                    (selectedTournament.teamStatuses && selectedTournament.teamStatuses[teamObj.id]) || 'none';
                  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['none'];

                  return (
                    <div key={teamObj.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: teamObj.color || '#10b981' }} />
                        <span className="font-bold text-sm text-white truncate">{teamObj.name}</span>
                      </div>

                      <div className="flex items-center justify-end flex-wrap gap-1 shrink-0 max-w-[60%]">
                        {STATUS_ORDER.filter((k) => k !== 'none').map((st) => (
                          <button
                            key={st}
                            title={STATUS_CONFIG[st].label}
                            onClick={() => handleUpdateTeamStatus(teamObj.id, currentStatus === st ? 'none' : st)}
                            className={`px-2 py-1 rounded text-[11px] font-black transition cursor-pointer ${
                              currentStatus === st
                                ? STATUS_CONFIG[st].badgePill
                                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {STATUS_CONFIG[st].badgeShort === '🏆 WINNER' ? '🏆' : STATUS_CONFIG[st].badgeShort}
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
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Fixtures & Matches ({tournamentMatches.length})</span>
              </span>
            </div>

            {tournamentMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl border border-dashed border-slate-800 text-xs">
                No matches scheduled for this tournament yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          {m.status === 'live' ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black uppercase animate-pulse">
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {m.date || 'Fixtures'}
                            </span>
                          )}
                        </div>
                        <div className="font-black text-sm sm:text-base text-white leading-snug break-words">
                          {m.teamA.name} <span className="text-slate-500 font-bold">vs</span> {m.teamB.name}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 leading-snug">
                          {m.status === 'live' ? (
                            <span className="text-emerald-400 font-bold">Match in progress</span>
                          ) : m.result ? (
                            <span className="text-amber-400 font-bold">🏆 {m.result.summary}</span>
                          ) : (
                            <span>Scheduled • {m.totalOvers} Overs</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onOpenScorecard(m)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                          title="View Scorecard"
                        >
                          <FileText className="w-4 h-4 text-cyan-400" />
                        </button>

                        <button
                          onClick={() => onSelectMatchToScore(m)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
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
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Score</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
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

              {/* Participating teams: add / remove */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Participating Teams</label>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                    {editTeamIds.length} Teams
                  </span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {editTeamIds.map((tId) => {
                    const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
                    const played = (tournamentMatches || []).some(
                      (m) => m && m.teamA && m.teamB && (m.teamA.id === tId || m.teamB.id === tId)
                    );
                    return (
                      <div key={tId} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="truncate text-xs text-slate-200 font-bold">{teamObj?.name || tId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (played) {
                              alert('Is team ke is tournament mein match ban chuke hain, isliye hata nahi sakte.');
                              return;
                            }
                            setEditTeamIds((prev) => prev.filter((id) => id !== tId));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            played
                              ? 'bg-slate-900 border-slate-700 text-slate-500'
                              : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                          }`}
                        >
                          {played ? 'Played' : 'Remove'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <label className="text-xs font-bold text-slate-300 block mt-3 mb-1">Add Teams</label>
                <input
                  value={editTeamSearch}
                  onChange={(e) => setEditTeamSearch(e.target.value)}
                  placeholder="Team ka naam ya ID likho"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 mt-2">
                  {(teams || [])
                    .filter((t) => t && !editTeamIds.includes(t.id))
                    .filter((t) => {
                      const q = editTeamSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (t.name || '').toLowerCase().includes(q) ||
                        (t.shortName || '').toLowerCase().includes(q) ||
                        (t.teamId || '').toLowerCase().includes(q)
                      );
                    })
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="truncate text-xs text-slate-200 font-bold">{t.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            setEditTeamIds((prev) => [...prev, t.id]);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-emerald-950/40 border-emerald-700/50 text-emerald-300 cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {editTeamIds.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Groups <span className="text-[10px] text-slate-500 font-normal">(optional, separate points table per group)</span>
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {editTeamIds.map((tId) => {
                      const teamObj = (teams || []).find((t) => t && (t.id === tId || t.teamId === tId || t.profileId === tId));
                      if (!teamObj) return null;
                      return (
                        <div key={teamObj.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="truncate text-xs text-slate-200 font-bold">{teamObj.name}</span>
                          <select
                            value={editGroups[teamObj.id] || ''}
                            onChange={(e) => setEditGroups((prev) => ({ ...prev, [teamObj.id]: e.target.value }))}
                            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold cursor-pointer"
                          >
                            <option value="">No group</option>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
                              <option key={g} value={g}>Group {g}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
              {STATUS_ORDER.map((statusKey) => {
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
      {isBvbOpen && selectedTournament && (
        <BatterVsBowlerModal
          isOpen={isBvbOpen}
          onClose={() => setIsBvbOpen(false)}
          matches={tournamentMatches}
          allMatches={allMatches}
          tournamentName={selectedTournament.name}
          season={selectedTournament.season}
          teamOf={Object.fromEntries((tournamentPlayerStats || []).map((p) => [p.playerId, p.teamName]))}
        />
      )}
      {isPartnershipOpen && selectedTournament && (
        <PartnershipModal
          isOpen={isPartnershipOpen}
          onClose={() => setIsPartnershipOpen(false)}
          matches={tournamentMatches}
          allMatches={allMatches}
          tournamentName={selectedTournament.name}
          season={selectedTournament.season}
        />
      )}
      {isAwardsOpen && selectedTournament && (
        <TournamentAwardsModal
          isOpen={isAwardsOpen}
          onClose={() => setIsAwardsOpen(false)}
          stats={tournamentPlayerStats}
          tournamentName={selectedTournament.name}
          season={selectedTournament.season}
        />
      )}
      {isCompareOpen && selectedTournament && (
        <TournamentCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          stats={tournamentPlayerStats}
          tournamentName={selectedTournament.name}
          season={selectedTournament.season}
        />
      )}
    </div>
  );
};
