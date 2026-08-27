import React, { useState } from 'react';
import { 
  Play, Trophy, Users, Shield, Sparkles, Plus, Moon, Sun, 
  Volume2, VolumeX, BookOpen, User, UserCheck, Menu, X, 
  Flag, Settings, LogOut, ChevronRight, Share2, Search
} from 'lucide-react';
import { cricketAudio } from '../utils/audio';

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
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(cricketAudio.getIsMuted());

  const handleToggleMute = () => {
    const next = cricketAudio.toggleMute();
    setIsMuted(next);
  };

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    cricketAudio.playClick();
  };

  return (
    <>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDarkMode
          ? 'bg-slate-950/90 border-slate-800 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Hamburger + Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setIsDrawerOpen(true);
                cricketAudio.playClick();
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
              }`}
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              className="flex items-center gap-2 cursor-pointer select-none" 
              onClick={() => setActiveTab('live')}
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-lg shadow-md font-black border border-emerald-400/30">
                🏏
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-base bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    ARCL
                  </span>
                  <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Amritsar
                  </span>
                  <span 
                    title="Firebase Cloud Database Connected" 
                    className="hidden lg:flex items-center gap-1 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Live
                  </span>
                </div>
                <p className={`text-[9px] font-medium hidden sm:block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Rooftop Cricket League
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/40 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80">
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
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound Toggle */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Commentary' : 'Mute Commentary'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title="Toggle Light / Dark mode"
              className={`p-2 rounded-xl border transition cursor-pointer ${
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    loggedInPlayerProfileId === 'ARCL-001'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title="Open Account & Profile Settings"
                >
                  {loggedInPlayerProfileId === 'ARCL-001' ? (
                    <span className="text-amber-400 font-black">👑</span>
                  ) : loggedInPlayerAvatar ? (
                    <img src={loggedInPlayerAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span className="truncate max-w-[85px] sm:max-w-[110px]">
                    {loggedInPlayerProfileId === 'ARCL-001' ? 'Admin' : loggedInPlayerName}
                  </span>
                </button>

                {/* Prominent Direct Header Logout Button */}
                <button
                  onClick={() => {
                    cricketAudio.playClick('Logged out');
                    onLogout();
                  }}
                  title="Logout from current account"
                  className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
                }`}
              >
                <User className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Login / PIN</span>
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
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden xs:inline">Match</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer (matching Screenshots 1 & 2) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 transition-transform ${
            isDarkMode ? 'bg-slate-950 text-white border-r border-slate-800' : 'bg-white text-slate-900 border-r border-slate-200'
          }`}>
            {/* Header: User Profile in Drawer */}
            <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/50 bg-slate-800 flex items-center justify-center text-white text-xl font-black shadow-md">
                    {loggedInPlayerAvatar ? (
                      <img src={loggedInPlayerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{loggedInPlayerName ? loggedInPlayerName.charAt(0).toUpperCase() : '🏏'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white tracking-tight">
                      {loggedInPlayerName || 'ARCL Player'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {loggedInPlayerProfileId ? `ID: ${loggedInPlayerProfileId}` : 'Free Account'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Login / Profile CTA button inside Drawer */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenLoginModal();
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isDarkMode
                      ? 'text-slate-200 hover:bg-slate-900 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>ARCL v2.0 • Amritsar</span>
                <button
                  onClick={onShareApp}
                  className="flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

