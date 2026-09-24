import React, { useState, useEffect } from 'react';
import { 
  Play, Trophy, Users, Shield, Sparkles, Plus, Moon, Sun, 
  Volume2, VolumeX, BookOpen, User, UserCheck, Menu, X, 
  Flag, Settings, LogOut, ChevronRight, Share2, Search, Palette, Check
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';

export type AppTheme = 'ipl_gold' | 'cyber_turf' | 'electric_sunset' | 'stealth_carbon';

interface ThemeOption {
  id: AppTheme;
  name: string;
  badge: string;
  dotColor: string;
  gradient: string;
  desc: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'ipl_gold',
    name: 'IPL Gold Night',
    badge: '🏆 Premium',
    dotColor: '#f59e0b',
    gradient: 'from-amber-500 to-yellow-600',
    desc: 'Deep black & rich luxury gold'
  },
  {
    id: 'cyber_turf',
    name: 'Stadium Cyber Turf',
    badge: '🏟️ Neon Turf',
    dotColor: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    desc: 'Electric pitch green & cyan'
  },
  {
    id: 'electric_sunset',
    name: 'Electric Sunset',
    badge: '⚡ OTT Fire',
    dotColor: '#f97316',
    gradient: 'from-orange-500 to-rose-600',
    desc: 'Vivid orange flame & obsidian'
  },
  {
    id: 'stealth_carbon',
    name: 'Stealth Carbon',
    badge: '❄️ Minimal',
    dotColor: '#38bdf8',
    gradient: 'from-sky-500 to-indigo-600',
    desc: 'Matte charcoal & cool ice blue'
  },
];

