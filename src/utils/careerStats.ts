import { Match, Player, PlayerStats, Innings } from '../types/cricket';

export type MatchFormatKey = 't10' | 't20' | 'club' | 'test';

// Determine which format bucket (T10/T20/Club/Test) a match belongs to,
// mirroring the same logic already used for display in PlayerProfileModal.
export function getMatchFormatKey(match: Match): MatchFormatKey {
  const matchFmt = (match.settings?.matchType || match.format || '').toLowerCase();
  if (matchFmt.includes('test') || match.matchFormat === 'test') return 'test';
  if (matchFmt.includes('20') || match.totalOvers >= 20) return 't20';
  if (matchFmt.includes('club') || matchFmt.includes('terrace')) return 'club';
  return 't10';
}

interface StatsDelta {
  matches: number;
  innings: number;
  timesOut: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  thirties: number;
  fifties: number;
  centuries: number;
  ducks: number;
  matchHighestScore: number;
  matchHighestScoreNotOut: boolean;
  bowledLegalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  matchBestWickets: number;
  matchBestRuns: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  directRoofOuts: number;
  momAwards: number;
}

function emptyDelta(): StatsDelta {
  return {
    matches: 0,
    innings: 0,
    timesOut: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    thirties: 0,
    fifties: 0,
    centuries: 0,
    ducks: 0,
    matchHighestScore: 0,
    matchHighestScoreNotOut: false,
    bowledLegalBalls: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    matchBestWickets: 0,
    matchBestRuns: 0,
    threeWicketHauls: 0,
    fiveWicketHauls: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
    directRoofOuts: 0,
    momAwards: 0,
  };
}

function addInningsToDelta(innings: Innings | undefined, playerId: string, delta: StatsDelta) {
  if (!innings) return;

  const bat = innings.battingStats?.[playerId];
  if (bat) {
    delta.innings += 1;
    delta.runs += bat.runs;
    delta.ballsFaced += bat.balls;
    delta.fours += bat.fours;
    delta.sixes += bat.sixes;
    if (bat.isOut) delta.timesOut += 1;

    if (bat.runs >= 100) delta.centuries += 1;
    else if (bat.runs >= 50) delta.fifties += 1;
    else if (bat.runs >= 30) delta.thirties += 1;

    if (bat.isOut && bat.runs === 0) delta.ducks += 1;

    if (bat.runs > delta.matchHighestScore) {
      delta.matchHighestScore = bat.runs;
      delta.matchHighestScoreNotOut = !bat.isOut;
    }
  }

  const bowl = innings.bowlingStats?.[playerId];
  if (bowl) {
    delta.bowledLegalBalls += bowl.overs * 6 + bowl.balls;
    delta.maidens += bowl.maidens;
    delta.runsConceded += bowl.runs;
    delta.wickets += bowl.wickets;

    const isBetterSpell =
      bowl.wickets > delta.matchBestWickets ||
      (bowl.wickets === delta.matchBestWickets && bowl.wickets > 0 && bowl.runs < delta.matchBestRuns);
    if (isBetterSpell) {
      delta.matchBestWickets = bowl.wickets;
      delta.matchBestRuns = bowl.runs;
    }

    if (bowl.wickets >= 3) delta.threeWicketHauls += 1;
    if (bowl.wickets >= 5) delta.fiveWicketHauls += 1;
  }

  // Fielding credit derived directly from ball-by-ball dismissal records
  for (const ball of innings.balls) {
    if (!ball.isWicket || !ball.fielderId) continue;
    if (ball.fielderId !== playerId) continue;
    if (ball.wicketType === 'caught' || ball.wicketType === 'wall_catch') delta.catches += 1;
    else if (ball.wicketType === 'runout') delta.runOuts += 1;
    else if (ball.wicketType === 'stumped') delta.stumpings += 1;
  }

  // Direct Roof Out dismissals credited to the bowler who delivered the ball
  for (const ball of innings.balls) {
    if (ball.isWicket && ball.wicketType === 'direct_roof_out' && ball.bowlerId === playerId) {
      delta.directRoofOuts += 1;
    }
  }
}

// Compute this player's stat contribution from a single completed match.
// Returns null if the player had no involvement in the match at all.
export function computeMatchPlayerDelta(match: Match, playerId: string): StatsDelta | null {
  const inSquadA =
    Boolean(match.playingSquadA?.includes(playerId)) || match.teamA.players.some((p) => p.id === playerId);
  const inSquadB =
    Boolean(match.playingSquadB?.includes(playerId)) || match.teamB.players.some((p) => p.id === playerId);

  const innings = [match.innings1, match.innings2, match.innings3, match.innings4];
  const hadContribution = innings.some(
    (inn) => Boolean(inn?.battingStats?.[playerId]) || Boolean(inn?.bowlingStats?.[playerId])
  );

  if (!inSquadA && !inSquadB && !hadContribution) return null;

  const delta = emptyDelta();
  delta.matches = 1;

  for (const inn of innings) {
    addInningsToDelta(inn, playerId, delta);
  }

  if (match.result?.playerOfTheMatch?.playerId === playerId) {
    delta.momAwards = 1;
  }

  return delta;
}

function emptyPlayerStats(): PlayerStats {
  return {
    matches: 0,
    innings: 0,
    timesOut: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    thirties: 0,
    fifties: 0,
    centuries: 0,
    ducks: 0,
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
    directRoofOuts: 0,
    momAwards: 0,
  };
}

