import React, { useState } from 'react';
import { Match, Team, Tournament, MatchSettings, Player } from '../types/cricket';
import { Plus, X, Trophy, Shield, MapPin, Zap, ArrowLeft, Settings, Calendar, Clock, Check } from 'lucide-react';
import { cricketAudio } from '../utils/audio';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  allTeams?: Team[];
  tournaments: Tournament[];
  initialTournamentId?: string;
  onOpenCreateTeam: () => void;
  onOpenSquadModalForTeam?: (team: Team) => void;
  onStartMatch: (newMatch: Match, openSquadFirst?: boolean) => void;
  onSaveFixture?: (newMatch: Match) => void;
  allGlobalPlayers?: Player[];
  onAddPlayerToTeam?: (teamId: string, player: Player) => void;
  loggedInPlayer?: Player | null;
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  teams,
  allTeams,
  tournaments,
  initialTournamentId,
  onOpenCreateTeam,
  onOpenSquadModalForTeam,
  onStartMatch,
  onSaveFixture,
  allGlobalPlayers = [],
  onAddPlayerToTeam,
  loggedInPlayer = null,
}) => {
  const [matchName, setMatchName] = useState('Match 21 ARCL Maha Muqabla');
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId || '');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [scorerName, setScorerName] = useState('');
  const [clubSeason, setClubSeason] = useState('2026');

  const [selectedFormat, setSelectedFormat] = useState<'T10' | 'T20' | 'Club' | '100' | 'One Day' | 'Test Match' | 'Custom'>('T10');
  const [totalOvers, setTotalOvers] = useState<number>(7);
  const [oversInput, setOversInput] = useState<string>('7');
  
  const [playersPerSide, setPlayersPerSide] = useState<number>(11);
  const [playersPerSideInput, setPlayersPerSideInput] = useState<string>('11');

  const [totalWickets, setTotalWickets] = useState<number>(10);
  const [wicketsInput, setWicketsInput] = useState<string>('10');

  const [showFormatModal, setShowFormatModal] = useState(false);

  const teamLookupPool = allTeams && allTeams.length > 0 ? allTeams : teams;
  const blankTeamPlaceholder: Team = {
    id: '',
    name: 'Select a Team',
    shortName: '—',
    city: '',
    color: '#334155',
    players: [],
  };
  const teamA = teamLookupPool.find((t) => t.id === teamAId) || blankTeamPlaceholder;
  const teamB = teamLookupPool.find((t) => t.id === teamBId) || blankTeamPlaceholder;

  const [playingSquadA, setPlayingSquadA] = useState<string[]>([]);
  const [playingSquadB, setPlayingSquadB] = useState<string[]>([]);
  const [captainA, setCaptainA] = useState<string>('');
  const [captainB, setCaptainB] = useState<string>('');
  const [viceCaptainA, setViceCaptainA] = useState<string>('');
  const [viceCaptainB, setViceCaptainB] = useState<string>('');
  const [keeperA, setKeeperA] = useState<string>('');
  const [keeperB, setKeeperB] = useState<string>('');

  const [squadModalTeam, setSquadModalTeam] = useState<'A' | 'B' | null>(null);

  React.useEffect(() => {
    if (teamA) {
      const selected = teamA.players.slice(0, playersPerSide).map((p) => p.id);
      setPlayingSquadA(selected);
      setCaptainA(teamA.players[0]?.id || '');
      setViceCaptainA(teamA.players[1]?.id || '');
      setKeeperA(teamA.players[3]?.id || teamA.players[0]?.id || '');
    }
  }, [teamAId, teamA, playersPerSide]);

  React.useEffect(() => {
    if (teamB) {
      const selected = teamB.players.slice(0, playersPerSide).map((p) => p.id);
      setPlayingSquadB(selected);
      setCaptainB(teamB.players[0]?.id || '');
      setViceCaptainB(teamB.players[1]?.id || '');
      setKeeperB(teamB.players[3]?.id || teamB.players[0]?.id || '');
    }
  }, [teamBId, teamB, playersPerSide]);

  const [showTossModal, setShowTossModal] = useState(false);
  const [tossWinnerId, setTossWinnerId] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  const [venue, setVenue] = useState('Rooftop Arena, Amritsar');
  const [allowDirectRoofOut, setAllowDirectRoofOut] = useState(true);
  const [allowSingleWallCatch, setAllowSingleWallCatch] = useState(true);
  const [matchStage, setMatchStage] = useState<'league' | 'eliminator' | 'qualifier1' | 'qualifier2' | 'semifinal1' | 'semifinal2' | 'final'>('league');
  const [opponentSearchQuery, setOpponentSearchQuery] = useState('');

  const selectedTour = tournaments.find((t) => t.id === selectedTournamentId);

  const opponentSearchResults = (() => {
    const q = opponentSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const pool = allTeams && allTeams.length > 0 ? allTeams : teams;
    return pool
      .filter(
        (t) =>
          (t.teamId && t.teamId.toLowerCase().includes(q)) ||
          t.name.toLowerCase().includes(q) ||
          t.shortName.toLowerCase().includes(q)
      )
      .slice(0, 6);
  })();

  if (!isOpen) return null;

  const handleFormatChange = (format: 'T10' | 'T20' | 'Club' | '100' | 'One Day' | 'Test Match' | 'Custom') => {
    setSelectedFormat(format);
    if (format === 'T10') {
      setTotalOvers(10);
      setOversInput('10');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    } else if (format === 'T20') {
      setTotalOvers(20);
      setOversInput('20');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    } else if (format === 'Club') {
      setTotalOvers(15);
      setOversInput('15');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    } else if (format === '100') {
      setTotalOvers(16);
      setOversInput('16');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    } else if (format === 'One Day') {
      setTotalOvers(50);
      setOversInput('50');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    } else if (format === 'Test Match') {
      setTotalOvers(20);
      setOversInput('20');
      setPlayersPerSide(11);
      setPlayersPerSideInput('11');
      setTotalWickets(10);
      setWicketsInput('10');
    }
  };

  const handlePlayersPerSideChange = (val: number) => {
    const clamped = Math.max(2, Math.min(25, val));
    setPlayersPerSide(clamped);
    setPlayersPerSideInput(String(clamped));
    const suggestedWickets = Math.max(1, clamped - 1);
    setTotalWickets(suggestedWickets);
    setWicketsInput(String(suggestedWickets));
  };

  const handleOversChange = (val: number) => {
    const clamped = Math.max(1, Math.min(100, val));
    setTotalOvers(clamped);
    setOversInput(String(clamped));
  };

  const handleWicketsChange = (val: number) => {
    const clamped = Math.max(1, Math.min(25, val));
    setTotalWickets(clamped);
    setWicketsInput(String(clamped));
  };

  const effectiveSquadA = playingSquadA.length > 0 ? playingSquadA : teamA.players.map((p) => p.id);
  const effectiveSquadB = playingSquadB.length > 0 ? playingSquadB : teamB.players.map((p) => p.id);

  const constructMatchObject = (status: 'scheduled' | 'live'): Match => {
    const isTest = selectedFormat === 'Test Match';

    // A "Save Fixture" (status === 'scheduled') is deliberately saved
    // WITHOUT a decided toss — the toss is asked for later, in App.tsx's
    // dedicated pendingTossMatch step, the single moment the fixture is
    // actually opened to start play. Previously this function silently
    // defaulted tossWinnerId to Team A here even for a fixture (nobody
    // had picked a toss winner yet), baking a fake "Team A won the toss
    // and chose to bat" result into innings1/2/3/4's teamId assignments.
    // That fake result WAS correctly overwritten later when the fixture
    // was opened and the real toss decided — but only if that second step
    // ran cleanly. Not baking in a fake toss result at all removes that
    // redundant duplicate-source-of-truth entirely, so there's nothing
    // stale left for a later step to depend on overwriting correctly.
    const tossDecided = status === 'live';
    const effectiveTossWinnerId = tossDecided ? (tossWinnerId || teamA.id) : undefined;
    const effectiveTossDecision = tossDecided ? tossDecision : undefined;

    // For a fixture with no decided toss yet, Team A/Team B are just
    // placeholders for which innings object gets which starting XI — the
    // real batting/bowling assignment happens (and fully overwrites these)
    // in App.tsx once the toss is actually decided at match-start time.
    const initialBattingTeam = !tossDecided
      ? teamA
      : effectiveTossWinnerId === teamA.id
      ? (effectiveTossDecision === 'bat' ? teamA : teamB)
      : (effectiveTossDecision === 'bat' ? teamB : teamA);

    const initialBowlingTeam = initialBattingTeam.id === teamA.id ? teamB : teamA;

    // Get active playing players for initial striker & bowler
    const battingPlayingIds = initialBattingTeam.id === teamA.id ? effectiveSquadA : effectiveSquadB;
    const bowlingPlayingIds = initialBowlingTeam.id === teamA.id ? effectiveSquadA : effectiveSquadB;

    const battingPlayingPlayers = initialBattingTeam.players.filter((p) => battingPlayingIds.includes(p.id));
    const bowlingPlayingPlayers = initialBowlingTeam.players.filter((p) => bowlingPlayingIds.includes(p.id));

    const striker = battingPlayingPlayers[0] || initialBattingTeam.players[0] || { id: 'p1', name: 'Striker' };
    const nonStriker = battingPlayingPlayers[1] || battingPlayingPlayers[0] || initialBattingTeam.players[1] || { id: 'p2', name: 'Non-Striker' };
    const bowler = bowlingPlayingPlayers[0] || initialBowlingTeam.players[0] || { id: 'b1', name: 'Bowler' };

    return {
      id: `match-${Date.now()}`,
      name: matchName || `${teamA.name} vs ${teamB.name}`,
      creatorId: loggedInPlayer?.id,
      creatorProfileId: loggedInPlayer?.profileId,
      creatorName: loggedInPlayer?.name,
      tournamentId: selectedTournamentId || undefined,
      tournamentName: selectedTour?.name || undefined,
      matchStage: selectedTournamentId ? matchStage : undefined,
      matchFormat: isTest ? 'test' : 'limited_overs',
      teamA,
      teamB,
      playingSquadA: effectiveSquadA,
      playingSquadB: effectiveSquadB,
      captainA: captainA || teamA.players[0]?.id,
      captainB: captainB || teamB.players[0]?.id,
      viceCaptainA: viceCaptainA || teamA.players[1]?.id,
      viceCaptainB: viceCaptainB || teamB.players[1]?.id,
      keeperA: keeperA || teamA.players[3]?.id || teamA.players[0]?.id,
      keeperB: keeperB || teamB.players[3]?.id || teamB.players[0]?.id,
      tossWinnerTeamId: effectiveTossWinnerId,
      tossDecision: effectiveTossDecision,
      status: status === 'scheduled' ? 'setup' : 'live',
      currentInningsNumber: 1,
      totalOvers,
      isFreeHit: false,
      venue,
      date: matchTime ? `${matchDate} ${matchTime}` : matchDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        maxOvers: totalOvers,
        ballsPerOver: 6,
        maxOversPerBowler: Math.ceil(totalOvers / 4) || 2,
        playersPerSide,
        maxWickets: totalWickets,
        allowDirectRoofOut,
        allowSingleWallCatch,
        freeHitOnNoBall: true,
        wideRuns: 1,
        noBallRuns: 1,
        lastManBattingAllowed: false,
        pitchType: 'Concrete Terrace',
        ballType: 'Tennis Heavy (Cosco)',
        venue,
        date: matchDate,
        matchType: isTest
          ? 'Test Match (4 Innings)'
          : selectedFormat === 'T10' && totalOvers === 10
          ? 'ARCL T10'
          : selectedFormat === 'T20'
          ? 'T20'
          : 'Custom Terrace Match',
        matchFormat: isTest ? 'test' : 'limited_overs',
        oversPerInningsInTest: isTest ? totalOvers : undefined,
      },
      currentStrikerId: striker.id,
      currentNonStrikerId: nonStriker.id,
      currentBowlerId: bowler.id,
      innings1: {
        teamId: initialBattingTeam.id,
        teamName: initialBattingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        balls: [],
        battingStats: {},
        bowlingStats: {},
        fallOfWickets: [],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
      },
      innings2: {
        teamId: initialBowlingTeam.id,
        teamName: initialBowlingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        balls: [],
        battingStats: {},
        bowlingStats: {},
        fallOfWickets: [],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
      },
      innings3: isTest ? {
        teamId: initialBattingTeam.id,
        teamName: initialBattingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        balls: [],
        battingStats: {},
        bowlingStats: {},
        fallOfWickets: [],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
      } : undefined,
      innings4: isTest ? {
        teamId: initialBowlingTeam.id,
        teamName: initialBowlingTeam.name,
        totalRuns: 0,
        totalWickets: 0,
        oversCompleted: 0,
        ballsInCurrentOver: 0,
        balls: [],
        battingStats: {},
        bowlingStats: {},
        fallOfWickets: [],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
      } : undefined,
    };
  };

  const handleSaveFixtureOnly = () => {
    cricketAudio.playClick();
    if (!loggedInPlayer) {
      alert('Please login first to create and schedule a match.');
      return;
    }
    if (!teamAId || !teamBId) {
      alert('Please select both Team A and Team B first (or search for a team by its Team ID).');
      return;
    }
    if (!teamA || !teamB || teamA.id === teamB.id) {
      alert('Please select two different teams.');
      return;
    }
    const matchObj = constructMatchObject('scheduled');
    if (onSaveFixture) onSaveFixture(matchObj);
    onClose();
  };

  const handleOpenToss = () => {
    cricketAudio.playClick();
    if (!loggedInPlayer) {
      alert('Please login first to create and score a match.');
      return;
    }
    if (!teamAId || !teamBId) {
      alert('Please select both Team A and Team B first (or search for a team by its Team ID).');
      return;
    }
    if (!teamA || !teamB || teamA.id === teamB.id) {
      alert('Please select two different teams.');
      return;
    }
    setTossWinnerId(teamA.id);
    setShowTossModal(true);
  };

  const handleStartScoringFromToss = () => {
    cricketAudio.playBatHit();
    if (!loggedInPlayer) {
      alert('Please login first to create and score a match.');
      return;
    }
    const matchObj = constructMatchObject('live');
    onStartMatch(matchObj, false);
    setShowTossModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[94vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-base font-black tracking-wide text-white uppercase text-center flex-1">
            {selectedTour ? selectedTour.name : 'GROUP A Match'}
          </h2>

          <button
            onClick={() => setShowFormatModal(true)}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {selectedTournamentId && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Match Stage
              </span>
              <select
                value={matchStage}
                onChange={(e) => setMatchStage(e.target.value as typeof matchStage)}
                className="w-full text-xs font-bold text-white bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none"
              >
                <option value="league">League Stage (counts in Points Table)</option>
                <option value="eliminator">Eliminator</option>
                <option value="qualifier1">Qualifier 1</option>
                <option value="qualifier2">Qualifier 2</option>
                <option value="semifinal1">Semi Final 1</option>
                <option value="semifinal2">Semi Final 2</option>
                <option value="final">Final</option>
              </select>
              {matchStage !== 'league' && (
                <p className="text-[10px] text-amber-300/80 leading-snug">
                  Knockout matches don't count in the Points Table / NRR — they'll show separately under Playoffs.
                </p>
              )}
            </div>
          )}

          {teams.length === 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
              <p className="text-xs font-bold text-amber-300">
                Aapne abhi tak koi team nahi banayi hai.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Neeche "Create New Team" se apni team banao, ya "Search by Team ID" se kisi aur team ko dhoondh ke select karo.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-center py-2">
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-slate-400 mb-1.5 font-medium">Select Team</span>
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500/50 p-1 flex items-center justify-center shadow-lg relative group">
                {teamA.logoIcon ? (
                  <span className="text-3xl">{teamA.logoIcon}</span>
                ) : (
                  <Shield className="w-9 h-9 text-emerald-400" />
                )}
              </div>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="mt-2 text-xs font-black text-white bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none max-w-[130px] truncate"
              >
                <option value="">— Select Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!teamAId}
                onClick={() => setSquadModalTeam('A')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Squad ({effectiveSquadA.length} Playing)</span>
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] text-slate-400 mb-1.5 font-medium">Select Team</span>
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-500/50 p-1 flex items-center justify-center shadow-lg relative group">
                {teamB.logoIcon ? (
                  <span className="text-3xl">{teamB.logoIcon}</span>
                ) : (
                  <Shield className="w-9 h-9 text-amber-400" />
                )}
              </div>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="mt-2 text-xs font-black text-white bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none max-w-[130px] truncate"
              >
                <option value="">— Select Team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!teamBId}
                onClick={() => setSquadModalTeam('B')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Squad ({effectiveSquadB.length} Playing)</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              🔍 Looking for another team? Search by Team ID
            </span>
            <input
              type="text"
              value={opponentSearchQuery}
              onChange={(e) => setOpponentSearchQuery(e.target.value)}
              placeholder="e.g. TEAM-014 or team name"
              className="w-full text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
            />
            {opponentSearchQuery.trim().length >= 2 && (
              opponentSearchResults.length > 0 ? (
                <div className="space-y-1.5">
                  {opponentSearchResults.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t.logoIcon || '🛡️'}</span>
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {t.teamId && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                            {t.teamId}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTeamAId(t.id);
                            setOpponentSearchQuery('');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Set as Team A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTeamBId(t.id);
                            setOpponentSearchQuery('');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
                        >
                          Set as Team B
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  No team found with that ID/name. Not created yet? Use "Create New Team" below.
                </p>
              )
            )}
          </div>

          <div>
            <input
              type="text"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="Match 21 Arcl Maha Maquabla"
              className="w-full text-center py-2.5 bg-transparent border-b border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full py-2 bg-transparent border-b border-slate-700 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="relative">
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full py-2 bg-transparent border-b border-slate-700 text-xs font-bold text-center text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div
            onClick={() => setShowFormatModal(true)}
            className="py-3 px-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center cursor-pointer hover:border-emerald-500/50 transition"
          >
            <p className="text-sm font-black text-white">
              {selectedFormat} • {playersPerSide} Players/Side • {totalWickets} Wkts ({totalOvers} Overs)
            </p>
            <span className="text-[10px] text-emerald-400 font-bold">Tap to change format, players per side, or overs</span>
          </div>

          <div>
            <input
              type="text"
              value={scorerName}
              onChange={(e) => setScorerName(e.target.value)}
              placeholder="Select Scorer (Optional)"
              className="w-full text-center py-2 bg-transparent border-b border-slate-700 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="font-bold">Club Season/Year* - {clubSeason}</span>
            <span className="text-base" title="Tennis Heavy Ball">🎾</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={handleSaveFixtureOnly}
              className="py-3 rounded-2xl bg-teal-900/80 hover:bg-teal-800 text-teal-200 text-xs font-black tracking-wider uppercase transition cursor-pointer border border-teal-500/30"
            >
              SAVE FIXTURE
            </button>

            <button
              type="button"
              onClick={handleOpenToss}
              className="py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-emerald-700/30 transition cursor-pointer"
            >
              START MATCH
            </button>
          </div>
        </div>
      </div>

      {showFormatModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-black text-white text-base">Select Overs & Format</h3>
              <button
                onClick={() => setShowFormatModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 block">Total Overs per Innings</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOversChange(totalOvers - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={oversInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOversInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 1 && num <= 100) {
                          setTotalOvers(num);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (oversInput === '' || isNaN(Number(oversInput)) || Number(oversInput) < 1) {
                        setOversInput(String(totalOvers || 7));
                      } else {
                        handleOversChange(Number(oversInput));
                      }
                    }}
                    className="w-14 py-1 px-1 text-center bg-slate-950 border border-emerald-500 rounded-lg text-sm font-mono font-black text-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleOversChange(totalOvers + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 font-bold">Ov</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {[2, 3, 5, 6, 7, 8, 10, 12, 15, 20, 25, 50].map((ov) => (
                  <button
                    key={ov}
                    type="button"
                    onClick={() => handleOversChange(ov)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      totalOvers === ov
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ov} ov
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">Select Format*</label>
              <div className="grid grid-cols-3 gap-2">
                {(['T10', 'T20', 'Club', '100', 'One Day', 'Test Match'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatChange(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedFormat === fmt
                        ? 'bg-teal-700 text-white border-teal-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 block">Players per Side (Team Size)</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePlayersPerSideChange(playersPerSide - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={playersPerSideInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlayersPerSideInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 2 && num <= 25) {
                          setPlayersPerSide(num);
                          const autoWickets = Math.max(1, num - 1);
                          setTotalWickets(autoWickets);
                          setWicketsInput(String(autoWickets));
                        }
                      }
                    }}
                    onBlur={() => {
                      if (playersPerSideInput === '' || isNaN(Number(playersPerSideInput)) || Number(playersPerSideInput) < 2) {
                        setPlayersPerSideInput(String(playersPerSide || 11));
                      } else {
                        handlePlayersPerSideChange(Number(playersPerSideInput));
                      }
                    }}
                    className="w-14 py-1 px-1 text-center bg-slate-950 border border-teal-500 rounded-lg text-sm font-mono font-black text-teal-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handlePlayersPerSideChange(playersPerSide + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 font-bold">Plyrs</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {[2, 3, 4, 5, 6, 7, 8, 10, 11].map((pCount) => (
                  <button
                    key={pCount}
                    type="button"
                    onClick={() => handlePlayersPerSideChange(pCount)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      playersPerSide === pCount
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pCount} vs {pCount}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 block">Wickets per Team</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleWicketsChange(totalWickets - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={wicketsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWicketsInput(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        if (num >= 1 && num <= 25) {
                          setTotalWickets(num);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (wicketsInput === '' || isNaN(Number(wicketsInput)) || Number(wicketsInput) < 1) {
                        setWicketsInput(String(totalWickets || 10));
                      } else {
                        handleWicketsChange(Number(wicketsInput));
                      }
                    }}
                    className="w-14 py-1 px-1 text-center bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono font-black text-white focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleWicketsChange(totalWickets + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 font-bold">Wkts</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (oversInput && !isNaN(Number(oversInput))) handleOversChange(Number(oversInput));
                if (playersPerSideInput && !isNaN(Number(playersPerSideInput))) handlePlayersPerSideChange(Number(playersPerSideInput));
                if (wicketsInput && !isNaN(Number(wicketsInput))) handleWicketsChange(Number(wicketsInput));
                setShowFormatModal(false);
              }}
              className="w-full py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {squadModalTeam && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <span>{squadModalTeam === 'A' ? teamA.name : teamB.name} Squad</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {squadModalTeam === 'A' ? effectiveSquadA.length : effectiveSquadB.length} Playing
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Tap C / VC / WK to assign roles. Any squad size allowed.</p>
              </div>
              <button
                onClick={() => setSquadModalTeam(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/60">
              {(squadModalTeam === 'A' ? teamA.players : teamB.players).map((p, idx) => {
                const isPlaying = (squadModalTeam === 'A' ? effectiveSquadA : effectiveSquadB).includes(p.id);
                const isCap = (squadModalTeam === 'A' ? captainA : captainB) === p.id;
                const isViceCap = (squadModalTeam === 'A' ? viceCaptainA : viceCaptainB) === p.id;
                const isKeep = (squadModalTeam === 'A' ? keeperA : keeperB) === p.id;

                const togglePlaying = (status: boolean) => {
                  cricketAudio.playClick();
                  if (squadModalTeam === 'A') {
                    if (status && !playingSquadA.includes(p.id)) setPlayingSquadA([...effectiveSquadA, p.id]);
                    else if (!status) setPlayingSquadA(effectiveSquadA.filter((id) => id !== p.id));
                  } else {
                    if (status && !playingSquadB.includes(p.id)) setPlayingSquadB([...effectiveSquadB, p.id]);
                    else if (!status) setPlayingSquadB(effectiveSquadB.filter((id) => id !== p.id));
                  }
                };

                return (
                  <div
                    key={p.id}
                    className={`pt-2.5 pb-1.5 flex items-center justify-between gap-2 rounded-xl px-2.5 transition ${
                      isPlaying ? 'bg-slate-950/50 border border-slate-800/60' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</span>
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
                        <span className="text-[11px] font-mono text-slate-400 lowercase block">{p.profileId}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            if (squadModalTeam === 'A') setCaptainA(isCap ? '' : p.id);
                            else setCaptainB(isCap ? '' : p.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            isCap ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          C
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            if (squadModalTeam === 'A') setViceCaptainA(isViceCap ? '' : p.id);
                            else setViceCaptainB(isViceCap ? '' : p.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            isViceCap ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          VC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cricketAudio.playClick();
                            if (squadModalTeam === 'A') setKeeperA(isKeep ? '' : p.id);
                            else setKeeperB(isKeep ? '' : p.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            isKeep ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          WK
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePlaying(!isPlaying)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          isPlaying
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isPlaying ? 'Playing' : 'Bench'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSquadModalTeam(null)}
                className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                Confirm Squad Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {showTossModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base">Who won the toss?</h3>
              <button
                onClick={() => setShowTossModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setTossWinnerId(teamA.id)}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                  tossWinnerId === teamA.id
                    ? 'border-emerald-500 bg-emerald-950/40'
                    : 'border-slate-800 bg-slate-950/60 opacity-60'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl mb-1.5 shadow-md">
                  {teamA.logoIcon || '🦁'}
                </div>
                <span className="text-xs font-black text-white uppercase">{teamA.name}</span>
              </div>

              <div
                onClick={() => setTossWinnerId(teamB.id)}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                  tossWinnerId === teamB.id
                    ? 'border-emerald-500 bg-emerald-950/40'
                    : 'border-slate-800 bg-slate-950/60 opacity-60'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl mb-1.5 shadow-md">
                  {teamB.logoIcon || '⚡'}
                </div>
                <span className="text-xs font-black text-white uppercase">{teamB.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block text-center">Decided to?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                    tossDecision === 'bat'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Bat
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                    tossDecision === 'bowl'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Bowl
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartScoringFromToss}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-teal-600/30"
            >
              START SCORING
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
