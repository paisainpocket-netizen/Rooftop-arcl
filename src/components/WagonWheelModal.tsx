import React, { useState } from 'react';
import { ShotZone } from '../types/cricket';
import { cricketAudio } from '../utils/audio';
import { X, Target } from 'lucide-react';

interface WagonWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  batterName?: string;
  runs: number;
  isWicket?: boolean;
  onSelectZone: (zone: ShotZone, selectedRuns: number, isWkt: boolean) => void;
}

const ZONES: { id: ShotZone; name: string; paName: string; angle: number; color: string }[] = [
  { id: 'straight', name: 'Straight', paName: 'ਸਿੱਧਾ', angle: 0, color: '#10b981' },
  { id: 'long_on', name: 'Long On', paName: 'ਲੌਂਗ ਆਨ', angle: 45, color: '#06b6d4' },
  { id: 'mid_wicket', name: 'Mid Wicket', paName: 'ਮਿਡ ਵਿਕਟ', angle: 90, color: '#3b82f6' },
  { id: 'square_leg', name: 'Square Leg', paName: 'ਸਕੁਏਅਰ ਲੈਗ', angle: 135, color: '#8b5cf6' },
  { id: 'fine_leg', name: 'Fine Leg', paName: 'ਫਾਈਨ ਲੈਗ', angle: 180, color: '#ec4899' },
  { id: 'third_man', name: 'Third Man', paName: 'ਥਰਡ ਮੈਨ', angle: 225, color: '#f59e0b' },
  { id: 'point', name: 'Point', paName: 'ਪੁਆਇੰਟ', angle: 270, color: '#10b981' },
  { id: 'cover', name: 'Cover / Extra Cover', paName: 'ਕਵਰ', angle: 315, color: '#14b8a6' },
];

export const WagonWheelModal: React.FC<WagonWheelModalProps> = ({
  isOpen,
  onClose,
  batterName = 'Striker',
  runs = 0,
  isWicket = false,
  onSelectZone,
}) => {
  const [selectedRuns, setSelectedRuns] = useState<number>(runs);
  const [isWkt, setIsWkt] = useState<boolean>(isWicket);

  if (!isOpen) return null;

  const handleZoneClick = (zone: ShotZone, zoneName: string) => {
    cricketAudio.playClick(`Shot to ${zoneName}`);
    onSelectZone(zone, selectedRuns, isWkt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/40 text-slate-100 p-4 sm:p-5 shadow-2xl space-y-3.5 text-center animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 text-emerald-400 text-left">
            <Target className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-black text-sm text-white">Shot Direction (Wagon Wheel)</h3>
              <p className="text-[10px] text-slate-400">Select Runs & Touch Ground Sector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batsman Name & Runs Selection Row */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 truncate max-w-[170px]">
              🏏 {batterName}
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              {isWkt ? 'Wicket Delivery' : `${selectedRuns} Runs Selected`}
            </span>
          </div>

          {/* Quick Runs Selector Buttons */}
          <div className="grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRuns(r);
                  setIsWkt(false);
                  cricketAudio.playClick();
                }}
                className={`py-1.5 rounded-xl font-mono font-black text-xs transition cursor-pointer ${
                  !isWkt && selectedRuns === r
                    ? r === 6
                      ? 'bg-purple-600 text-white shadow-md'
                      : r === 4
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-cyan-600 text-white shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {r === 0 ? '•' : r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsWkt(true);
                setSelectedRuns(0);
                cricketAudio.playClick();
              }}
              className={`py-1.5 rounded-xl font-sans font-black text-[10px] transition cursor-pointer ${
                isWkt
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-rose-400 hover:border-rose-700'
              }`}
            >
              OUT
            </button>
          </div>
        </div>

        {/* Circular Touch Wagon Wheel Graphic */}
        <div className="relative w-60 h-60 mx-auto rounded-full bg-slate-950 border-4 border-emerald-500/40 shadow-inner flex items-center justify-center overflow-hidden my-1">
          {/* Pitch in Center */}
          <div className="absolute w-7 h-12 rounded bg-amber-700/60 border border-amber-500/40 z-10 flex flex-col items-center justify-between py-1 pointer-events-none">
            <div className="w-3 h-0.5 bg-white/80 rounded-full" />
            <span className="text-[7px] font-black text-amber-200">22yd</span>
            <div className="w-3 h-0.5 bg-white/80 rounded-full" />
          </div>

          {/* 30-Yard Circle Marker */}
          <div className="absolute w-36 h-36 rounded-full border border-dashed border-white/20 pointer-events-none" />

          {/* 8 Touch Sectors */}
          {ZONES.map((z) => {
            const rad = ((z.angle - 90) * Math.PI) / 180;
            const x = 50 + 37 * Math.cos(rad);
            const y = 50 + 37 * Math.sin(rad);

            return (
              <button
                key={z.id}
                type="button"
                onClick={() => handleZoneClick(z.id, z.name)}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 px-2 py-1 rounded-xl text-[9px] font-black shadow-lg transition transform hover:scale-110 active:scale-90 cursor-pointer bg-slate-800/90 border border-slate-700 hover:border-emerald-400 hover:bg-emerald-600 hover:text-white text-slate-200"
              >
                {z.name.split('/')[0]}
              </button>
            );
          })}
        </div>

        {/* Quick Sector Grid for Easy Big Touch */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {ZONES.map((z) => (
            <button
              key={z.id}
              onClick={() => handleZoneClick(z.id, z.name)}
              className="p-1.5 rounded-xl bg-slate-800/70 hover:bg-emerald-600 hover:text-white border border-slate-700/60 text-[10px] font-bold text-slate-300 truncate transition active:scale-95 cursor-pointer"
            >
              {z.name.split('/')[0]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
        >
          Cancel / Skip
        </button>
      </div>
    </div>
  );
};
