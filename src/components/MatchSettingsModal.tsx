import React, { useState } from 'react';
import { Match, MatchSettings, Tournament } from '../types/cricket';
import { Settings, X, Trash2, Play, AlertTriangle, Trophy, Layers } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface MatchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  tournaments: Tournament[];
  onUpdateMatchSettings: (
    matchId: string,
    updatedSettings: MatchSettings,
    extraUpdates?: { tournamentId?: string; tournamentName?: string; format?: 'limited_overs' | 'test' }
  ) => void;
  onDeleteMatch: (matchId: string) => void;
  onResumeMatch: (match: Match) => void;
}

export const MatchSettingsModal: React.FC<MatchSettingsModalProps> = ({
  isOpen,
  onClose,
  match,
  tournaments,
  onUpdateMatchSettings,
  onDeleteMatch,
  onResumeMatch,
}) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(match.tournamentId || '');
  const [matchFormat, setMatchFormat] = useState<'limited_overs' | 'test'>(
    match.format || (match.settings.matchType?.includes('Test') ? 'test' : 'limited_overs')
  );
  const [matchType, setMatchType] = useState<any>(match.settings.matchType || 'ARCL T6');

  const [maxOvers, setMaxOvers] = useState<number>(match.settings.maxOvers || match.totalOvers || 7);
  const [maxOversInput, setMaxOversInput] = useState<string>(String(match.settings.maxOvers || match.totalOvers || 7));

  const [maxOversPerBowler, setMaxOversPerBowler] = useState<number>(match.settings.maxOversPerBowler || 2);
  const [maxOversPerBowlerInput, setMaxOversPerBowlerInput] = useState<string>(String(match.settings.maxOversPerBowler || 2));

  const [playersPerSide, setPlayersPerSide] = useState<number>(match.settings.playersPerSide || match.playingSquadA?.length || 11);
  const [playersPerSideInput, setPlayersPerSideInput] = useState<string>(String(match.settings.playersPerSide || match.playingSquadA?.length || 11));

  const [maxWickets, setMaxWickets] = useState<number>(match.settings.maxWickets || 10);
  const [maxWicketsInput, setMaxWicketsInput] = useState<string>(String(match.settings.maxWickets || 10));

  const [venue, setVenue] = useState(match.settings.venue || match.venue);
  const [date, setDate] = useState(match.settings.date || match.date);
  const [allowDirectRoofOut, setAllowDirectRoofOut] = useState(match.settings.allowDirectRoofOut);
  const [allowSingleWallCatch, setAllowSingleWallCatch] = useState(match.settings.allowSingleWallCatch);
  const [freeHitOnNoBall, setFreeHitOnNoBall] = useState(match.settings.freeHitOnNoBall);
  const [wideRuns, setWideRuns] = useState<number>(match.settings.wideRuns || 1);
  const [noBallRuns, setNoBallRuns] = useState<number>(match.settings.noBallRuns || 1);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    cricketAudio.playClick();
    const updatedSettings: MatchSettings = {
      ...match.settings,
      matchType,
      matchFormat,
      maxOvers,
      maxOversPerBowler,
      playersPerSide,
      maxWickets,
      venue,
      date,
      allowDirectRoofOut,
      allowSingleWallCatch,
      freeHitOnNoBall,
      wideRuns,
      noBallRuns,
    };

    const targetTour = tournaments.find((t) => t.id === selectedTournamentId);
    const tournamentName = targetTour ? targetTour.name : undefined;

    onUpdateMatchSettings(match.id, updatedSettings, {
      tournamentId: selectedTournamentId || undefined,
      tournamentName: tournamentName,
      format: matchFormat,
    });
  };

  const handleConfirmDelete = () => {
    cricketAudio.playClick('Match deleted');
    onDeleteMatch(match.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-white text-xl">
              ⚙️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Match Settings & Switch League</h2>
              <p className="text-xs text-slate-400">{match.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Step */}
        {showDeleteConfirm ? (
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/50 space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-black text-sm text-white">Confirm Match Deletion</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong className="text-white">"{match.name}"</strong>? All ball-by-ball commentary and statistics for this game will be wiped.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Permanently Delete</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 text-xs">
              {/* Shift Tournament / League Option */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Trophy className="w-4 h-4" />
                    <label className="font-bold text-xs">Tournament / League Assignment</label>
                  </div>
                  <span className="text-[10px] text-slate-400">Shift match freely</span>
                </div>
                <select
                  value={selectedTournamentId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  <option value="">-- Standalone / Friendly Match (No League) --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏆 {t.name} ({t.format})
                    </option>
                  ))}
                </select>
              </div>

              {/* Match Format & Match Type */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Layers className="w-4 h-4" />
                  <label className="font-bold text-xs">Match Format & Type</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchFormat('limited_overs');
                      setMatchType('ARCL T6');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      matchFormat === 'limited_overs'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    ⚡ Limited Overs (2 Innings)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchFormat('test');
                      setMatchType('Test Match (4 Innings)');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      matchFormat === 'test'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    🏏 Test Match (4 Innings / Declare)
                  </button>
                </div>

                <div className="pt-1">
                  <label className="text-slate-400 font-bold block mb-1 text-[11px]">Match Preset Label</label>
                  <select
                    value={matchType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatchType(val);
                      if (val === 'Test Match (4 Innings)') {
                        setMatchFormat('test');
                      } else {
                        setMatchFormat('limited_overs');
                        if (val === 'ARCL T6') setMaxOvers(6);
                        if (val === 'ARCL T10') setMaxOvers(10);
                        if (val === 'T20') setMaxOvers(20);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs cursor-pointer"
                  >
                    <option value="ARCL T6">ARCL T6 (6 Overs)</option>
                    <option value="ARCL T10">ARCL T10 (10 Overs)</option>
                    <option value="T20">T20 (20 Overs)</option>
                    <option value="Test Match (4 Innings)">Test Match (4 Innings, Declaration)</option>
                    <option value="Custom Terrace Match">Custom Terrace Match</option>
                  </select>
                </div>
              </div>

              {/* Overs & Players Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">
                    {matchFormat === 'test' ? 'Overs / Inning' : 'Total Overs'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxOversInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxOversInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 1 && num <= 100) setMaxOvers(num);
                      }
                    }}
                    onBlur={() => {
                      if (maxOversInput === '' || isNaN(Number(maxOversInput)) || Number(maxOversInput) < 1) {
                        setMaxOversInput(String(maxOvers));
                      } else {
                        setMaxOvers(Math.max(1, Math.min(100, Number(maxOversInput))));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Max Ov / Bowler</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxOversPerBowlerInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxOversPerBowlerInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 1 && num <= maxOvers) setMaxOversPerBowler(num);
                      }
                    }}
                    onBlur={() => {
                      if (maxOversPerBowlerInput === '' || isNaN(Number(maxOversPerBowlerInput)) || Number(maxOversPerBowlerInput) < 1) {
                        setMaxOversPerBowlerInput(String(maxOversPerBowler));
                      } else {
                        setMaxOversPerBowler(Math.max(1, Math.min(maxOvers, Number(maxOversPerBowlerInput))));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Players per Side</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={playersPerSideInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlayersPerSideInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 2 && num <= 25) setPlayersPerSide(num);
                      }
                    }}
                    onBlur={() => {
                      if (playersPerSideInput === '' || isNaN(Number(playersPerSideInput)) || Number(playersPerSideInput) < 2) {
                        setPlayersPerSideInput(String(playersPerSide));
                      } else {
                        setPlayersPerSide(Math.max(2, Math.min(25, Number(playersPerSideInput))));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Wickets per Team</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxWicketsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxWicketsInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 1 && num <= 25) setMaxWickets(num);
                      }
                    }}
                    onBlur={() => {
                      if (maxWicketsInput === '' || isNaN(Number(maxWicketsInput)) || Number(maxWicketsInput) < 1) {
                        setMaxWicketsInput(String(maxWickets));
                      } else {
                        setMaxWickets(Math.max(1, Math.min(25, Number(maxWicketsInput))));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Venue / Terrace Address</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-black text-emerald-400 block uppercase text-[10px]">
                  Terrace Rules Toggles
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDirectRoofOut}
                      onChange={(e) => setAllowDirectRoofOut(e.target.checked)}
                      className="rounded text-emerald-500"
                    />
                    <span>Direct Roof Out (Ball outside boundary is OUT)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowSingleWallCatch}
                      onChange={(e) => setAllowSingleWallCatch(e.target.checked)}
                      className="rounded text-emerald-500"
                    />
                    <span>Single-Wall Catch (1 hand catch off wall is OUT)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={freeHitOnNoBall}
                      onChange={(e) => setFreeHitOnNoBall(e.target.checked)}
                      className="rounded text-emerald-500"
                    />
                    <span>Free Hit on No-Ball deliveries</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Match</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onResumeMatch(match)}
                  className="px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Save Settings & League
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
