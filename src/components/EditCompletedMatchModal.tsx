import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save } from 'lucide-react';
import { Match, BatsmanStats, BowlerStats, WicketType, BallOutcome } from '../types/cricket';
import { cricketAudio } from '../utils/audio';

interface EditCompletedMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onSaveCorrections: (correctedMatch: Match) => void;
}

const WICKET_TYPE_OPTIONS: { value: WicketType; label: string; needsFielder: boolean }[] = [
  { value: 'caught', label: 'Caught', needsFielder: true },
  { value: 'bowled', label: 'Bowled', needsFielder: false },
  { value: 'lbw', label: 'LBW', needsFielder: false },
  { value: 'runout', label: 'Run Out', needsFielder: true },
  { value: 'stumped', label: 'Stumped', needsFielder: true },
  { value: 'hitwicket', label: 'Hit Wicket', needsFielder: false },
  { value: 'direct_roof_out', label: 'Direct Roof Out', needsFielder: true },
  { value: 'wall_catch', label: 'Wall Catch', needsFielder: true },
  { value: 'retired_hurt', label: 'Retired Hurt', needsFielder: false },
  { value: 'retired', label: 'Retired', needsFielder: false },
  { value: 'timed_out', label: 'Timed Out', needsFielder: false },
];

const needsFielderFor = (wt: WicketType | ''): boolean =>
  WICKET_TYPE_OPTIONS.find((o) => o.value === wt)?.needsFielder || false;

// A bowler is credited (and so needs to be picked) for these dismissal types.
// Run outs, retirements and timed-out are not credited to a bowler.
const needsBowlerFor = (wt: WicketType | ''): boolean =>
  ['caught', 'bowled', 'lbw', 'stumped', 'hitwicket', 'wall_catch'].includes(wt as string);

// Dismissal types that earn the fielder an MVP fielding point (see utils/mvp.ts).
// A manually-added dismissal of these types needs a synthetic ball entry so the
// fielder actually gets credited — MVP points are recalculated from balls only.
const FIELDING_CREDIT_TYPES: WicketType[] = ['caught', 'wall_catch', 'stumped', 'runout'];

const buildDismissalText = (wicketType: WicketType, fielderName: string, bowlerName: string): string => {
  switch (wicketType) {
    case 'caught':
      return `c ${fielderName || 'Fielder'} b ${bowlerName || 'Bowler'}`;
    case 'wall_catch':
      return `c ${fielderName || 'Fielder'} (wall catch) b ${bowlerName || 'Bowler'}`;
    case 'bowled':
      return `b ${bowlerName || 'Bowler'}`;
    case 'lbw':
      return `lbw b ${bowlerName || 'Bowler'}`;
    case 'runout':
      return `run out (${fielderName || 'Fielder'})`;
    case 'stumped':
      return `st ${fielderName || 'Fielder'} b ${bowlerName || 'Bowler'}`;
    case 'hitwicket':
      return `hit wicket b ${bowlerName || 'Bowler'}`;
    case 'direct_roof_out':
      return `out (direct roof — ${fielderName || 'Fielder'})`;
    case 'retired_hurt':
      return 'retired hurt';
    case 'retired':
      return 'retired';
    case 'timed_out':
      return 'timed out';
    default:
      return '';
  }
};

interface DismissalEdit {
  wicketType: WicketType | '';
  fielderId: string;
  fielderName: string;
  bowlerId?: string;
  bowlerName?: string;
  hasBallRecord: boolean;
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

  const [battingEdits, setBattingEdits] = useState<{ [inningsIdx: number]: { [playerId: string]: BatsmanStats } }>({});
  const [bowlingEdits, setBowlingEdits] = useState<{ [inningsIdx: number]: { [playerId: string]: BowlerStats } }>({});
  const [dismissalEdits, setDismissalEdits] = useState<{ [inningsIdx: number]: { [playerId: string]: DismissalEdit } }>({});

  // New-batsman-to-add dropdown selection (per current innings tab)
  const [newBatsmanId, setNewBatsmanId] = useState('');

