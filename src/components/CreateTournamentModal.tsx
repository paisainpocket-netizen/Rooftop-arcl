import React, { useState, useEffect } from 'react';
import { Tournament, Team, Player } from '../types/cricket';
import { Trophy, X, Calendar, MapPin, Image as ImageIcon, Camera, Check, Plus, AlertCircle, Hash, Sparkles } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { getNextSequentialTournamentId } from '../utils/playerSequence';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  existingTournaments?: Tournament[];
  onCreateTournament: (tournament: Tournament) => void;
  loggedInPlayer?: Player | null;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  teams,
  existingTournaments = [],
  onCreateTournament,
  loggedInPlayer = null,
}) => {
  const [tournamentId, setTournamentId] = useState(() => getNextSequentialTournamentId(existingTournaments));
  const [name, setName] = useState('');
  const [season, setSeason] = useState('Season 1');
  const [trophyName, setTrophyName] = useState('');
  const [location, setLocation] = useState('Amritsar Rooftop Arena');
  const [oversPerMatch, setOversPerMatch] = useState<number>(6);
  const [format, setFormat] = useState<'Round Robin + Knockout' | 'League' | 'Knockout'>('Round Robin + Knockout');
  const [bannerImage, setBannerImage] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Initialize selected teams & tournament ID on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTeamIds(teams.map((t) => t.id));
      setTournamentId(getNextSequentialTournamentId(existingTournaments));
    }
  }, [isOpen, teams, existingTournaments]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        setBannerImage(event.target.result as string);
        cricketAudio.playClick('Photo loaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleTeam = (teamId: string) => {
    cricketAudio.playClick();
    if (selectedTeamIds.includes(teamId)) {
      if (selectedTeamIds.length <= 2) {
        alert('Tournament needs at least 2 teams.');
        return;
      }
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const selectAllTeams = () => {
    cricketAudio.playClick();
    setSelectedTeamIds(teams.map((t) => t.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!loggedInPlayer) {
      alert('Please login first to create a tournament.');
      return;
    }

    if (selectedTeamIds.length < 2) {
      alert('Please select at least 2 teams for the tournament.');
      return;
    }

    cricketAudio.playClick();
    const cleanTourId = tournamentId.trim().toUpperCase() || getNextSequentialTournamentId(existingTournaments);
    const newTour: Tournament = {
      id: `tour-${Date.now()}`,
      tournamentId: cleanTourId,
      name: name.trim(),
      season: season.trim() || 'Season 1',
      trophyName: trophyName.trim() || `${name.trim()} Trophy`,
      location: location.trim() || 'Amritsar Rooftop Arena',
      bannerImage: bannerImage || undefined,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      teams: selectedTeamIds,
      format,
      status: 'ongoing',
      oversPerMatch,
      creatorId: loggedInPlayer?.id,
      creatorProfileId: loggedInPlayer?.profileId,
      creatorName: loggedInPlayer?.name,
    };

    onCreateTournament(newTour);
    onClose();
  };

  const overPresets = [4, 6, 8, 10, 12, 20, 50, 90];

  return (
    <div
      id="create-tournament-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="create-tournament-modal-card"
        className="relative w-full max-w-lg max-h-[94dvh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-800 text-slate-100 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Top Header */}
        <div
          id="create-tournament-modal-header"
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0 z-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-amber-500/20 shrink-0">
              🏆
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Create Tournament</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Setup league, participating teams & trophy</p>
            </div>
          </div>

          <button
            id="create-tournament-close-button"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-700/50"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            id="create-tournament-scroll-content"
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 overscroll-contain text-xs"
          >
            {/* Banner Photo Upload */}
            <div>
              <label className="text-slate-400 font-bold block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tournament Banner / Photo</span>
                </span>
                {bannerImage && (
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer font-semibold"
                  >
                    Remove Photo
                  </button>
                )}
              </label>

              {bannerImage ? (
                <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-700/80 mb-1 group">
                  <img src={bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                  <label className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md border border-white/10 active:scale-95 transition">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition active:scale-[0.99]">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Upload Tournament Banner</span>
                  <span className="text-[10px] text-slate-500">Supports JPG, PNG (Max 2.5MB)</span>
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Tournament ID (Auto-Sequential) & Tournament Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1 flex items-center justify-between">
                  <span>Tournament ID</span>
                  <span className="text-[10px] text-amber-400 font-mono">AUTO</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tournamentId}
                    readOnly
                    disabled
                    placeholder="e.g. TRN-001"
                    title="Tournament ID is auto-generated by the system and cannot be edited"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-black text-xs sm:text-sm tracking-wider uppercase cursor-not-allowed opacity-90"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 font-bold block mb-1">
                  Tournament Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amritsar Premier Terrace Trophy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-white font-semibold text-xs sm:text-sm placeholder-slate-600 transition"
                />
              </div>
            </div>

            {/* Season & Trophy Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Season / Edition</label>
                <input
                  type="text"
                  placeholder="e.g. Season 2026"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-white font-semibold text-xs transition"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Trophy Title</label>
                <input
                  type="text"
                  placeholder="e.g. Golden Terrace Cup"
                  value={trophyName}
                  onChange={(e) => setTrophyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-white font-semibold text-xs transition"
                />
              </div>
            </div>

            {/* Ground / Venue Location */}
            <div>
              <label className="text-slate-400 font-bold block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Venue / Ground Location</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Amritsar Rooftop Arena, Ranjit Avenue"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-white font-semibold text-xs transition"
              />
            </div>

            {/* Overs & Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-bold block mb-1.5">Overs Per Match</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={oversPerMatch}
                    onChange={(e) => setOversPerMatch(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-center text-xs"
                  />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {overPresets.map((ov) => (
                      <button
                        type="button"
                        key={ov}
                        onClick={() => setOversPerMatch(ov)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                          oversPerMatch === ov
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ov === 90 ? 'Test' : `${ov}O`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1.5">Tournament Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:border-amber-400 focus:outline-none transition cursor-pointer"
                >
                  <option value="Round Robin + Knockout">Round Robin + Knockout</option>
                  <option value="League">League Stage Only</option>
                  <option value="Knockout">Direct Knockout</option>
                </select>
              </div>
            </div>

            {/* Participating Teams Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 font-bold flex items-center gap-2">
                  <span>Participating Teams</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                    {selectedTeamIds.length} of {teams.length} Selected
                  </span>
                </label>
                <button
                  type="button"
                  onClick={selectAllTeams}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer transition"
                >
                  Select All
                </button>
              </div>

              {teams.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                  No teams available. Please create teams first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {teams.map((t) => {
                    const isSelected = selectedTeamIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTeam(t.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition active:scale-[0.98] ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400/80 text-amber-200 font-bold shadow-sm'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0"
                            style={{ backgroundColor: t.color ? `${t.color}33` : '#3b82f633', color: t.color || '#3b82f6' }}
                          >
                            {t.logoIcon || '🛡️'}
                          </div>
                          <span className="truncate text-xs">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] uppercase font-black font-mono text-slate-500">{t.shortName}</span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center transition ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'border border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Action Bar */}
          <div
            id="create-tournament-modal-footer"
            className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0 flex items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-10"
          >
            <button
              id="create-tournament-cancel-button"
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs sm:text-sm cursor-pointer transition flex items-center justify-center border border-slate-700/50"
            >
              Cancel
            </button>
            <button
              id="create-tournament-submit-button"
              type="submit"
              disabled={!name.trim() || selectedTeamIds.length < 2}
              className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 cursor-pointer transition flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>Create Tournament</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
