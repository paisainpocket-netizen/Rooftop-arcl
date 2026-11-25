import React, { useState } from 'react';
import { Team, Player } from '../types/cricket';
import { Shield, X, Sparkles, Image as ImageIcon, Camera, Lock } from 'lucide-react';
import { cricketAudio } from '../utils/audio';
import { getNextSequentialTeamId } from '../utils/playerSequence';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTeam: (team: Team) => void;
  allExistingPlayers?: Player[];
  allExistingTeams?: Team[];
  loggedInPlayer?: Player | null;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSaveTeam,
  allExistingPlayers = [],
  allExistingTeams = [],
  loggedInPlayer = null,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('Amritsar');
  const [color, setColor] = useState('#10b981');
  const [logoIcon, setLogoIcon] = useState('🦁');
  const [logoUrl, setLogoUrl] = useState('');

  const assignedTeamId = React.useMemo(() => {
    return getNextSequentialTeamId(allExistingTeams);
  }, [allExistingTeams, isOpen]);

  if (!isOpen) return null;

  // Shrinks the chosen logo before it is stored (about 256px, a few KB) so team documents stay
  // small and every phone loads them fast. WebP keeps a transparent background; phones that
  // cannot make WebP automatically get a small PNG instead.
  const compressLogo = (file: File, maxDim = 256, quality = 0.8): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('image failed'));
        img.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('no canvas');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/webp', quality));
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Logo image is too big. Please choose a photo under 10MB.');
      return;
    }

    compressLogo(file)
      .then((dataUrl) => {
        setLogoUrl(dataUrl);
        cricketAudio.playClick('Logo uploaded');
      })
      .catch(() => {
        alert('Could not read this image. Please try another photo.');
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!loggedInPlayer) {
      alert('Please login first to create a team.');
      return;
    }

    cricketAudio.playClick();
    const finalTeamId = getNextSequentialTeamId(allExistingTeams);
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      teamId: finalTeamId,
      profileId: finalTeamId,
      name: name.trim(),
      shortName: (shortName || name.slice(0, 3)).toUpperCase(),
      city: city.trim() || 'Amritsar',
      color,
      logoIcon,
      logoUrl: logoUrl.trim() || undefined,
      isCustom: true,
      creatorId: loggedInPlayer?.id,
      creatorProfileId: loggedInPlayer?.profileId,
      creatorName: loggedInPlayer?.name,
      players: loggedInPlayer ? [{ ...loggedInPlayer }] : [],
    };

    onSaveTeam(newTeam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl">
              🛡️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Create New Team</h2>
              <p className="text-xs text-slate-400">Add custom franchise with jersey colors</p>
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
          {/* Auto Sequential Team ID Box */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Auto-Assigned Team ID</span>
              <span className="text-sm font-black font-mono text-emerald-400">{assignedTeamId}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold">
              <Lock className="w-3 h-3" />
              <span>SEQUENTIAL LOCKED</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Team Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ranjit Avenue Strikers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Short Code (3-4 chars)</label>
              <input
                type="text"
                placeholder="e.g. RAS"
                maxLength={4}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold uppercase"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Area / Locality</label>
              <input
                type="text"
                placeholder="e.g. Lawrence Road, Amritsar"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Jersey / Team Color</label>
            <div className="flex items-center gap-2">
              {['#3b82f6', '#10b981', '#ef4444', '#eab308', '#8b5cf6', '#ec4899', '#f97316'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-xl border-2 transition cursor-pointer ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Team Logo Photo Upload */}
          <div>
            <label className="text-slate-400 font-bold block mb-1 flex items-center justify-between">
              <span>Team Logo Photo / Badge</span>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </label>

            {logoUrl ? (
              <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-300">Upload Team Logo Photo</span>
                <span className="text-[9px] text-slate-500">Photo is auto-resized to a small size</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Team Emoji / Icon</label>
            <div className="flex items-center gap-2">
              {['🦁', '👑', '🛡️', '⚡', '🦅', '🔥', '🐯', '🏏'].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setLogoIcon(icon)}
                  className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center cursor-pointer transition ${
                    logoIcon === icon ? 'bg-slate-800 border-emerald-400' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
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
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
