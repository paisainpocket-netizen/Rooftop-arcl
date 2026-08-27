import React, { useState } from 'react';
import { Team, Player, Match } from '../types/cricket';
import {
  Plus,
  Shield,
  Users,
  MapPin,
  UserPlus,
  Trophy,
  Trash2,
  Edit3,
  Search,
  Copy,
  Check,
  AlertTriangle,
  X,
  Image as ImageIcon,
  Camera,
  TrendingUp,
  Swords,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { TeamProfileModal } from './TeamProfileModal';
import { calculateTeamAnalytics } from '../utils/teamAnalytics';
import { formatTeamId } from '../utils/playerSequence';

interface TeamsManagerProps {
  teams: Team[];
  allPlayers: Player[];
  allMatches?: Match[];
  loggedInPlayer?: Player | null;
  isAdmin?: boolean;
  onUpdateTeams: (teams: Team[]) => void;
  onOpenCreateTeamModal: () => void;
  onOpenCreatePlayerModal: (teamId: string) => void;
  onAddPlayerToTeam: (teamId: string, player: Player) => void;
  onRemovePlayerFromTeam: (teamId: string, playerId: string) => void;
  onViewPlayerProfile: (player: Player) => void;
  onOpenScorecard?: (match: Match) => void;
  isDarkMode: boolean;
}

export const TeamsManager: React.FC<TeamsManagerProps> = ({
  teams,
  allPlayers,
  allMatches = [],
  loggedInPlayer,
  isAdmin,
  onUpdateTeams,
  onOpenCreateTeamModal,
  onOpenCreatePlayerModal,
  onAddPlayerToTeam,
  onRemovePlayerFromTeam,
  onViewPlayerProfile,
  onOpenScorecard,
  isDarkMode,
}) => {
  const [tabFilter, setTabFilter] = useState<'my' | 'public'>(() => (loggedInPlayer ? 'my' : 'public'));
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  
  // Search teams by Team ID, Name, or City
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  // Search inside selected team's squad
  const [squadSearch, setSquadSearch] = useState('');

  // Team Analytics Modal State
  const [inspectedTeam, setInspectedTeam] = useState<Team | null>(null);

  // Add player by Profile ID search
  const [showAddPlayerByProfile, setShowAddPlayerByProfile] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');

  // Edit Team state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamShortName, setEditTeamShortName] = useState('');
  const [editTeamCity, setEditTeamCity] = useState('');
  const [editTeamIcon, setEditTeamIcon] = useState('🏏');
  const [editTeamLogoUrl, setEditTeamLogoUrl] = useState('');

  // Confirmation Modals
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [playerToRemove, setPlayerToRemove] = useState<{ player: Player; team: Team } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  const isUserAdmin = Boolean(
    isAdmin ||
    (loggedInPlayer &&
     (loggedInPlayer.profileId === 'ARCL-001'))
  );

  // If user is not logged in, show lock screen
  if (!loggedInPlayer) {
    return (
      <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center max-w-xl mx-auto space-y-4 my-8 ${
        isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
      }`}>
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto text-emerald-400 shadow-md">
          🛡️
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Private Teams & Clubs
          </h2>
          <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            In ARCL, team rosters, lineups, and club settings are 100% private and sandboxed. Please login with your PIN or register a new profile to create and manage your private squads.
          </p>
        </div>
      </div>
    );
  }

  const myTeams = teams.filter((t) => {
    if (!loggedInPlayer) return false;
    if (isUserAdmin) return true;
    return (
      (t.creatorId && t.creatorId === loggedInPlayer.id) ||
      (t.creatorProfileId && t.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
      t.players?.some(p => p.id === loggedInPlayer.id || p.profileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
    );
  });

  const baseDisplayedTeams = isUserAdmin ? teams : (tabFilter === 'public' ? teams : myTeams);

  // Filter teams by search query (Team ID, Name, City)
  const displayedTeams = baseDisplayedTeams.filter((t) => {
    if (!teamSearchQuery.trim()) return true;
    const q = teamSearchQuery.toLowerCase().trim();
    const idMatch = t.teamId?.toLowerCase().includes(q) || t.profileId?.toLowerCase().includes(q);
    const nameMatch = t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q);
    const cityMatch = t.city?.toLowerCase().includes(q);
    return idMatch || nameMatch || cityMatch;
  });

  const selectedTeam = displayedTeams.find((t) => t.id === selectedTeamId) || displayedTeams[0] || baseDisplayedTeams[0] || myTeams[0];

  const handleCopyTeamId = (teamIdStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(teamIdStr);
    cricketAudio.playClick('Copied');
    setCopiedTeamId(teamIdStr);
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  const handleConfirmDeleteTeam = () => {
    if (!teamToDelete) return;
    const isCreator = Boolean(
      loggedInPlayer &&
      ((teamToDelete.creatorId && teamToDelete.creatorId === loggedInPlayer.id) ||
       (teamToDelete.creatorProfileId && teamToDelete.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
       (!teamToDelete.creatorId && !teamToDelete.creatorProfileId && isUserAdmin))
    );
    if (!isUserAdmin && !isCreator) {
      alert('Only the team creator or Master Admin can delete this team.');
      return;
    }
    const filtered = teams.filter((t) => t.id !== teamToDelete.id);
    onUpdateTeams(filtered);
    if (selectedTeamId === teamToDelete.id && filtered.length > 0) {
      setSelectedTeamId(filtered[0].id);
    }
    cricketAudio.playClick('Team deleted');
    setToastMessage(`Team "${teamToDelete.name}" deleted!`);
    setTeamToDelete(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmRemovePlayer = () => {
    if (!playerToRemove) return;
    const isCreator = Boolean(
      loggedInPlayer &&
      ((playerToRemove.team.creatorId && playerToRemove.team.creatorId === loggedInPlayer.id) ||
       (playerToRemove.team.creatorProfileId && playerToRemove.team.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
       (!playerToRemove.team.creatorId && !playerToRemove.team.creatorProfileId && isUserAdmin))
    );
    if (!isUserAdmin && !isCreator) {
      alert('Only the team creator or Master Admin can modify this team squad.');
      return;
    }
    onRemovePlayerFromTeam(playerToRemove.team.id, playerToRemove.player.id);
    cricketAudio.playClick('Player removed from team');
    setToastMessage(`${playerToRemove.player.name} removed from ${playerToRemove.team.name}!`);
    setPlayerToRemove(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartEditTeam = (t: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    cricketAudio.playClick();
    setEditingTeam(t);
    setEditTeamName(t.name);
    setEditTeamShortName(t.shortName);
    setEditTeamCity(t.city || 'Amritsar');
    setEditTeamIcon(t.logoIcon || '🏏');
    setEditTeamLogoUrl(t.logoUrl || '');
  };

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditTeamLogoUrl(event.target.result as string);
        cricketAudio.playClick('Logo uploaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTeamEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;

    const isCreator = Boolean(
      loggedInPlayer &&
      ((editingTeam.creatorId && editingTeam.creatorId === loggedInPlayer.id) ||
       (editingTeam.creatorProfileId && editingTeam.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
       (!editingTeam.creatorId && !editingTeam.creatorProfileId && isUserAdmin))
    );
    if (!isUserAdmin && !isCreator) {
      alert('Only the team creator or Master Admin can edit this team.');
      return;
    }

    const updated = teams.map((t) => {
      if (t.id === editingTeam.id) {
        return {
          ...t,
          name: editTeamName.trim(),
          shortName: editTeamShortName.trim() || editTeamName.slice(0, 3).toUpperCase(),
          city: editTeamCity.trim(),
          logoIcon: editTeamIcon,
          logoUrl: editTeamLogoUrl.trim() || undefined,
        };
      }
      return t;
    });

    onUpdateTeams(updated);
    cricketAudio.playClick('Team updated');
    setEditingTeam(null);
  };

  const isSelectedTeamCreator = Boolean(
    loggedInPlayer &&
    selectedTeam &&
    ((selectedTeam.creatorId && selectedTeam.creatorId === loggedInPlayer.id) ||
     (selectedTeam.creatorProfileId && selectedTeam.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
     (!selectedTeam.creatorId && !selectedTeam.creatorProfileId && isUserAdmin))
  );

  const canManageSelectedTeam = isUserAdmin || isSelectedTeamCreator;

  const handleAddPlayerFromDirectory = (p: Player) => {
    if (!selectedTeam) return;
    if (!canManageSelectedTeam) {
      alert('Only team creator can add players to this squad.');
      return;
    }
    if (selectedTeam.players.some((pl) => pl.id === p.id || pl.profileId === p.profileId)) {
      setErrorMessage(`${p.name} is already in ${selectedTeam.name}!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    onAddPlayerToTeam(selectedTeam.id, p);
    cricketAudio.playClick(`${p.name} added to squad`);
    setShowAddPlayerByProfile(false);
    setProfileSearchQuery('');
  };

  const filteredSquad = selectedTeam?.players?.filter((p) => {
    if (!squadSearch.trim()) return true;
    const q = squadSearch.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.profileId?.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-rose-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider text-emerald-400">
              Clubs & Performance Hub
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            ARCL Teams & Performance Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search any team by Team ID (e.g. TEAM-001) to view Last 20 Matches analysis, Bat 1st vs Chase ratios, and Head-to-Head comparisons.
          </p>
        </div>

        {loggedInPlayer && (
          <button
            onClick={() => {
              onOpenCreateTeamModal();
              cricketAudio.playClick();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ Create New Team</span>
          </button>
        )}
      </div>

      {/* Top Controls: Search by Team ID & Segment Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Team ID Search Bar */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={teamSearchQuery}
            onChange={(e) => setTeamSearchQuery(e.target.value)}
            placeholder="🔍 Search Team by Team ID (e.g. TEAM-001), Team Name, or Area..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
          />
          {teamSearchQuery && (
            <button
              onClick={() => setTeamSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 justify-self-stretch md:justify-self-end">
          <button
            onClick={() => {
              setTabFilter('my');
              cricketAudio.playClick();
              if (myTeams[0]) setSelectedTeamId(myTeams[0].id);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 flex-1 justify-center ${
              tabFilter === 'my' || !isUserAdmin
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Teams ({myTeams.length})</span>
          </button>
          
          {isUserAdmin && (
            <button
              onClick={() => {
                setTabFilter('public');
                cricketAudio.playClick();
                if (teams[0]) setSelectedTeamId(teams[0].id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 flex-1 justify-center ${
                tabFilter === 'public'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>All Teams ({teams.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Left Team List & Right Squad Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Team List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase text-slate-400 block">
              {tabFilter === 'my' ? 'My Teams' : 'Registered League Teams'} ({displayedTeams.length})
            </span>
            {teamSearchQuery && (
              <span className="text-[10px] text-emerald-400 font-bold">
                Filtered: "{teamSearchQuery}"
              </span>
            )}
          </div>

          {displayedTeams.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 text-center text-xs text-slate-400 space-y-3">
              <p>{teamSearchQuery ? `No team matches "${teamSearchQuery}".` : "You haven't created any teams yet."}</p>
              {loggedInPlayer && !teamSearchQuery && (
                <button
                  onClick={onOpenCreateTeamModal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  + Create Your First Team
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedTeams.map((t, idx) => {
                const isSelected = t.id === selectedTeam?.id;
                const teamCode = t.teamId || t.profileId || formatTeamId(idx + 1);
                const teamStats = calculateTeamAnalytics(t, allMatches);

                const isMyTeam = Boolean(
                  loggedInPlayer &&
                  t.players.some((p) => p.id === loggedInPlayer.id || p.profileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
                );
                const isCreator = Boolean(
                  loggedInPlayer &&
                  ((t.creatorId && t.creatorId === loggedInPlayer.id) ||
                   (t.creatorProfileId && t.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
                   (!t.creatorId && !t.creatorProfileId && isUserAdmin))
                );
                const canManageTeam = isUserAdmin || isCreator;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTeamId(t.id);
                      cricketAudio.playClick();
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-3 group ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md border border-white/10 overflow-hidden shrink-0"
                          style={{ backgroundColor: t.color || '#10b981' }}
                        >
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{t.logoIcon || '🏏'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-sm text-white truncate">{t.name}</h4>
                            {isMyTeam && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                MY TEAM
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {/* Team ID Badge */}
                            <button
                              onClick={(e) => handleCopyTeamId(teamCode, e)}
                              title="Click to copy Team ID"
                              className="font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                            >
                              <span>{teamCode}</span>
                              {copiedTeamId === teamCode ? (
                                <Check className="w-2.5 h-2.5 text-emerald-300" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-50" />
                              )}
                            </button>
                            <span>•</span>
                            <span className="truncate">{t.city || 'Amritsar'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canManageTeam && (
                          <>
                            <button
                              onClick={(e) => handleStartEditTeam(t, e)}
                              title="Edit Team"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cricketAudio.playClick();
                                setTeamToDelete(t);
                              }}
                              title="Delete Team"
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 text-rose-400 hover:text-rose-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Performance Snippet Bar */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{teamStats.totalMatches} Matches</span>
                        <span className="text-slate-600">•</span>
                        <span className="font-bold text-emerald-400">{teamStats.overall.winPercentage}% Win Rate</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cricketAudio.playClick();
                          setInspectedTeam(t);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Last 20 & H2H</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Squad Details */}
        {selectedTeam && (
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl space-y-4">
              {/* Squad Header with Full Analytics Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/20 overflow-hidden shrink-0"
                    style={{ backgroundColor: selectedTeam.color || '#10b981' }}
                  >
                    {selectedTeam.logoUrl ? (
                      <img src={selectedTeam.logoUrl} alt={selectedTeam.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedTeam.logoIcon || '🏏'}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-white">{selectedTeam.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                        {selectedTeam.teamId || selectedTeam.profileId || formatTeamId(1)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedTeam.players.length} Players in Roster • {selectedTeam.city || 'Amritsar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Open Complete Team Profile Button */}
                  <button
                    onClick={() => {
                      cricketAudio.playClick();
                      setInspectedTeam(selectedTeam);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-900/30"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>📊 Team Performance Card</span>
                  </button>

                  {canManageSelectedTeam && (
                    <button
                      onClick={() => setShowAddPlayerByProfile(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition cursor-pointer border border-slate-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Player by ID</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Performance Strip */}
              {(() => {
                const selAnalytics = calculateTeamAnalytics(selectedTeam, allMatches);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Matches</span>
                      <span className="text-sm font-black text-white">{selAnalytics.totalMatches}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Win Rate</span>
                      <span className="text-sm font-black text-emerald-400">{selAnalytics.overall.winPercentage}%</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Bat 1st Win</span>
                      <span className="text-sm font-black text-cyan-400">{selAnalytics.batFirst.winPercentage}%</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Chase Win</span>
                      <span className="text-sm font-black text-indigo-400">{selAnalytics.chaseFirst.winPercentage}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Squad Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={squadSearch}
                  onChange={(e) => setSquadSearch(e.target.value)}
                  placeholder="Search registered players in squad by name or ID (e.g. ARCL-001)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Squad List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 divide-y divide-slate-800/60">
                {filteredSquad.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No players found in this squad.
                  </div>
                ) : (
                  filteredSquad.map((p, idx) => (
                    <div
                      key={p.id}
                      className="pt-2 flex items-center justify-between gap-3"
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onViewPlayerProfile(p)}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{p.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs sm:text-sm text-white truncate hover:text-emerald-400 transition">
                            {p.name}
                          </h5>
                          <span className="text-[11px] font-mono text-emerald-400 block tracking-wide">
                            ID: {p.profileId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">
                          {p.role}
                        </span>
                        {canManageSelectedTeam && (
                          <button
                            onClick={() => {
                              cricketAudio.playClick();
                              setPlayerToRemove({ player: p, team: selectedTeam });
                            }}
                            title="Remove player from this squad"
                            className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900 border border-rose-800/40 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Team Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-lg text-white">Delete Team?</h3>
              </div>
              <button
                onClick={() => setTeamToDelete(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong className="text-white">{teamToDelete.name}</strong>? All matches and individual player stats will remain safe.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTeam}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Modal */}
      {playerToRemove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Remove Player?</h3>
                  <p className="text-[11px] text-slate-400">From {playerToRemove.team.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPlayerToRemove(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Remove <strong className="text-white">{playerToRemove.player.name}</strong> (ID: {playerToRemove.player.profileId}) from {playerToRemove.team.name} roster? Global stats remain intact.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlayerToRemove(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePlayer}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Player</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player by Profile ID Search Modal */}
      {showAddPlayerByProfile && selectedTeam && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">
                Add Player to {selectedTeam.name}
              </h3>
              <button
                onClick={() => setShowAddPlayerByProfile(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">
                {isUserAdmin ? 'Search ARCL League Directory by Profile ID or Name' : 'Search Your Created Players by Profile ID or Name'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profileSearchQuery}
                  onChange={(e) => setProfileSearchQuery(e.target.value)}
                  placeholder={isUserAdmin ? "e.g. ARCL-001 or Player Name" : "Search your private players..."}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {allPlayers
                  .filter((ap) => {
                    if (!isUserAdmin) {
                      const isOwned = ap.id === loggedInPlayer?.id || 
                                      ap.profileId?.toLowerCase() === loggedInPlayer?.profileId?.toLowerCase() ||
                                      ap.creatorId === loggedInPlayer?.id || 
                                      ap.creatorProfileId?.toLowerCase() === loggedInPlayer?.profileId?.toLowerCase();
                      const matchesExactId = profileSearchQuery.trim() && ap.profileId?.toLowerCase() === profileSearchQuery.trim().toLowerCase();
                      if (!isOwned && !matchesExactId) return false;
                    }
                    const q = profileSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return ap.profileId?.toLowerCase().includes(q) || ap.name.toLowerCase().includes(q);
                  })
                  .slice(0, 8)
                  .map((ap) => {
                    const isAlreadyInTeam = selectedTeam.players.some((pl) => pl.id === ap.id || pl.profileId === ap.profileId);
                    return (
                      <div
                        key={ap.id}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 flex items-center justify-between transition"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{ap.name}</p>
                          <p className="text-[10px] font-mono text-emerald-400">ID: {ap.profileId} • {ap.role}</p>
                        </div>
                        {isAlreadyInTeam ? (
                          <span className="text-[10px] font-bold text-slate-500">In Squad</span>
                        ) : (
                          <button
                            onClick={() => handleAddPlayerFromDirectory(ap)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Don't see the player?</span>
              <button
                onClick={() => {
                  setShowAddPlayerByProfile(false);
                  onOpenCreatePlayerModal(selectedTeam.id);
                }}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                Create New Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveTeamEdit}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-slate-100"
          >
            <h3 className="font-black text-white text-base">Edit Team Details</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Team Name</label>
              <input
                type="text"
                required
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Short Name (3-4 letters)</label>
                <input
                  type="text"
                  maxLength={5}
                  value={editTeamShortName}
                  onChange={(e) => setEditTeamShortName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">City / Rooftop</label>
                <input
                  type="text"
                  value={editTeamCity}
                  onChange={(e) => setEditTeamCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Team Logo Photo Upload */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1 flex items-center justify-between">
                <span>Team Logo Photo / Badge</span>
                {editTeamLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setEditTeamLogoUrl('')}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </label>

              {editTeamLogoUrl ? (
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                    <img src={editTeamLogoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Logo</span>
                    <input type="file" accept="image/*" onChange={handleTeamLogoUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-300">Upload Custom Team Logo</span>
                  <span className="text-[9px] text-slate-500">Supports JPG, PNG (Max 2MB)</span>
                  <input type="file" accept="image/*" onChange={handleTeamLogoUpload} className="hidden" />
                </label>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Team Logo Icon / Emoji</label>
              <input
                type="text"
                value={editTeamIcon}
                onChange={(e) => setEditTeamIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none text-center"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Detailed Analytics & Last 20 Matches & H2H Modal */}
      {inspectedTeam && (
        <TeamProfileModal
          isOpen={Boolean(inspectedTeam)}
          onClose={() => setInspectedTeam(null)}
          team={inspectedTeam}
          allTeams={teams}
          allMatches={allMatches}
          onViewPlayerProfile={onViewPlayerProfile}
          onOpenScorecard={onOpenScorecard}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
