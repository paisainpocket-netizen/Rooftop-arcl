import React, { useState } from 'react';
import { Match, Innings, BallOutcome } from '../types/cricket';
import { calculateMatchMVP } from '../utils/mvp';
import { Trophy, FileText, Printer, Award, Sparkles, HelpCircle } from 'lucide-react';
import { PointsSystemModal } from './PointsSystemModal';

interface ScorecardViewProps {
  match: Match;
  onClose?: () => void;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({ match, onClose }) => {
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSubTab, setSelectedSubTab] = useState<'scorecard' | 'mvp' | 'balls'>('scorecard');
  const [selectedBallDetail, setSelectedBallDetail] = useState<BallOutcome | null>(null);
  const [showMvpRules, setShowMvpRules] = useState(false);

  const teamA = match?.teamA || { id: 'team-a', name: 'Team A', shortName: 'TMA', color: '#10b981', players: [] };
  const teamB = match?.teamB || { id: 'team-b', name: 'Team B', shortName: 'TMB', color: '#f59e0b', players: [] };

  const isTeamABattingFirst = match?.tossWinnerTeamId === teamA.id
    ? match?.tossDecision === 'bat'
    : match?.tossDecision === 'bowl';

  const battingTeam1 = isTeamABattingFirst ? teamA : teamB;
  const bowlingTeam1 = battingTeam1.id === teamA.id ? teamB : teamA;

  const getCurrentTabInnings = (): Innings => {
    if (activeInningsTab === 1) return match.innings1;
    if (activeInningsTab === 2) return match.innings2;
    if (activeInningsTab === 3 && match.innings3) return match.innings3;
    if (activeInningsTab === 4 && match.innings4) return match.innings4;
    return match.innings1;
  };

  const currentTabInnings: Innings = getCurrentTabInnings();
  const currentTabBattingTeam = (activeInningsTab === 1 || activeInningsTab === 3) ? battingTeam1 : bowlingTeam1;

  const battingStatsList = Object.values(currentTabInnings.battingStats || {}).sort(
    (a, b) => a.battingOrder - b.battingOrder
  );