interface NavbarProps {
  activeTab: 'live' | 'matches' | 'teams' | 'players' | 'tournaments' | 'rules' | 'saved_matches';
  setActiveTab: (tab: any) => void;
  onNewMatch: () => void;
  onOpenCreateTeam: () => void;
  onOpenCreatePlayer: () => void;
  onOpenCreateTournament?: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  loggedInPlayerName?: string;
  loggedInPlayerAvatar?: string;
  loggedInPlayerProfileId?: string;
  onShareApp: () => void;
  hasActiveMatch: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentTheme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewMatch,
  onOpenCreateTeam,
  onOpenCreatePlayer,
  onOpenCreateTournament,
  onOpenLoginModal,
  onLogout,
  loggedInPlayerName,
  loggedInPlayerAvatar,
  loggedInPlayerProfileId,
  onShareApp,
  hasActiveMatch,
  isDarkMode,
  onToggleTheme,
  currentTheme = 'ipl_gold',
  onSelectTheme,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(cricketAudio.getIsMuted());
  const [activeTheme, setActiveTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('arcl_theme') as AppTheme) || currentTheme || 'ipl_gold';
  });

  useEffect(() => {
    // Apply theme class to root body for CSS-level styling
    document.documentElement.setAttribute('data-arcl-theme', activeTheme);
    localStorage.setItem('arcl_theme', activeTheme);
  }, [activeTheme]);

  const handlePickTheme = (theme: AppTheme) => {
    setActiveTheme(theme);
    if (onSelectTheme) onSelectTheme(theme);
    cricketAudio.playClick('Theme selected');
    setIsThemeModalOpen(false);
  };

  const handleToggleMute = () => {
    const next = cricketAudio.toggleMute();
    setIsMuted(next);
  };

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    cricketAudio.playClick();
  };

  const isAdmin = loggedInPlayerProfileId === 'ARCL-001';

  return (
    <>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDarkMode
          ? 'bg-slate-950/90 border-slate-800 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Hamburger + Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                setIsDrawerOpen(true);
                cricketAudio.playClick();
              }}
              className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
              }`}
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              className="flex items-center gap-2 cursor-pointer select-none min-w-0" 
              onClick={() => setActiveTab('live')}
            >
              <img
                src="/icon-192.png"
                alt="ARCL"
                className="w-9 h-9 shrink-0 rounded-2xl object-cover shadow-md border border-amber-400/30"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-base bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent">
                    ARCL
                  </span>
                  <span className="hidden sm:inline text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Amritsar
                  </span>
                  <span 
                    title="Firebase Cloud Database Connected" 
                    className="hidden 2xl:flex items-center gap-1 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Live
                  </span>
                </div>
                <p className={`text-[9px] font-medium hidden md:block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Rooftop Cricket League
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (wide screens only) */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-900/40 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80">
            {[
              { id: 'live', label: 'Match Centre', icon: Play, badge: hasActiveMatch ? 'LIVE' : undefined },
              { id: 'matches', label: 'Matches', icon: Trophy },
              { id: 'teams', label: 'Teams', icon: Shield },
              { id: 'players', label: 'Players', icon: Users },
              { id: 'tournaments', label: 'Tournaments', icon: Sparkles },
              { id: 'rules', label: 'Rules', icon: BookOpen },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => handleNavClick(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Selector Button */}
            <button
              onClick={() => {
                setIsThemeModalOpen(true);
                cricketAudio.playClick();
              }}
              title="Change Visual Theme"
              className={`p-2 rounded-xl border transition cursor-pointer relative ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span 
                className="absolute top-1 right-1 w-2 h-2 rounded-full ring-1 ring-slate-900" 
                style={{ 
                  backgroundColor: THEME_OPTIONS.find(t => t.id === activeTheme)?.dotColor || '#f59e0b' 
                }} 
              />
            </button>

            {/* Sound Toggle (wide screens; lives in the drawer on phones) */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Commentary' : 'Mute Commentary'}
              className={`hidden xl:block p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Light / Dark Mode Toggle (wide screens; lives in the drawer on phones) */}
            <button
              onClick={onToggleTheme}
              title="Toggle Light / Dark mode"
              className={`hidden xl:block p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Player Account & Logout Controls */}
            {loggedInPlayerName ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenLoginModal}
                  className={`flex items-center gap-1.5 p-2 xl:px-2.5 xl:py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isAdmin
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title={isAdmin ? 'Admin – Account & Profile Settings' : 'Open Account & Profile Settings'}
                >
                  {isAdmin ? (
                    <span className="text-amber-400 font-black leading-none w-4 h-4 flex items-center justify-center text-sm">👑</span>
                  ) : loggedInPlayerAvatar ? (
                    <img src={loggedInPlayerAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span className="hidden xl:inline truncate max-w-[110px]">
                    {isAdmin ? 'Admin' : loggedInPlayerName}
                  </span>
                </button>

                <button
                  onClick={() => {
                    cricketAudio.playClick('Logged out');
                    onLogout();
                  }}
                  title="Logout from current account"
                  className="hidden xl:flex px-2 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold items-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className={`p-2 xl:px-2.5 xl:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
                }`}
                title="Login with PIN"
              >
                <User className="w-4 h-4 text-cyan-400" />
                <span className="hidden xl:inline">Login / PIN</span>
              </button>
            )}

            {/* "+ Match" Primary CTA */}
            <button
              id="nav-new-match-btn"
              onClick={() => {
                if (!loggedInPlayerName) {
                  onOpenLoginModal();
                } else {
                  onNewMatch();
                }
                cricketAudio.playClick();
              }}
              title="Start New Match"
              className="flex items-center gap-1 p-2 sm:px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Match</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 transition-transform ${
            isDarkMode ? 'bg-slate-950 text-white border-r border-slate-800' : 'bg-white text-slate-900 border-r border-slate-200'
          }`}>
            <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-amber-500/50 bg-slate-800 flex items-center justify-center text-white text-xl font-black shadow-md">
                    {loggedInPlayerAvatar ? (
                      <img src={loggedInPlayerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{loggedInPlayerName ? loggedInPlayerName.charAt(0).toUpperCase() : '🏏'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-black text-base tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {loggedInPlayerName || 'ARCL Player'}
                    </h3>
                    {loggedInPlayerProfileId && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ID: {loggedInPlayerProfileId}
                        </span>
                        {isAdmin && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                            👑 Admin
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenLoginModal();
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{loggedInPlayerName ? 'My Profile & Stats' : 'Login with PIN'}</span>
                </button>
                {loggedInPlayerName && (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onLogout();
                    }}
                    title="Logout"
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsThemeModalOpen(true);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold">Change Theme</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {THEME_OPTIONS.find(t => t.id === activeTheme)?.name}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              </button>

              {/* Sound toggle (moved here from the header on phones) */}
              <button
                onClick={handleToggleMute}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span className="text-sm font-semibold">Commentary Sound</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isMuted ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {isMuted ? 'OFF' : 'ON'}
                </span>
              </button>

              {/* Light / Dark toggle (moved here from the header on phones) */}
              <button
                onClick={onToggleTheme}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-400" />}
                  <span className="text-sm font-semibold">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {[
                { label: 'My Matches', icon: Trophy, action: () => handleNavClick('matches') },
                { label: 'My Tournaments', icon: Sparkles, action: () => handleNavClick('tournaments') },
                { label: 'Profile Overview', icon: User, action: () => { setIsDrawerOpen(false); onOpenLoginModal(); } },
                { label: 'My Teams', icon: Shield, action: () => handleNavClick('teams') },
                { label: 'All Players', icon: Users, action: () => handleNavClick('players') },
                { 
                  label: 'Start Match', 
                  icon: Play, 
                  highlight: true,
                  action: () => { 
                    setIsDrawerOpen(false); 
                    if (!loggedInPlayerName) {
                      onOpenLoginModal();
                    } else {
                      onNewMatch(); 
                    }
                  } 
                },
                { 
                  label: 'Create Tournament', 
                  icon: Flag, 
                  action: () => { 
                    setIsDrawerOpen(false); 
                    if (!loggedInPlayerName) {
                      onOpenLoginModal();
                    } else if (onOpenCreateTournament) {
                      onOpenCreateTournament(); 
                    } else {
                      handleNavClick('tournaments');
                    }
                  } 
                },
                { 
                  label: 'Create Team', 
                  icon: Plus, 
                  action: () => { 
                    setIsDrawerOpen(false); 
                    if (!loggedInPlayerName) {
                      onOpenLoginModal();
                    } else {
                      onOpenCreateTeam(); 
                    }
                  } 
                },
                { label: 'Rooftop Rules', icon: BookOpen, action: () => handleNavClick('rules') },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    item.highlight
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black shadow-md'
                      : isDarkMode
                      ? 'text-slate-200 hover:bg-slate-900 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>

            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>ARCL v2.0 • Amritsar</span>
                <button
                  onClick={onShareApp}
                  className="flex items-center gap-1 text-amber-400 hover:underline cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Theme Selection Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Choose App Theme</h3>
                  <p className="text-[10px] text-slate-400">Free client-side styles (0 KB data)</p>
                </div>
              </div>
              <button
                onClick={() => setIsThemeModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = activeTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handlePickTheme(theme.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-inner shrink-0`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-white">{theme.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {theme.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{theme.desc}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsThemeModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
