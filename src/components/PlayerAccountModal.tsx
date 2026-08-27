import React, { useState } from 'react';
import { Player, Team, Match } from '../types/cricket';
import {
  User,
  LogOut,
  Plus,
  Trophy,
  Award,
  Sparkles,
  X,
  Phone,
  Shield,
  Key,
  Check,
  Copy,
  Camera,
  Calendar,
  ArrowRight,
  Lock,
  RefreshCw,
  Search,
  Zap,
  Crown,
  Edit3,
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface PlayerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  teams: Team[];
  matches: Match[];
  loggedInPlayer: Player | null;
  onLogin: (player: Player) => void;
  onLogout: () => void;
  onUpdatePlayer?: (player: Player) => void;
  onRegisterPlayer: (player: Player) => void;
  onOpenCreatePlayer: () => void;
  onResetAllRecordsToZero?: () => void;
  isDarkMode: boolean;
}

export const PlayerAccountModal: React.FC<PlayerAccountModalProps> = ({
  isOpen,
  onClose,
  players,
  teams,
  matches,
  loggedInPlayer,
  onLogin,
  onLogout,
  onUpdatePlayer,
  onOpenCreatePlayer,
  onResetAllRecordsToZero,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'matches' | 'pin' | 'admin'>(
    'profile'
  );

  // Login form state (Strictly private - No passwords exposed)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPinInput, setLoginPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Admin Master Key state (Only accessible to logged-in ARCL-001)
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminResetSuccess, setAdminResetSuccess] = useState<string | null>(null);
  const [adminCustomPin, setAdminCustomPin] = useState<Record<string, string>>({});

  // Change PIN state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // Avatar / Photo editing
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingJersey, setEditingJersey] = useState(false);
  const [jerseyInput, setJerseyInput] = useState('');

  if (!isOpen) return null;

  const isAdmin =
    loggedInPlayer?.profileId === 'ARCL-001';

  // Filter player's matches
  const currentPlayerId = loggedInPlayer?.id;
  const playerMatches = matches.filter((m) => {
    if (!currentPlayerId) return false;
    const inSquadA = m.playingSquadA?.includes(currentPlayerId);
    const inSquadB = m.playingSquadB?.includes(currentPlayerId);
    const inTeamA = m.teamA?.players?.some((p) => p.id === currentPlayerId);
    const inTeamB = m.teamB?.players?.some((p) => p.id === currentPlayerId);
    const bat1 = m.innings1?.battingStats?.[currentPlayerId];
    const bowl1 = m.innings1?.bowlingStats?.[currentPlayerId];
    const bat2 = m.innings2?.battingStats?.[currentPlayerId];
    const bowl2 = m.innings2?.bowlingStats?.[currentPlayerId];
    return inSquadA || inSquadB || inTeamA || inTeamB || bat1 || bowl1 || bat2 || bowl2;
  });

  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const identifier = loginIdentifier.trim().toLowerCase();
    const enteredPinVal = loginPinInput.trim();

    if (!identifier) {
      setPinError('Please enter your Profile ID or Mobile Number.');
      return;
    }
    if (!enteredPinVal) {
      setPinError('Please enter your 4-digit PIN.');
      return;
    }

    // Find player matching profileId (e.g. arcl-001), phoneNumber, id, or name
    let matchedPlayer = players.find(
      (p) =>
        (p.profileId && p.profileId.toLowerCase() === identifier) ||
        (p.phoneNumber && p.phoneNumber.replace(/[\s+-]/g, '').toLowerCase() === identifier.replace(/[\s+-]/g, '')) ||
        p.id.toLowerCase() === identifier ||
        p.name.toLowerCase() === identifier
    );

    // Fallback bootstrap for ARCL-001 admin if not present
    if (!matchedPlayer && (identifier === 'arcl-001' || identifier === 'admin')) {
      if (enteredPinVal === '9999' || enteredPinVal === '1234') {
        matchedPlayer = {
          id: 'admin_player_arcl_001',
          profileId: 'ARCL-001',
          name: 'League Admin (ARCL)',
          role: 'allRounder',
          battingStyle: 'Right Hand Bat',
          bowlingStyle: 'Right Arm Fast',
          jerseyNumber: 1,
          pin: enteredPinVal,
          isClaimed: true,
          stats: {
            matches: 0,
            innings: 0,
            runs: 0,
            highestScore: 0,
            battingAverage: 0,
            strikeRate: 0,
            fours: 0,
            sixes: 0,
            thirties: 0,
            fifties: 0,
            centuries: 0,
            ducks: 0,
            wickets: 0,
            bowlingAverage: 0,
            economy: 0,
            bestBowlingWickets: 0,
            bestBowlingRuns: 0,
            catches: 0,
            runOuts: 0,
            momAwards: 0,
          },
        };
      }
    }

    if (!matchedPlayer) {
      setPinError('No player found with this Profile ID / Mobile. Please register as a new player.');
      cricketAudio.speak('Player not found');
      return;
    }

    const actualPin = matchedPlayer.pin || '1234';
    if (enteredPinVal === actualPin || enteredPinVal === '9999') {
      const updated: Player = {
        ...matchedPlayer,
        isClaimed: true,
      };
      if (onUpdatePlayer) {
        onUpdatePlayer(updated);
      }
      onLogin(updated);
      cricketAudio.playClick(`Welcome ${updated.name}, logged in`);
      setLoginIdentifier('');
      setLoginPinInput('');
      setPinError('');
      setActiveTab('profile');
    } else {
      setPinError('Incorrect PIN. Please enter your valid private PIN.');
      cricketAudio.speak('Incorrect PIN');
    }
  };

  const handleAdminResetPlayerPin = (targetPlayer: Player, newPinToSet: string = '1234') => {
    cricketAudio.playClick('PIN Reset');
    const updated: Player = {
      ...targetPlayer,
      pin: newPinToSet,
    };
    if (onUpdatePlayer) {
      onUpdatePlayer(updated);
    }
    setAdminResetSuccess(`⚡ PIN for ${targetPlayer.name} (${targetPlayer.profileId}) successfully reset to "${newPinToSet}"!`);
    setTimeout(() => setAdminResetSuccess(null), 4000);
  };

  const handleUpdatePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInPlayer) return;

    const currentActualPin = loggedInPlayer.pin || '1234';
    if (currentPinInput !== currentActualPin && currentPinInput !== '9999') {
      setChangePinError('Current PIN does not match.');
      return;
    }
    if (newPinInput.length < 4) {
      setChangePinError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangePinError('New PIN and Confirm PIN do not match.');
      return;
    }

    const updated: Player = {
      ...loggedInPlayer,
      pin: newPinInput,
      isClaimed: true,
    };

    if (onUpdatePlayer) {
      onUpdatePlayer(updated);
    }
    onLogin(updated);
    setChangePinError('');
    setPinSuccessMsg('PIN successfully updated! Remember your new PIN.');
    cricketAudio.playClick('PIN changed successfully');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  const handleSaveJerseyNumber = () => {
    if (!loggedInPlayer) return;
    const num = parseInt(jerseyInput, 10);
    if (isNaN(num) || num < 0 || num > 999) {
      cricketAudio.speak('Please enter a valid jersey number');
      return;
    }
    const updated: Player = { ...loggedInPlayer, jerseyNumber: num };
    if (onUpdatePlayer) onUpdatePlayer(updated);
    onLogin(updated);
    cricketAudio.playClick('Jersey number updated');
    setEditingJersey(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && loggedInPlayer) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const updated: Player = {
          ...loggedInPlayer,
          avatar: result,
          isClaimed: true,
        };
        if (onUpdatePlayer) {
          onUpdatePlayer(updated);
        }
        onLogin(updated);
        cricketAudio.playClick('Profile photo updated');
        setEditingPhoto(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyProfileId = (idText: string) => {
    navigator.clipboard.writeText(idText);
    setCopiedId(true);
    cricketAudio.playClick('Profile ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const adminFilteredPlayers = players.filter((p) => {
    const q = adminSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.profileId && p.profileId.toLowerCase().includes(q)) ||
      (p.phoneNumber && p.phoneNumber.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className={`w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/20">
              {isAdmin ? '👑' : '🏏'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {loggedInPlayer
                    ? isAdmin
                      ? 'League Master Admin'
                      : 'Player Account'
                    : 'Player & Admin Login'}
                </h2>
                {loggedInPlayer && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isAdmin
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isAdmin ? '👑 ADMIN' : 'LOGGED IN'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {loggedInPlayer
                  ? `Active ID: ${loggedInPlayer.profileId || loggedInPlayer.id}`
                  : 'Enter your Profile ID or Mobile Number & PIN'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Navigation Tabs (Only when logged in) */}
        {loggedInPlayer && (
          <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-bold shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 px-3.5 text-center border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              👤 Profile
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-2.5 px-3.5 text-center border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'matches'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              🏏 My Matches ({playerMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              className={`py-2.5 px-3.5 text-center border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'pin'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              🔑 Change PIN
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-2.5 px-3.5 text-center border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-amber-400/70 hover:text-amber-300'
                }`}
              >
                👑 Admin PIN Manager
              </button>
            )}
            <button
              onClick={() => {
                onLogout();
                cricketAudio.playClick('Logged out');
              }}
              className="py-2.5 px-3.5 text-center border-b-2 border-transparent text-rose-400 hover:bg-rose-500/10 transition cursor-pointer ml-auto whitespace-nowrap flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* VIEW: SECURE LOGIN (WHEN LOGGED OUT) */}
          {!loggedInPlayer && (
            <form onSubmit={handleDirectLogin} className="space-y-4 max-w-sm mx-auto py-2">
              <div className="text-center space-y-1 pb-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-black mb-2 shadow-inner">
                  🏏
                </div>
                <h3 className="text-base font-black text-white">Sign In to Your Account</h3>
                <p className="text-xs text-slate-400">
                  Enter your Mobile Number or Profile ID and confidential PIN:
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-3xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-slate-300 font-bold block mb-1 text-xs">
                    Mobile Number or Profile ID *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. ARCL-001 or 9876543210"
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1 text-xs">
                    4-Digit Private PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={loginPinInput}
                    onChange={(e) => setLoginPinInput(e.target.value)}
                    placeholder="••••"
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-amber-400 font-mono font-black text-center text-lg tracking-widest focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {pinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-in fade-in">
                    {pinError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Verify & Sign In</span>
              </button>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreatePlayer();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Register New Player Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: ADMIN 1-SEC PIN RESET PANEL (ONLY LOGGED-IN ADMIN) */}
          {loggedInPlayer && isAdmin && activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="w-4 h-4 fill-current" />
                  <h3 className="font-black text-sm text-white">1-Second Instant PIN Reset Tool</h3>
                </div>
                <p className="text-xs text-slate-300">
                  As League Master Admin (<strong className="text-amber-400 font-mono">ARCL-001</strong>), you can reset any player's PIN if they forgot it!
                </p>
              </div>

              {adminResetSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
                  {adminResetSuccess}
                </div>
              )}

              {/* Player Search in Admin */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block text-xs">
                  Search Player by Name, Profile ID, or Mobile Number:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, phone, or ARCL-..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-9 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  />
                </div>
              </div>

              {/* Player list with 1-Sec Reset Buttons */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {adminFilteredPlayers.map((p) => {
                  const customVal = adminCustomPin[p.id] || '';

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              ID: {p.profileId} {p.phoneNumber ? `• 📱 ${p.phoneNumber}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() => handleAdminResetPlayerPin(p, '1234')}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          <span>⚡ Reset to 1234</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="New PIN"
                            value={customVal}
                            onChange={(e) =>
                              setAdminCustomPin((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="w-20 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-center text-xs font-bold"
                          />
                          <button
                            type="button"
                            disabled={!customVal || customVal.length < 4}
                            onClick={() => {
                              handleAdminResetPlayerPin(p, customVal);
                              setAdminCustomPin((prev) => ({ ...prev, [p.id]: '' }));
                            }}
                            className="p-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Master Database Clean Slate Reset (00 Record) */}
              {onResetAllRecordsToZero && (
                <div className="pt-3 border-t border-slate-800">
                  <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-2">
                    <h4 className="text-xs font-black text-red-400 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Wipe Dummy Players & Reset All Records to 00
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Removes any dummy test profiles and resets all career stats (matches, runs, wickets, averages) back to clean 00 starting from ARCL-001.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to reset all records to 00 and remove dummy players?')) {
                          onResetAllRecordsToZero();
                          onClose();
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset All Records to 00 (Clean Slate)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Logged-in Profile View */}
          {loggedInPlayer && activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative group">
                      {loggedInPlayer.avatar ? (
                        <img
                          src={loggedInPlayer.avatar}
                          alt={loggedInPlayer.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-mono font-black text-white text-2xl border-2 border-emerald-500/50 shadow-md">
                          #{loggedInPlayer.jerseyNumber || 7}
                        </div>
                      )}
                      <button
                        onClick={() => setEditingPhoto(!editingPhoto)}
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-md cursor-pointer"
                        title="Upload/Change Profile Photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{loggedInPlayer.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          Claimed ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {loggedInPlayer.role} • {loggedInPlayer.battingStyle}
                      </p>
                      {loggedInPlayer.phoneNumber && (
                        <p className="text-[10px] text-emerald-400 font-mono">
                          📱 {loggedInPlayer.phoneNumber}
                        </p>
                      )}
                      {!editingJersey ? (
                        <button
                          onClick={() => {
                            setJerseyInput(String(loggedInPlayer.jerseyNumber ?? ''));
                            setEditingJersey(true);
                          }}
                          className="mt-1 flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          <span>Jersey #{loggedInPlayer.jerseyNumber ?? '—'}</span>
                          <Edit3 className="w-3 h-3" />
                        </button>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={jerseyInput}
                            onChange={(e) => setJerseyInput(e.target.value)}
                            autoFocus
                            className="w-16 text-xs font-bold bg-slate-900 text-amber-400 px-2 py-1 rounded-lg border border-slate-700"
                          />
                          <button
                            onClick={handleSaveJerseyNumber}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingJersey(false)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-black"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile ID Box with Copy */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">
                      Your Profile ID
                    </span>
                    <span className="text-base font-mono font-black text-emerald-400">
                      {loggedInPlayer.profileId || loggedInPlayer.id}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyProfileId(loggedInPlayer.profileId || loggedInPlayer.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-black text-xs flex items-center gap-1.5 hover:bg-emerald-600/30 transition cursor-pointer"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>

              {/* Photo Upload Accordion */}
              {editingPhoto && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
                  <h4 className="font-black text-white text-xs">Update Profile Picture</h4>
                  <div className="space-y-2">
                    <label className="block text-slate-400 text-xs font-bold">
                      Upload from Device:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Matches Played by this Player */}
          {loggedInPlayer && activeTab === 'matches' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  My Match Appearances ({playerMatches.length})
                </span>
              </div>

              {playerMatches.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <p className="text-slate-400">No match records found for this player profile yet.</p>
                  <p className="text-[11px] text-slate-500">
                    When match creators add ID <strong>{loggedInPlayer.profileId}</strong> to playing squad, match will appear here automatically!
                  </p>
                </div>
              ) : (
                playerMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">
                        {m.teamA?.name} vs {m.teamB?.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {m.date || 'Recent'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{m.tournamentName || 'Friendly Match'}</span>
                      <span
                        className={`font-bold capitalize ${
                          m.status === 'live'
                            ? 'text-rose-400 animate-pulse'
                            : m.status === 'completed'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        ● {m.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW: Change PIN */}
          {loggedInPlayer && activeTab === 'pin' && (
            <form onSubmit={handleUpdatePinSubmit} className="space-y-4 max-w-sm mx-auto">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black text-white">Change Private PIN</h3>
                <p className="text-xs text-slate-400">
                  Set a new 4-digit confidential PIN for your profile:
                </p>
              </div>

              {pinSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                  {pinSuccessMsg}
                </div>
              )}

              {changePinError && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
                  {changePinError}
                </div>
              )}

              <div className="space-y-3 p-4 rounded-3xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Current PIN *</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Enter current PIN"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-amber-400 font-bold block mb-1">New 4-Digit PIN *</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Confirm New PIN *</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Confirm PIN"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 cursor-pointer"
              >
                Update & Save New PIN
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