  // Fix: Yeh useEffect har baar jab modal khulega, tab data ko fresh reset karega (Stale data issue fixed)
  useEffect(() => {
    if (isOpen && match) {
      setActiveInningsIdx(0);
      setNewBatsmanId('');

      const bMap: { [inningsIdx: number]: { [playerId: string]: BatsmanStats } } = {};
      const bwMap: { [inningsIdx: number]: { [playerId: string]: BowlerStats } } = {};
      const dMap: { [inningsIdx: number]: { [playerId: string]: DismissalEdit } } = {};

      inningsList.forEach((inn, idx) => {
        bMap[idx] = {};
        bwMap[idx] = {};
        dMap[idx] = {};

        Object.values(inn.battingStats).forEach((s) => {
          bMap[idx][s.playerId] = { ...s };

          const wicketBall = (inn.balls || []).find(
            (b) => b.isWicket && b.dismissedPlayerId === s.playerId
          );
          if (wicketBall) {
            dMap[idx][s.playerId] = {
              wicketType: wicketBall.wicketType || 'bowled',
              fielderId: wicketBall.fielderId || '',
              fielderName: wicketBall.fielderName || '',
              bowlerId: '',
              bowlerName: wicketBall.bowlerName || '',
              hasBallRecord: true,
            };
          } else {
            dMap[idx][s.playerId] = {
              wicketType: '',
              fielderId: '',
              fielderName: '',
              bowlerId: '',
              bowlerName: '',
              hasBallRecord: false,
            };
          }
        });

        Object.values(inn.bowlingStats).forEach((s) => {
          bwMap[idx][s.playerId] = { ...s };
        });
      });

      setBattingEdits(bMap);
      setBowlingEdits(bwMap);
      setDismissalEdits(dMap);
    }
  }, [isOpen, match.id]);

  // Fielding (bowling) side squad, per innings — used for fielder/bowler pickers
  const fieldingPlayersByInnings = inningsList.map((inn) => {
    const battingTeamIsA = Boolean(match.teamA && inn.teamId === match.teamA.id);
    const fieldingTeam = battingTeamIsA ? match.teamB : match.teamA;
    const squadIds = battingTeamIsA ? match.playingSquadB : match.playingSquadA;
    const allPlayers = fieldingTeam?.players || [];
    const squadPlayers = squadIds && squadIds.length > 0 ? allPlayers.filter((p) => squadIds.includes(p.id)) : allPlayers;
    return squadPlayers.length > 0 ? squadPlayers : allPlayers;
  });

  // Batting side squad, per innings — used for the "Add Batsman (DND)" picker
  const battingPlayersByInnings = inningsList.map((inn) => {
    const battingTeamIsA = Boolean(match.teamA && inn.teamId === match.teamA.id);
    const battingTeam = battingTeamIsA ? match.teamA : match.teamB;
    const squadIds = battingTeamIsA ? match.playingSquadA : match.playingSquadB;
    const allPlayers = battingTeam?.players || [];
    const squadPlayers = squadIds && squadIds.length > 0 ? allPlayers.filter((p) => squadIds.includes(p.id)) : allPlayers;
    return squadPlayers.length > 0 ? squadPlayers : allPlayers;
  });

  if (!isOpen) return null;

  const activeInnings = inningsList[activeInningsIdx];
  const battingRows = Object.values(battingEdits[activeInningsIdx] || {}).sort(
    (a, b) => a.battingOrder - b.battingOrder
  );
  const bowlingRows = Object.values(bowlingEdits[activeInningsIdx] || {});
  const activeFieldingPlayers = fieldingPlayersByInnings[activeInningsIdx] || [];

  const alreadyBattingIds = new Set(Object.keys(battingEdits[activeInningsIdx] || {}));
  const availableToAdd = (battingPlayersByInnings[activeInningsIdx] || []).filter(
    (p) => !alreadyBattingIds.has(p.id)
  );

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

  const updateDismissal = (playerId: string, patch: Partial<DismissalEdit>) => {
    setDismissalEdits((prev) => {
      const next = { ...prev };
      const innMap = { ...next[activeInningsIdx] };
      const current = innMap[playerId] || {
        wicketType: '',
        fielderId: '',
        fielderName: '',
        bowlerId: '',
        bowlerName: '',
        hasBallRecord: false,
      };
      innMap[playerId] = { ...current, ...patch };
      next[activeInningsIdx] = innMap;
      return next;
    });
  };

