import React, { useState } from 'react';
import { Player, PlayerRole, BattingStyle, BowlingStyle } from '../types/cricket';
import { User, X, Plus, Lock, ShieldCheck } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { getNextSequentialProfileId } from '../utils/playerSequence';

interface CreatePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
  teamName?: string;
  existingPlayers?: Player[];
  onSavePlayer: (player: Player, teamId?: string) => void;
  loggedInPlayer?: Player | null;
}

export const CreatePlayerModal: React.FC<CreatePlayerModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  existingPlayers = [],
  onSavePlayer,
  loggedInPlayer = null,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('allrounder');
  const [battingStyle, setBattingStyle] = useState<BattingStyle>('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>('Right-arm medium');
  const [jerseyNumber, setJerseyNumber] = useState<number>(18);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialPin, setInitialPin] = useState('1234');
  const [assignedProfileId, setAssignedProfileId] = useState(() => getNextSequentialProfileId(existingPlayers));
  const [createdInfo, setCreatedInfo] = useState<{ name: string; profileId: string; pin: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setAssignedProfileId(getNextSequentialProfileId(existingPlayers));
      setName('');
      setPhoneNumber('');
      setInitialPin('1234');
    }
  }, [isOpen, existingPlayers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Guaranteed next sequential ID without duplicates
    const finalProfileId = getNextSequentialProfileId(existingPlayers);
    const assignedPin = initialPin.trim() || '1234';

    cricketAudio.playClick('Player profile created with ID ' + finalProfileId);
    const newPlayerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPlayer: Player = {
      id: newPlayerId,
      profileId: finalProfileId,
      pin: assignedPin,
      isClaimed: !loggedInPlayer ? true : false,
      creatorId: loggedInPlayer ? loggedInPlayer.id : newPlayerId,
      creatorProfileId: loggedInPlayer ? loggedInPlayer.profileId : finalProfileId,
      creatorName: loggedInPlayer ? loggedInPlayer.name : name.trim(),
      name: name.trim(),
      role,
      battingStyle,
      bowlingStyle,
      jerseyNumber,
      phoneNumber: phoneNumber.trim() || undefined,
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

    onSavePlayer(newPlayer, teamId);
    setCreatedInfo({ name: newPlayer.name, profileId: finalProfileId, pin: assignedPin });
  };

  if (createdInfo) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 text-slate-100 p-6 shadow-2xl space-y-5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center text-3xl font-black">
            ✅
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Player Profile Created!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Give these login details to your friend/player so they can login and manage their account:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-left font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-sans">Player Name:</span>
              <span className="text-white font-bold">{createdInfo.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-sans">Profile ID:</span>
              <span className="text-emerald-400 font-black text-sm">{createdInfo.profileId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-sans">Initial PIN:</span>
              <span className="text-amber-400 font-black text-sm">{createdInfo.pin}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Once {createdInfo.name} logs in with this Profile ID & PIN, they can change their PIN and upload their profile photo.
          </p>

          <button
            onClick={() => {
              setCreatedInfo(null);
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            Done & Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center text-white text-xl">
              🏏
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Add New Player</h2>
              <p className="text-xs text-slate-400">
                {teamName ? `Adding player to ${teamName}` : 'Add player to master pool'}
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">Player Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jaswinder Singh (Jassi)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Primary Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as PlayerRole)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              >
                <option value="allrounder">All-Rounder</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Jersey Number</label>
              <input
                type="number"
                min={1}
                max={999}
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Batting Hand</label>
              <select
                value={battingStyle}
                onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
              >
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Bowling Style</label>
              <select
                value={bowlingStyle}
                onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
              >
                <option value="Right-arm medium">Right-arm medium</option>
                <option value="Right-arm fast">Right-arm fast</option>
                <option value="Right-arm spin">Right-arm spin</option>
                <option value="Left-arm fast">Left-arm fast</option>
                <option value="Left-arm spin">Left-arm spin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-emerald-400 font-bold block text-[11px]">System Auto-Sequence ID</label>
                <Lock className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 font-mono font-black uppercase text-xs flex items-center justify-between shadow-inner">
                <span>{assignedProfileId}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-sans font-bold">LOCKED</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Automatic line-wise unique sequence</span>
            </div>

            <div>
              <label className="text-amber-400 font-bold block mb-1 text-[11px]">Initial 4-Digit PIN *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={initialPin}
                onChange={(e) => setInitialPin(e.target.value)}
                placeholder="1234"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-mono font-black text-xs"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Player can change later</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Phone / WhatsApp (Optional)</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black shadow-md shadow-cyan-600/30 cursor-pointer"
            >
              Save Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
