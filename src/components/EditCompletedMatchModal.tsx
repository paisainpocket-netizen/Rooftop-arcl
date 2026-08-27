import React, { useState } from 'react';
import { X, AlertTriangle, Save } from 'lucide-react';
import { Match, BatsmanStats, BowlerStats } from '../types/cricket';
import { cricketAudio } from '../utils/audio';

interface EditCompletedMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onSaveCorrections: (correctedMatch: Match) => void;
}

export const EditCompletedMatchModal: React.FC<EditCompletedMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  onSaveCorrections,
}) => {
  const inningsList = [match.innings1, match.innings2, match.innings3, match.innings4].filter(
    (inn): inn is NonNullable<typeof inn> => Boolean(inn) && Object.keys(inn.battingStats).length > 0
  );

  const [activeInningsIdx, setActiveInningsIdx] = useState(0);

  const [battingEdits, setBattingEdits] = useState<{ [inningsIdx: number]: { [playerId: string]: BatsmanStats } }>(
    () => {
      const map: { [inningsIdx: number]: { [playerId: string]: BatsmanStats } } = {};
      inningsList.forEach((inn, idx) => {
        map[idx] = {};
        Object.values(inn.battingStats).forEach((s) => {
          map[idx][s.playerId] = { ...s };
        });
      });
      return map;
    }
  );

  const [bowlingEdits, setBowlingEdits] = useState<{ [inningsIdx: number]: { [playerId: string]: BowlerStats } }>(
    () => {
      const map: { [inningsIdx: number]: { [playerId: string]: BowlerStats } } = {};
      inningsList.forEach((inn, idx) => {
        map[idx] = {};
        Object.values(inn.bowlingStats).forEach((s) => {
          map[idx][s.playerId] = { ...s };
        });
      });
      return map;
    }
  );

  if (!isOpen) return null;

  const activeInnings = inningsList[activeInningsIdx];
  const battingRows = Object.values(battingEdits[activeInningsIdx] || {}).sort(
    (a, b) => a.battingOrder - b.battingOrder
  );
  const bowlingRows = Object.values(bowlingEdits[activeInningsIdx] || {});

  const updateBatting = (playerId: string, patch: Partial<BatsmanStats>) => {
    setBattingEdits((prev) => {
      const next = { ...prev };
      const innMap = { ...next[activeInningsIdx] };
      innMap[playerId] = { ...innMap[playerId], ...patch };
      next[activeInningsIdx] = innMap;
      return next;
    });
  };

  const updateBowling = (playerId: string, patch: Partial<BowlerStats>) => {
    setBowlingEdits((prev) => {
      const next = { ...prev };
      const innMap = { ...next[activeInningsIdx] };
      innMap[playerId] = { ...innMap[playerId], ...patch };
      next[activeInningsIdx] = innMap;
      return next;
    });
  };

  const handleSave = () => {
    cricketAudio.playClick();

    const updatedInningsList = inningsList.map((inn, idx) => {
      const finalBatting: { [playerId: string]: BatsmanStats } = {};
      Object.values(battingEdits[idx] || {}).forEach((s) => {
        const strikeRate = s.balls > 0 ? Number(((s.runs / s.balls) * 100).toFixed(1)) : 0;
        finalBatting[s.playerId] = { ...s, strikeRate };
      });

      const finalBowling: { [playerId: string]: BowlerStats } = {};
      Object.values(bowlingEdits[idx] || {}).forEach((s) => {
        const oversFloat = s.overs + s.balls / 6;
        const economy = oversFloat > 0 ? Number((s.runs / oversFloat).toFixed(2)) : 0;
        finalBowling[s.playerId] = { ...s, economy };
      });

      const battingRunsTotal = Object.values(finalBatting).reduce((sum, s) => sum + s.runs, 0);
      const totalRuns = battingRunsTotal + (inn.extras?.total || 0);
      const totalWickets = Object.values(finalBatting).filter((s) => s.isOut).length;

      return {
        ...inn,
        battingStats: finalBatting,
        bowlingStats: finalBowling,
        totalRuns,
        totalWickets,
      };
    });

    const correctedMatch: Match = { ...match, updatedAt: Date.now() };
    if (match.innings1 && updatedInningsList[0]) correctedMatch.innings1 = updatedInningsList[0];
    let cursor = match.innings1 && Object.keys(match.innings1.battingStats).length > 0 ? 1 : 0;
    if (match.innings2 && Object.keys(match.innings2.battingStats).length > 0) {
      correctedMatch.innings2 = updatedInningsList[cursor];
      cursor += 1;
    }
    if (match.innings3 && Object.keys(match.innings3.battingStats).length > 0) {
      correctedMatch.innings3 = updatedInningsList[cursor];
      cursor += 1;
    }
    if (match.innings4 && Object.keys(match.innings4.battingStats).length > 0) {
      correctedMatch.innings4 = updatedInningsList[cursor];
    }

    onSaveCorrections(correctedMatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-slate-900 border border-amber-700/40 text-slate-100 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Edit Scorecard — Fix a Mistake
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{match.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-800/30 text-[11px] text-amber-300">
          Directly edit any player's runs, balls, wickets, overs, etc. below. Totals and averages
          recalculate automatically when you save.
        </div>

        {/* Innings tabs */}
        {inningsList.length > 1 && (
          <div className="flex gap-2 px-4 pt-3">
            {inningsList.map((inn, idx) => (
              <button
                key={idx}
                onClick={() => setActiveInningsIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  activeInningsIdx === idx ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {inn.teamName} Innings
              </button>
            ))}
          </div>
        )}

        {/* Scorecard editor */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Batting */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              🏏 Batting — {activeInnings.teamName}
            </h3>
            <div className="space-y-2">
              {battingRows.map((s) => (
                <div
                  key={s.playerId}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex items-center gap-2 flex-wrap"
                >
                  <span className="flex-1 min-w-[90px] text-xs font-bold text-white truncate">
                    {s.playerName}
                  </span>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    R
                    <input
                      type="number"
                      min={0}
                      value={s.runs}
                      onChange={(e) => updateBatting(s.playerId, { runs: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-14 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    B
                    <input
                      type="number"
                      min={0}
                      value={s.balls}
                      onChange={(e) => updateBatting(s.playerId, { balls: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-14 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    4s
                    <input
                      type="number"
                      min={0}
                      value={s.fours}
                      onChange={(e) => updateBatting(s.playerId, { fours: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-12 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    6s
                    <input
                      type="number"
                      min={0}
                      value={s.sixes}
                      onChange={(e) => updateBatting(s.playerId, { sixes: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-12 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-rose-400 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.isOut}
                      onChange={(e) => updateBatting(s.playerId, { isOut: e.target.checked })}
                    />
                    OUT
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Bowling */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              🎯 Bowling
            </h3>
            <div className="space-y-2">
              {bowlingRows.map((s) => (
                <div
                  key={s.playerId}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex items-center gap-2 flex-wrap"
                >
                  <span className="flex-1 min-w-[90px] text-xs font-bold text-white truncate">
                    {s.playerName}
                  </span>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    Ov
                    <input
                      type="number"
                      min={0}
                      value={s.overs}
                      onChange={(e) => updateBowling(s.playerId, { overs: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-12 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                    .
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={s.balls}
                      onChange={(e) =>
                        updateBowling(s.playerId, { balls: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })
                      }
                      className="w-10 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    Md
                    <input
                      type="number"
                      min={0}
                      value={s.maidens}
                      onChange={(e) =>
                        updateBowling(s.playerId, { maidens: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-12 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    R
                    <input
                      type="number"
                      min={0}
                      value={s.runs}
                      onChange={(e) => updateBowling(s.playerId, { runs: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-14 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    W
                    <input
                      type="number"
                      min={0}
                      value={s.wickets}
                      onChange={(e) =>
                        updateBowling(s.playerId, { wickets: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-12 text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-center"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Corrections
          </button>
        </div>
      </div>
    </div>
  );
};