  // Add a Did-Not-Bat squad player into this innings' batting list (e.g. score was
  // wrongly recorded under the wrong name). Starts at 0/0 — edit the row after adding.
  const addBatsman = (playerId: string) => {
    if (!playerId) return;
    const player = (battingPlayersByInnings[activeInningsIdx] || []).find((p) => p.id === playerId);
    if (!player) return;

    setBattingEdits((prev) => {
      const innRows = Object.values(prev[activeInningsIdx] || {});
      const maxOrder = innRows.reduce((max, r) => Math.max(max, r.battingOrder || 0), 0);
      const newStat: BatsmanStats = {
        playerId: player.id,
        playerName: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        battingOrder: maxOrder + 1,
      };
      const next = { ...prev };
      next[activeInningsIdx] = { ...(next[activeInningsIdx] || {}), [playerId]: newStat };
      return next;
    });

    setDismissalEdits((prev) => {
      const next = { ...prev };
      next[activeInningsIdx] = {
        ...(next[activeInningsIdx] || {}),
        [playerId]: {
          wicketType: '',
          fielderId: '',
          fielderName: '',
          bowlerId: '',
          bowlerName: '',
          hasBallRecord: false,
        },
      };
      return next;
    });

    setNewBatsmanId('');
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

      const innDismissals = dismissalEdits[idx] || {};

      // Existing deliveries: apply any wicket-type / fielder corrections made to them.
      const finalBalls: BallOutcome[] = (inn.balls || []).map((b) => {
        if (!b.isWicket || !b.dismissedPlayerId) return b;
        const edit = innDismissals[b.dismissedPlayerId];
        if (!edit || !edit.hasBallRecord || !edit.wicketType) return b;

        const needsFielder = needsFielderFor(edit.wicketType);
        const updatedBall: BallOutcome = {
          ...b,
          wicketType: edit.wicketType,
          fielderId: needsFielder ? edit.fielderId : undefined,
          fielderName: needsFielder ? edit.fielderName : undefined,
        };

        const batter = finalBatting[b.dismissedPlayerId];
        if (batter) {
          batter.dismissalText = buildDismissalText(edit.wicketType, edit.fielderName, b.bowlerName);
        }

        return updatedBall;
      });

      // Dismissals with no underlying delivery record (newly marked OUT, or a newly
      // added batsman) — save the dismissal type/fielder/bowler picked here directly.
      Object.entries(innDismissals).forEach(([pid, edit]) => {
        if (!edit.hasBallRecord && edit.wicketType && finalBatting[pid]) {
          finalBatting[pid].dismissalText = buildDismissalText(
            edit.wicketType,
            edit.fielderName,
            edit.bowlerName || ''
          );

          // Fielding-credited dismissal with no real ball behind it — add a
          // correction entry so the fielder's MVP point is picked up too.
          // (Doesn't touch total runs/wickets/overs — only fielding credit.)
          if (FIELDING_CREDIT_TYPES.includes(edit.wicketType) && edit.fielderId) {
            const dismissedName = finalBatting[pid].playerName;
            finalBalls.push({
              id: `correction-${pid}-${Date.now()}`,
              ballNumber: 0,
              overNumber: -1,
              legalBallNumber: 0,
              displayOver: 'corr.',
              bowlerId: edit.bowlerId || '',
              bowlerName: edit.bowlerName || '',
              strikerId: pid,
              strikerName: dismissedName,
              nonStrikerId: '',
              nonStrikerName: '',
              runsBat: 0,
              extraRuns: 0,
              extraType: 'none',
              isLegalDelivery: false,
              isWicket: true,
              wicketType: edit.wicketType,
              dismissedPlayerId: pid,
              dismissedPlayerName: dismissedName,
              fielderId: edit.fielderId,
              fielderName: edit.fielderName,
              shotZone: undefined,
              commentary: 'Correction entry added via scorecard edit',
              isFour: false,
              isSix: false,
              isFreeHit: false,
              nextBallIsFreeHit: false,
              timestamp: Date.now(),
            });
          }
        }
      });

      const battingRunsTotal = Object.values(finalBatting).reduce((sum, s) => sum + s.runs, 0);
      const totalRuns = battingRunsTotal + (inn.extras?.total || 0);
      const totalWickets = Object.values(finalBatting).filter((s) => s.isOut).length;

      return {
        ...inn,
        battingStats: finalBatting,
        bowlingStats: finalBowling,
        balls: finalBalls,
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
          Directly edit any player's runs, balls, wickets, overs, etc. below. Totals, averages, and
          MVP fielding credit recalculate automatically when you save.
        </div>

        {inningsList.length > 1 && (
          <div className="flex gap-2 px-4 pt-3">
            {inningsList.map((inn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveInningsIdx(idx);
                  setNewBatsmanId('');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  activeInningsIdx === idx ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {inn.teamName} Innings
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              🏏 Batting — {activeInnings?.teamName}
            </h3>
            <div className="space-y-2">
              {battingRows.map((s) => {
                const dismissal = dismissalEdits[activeInningsIdx]?.[s.playerId];
                const showFielder = Boolean(dismissal && needsFielderFor(dismissal.wicketType));
                const showBowler = Boolean(
                  dismissal && !dismissal.hasBallRecord && needsBowlerFor(dismissal.wicketType)
                );

                return (
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

                    {s.isOut && (
                      <div className="w-full pt-2 mt-1 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1 text-[10px] text-slate-400">
                          Out
                          <select
                            value={dismissal?.wicketType || ''}
                            onChange={(e) => {
                              const newType = e.target.value as WicketType;
                              const willNeedFielder = needsFielderFor(newType);
                              const willNeedBowler = needsBowlerFor(newType);
                              updateDismissal(s.playerId, {
                                wicketType: newType,
                                ...(willNeedFielder ? {} : { fielderId: '', fielderName: '' }),
                                ...(willNeedBowler ? {} : { bowlerId: '', bowlerName: '' }),
                              });
                            }}
                            className="text-[11px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700"
                          >
                            <option value="">Select type</option>
                            {WICKET_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        {showFielder && (
                          <label className="flex items-center gap-1 text-[10px] text-slate-400">
                            By
                            <select
                              value={dismissal?.fielderId || ''}
                              onChange={(e) => {
                                const pid = e.target.value;
                                const player = activeFieldingPlayers.find((p) => p.id === pid);
                                updateDismissal(s.playerId, { fielderId: pid, fielderName: player?.name || '' });
                              }}
                              className="text-[11px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 max-w-[150px]"
                            >
                              <option value="">Select fielder</option>
                              {activeFieldingPlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {showBowler && (
                          <label className="flex items-center gap-1 text-[10px] text-slate-400">
                            Bowler
                            <select
                              value={dismissal?.bowlerId || ''}
                              onChange={(e) => {
                                const pid = e.target.value;
                                const player = activeFieldingPlayers.find((p) => p.id === pid);
                                updateDismissal(s.playerId, { bowlerId: pid, bowlerName: player?.name || '' });
                              }}
                              className="text-[11px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 max-w-[150px]"
                            >
                              <option value="">Select bowler</option>
                              {activeFieldingPlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {dismissal && !dismissal.hasBallRecord && (
                          <span className="text-[10px] text-slate-500 italic w-full">
                            No delivery record for this dismissal — only the details you set here will be saved
                            (bowler's own over/wicket figures won't change automatically; edit those below if needed).
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {availableToAdd.length > 0 && (
                <div className="rounded-xl bg-slate-950 border border-dashed border-slate-700 p-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">+ Add Batsman (DND player)</span>
                  <select
                    value={newBatsmanId}
                    onChange={(e) => setNewBatsmanId(e.target.value)}
                    className="text-[11px] font-bold bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 max-w-[160px]"
                  >
                    <option value="">Select player</option>
                    {availableToAdd.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!newBatsmanId}
                    onClick={() => addBatsman(newBatsmanId)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-black"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

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
