import React, { useState, useEffect } from 'react';
import { Match, Player, Team } from '../types/cricket';
import { Users, X, Shield, Plus, Check, Search, Trash2, UserPlus, Star, Lock, UserCheck, UserMinus } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { getNextSequentialProfileId } from '../utils/playerSequence';

interface MatchSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onSaveMatchSquad: (updatedMatch: Match) => void;
  allGlobalPlayers?: Player[];
  loggedInPlayer?: Player | null;
  canEdit?: boolean;
  onAddPlayerToTeam?: (teamId: string, player: Player) => void;
  onRemovePlayerFromTeam?: (teamId: string, playerId: string) => void;
}

export const MatchSquadModal: React.FC<MatchSquadModalProps> = ({
  isOpen,
  onClose,
  match,
  onSaveMatchSquad,
  allGlobalPlayers = [],
  loggedInPlayer,
  canEdit,
  onAddPlayerToTeam,
  onRemovePlayerFromTeam,
}) => {
  // Permission verification
  const isMatchAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const isMatchCreator = Boolean(
    loggedInPlayer &&
    ((match.creatorId && match.creatorId === loggedInPlayer.id) ||
     (match.creatorProfileId && match.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
     (!match.creatorId && !match.creatorProfileId && isMatchAdmin))
  );

  const isDelegatedScorer = Boolean(
    loggedInPlayer &&
    match.delegatedScorerProfileId &&
    (match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
     match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase() ||
     (loggedInPlayer.phoneNumber && match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.phoneNumber.toLowerCase()))
  );

  const canEditSquad = canEdit !== undefined ? canEdit : Boolean(isMatchCreator || isDelegatedScorer || isMatchAdmin);

  const [activeTab, setActiveTab] = useState<'teamA' | 'teamB'>('teamA');
  const [selectedSquadA, setSelectedSquadA] = useState<string[]>(
    match.playingSquadA && match.playingSquadA.length > 0
      ? match.playingSquadA
      : match.teamA.players.map((p) => p.id)
  );
  const [selectedSquadB, setSelectedSquadB] = useState<string[]>(
    match.playingSquadB && match.playingSquadB.length > 0
      ? match.playingSquadB
      : match.teamB.players.map((p) => p.id)
  );
  const [captainA, setCaptainA] = useState<string>(match.captainA || match.teamA.players[0]?.id || '');
  const [captainB, setCaptainB] = useState<string>(match.captainB || match.teamB.players[0]?.id || '');
  const [viceCaptainA, setViceCaptainA] = useState<string>(match.viceCaptainA || match.teamA.players[1]?.id || '');
  const [viceCaptainB, setViceCaptainB] = useState<string>(match.viceCaptainB || match.teamB.players[1]?.id || '');
  const [keeperA, setKeeperA] = useState<string>(match.keeperA || match.teamA.players[3]?.id || match.teamA.players[0]?.id || '');
  const [keeperB, setKeeperB] = useState<string>(match.keeperB || match.teamB.players[3]?.id || match.teamB.players[0]?.id || '');

  const [filterView, setFilterView] = useState<'all' | 'playing' | 'bench'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [searchProfileIdQuery, setSearchProfileIdQuery] = useState('');
  
  // Sync state whenever modal opens or match updates
  useEffect(() => {
    if (isOpen) {
      const initialSquadA = match.playingSquadA && match.playingSquadA.length > 0
        ? match.playingSquadA
        : match.teamA.players.map((p) => p.id);
      const initialSquadB = match.playingSquadB && match.playingSquadB.length > 0
        ? match.playingSquadB
        : match.teamB.players.map((p) => p.id);

      setSelectedSquadA(initialSquadA);
      setSelectedSquadB(initialSquadB);
      setCaptainA(match.captainA || match.teamA.captainId || match.teamA.players[0]?.id || '');
      setCaptainB(match.captainB || match.teamB.captainId || match.teamB.players[0]?.id || '');
      setViceCaptainA(match.viceCaptainA || match.teamA.viceCaptainId || match.teamA.players[1]?.id || '');
      setViceCaptainB(match.viceCaptainB || match.teamB.viceCaptainId || match.teamB.players[1]?.id || '');
      setKeeperA(match.keeperA || match.teamA.wicketKeeperId || match.teamA.players[3]?.id || match.teamA.players[0]?.id || '');
      setKeeperB(match.keeperB || match.teamB.wicketKeeperId || match.teamB.players[3]?.id || match.teamB.players[0]?.id || '');
    }
  }, [isOpen, match.id, match.playingSquadA, match.playingSquadB, match.teamA.players, match.teamB.players]);
  
  // Quick new player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'>('allrounder');
  const [newPlayerPin, setNewPlayerPin] = useState('1234');

  if (!isOpen) return null;

  const currentTeam: Team = activeTab === 'teamA' ? match.teamA : match.teamB;
  const currentSquad = activeTab === 'teamA' ? selectedSquadA : selectedSquadB;
  const setSquad = activeTab === 'teamA' ? setSelectedSquadA : setSelectedSquadB;
  const currentCaptain = activeTab === 'teamA' ? captainA : captainB;
  const setCaptain = activeTab === 'teamA' ? setCaptainA : setCaptainB;
  const currentViceCaptain = activeTab === 'teamA' ? viceCaptainA : viceCaptainB;
  const setViceCaptain = activeTab === 'teamA' ? setViceCaptainA : setViceCaptainB;
  const currentKeeper = activeTab === 'teamA' ? keeperA : keeperB;
  const setKeeper = activeTab === 'teamA' ? setKeeperA : setKeeperB;

  const filteredPlayers = currentTeam.players.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.profileId.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    const isPlaying = currentSquad.includes(p.id);
    if (filterView === 'playing') return isPlaying;
    if (filterView === 'bench') return !isPlaying;
    return true;
  });

  // Global players not currently in this team matching search query
  const matchingGlobalPlayers = searchQuery.trim()
    ? allGlobalPlayers.filter((gp) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = gp.name.toLowerCase().includes(q) || gp.profileId.toLowerCase().includes(q);
        const alreadyInTeam = currentTeam.players.some((p) => p.id === gp.id || p.profileId === gp.profileId);
        return matchesQuery && !alreadyInTeam;
      })
    : [];

  const setPlayerStatus = (playerId: string, status: 'playing' | 'bench') => {
    if (!canEditSquad) {
      alert('Only the match creator, scorer, or admin can change squad status.');
      return;
    }
    cricketAudio.playClick();
    if (status === 'playing') {
      if (!currentSquad.includes(playerId)) {
        setSquad([...currentSquad, playerId]);
      }
    } else {
      if (currentSquad.length <= 1 && currentSquad.includes(playerId)) {
        alert('Match needs at least 1-2 playing squad members.');
        return;
      }
      setSquad(currentSquad.filter((id) => id !== playerId));
    }
  };

  const handleSave = () => {
    if (!canEditSquad) {
      onClose();
      return;
    }
    cricketAudio.playClick();
    onSaveMatchSquad({
      ...match,
      playingSquadA: selectedSquadA,
      playingSquadB: selectedSquadB,
      captainA,
      captainB,
      viceCaptainA,
      viceCaptainB,
      keeperA,
      keeperB,
      updatedAt: Date.now(),
    });
    onClose();
  };

  // Add existing player by Profile ID from global directory
  const handleAddExistingPlayerByProfile = (playerToAdd: Player) => {
    if (!canEditSquad) {
      alert('Only the match creator, scorer, or admin can add players.');
      return;
    }
    cricketAudio.playClick();
    if (currentTeam.players.some((p) => p.id === playerToAdd.id || p.profileId === playerToAdd.profileId)) {
      alert(`${playerToAdd.name} is already in ${currentTeam.name}!`);
      return;
    }
    if (onAddPlayerToTeam) {
      onAddPlayerToTeam(currentTeam.id, playerToAdd);
    }
    // Also add to active squad
    setSquad([...currentSquad, playerToAdd.id]);
    setShowAddPlayerModal(false);
    setSearchProfileIdQuery('');
    setSearchQuery('');
  };

  // Create brand new player with sequential ARCL ID
  const handleCreateNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSquad) {
      alert('Only the match creator, scorer, or admin can create and add players.');
      return;
    }
    if (!newPlayerName.trim()) return;

    cricketAudio.playClick();
    const generatedProfileId = getNextSequentialProfileId(allGlobalPlayers);

    const newP: Player = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      profileId: generatedProfileId,
      pin: newPlayerPin || '1234',
      isClaimed: false,
      name: newPlayerName.trim(),
      role: newPlayerRole,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      jerseyNumber: Math.floor(Math.random() * 99) + 1,
      isCustom: true,
      stats: {
        matches: 0,
        innings: 0,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        fifties: 0,
        centuries: 0,
        highestScore: 0,
        highestScoreNotOut: false,
        strikeRate: 0,
        battingAverage: 0,
        oversBowled: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        bestBowlingWickets: 0,
        bestBowlingRuns: 0,
        economy: 0,
        bowlingAverage: 0,
        threeWicketHauls: 0,
        fiveWicketHauls: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        momAwards: 0,
      },
    };

    if (onAddPlayerToTeam) {
      onAddPlayerToTeam(currentTeam.id, newP);
    }
    setSquad([...currentSquad, newP.id]);
    setNewPlayerName('');
    setShowAddPlayerModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
        {/* Top App Bar (Screenshot 1 & 2) */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-2">
            <h2 className="text-base font-black tracking-wider text-white uppercase text-center truncate">
              {currentTeam.name}
            </h2>
            {!canEditSquad && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> View Only (Spectator)
              </span>
            )}
          </div>

          {canEditSquad ? (
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              Done
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        {/* Team Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('teamA')}
            className={`py-2 rounded-xl font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'teamA'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <span className="truncate">{match.teamA.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40">
              {selectedSquadA.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teamB')}
            className={`py-2 rounded-xl font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'teamB'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <span className="truncate">{match.teamB.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40">
              {selectedSquadB.length}
            </span>
          </button>
        </div>

        {/* Search & Quick Controls Bar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player name or profile ID..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Filter View Selector & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
              <button
                type="button"
                onClick={() => setFilterView('all')}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition cursor-pointer ${
                  filterView === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({currentTeam.players.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterView('playing')}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition cursor-pointer flex items-center gap-1 ${
                  filterView === 'playing'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Playing</span>
                <span className="font-mono text-[10px] px-1 rounded bg-black/30">
                  {currentSquad.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterView('bench')}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition cursor-pointer flex items-center gap-1 ${
                  filterView === 'bench'
                    ? 'bg-slate-700 text-slate-200 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Bench</span>
                <span className="font-mono text-[10px] px-1 rounded bg-black/30">
                  {Math.max(0, currentTeam.players.length - currentSquad.length)}
                </span>
              </button>
            </div>

            {canEditSquad && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playClick();
                    setSquad(currentTeam.players.map((p) => p.id));
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playClick();
                    setSquad(currentTeam.players.slice(0, 2).map((p) => p.id));
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Min (2)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Player Squad List (Numbered, Avatar, Name, ID, C/VC/WK roles, Playing/Bench Toggle) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/60">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No players found matching "{searchQuery}".
            </div>
          ) : (
            filteredPlayers.map((p, idx) => {
              const isPlaying = currentSquad.includes(p.id);
              const isCap = currentCaptain === p.id;
              const isViceCap = currentViceCaptain === p.id;
              const isKeep = currentKeeper === p.id;

              return (
                <div
                  key={p.id}
                  className={`pt-2.5 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition rounded-xl px-2 ${
                    isPlaying ? 'bg-slate-950/40' : 'opacity-70'
                  }`}
                >
                  {/* Left: Number + Avatar + Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Index Badge */}
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    {/* Circular Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                      {p.avatar ? (
                        <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Name & Profile ID */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                          {p.name}
                        </span>
                        {isCap && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            (C)
                          </span>
                        )}
                        {isViceCap && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            (VC)
                          </span>
                        )}
                        {isKeep && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            (WK)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-400 lowercase">
                          {p.profileId}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">• {p.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role assignments (C, VC, WK) & Playing/Bench Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-end">
                    {/* Role Badges */}
                    {canEditSquad ? (
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            setCaptain(isCap ? '' : p.id);
                          }}
                          title="Set as Captain (C)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                            isCap
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          C
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            setViceCaptain(isViceCap ? '' : p.id);
                          }}
                          title="Set as Vice-Captain (VC)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                            isViceCap
                              ? 'bg-blue-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          VC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            setKeeper(isKeep ? '' : p.id);
                          }}
                          title="Set as Wicketkeeper (WK)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                            isKeep
                              ? 'bg-cyan-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          WK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {isCap && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white">C</span>}
                        {isViceCap && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white">VC</span>}
                        {isKeep && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-500 text-white">WK</span>}
                      </div>
                    )}

                    {/* Playing / Bench Toggle Pill */}
                    <div className="flex items-center gap-1">
                      {canEditSquad ? (
                        <>
                          <button
                            onClick={() => setPlayerStatus(p.id, 'playing')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                              isPlaying
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Playing
                          </button>
                          <button
                            onClick={() => setPlayerStatus(p.id, 'bench')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                              !isPlaying
                                ? 'bg-slate-700 text-slate-100 shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Bench
                          </button>

                          {/* Remove from Squad button */}
                          {onRemovePlayerFromTeam && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${p.name} from this team squad? (Global player record & Profile ID will remain intact)`)) {
                                  onRemovePlayerFromTeam(currentTeam.id, p.id);
                                  setSquad(currentSquad.filter((id) => id !== p.id));
                                }
                              }}
                              title="Remove player from this team"
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isPlaying
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isPlaying ? 'Playing' : 'Bench'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* If search query has matches in global players not yet in this team (Creator only) */}
          {canEditSquad && matchingGlobalPlayers.length > 0 && (
            <div className="pt-3 mt-2 border-t border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Found in ARCL Directory ({matchingGlobalPlayers.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Click Add to bring into this match</span>
              </div>

              {matchingGlobalPlayers.map((gp) => (
                <div
                  key={gp.id}
                  className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-800 border border-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {gp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{gp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-emerald-300 font-bold">
                          {gp.profileId}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">• {gp.role}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddExistingPlayerByProfile(gp)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add to Squad</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Action Bar: ADD / CREATE PLAYER (Creator/Scorer only) */}
        {canEditSquad && (
          <div className="p-3 bg-emerald-950/60 border-t border-emerald-500/20">
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ ADD / CREATE PLAYER</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Search Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">
                Add Player to {currentTeam.name}
              </h3>
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option A: Search from ARCL Global Directory by Profile ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 uppercase">
                1. Search by Profile ID / Name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProfileIdQuery}
                  onChange={(e) => setSearchProfileIdQuery(e.target.value)}
                  placeholder="e.g. ARCL-002, Vicky, 98765..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {searchProfileIdQuery.trim() && (
                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {allGlobalPlayers
                    .filter((gp) => {
                      const q = searchProfileIdQuery.toLowerCase().trim();
                      return (
                        gp.profileId?.toLowerCase().includes(q) ||
                        gp.id?.toLowerCase().includes(q) ||
                        gp.name.toLowerCase().includes(q) ||
                        (gp.phoneNumber && gp.phoneNumber.toLowerCase().includes(q))
                      );
                    })
                    .slice(0, 8)
                    .map((gp) => (
                      <div
                        key={gp.id}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-between cursor-pointer border border-slate-800 transition"
                        onClick={() => handleAddExistingPlayerByProfile(gp)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-800/80 border border-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                            {gp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{gp.name}</p>
                            <p className="text-[10px] font-mono text-emerald-400 font-bold">Profile ID: {gp.profileId || gp.id}</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow">
                          + Add to Team
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-500 uppercase">OR Create New</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Option B: Create Brand New Player */}
            <form onSubmit={handleCreateNewPlayer} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Jaggi Amritsaria"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Playing Role
                  </label>
                  <select
                    value={newPlayerRole}
                    onChange={(e: any) => setNewPlayerRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  >
                    <option value="allrounder">All-Rounder</option>
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Initial PIN (for login)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPlayerPin}
                    onChange={(e) => setNewPlayerPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow-md"
              >
                Create Player & Add to Squad
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
