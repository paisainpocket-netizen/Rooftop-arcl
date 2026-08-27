import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { MVP_POINTS_RULES } from '../utils/mvp';

interface PointsSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PointsSystemModal: React.FC<PointsSystemModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition mr-1"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-black text-lg text-white tracking-wide">Points System</h3>
          </div>
          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MVP Rules</span>
          </span>
        </div>

        {/* Tables list matching Screenshot 1 */}
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Batting Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-teal-400 uppercase text-[11px] font-black border-b border-slate-800">
                <tr>
                  <th className="p-3">Batting</th>
                  <th className="p-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {MVP_POINTS_RULES.batting.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-3 text-slate-200">{row.label}</td>
                    <td className="p-3 text-right font-mono font-black text-white">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bowling Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-teal-400 uppercase text-[11px] font-black border-b border-slate-800">
                <tr>
                  <th className="p-3">Bowling</th>
                  <th className="p-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {MVP_POINTS_RULES.bowling.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-3 text-slate-200">{row.label}</td>
                    <td className="p-3 text-right font-mono font-black text-white">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fielding Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-teal-400 uppercase text-[11px] font-black border-b border-slate-800">
                <tr>
                  <th className="p-3">Fielding</th>
                  <th className="p-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {MVP_POINTS_RULES.fielding.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-3 text-slate-200">{row.label}</td>
                    <td className="p-3 text-right font-mono font-black text-white">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-teal-600/30"
        >
          Close
        </button>
      </div>
    </div>
  );
};