// Merge a match delta additively into an existing PlayerStats snapshot,
// recomputing every derived/ratio field (averages, strike rate, economy) from
// the new cumulative totals rather than adding deltas to old derived values.
function mergeStatsWithDelta(base: PlayerStats, delta: StatsDelta): PlayerStats {
  const newRuns = base.runs + delta.runs;
  const newBallsFaced = base.ballsFaced + delta.ballsFaced;
  const newTimesOut = (base.timesOut || 0) + delta.timesOut;

  // oversBowled is stored in cricket "overs.balls" notation (e.g. 3.4 = 3 overs, 4 balls),
  // matching how the rest of the app already displays it. Reconstruct total legal balls
  // to combine correctly across matches instead of naively adding the decimal values.
  const existingBowledBalls = Math.floor(base.oversBowled) * 6 + Math.round((base.oversBowled % 1) * 10);
  const newBowledBalls = existingBowledBalls + delta.bowledLegalBalls;
  const newOversBowled = Math.floor(newBowledBalls / 6) + (newBowledBalls % 6) / 10;

  const newRunsConceded = base.runsConceded + delta.runsConceded;
  const newWickets = base.wickets + delta.wickets;

  const useDeltaBest =
    delta.matchBestWickets > base.bestBowlingWickets ||
    (delta.matchBestWickets === base.bestBowlingWickets &&
      delta.matchBestWickets > 0 &&
      delta.matchBestRuns < base.bestBowlingRuns);

  const newHighestScore = delta.matchHighestScore > base.highestScore ? delta.matchHighestScore : base.highestScore;
  const newHighestScoreNotOut =
    delta.matchHighestScore > base.highestScore ? delta.matchHighestScoreNotOut : base.highestScoreNotOut;

  return {
    ...base,
    matches: base.matches + delta.matches,
    innings: base.innings + delta.innings,
    timesOut: newTimesOut,
    runs: newRuns,
    ballsFaced: newBallsFaced,
    fours: base.fours + delta.fours,
    sixes: base.sixes + delta.sixes,
    thirties: (base.thirties || 0) + delta.thirties,
    fifties: base.fifties + delta.fifties,
    centuries: base.centuries + delta.centuries,
    ducks: (base.ducks || 0) + delta.ducks,
    highestScore: newHighestScore,
    highestScoreNotOut: newHighestScoreNotOut,
    strikeRate: newBallsFaced > 0 ? Number(((newRuns / newBallsFaced) * 100).toFixed(2)) : base.strikeRate,
    battingAverage:
      newTimesOut > 0 ? Number((newRuns / newTimesOut).toFixed(2)) : newRuns > 0 ? newRuns : base.battingAverage,

    oversBowled: Number(newOversBowled.toFixed(1)),
    maidens: base.maidens + delta.maidens,
    runsConceded: newRunsConceded,
    wickets: newWickets,
    bestBowlingWickets: useDeltaBest ? delta.matchBestWickets : base.bestBowlingWickets,
    bestBowlingRuns: useDeltaBest ? delta.matchBestRuns : base.bestBowlingRuns,
    economy: newBowledBalls > 0 ? Number((newRunsConceded / (newBowledBalls / 6)).toFixed(2)) : base.economy,
    bowlingAverage: newWickets > 0 ? Number((newRunsConceded / newWickets).toFixed(2)) : base.bowlingAverage,
    threeWicketHauls: base.threeWicketHauls + delta.threeWicketHauls,
    fiveWicketHauls: base.fiveWicketHauls + delta.fiveWicketHauls,

    catches: base.catches + delta.catches,
    runOuts: base.runOuts + delta.runOuts,
    stumpings: base.stumpings + delta.stumpings,
    directRoofOuts: (base.directRoofOuts || 0) + delta.directRoofOuts,
    momAwards: base.momAwards + delta.momAwards,
  };
}

// Rebuild every player's career stats (overall + T10/T20/Club/Test) completely
// from scratch, replaying only the given completed matches in chronological
// order. Use this whenever a completed match is deleted or edited after the
// fact — record-type fields like highestScore/bestBowling can't be safely
// "subtracted", so a full, correct recalculation is done instead.
export function recalculateCareerStats(players: Player[], allMatches: Match[]): Player[] {
  const completedMatches = allMatches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));

  return players.map((player) => {
    let overallStats = emptyPlayerStats();
    let formatStats: NonNullable<Player['formatStats']> = {};

    for (const match of completedMatches) {
      const delta = computeMatchPlayerDelta(match, player.id);
      if (!delta) continue;

      const formatKey = getMatchFormatKey(match);
      overallStats = mergeStatsWithDelta(overallStats, delta);
      const existingFormat = formatStats[formatKey] || emptyPlayerStats();
      formatStats = { ...formatStats, [formatKey]: mergeStatsWithDelta(existingFormat, delta) };
    }

    return { ...player, stats: overallStats, formatStats };
  });
}

// Apply a just-completed match's stats to every involved player: updates both
// the overall career totals (player.stats) and the correct format bucket
// (player.formatStats.t10 / t20 / club / test) based on this match's format.
export function applyMatchStatsToPlayers(players: Player[], match: Match): Player[] {
  const formatKey = getMatchFormatKey(match);

  return players.map((player) => {
    const delta = computeMatchPlayerDelta(match, player.id);
    if (!delta) return player;

    const newOverallStats = mergeStatsWithDelta(player.stats, delta);
    const existingFormatStats = player.formatStats?.[formatKey] || player.stats;
    const newFormatStats = mergeStatsWithDelta(existingFormatStats, delta);

    return {
      ...player,
      stats: newOverallStats,
      formatStats: {
        ...player.formatStats,
        [formatKey]: newFormatStats,
      },
    };
  });
}
