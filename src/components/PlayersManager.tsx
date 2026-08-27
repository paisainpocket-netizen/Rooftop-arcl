import React, { useState } from 'react';
import { Player, PlayerRole } from '../types/cricket';
import { Plus, User, Search, Award, Flame, Shield, Trash2, Edit3, Trophy, Filter, Copy, Check } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface PlayersManagerProps {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onViewProfile: (player: Player) => void;
  onPurgeSamplePlayers: () => void;
  onOpenCreatePlayerModal: () => void;
  isDarkMode: boolean;
  loggedInPlayer?: Player | null;
  onOpenLoginModal?: () => void;
}

export const PlayersManager: React.FC<PlayersManagerProps> = ({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onViewProfile,
  onPurgeSamplePlayers,
  onOpenCreatePlayerModal,
  isDarkMode,
  loggedInPlayer = null,
  onOpenLoginModal,
}) => {
  const [tabFilter, setTabFilter] = useState<'my' | 'all'>(() => (loggedInPlayer ? 'my' : 'all'));
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit player modal state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<PlayerRole>('allrounder');
  const [editPin, setEditPin] = useState('');

  const isAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  // If user is not logged in, show private lock screen
  if (!loggedInPlayer) {
    return (
      <div className={`p-8 sm:p-12 rounded-3xl border shadow-xl text-center max-w-xl mx-auto space-y-4 my-8 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl mx-auto text-cyan-400 shadow-md">
          🔒
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Private Player Directory
          </h2>
          <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            In ARCL, player profiles, batting statistics, and career records are 100% private and sandboxed. Please login with your PIN or register a new player profile to manage your private squad.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              if (onOpenLoginModal) onOpenLoginModal();
              cricketAudio.playClick();
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-cyan-600/30 transition cursor-pointer flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            <span>Login / Register New Profile</span>
          </button>
        </div>
      </div>
    );
  }

  // Strict Permissions: Only ARCL-001 / Master Admin can browse all league players. Regular users only see their own squad.
  const myPlayers = players.filter((p) => {
    if (!loggedInPlayer) return false;
    const isSelf = p.id === loggedInPlayer.id || (p.profileId && p.profileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase());
    const isCreated = Boolean(
      (p.creatorId && p.creatorId === loggedInPlayer.id) ||
      (p.creatorProfileId && p.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
    );
    return isSelf || isCreated;
  });

  const effectiveTab = isAdmin ? tabFilter : 'my';
  const displayedPlayers = effectiveTab === 'my' && loggedInPlayer ? myPlayers : players;

  const filteredPlayers = (
    !isAdmin && search.trim()
      ? players // Allow looking up a specific player by Profile ID or Name when searching
      : displayedPlayers
  ).filter((p) => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.profileId.toLowerCase().includes(q) ||
        (p.phoneNumber && p.phoneNumber.includes(q))
      );
    }
    return true;
  });

  const handleCopyId = (pid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    cricketAudio.playClick();
    navigator.clipboard.writeText(pid);
    setCopiedId(pid);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (p: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    cricketAudio.playClick();
    setEditingPlayer(p);
    setEditName(p.name);
    setEditRole(p.role);
    setEditPin(p.pin || '1234');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editName.trim()) return;

    const isCreatorOrSelf = Boolean(
      loggedInPlayer &&
      ((editingPlayer.creatorId && editingPlayer.creatorId === loggedInPlayer.id) ||
       (editingPlayer.creatorProfileId && editingPlayer.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
       editingPlayer.id === loggedInPlayer.id ||
       editingPlayer.profileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
    );

    if (!isAdmin && !isCreatorOrSelf) {
      alert('Only the player creator, account owner, or Master Admin can edit this profile.');
      return;
    }

    const updated: Player = {
      ...editingPlayer,
      name: editName.trim(),
      role: editRole,
      pin: editPin.trim() || '1234',
    };

    onUpdatePlayer(updated);
    cricketAudio.playClick('Player details updated');
    setEditingPlayer(null);
  };

  const handleDelete = (p: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCreator = Boolean(
      loggedInPlayer &&
      ((p.creatorId && p.creatorId === loggedInPlayer.id) ||
       (p.creatorProfileId && p.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()))
    );

    if (!isAdmin && !isCreator) {
      alert('Only the player creator or Master Admin (ARCL-001) can delete this player.');
      return;
    }

    if (confirm(`Are you sure you want to delete player ${p.name} (ID: ${p.profileId}) from ARCL?`)) {
      onDeletePlayer(p.id);
      cricketAudio.playClick('Player deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black tracking-wider text-cyan-400">
              Player Registry & ID System
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            ARCL Players Directory
          </h2>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {loggedInPlayer
              ? 'Every player has a permanent unique Profile ID and stats record. Search and add players to any team squad.'
              : 'Guest Fan Mode: View registered players and career statistics. Login to manage your players.'}
          </p>
        </div>

        {loggedInPlayer ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenCreatePlayerModal();
                cricketAudio.playClick();
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm shadow-xl shadow-cyan-600/30 transition cursor-pointer active:scale-95 flex-shrink-0"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ Add Player</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (onOpenLoginModal) onOpenLoginModal();
              cricketAudio.playClick();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold text-xs shadow-lg transition cursor-pointer flex-shrink-0"
          >
            <User className="w-4 h-4" />
            <span>Login to Add Players</span>
          </button>
        )}
      </div>

      {/* Segment Filter: Admin sees both tabs; Regular user sees My Added Players badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isAdmin ? (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => {
                setTabFilter('my');
                cricketAudio.playClick();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'my'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>👤 My Profile & Squad ({myPlayers.length})</span>
            </button>
            
            <button
              onClick={() => {
                setTabFilter('all');
                cricketAudio.playClick();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>👑 All League Players ({players.length}) [Admin]</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-black flex items-center gap-2 shadow-sm">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>👤 My Added Players ({myPlayers.length})</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
              🔒 Global list is hidden • Search by Profile ID below to look up players
            </span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className={`flex items-center gap-1 p-1 rounded-2xl border overflow-x-auto max-w-full ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['all', 'batsman', 'bowler', 'allrounder', 'wicketkeeper'] as const).map((role) => (
            <button
              key={role}
              onClick={() => {
                setRoleFilter(role);
                cricketAudio.playClick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer shrink-0 ${
                roleFilter === role
                  ? 'bg-cyan-600 text-white shadow-md'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {role === 'all' ? 'All Roles' : role}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or Profile ID (e.g. arvi2107)..."
            className={`w-full pl-9 pr-4 py-2 rounded-2xl border text-xs focus:outline-none transition ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
            }`}
          />
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs">
            {tabFilter === 'my'
              ? "You haven't created any custom player profiles yet."
              : 'No players found matching your criteria.'}
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isPlayerCreatorOrSelf = Boolean(
              loggedInPlayer &&
              ((player.creatorId && player.creatorId === loggedInPlayer.id) ||
               (player.creatorProfileId && player.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
               player.id === loggedInPlayer.id ||
               player.profileId?.toLowerCase() === loggedInPlayer.profileId?.toLowerCase())
            );
            const canEdit = isAdmin || isPlayerCreatorOrSelf;
            const canDelete = isAdmin || Boolean(
              loggedInPlayer &&
              ((player.creatorId && player.creatorId === loggedInPlayer.id) ||
               (player.creatorProfileId && player.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()))
            );

            return (
              <div
                key={player.id}
                onClick={() => {
                  onViewProfile(player);
                  cricketAudio.playClick();
                }}
                className={`p-4 rounded-3xl border transition shadow-lg cursor-pointer flex flex-col justify-between group ${
                  isDarkMode
                    ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900'
                    : 'bg-white border-slate-200 hover:border-cyan-500/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{player.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white group-hover:text-cyan-400 transition">
                          {player.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 capitalize block">
                          {player.role} • {player.battingStyle || 'Right Hand'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete (Strict Creator / Admin permissions) */}
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={(e) => handleStartEdit(player, e)}
                          title="Edit Player Details (Creator / Owner Only)"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(player, e)}
                          title="Delete Player (Creator / Admin Only)"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile ID Pill */}
                  <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3">
                    <span className="text-[11px] font-mono text-cyan-400 tracking-wider">
                      ID: {player.profileId}
                    </span>
                    <button
                      onClick={(e) => handleCopyId(player.profileId, e)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title="Copy Profile ID"
                    >
                      {copiedId === player.profileId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Career Stats Mini Banner */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Runs</span>
                    <span className="font-black text-emerald-400">{player.stats.runs}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Wickets</span>
                    <span className="font-black text-cyan-400">{player.stats.wickets}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Matches</span>
                    <span className="font-black text-amber-400">{player.stats.matches}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-slate-100"
          >
            <h3 className="font-black text-white text-base">Edit Player</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Player Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Playing Role</label>
              <select
                value={editRole}
                onChange={(e: any) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
              >
                <option value="allrounder">All-Rounder</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Login PIN</label>
              <input
                type="text"
                maxLength={4}
                value={editPin}
                onChange={(e) => setEditPin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