  const bowlingStatsList = Object.values(currentTabInnings.bowlingStats || {});
  const mvpScores = calculateMatchMVP(match);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Official Match Centre
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {match.tournamentName || 'ARCL Amritsar Rooftop Cricket League'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
            {match.teamA.name} vs {match.teamB.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Venue: {match.venue} • Date: {match.date} • Format: {match.settings.matchType} ({match.totalOvers} Overs)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Match Result & Player of the Match Banner */}
      {match.result && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl">
              🏆
            </div>
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                Match Result
              </span>
              <p className="text-sm sm:text-base font-black text-white">{match.result.summary}</p>
            </div>
          </div>

          {match.result.playerOfTheMatch && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Player of the Match (MOM)
                </span>
                <span className="font-black text-white text-sm">
                  {match.result.playerOfTheMatch.playerName}
                </span>
                <span className="text-slate-400">
                  ({match.result.playerOfTheMatch.teamName})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Mode Navigation (Scorecard | Super Stars MVP | Ball by Ball) */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setSelectedSubTab('scorecard')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'scorecard'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Full Scorecard</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('mvp')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'mvp'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Super Stars (MVP Points)</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('balls')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'balls'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="font-mono text-sm">⚡</span>
          <span>Ball by Ball</span>
        </button>
      </div>

      {/* SUBTAB 1: FULL SCORECARD */}
      {selectedSubTab === 'scorecard' && (
        <div className="space-y-6">
          {/* Innings Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveInningsTab(1)}
              className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                activeInningsTab === 1
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>1st Inn ({battingTeam1.name})</span>
              <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-white">
                {match.innings1.totalRuns}/{match.innings1.totalWickets} ({match.innings1.oversCompleted}.{match.innings1.ballsInCurrentOver})
              </span>
            </button>

            <button
              onClick={() => setActiveInningsTab(2)}
              className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                activeInningsTab === 2
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>2nd Inn ({bowlingTeam1.name})</span>
              <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-white">
                {match.innings2.totalRuns}/{match.innings2.totalWickets} ({match.innings2.oversCompleted}.{match.innings2.ballsInCurrentOver})
              </span>
            </button>

            {match.innings3 && (
              <button
                onClick={() => setActiveInningsTab(3)}
                className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeInningsTab === 3
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>3rd Inn (Test)</span>
                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-white">
                  {match.innings3.totalRuns}/{match.innings3.totalWickets}
                </span>
              </button>
            )}

            {match.innings4 && (
              <button
                onClick={() => setActiveInningsTab(4)}
                className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeInningsTab === 4
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>4th Inn (Test)</span>
                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-white">
                  {match.innings4.totalRuns}/{match.innings4.totalWickets}
                </span>
              </button>
            )}
          </div>

          {/* Innings Summary Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 block">
                Innings {activeInningsTab} • Batting Team
              </span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">{currentTabBattingTeam.name}</h3>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  {currentTabInnings.totalRuns}/{currentTabInnings.totalWickets}
                </span>
                <span className="text-sm font-mono text-slate-400">
                  ({currentTabInnings.oversCompleted}.{currentTabInnings.ballsInCurrentOver}/{match.totalOvers} ov)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Run Rate</span>
                <span className="font-black text-white text-sm">
                  {currentTabInnings.oversCompleted > 0 || currentTabInnings.ballsInCurrentOver > 0
                    ? ((currentTabInnings.totalRuns / (currentTabInnings.oversCompleted + currentTabInnings.ballsInCurrentOver / 6))).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Extras</span>
                <span className="font-black text-amber-400 text-sm">
                  {currentTabInnings.extras?.total || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Batting Scorecard Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 font-black text-xs uppercase tracking-wider text-slate-300">
              Batting Card
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                  <tr>
                    <th className="p-3">Batsman</th>
                    <th className="p-3">Dismissal</th>
                    <th className="p-3 text-right">R</th>
                    <th className="p-3 text-right">B</th>
                    <th className="p-3 text-right">4s</th>
                    <th className="p-3 text-right">6s</th>
                    <th className="p-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {battingStatsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                        No batting data recorded yet.
                      </td>
                    </tr>
                  ) : (
                    battingStatsList.map((b) => (
                      <tr key={b.playerId} className="hover:bg-slate-900/40">
                        <td className="p-3 font-sans font-bold text-slate-100">
                          {b.playerName} {!b.isOut && <span className="text-emerald-400 font-bold">*</span>}
                        </td>
                        <td className="p-3 font-sans text-slate-400 text-[11px]">
                          {b.isOut ? (
                            <span className="text-rose-300 font-medium">{b.dismissalText || 'out'}</span>
                          ) : (
                            <span className="text-emerald-400 font-black">not out</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black text-white">{b.runs}</td>
                        <td className="p-3 text-right text-slate-400">{b.balls}</td>
                        <td className="p-3 text-right text-slate-300">{b.fours}</td>
                        <td className="p-3 text-right text-purple-400 font-bold">{b.sixes}</td>
                        <td className="p-3 text-right text-cyan-400 font-bold">{b.strikeRate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowling Scorecard Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 font-black text-xs uppercase tracking-wider text-slate-300">
              Bowling Card
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                  <tr>
                    <th className="p-3">Bowler</th>
                    <th className="p-3 text-right">O</th>
                    <th className="p-3 text-right">M</th>
                    <th className="p-3 text-right">R</th>
                    <th className="p-3 text-right">W</th>
                    <th className="p-3 text-right">Econ</th>
                    <th className="p-3 text-right">0s</th>
                    <th className="p-3 text-right">WD</th>
                    <th className="p-3 text-right">NB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bowlingStatsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                        No bowling data recorded yet.
                      </td>
                    </tr>
                  ) : (
                    bowlingStatsList.map((bw) => (
                      <tr key={bw.playerId} className="hover:bg-slate-900/40">
                        <td className="p-3 font-sans font-bold text-slate-100">{bw.playerName}</td>
                        <td className="p-3 text-right text-slate-300 font-bold">{bw.overs}.{bw.balls}</td>
                        <td className="p-3 text-right text-slate-400">{bw.maidens}</td>
                        <td className="p-3 text-right text-slate-200">{bw.runs}</td>
                        <td className="p-3 text-right font-black text-emerald-400">{bw.wickets}</td>
                        <td className="p-3 text-right text-cyan-400">{bw.economy}</td>
                        <td className="p-3 text-right text-slate-400">{bw.dots}</td>
                        <td className="p-3 text-right text-amber-400">{bw.wides}</td>
                        <td className="p-3 text-right text-amber-400">{bw.noBalls}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fall of Wickets */}
          {currentTabInnings.fallOfWickets.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-2">
                Fall of Wickets
              </span>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {currentTabInnings.fallOfWickets.map((fow) => (
                  <span
                    key={fow.wicketNumber}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <strong className="text-rose-400">{fow.score}-{fow.wicketNumber}</strong> ({fow.playerName}, {fow.over} ov)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SUPER STARS (MVP RANKINGS) */}
      {selectedSubTab === 'mvp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Super Stars • Match MVP Leaderboard</span>
              </h3>
              <button
                onClick={() => setShowMvpRules(true)}
                className="text-xs text-amber-400 underline font-bold cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Rules</span>
              </button>
            </div>
            <span className="text-xs text-slate-400">Calculated from runs, wickets, catches</span>
          </div>

          {/* Leaderboard Table matching Screenshot 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-16 text-center">Rank</th>
                    <th className="p-3">Player</th>
                    <th className="p-3">Team</th>
                    <th className="p-3 text-right font-mono">Batting</th>
                    <th className="p-3 text-right font-mono">Bowling</th>
                    <th className="p-3 text-right font-mono">Fielding</th>
                    <th className="p-3 text-right font-mono font-black text-amber-400">Total Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mvpScores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                        No match performance recorded yet.
                      </td>
                    </tr>
                  ) : (
                    mvpScores.map((p, idx) => {
                      const isMom = match.result?.playerOfTheMatch?.playerId === p.playerId;
                      return (
                        <tr
                          key={p.playerId}
                          className={`hover:bg-slate-900/60 transition ${
                            idx === 0
                              ? 'bg-amber-500/10'
                              : isMom
                              ? 'bg-purple-500/10'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            {idx === 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center justify-center shadow">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs inline-flex items-center justify-center">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs inline-flex items-center justify-center">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono font-bold">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-white border border-slate-700">
                                {p.playerName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-xs">{p.playerName}</span>
                                  {isMom && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                      MOM
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {p.battingSummary || '0 runs'} • {p.bowlingSummary || '0 wkts'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 text-xs font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                              {p.teamName}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-400 font-bold">{p.battingPoints}</td>
                          <td className="p-3 text-right font-mono text-cyan-400 font-bold">{p.bowlingPoints}</td>
                          <td className="p-3 text-right font-mono text-purple-400 font-bold">{p.fieldingPoints}</td>
                          <td className="p-3 text-right font-mono font-black text-amber-400 text-sm">{p.totalPoints}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: BALL BY BALL */}
      {selectedSubTab === 'balls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-white">Ball by Ball History</h3>
            <span className="text-xs text-slate-400 font-mono">
              {currentTabInnings.balls.length} deliveries
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {currentTabInnings.balls.length === 0 ? (
              <p className="text-center text-slate-500 italic py-6">No deliveries in this innings yet.</p>
            ) : (
              [...currentTabInnings.balls].reverse().map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBallDetail(b)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                    b.isWicket
                      ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/50'
                      : b.isSix
                      ? 'bg-purple-950/30 border-purple-800/60 hover:bg-purple-950/50'
                      : b.isFour
                      ? 'bg-emerald-950/30 border-emerald-800/60 hover:bg-emerald-950/50'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-black text-xs text-white">
                      {b.displayOver}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{b.bowlerName} to {b.strikerName}</span>
                        {b.isWicket && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[9px] uppercase">
                            Wicket
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md">{b.commentary}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-base font-black font-mono ${
                      b.isWicket ? 'text-rose-400' : b.isSix ? 'text-purple-400' : b.isFour ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {b.isWicket ? 'W' : b.extraType === 'wide' ? `${b.extraRuns}wd` : b.extraType === 'noBall' ? `${b.runsBat + b.extraRuns}nb` : b.runsBat}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* BALL DETAIL MODAL */}
      {selectedBallDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-white text-base">Ball Detail • Over {selectedBallDetail.displayOver}</h4>
              <button
                onClick={() => setSelectedBallDetail(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Commentary</span>
                <p className="font-bold text-white text-sm mt-0.5">{selectedBallDetail.commentary}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Bowler</span>
                  <span className="font-bold text-cyan-400 text-xs">{selectedBallDetail.bowlerName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Striker</span>
                  <span className="font-bold text-emerald-400 text-xs">{selectedBallDetail.strikerName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Runs Off Bat</span>
                  <span className="font-bold text-white text-xs">{selectedBallDetail.runsBat}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Extras</span>
                  <span className="font-bold text-amber-400 text-xs">
                    {selectedBallDetail.extraType !== 'none' ? `${selectedBallDetail.extraRuns} (${selectedBallDetail.extraType})` : '0'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedBallDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MVP RULES MODAL */}
      <PointsSystemModal isOpen={showMvpRules} onClose={() => setShowMvpRules(false)} />
    </div>
  );
};
