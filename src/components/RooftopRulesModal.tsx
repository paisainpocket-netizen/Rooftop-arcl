import React from 'react';
import { BookOpen, ShieldAlert, Sparkles, CheckCircle2, X } from 'lucide-react';

interface RooftopRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RooftopRulesModal: React.FC<RooftopRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-6 shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl">
              🏏
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-emerald-400">
                Official ARCL Rooftop Cricket Rules
              </h2>
              <p className="text-xs text-slate-400">
                Custom terrace and net arena scoring regulations (Amritsar Edition).
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

        {/* Rule cards */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>1. Direct Roof Out (ਛੱਤ ਤੋਂ ਬਾਹਰ ਆਊਟ)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              If a batsman hits the tennis ball directly over the safety net / boundary railing onto the street below, the batter is declared <strong>OUT immediately</strong>. No runs are awarded. The batting team is also responsible for retrieving the ball!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-black text-sm">
              <Sparkles className="w-4 h-4" />
              <span>2. Single-Wall Catch (ਕੰਧ ਲੱਗ ਕੇ ਇੱਕ ਹੱਥ ਕੈਚ)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              A ball that rebounds off a single terrace perimeter wall and is caught with <strong>one hand</strong> before touching the floor constitutes a legitimate dismissal (Wall Catch).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>3. Free Hit on Front-Foot & Height No-Balls</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Every no-ball awards +1 run extra to the batting side and enforces an automatic <strong>FREE HIT</strong> on the subsequent legal delivery. Batsmen can only be run out on free hits.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-black text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>4. Over Limit & Maximum Bowler Spell</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Default ARCL terrace games are 6 overs (T6) or 10 overs (T10). In a 6-over match, each bowler is restricted to a maximum of 2 overs to guarantee full squad participation.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-600/30"
        >
          Understood & Close
        </button>
      </div>
    </div>
  );
};
