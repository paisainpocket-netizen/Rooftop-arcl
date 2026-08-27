import { Innings, BatsmanStats, BowlerStats, FallOfWicket, BallOutcome } from '../types/cricket';

// Rebuilds every derived number in an innings (totals, extras, batting/bowling
// stats, fall of wickets) purely from its `balls` array. Used after a creator
// manually corrects a mistake (e.g. runs credited to the wrong batsman) so
// every downstream number stays consistent — instead of trying to patch
// individual counters by hand, which is error-prone.
export function recomputeInningsFromBalls(innings: Innings): Innings {
  const balls = innings.balls;

  const totalRuns = balls.reduce((sum, b) => sum + b.runsBat + b.extraRuns, 0);
  const totalWickets = balls.filter((b) => b.isWicket).length;

  const legalBalls = balls.filter((b) => b.isLegalDelivery);
  const oversCompleted = Math.floor(legalBalls.length / 6);
  const ballsInCurrentOver = legalBalls.length % 6;

  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 };
  balls.forEach((b) => {
    if (b.extraType === 'wide') extras.wides += b.extraRuns;
    else if (b.extraType === 'noBall') extras.noBalls += b.extraRuns;
    else if (b.extraType === 'bye') extras.byes += b.extraRuns;
    else if (b.extraType === 'legBye') extras.legByes += b.extraRuns;
    else if (b.extraType === 'penalty') extras.penalty += b.extraRuns;
  });
  extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;

  // --- Batting stats: recompute numbers, keep existing playerName/battingOrder ---
  const battingStats: { [playerId: string]: BatsmanStats } = {};
  const existingBattingOrders = Object.values(innings.battingStats).map((s) => s.battingOrder);
  let nextBattingOrder = existingBattingOrders.length > 0 ? Math.max(...existingBattingOrders) + 1 : 1;

  const ensureBatsman = (playerId: string, playerName: string) => {
    if (battingStats[playerId]) return;
    const existing = innings.battingStats[playerId];
    battingStats[playerId] = {
      playerId,
      playerName: existing?.playerName || playerName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      battingOrder: existing?.battingOrder ?? nextBattingOrder++,
    };
  };

  balls.forEach((b) => {
    ensureBatsman(b.strikerId, b.strikerName);
    const s = battingStats[b.strikerId];
    s.runs += b.runsBat;
    if (b.extraType !== 'wide') s.balls += 1;
    if (b.isFour) s.fours += 1;
    if (b.isSix) s.sixes += 1;
  });

  balls.forEach((b) => {
    if (b.isWicket && b.dismissedPlayerId) {
      ensureBatsman(b.dismissedPlayerId, b.dismissedPlayerName || 'Batsman');
      const s = battingStats[b.dismissedPlayerId];
      s.isOut = true;
      s.dismissalText =
        innings.battingStats[b.dismissedPlayerId]?.dismissalText ||
        `${b.wicketType || 'out'}${b.bowlerName ? ` b ${b.bowlerName}` : ''}`;
    }
  });

  Object.values(battingStats).forEach((s) => {
    s.strikeRate = s.balls > 0 ? Number(((s.runs / s.balls) * 100).toFixed(1)) : 0;
  });

  // --- Bowling stats: recompute numbers, keep existing playerName ---
  const bowlingStats: { [playerId: string]: BowlerStats } = {};
  const ensureBowler = (playerId: string, playerName: string) => {
    if (bowlingStats[playerId]) return;
    const existing = innings.bowlingStats[playerId];
    bowlingStats[playerId] = {
      playerId,
      playerName: existing?.playerName || playerName,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      wides: 0,
      noBalls: 0,
    };
  };

  const legalBallsByBowler: { [playerId: string]: number } = {};
  balls.forEach((b) => {
    ensureBowler(b.bowlerId, b.bowlerName);
    const s = bowlingStats[b.bowlerId];
    const runsAgainstBowler = b.extraType === 'bye' || b.extraType === 'legBye' ? 0 : b.runsBat + b.extraRuns;
    s.runs += runsAgainstBowler;
    if (b.extraType === 'wide') s.wides += 1;
    if (b.extraType === 'noBall') s.noBalls += 1;
    if (b.isLegalDelivery) {
      legalBallsByBowler[b.bowlerId] = (legalBallsByBowler[b.bowlerId] || 0) + 1;
      if (b.runsBat === 0 && b.extraType === 'none' && !b.isWicket) s.dots += 1;
    }
    if (b.isWicket && !['runout', 'timed_out', 'retired', 'retired_hurt'].includes(b.wicketType || '')) {
      s.wickets += 1;
    }
  });

  Object.keys(bowlingStats).forEach((playerId) => {
    const total = legalBallsByBowler[playerId] || 0;
    bowlingStats[playerId].overs = Math.floor(total / 6);
    bowlingStats[playerId].balls = total % 6;
    const oversFloat = bowlingStats[playerId].overs + bowlingStats[playerId].balls / 6;
    bowlingStats[playerId].economy =
      oversFloat > 0 ? Number((bowlingStats[playerId].runs / oversFloat).toFixed(2)) : 0;
  });

  // Maidens: group this bowler's legal deliveries by over number, an over is
  // maiden if 0 total runs (bat + extras) were conceded in it.
  const overRunsByBowler: { [key: string]: number } = {};
  const overBallCountByBowler: { [key: string]: number } = {};
  balls.forEach((b) => {
    if (!b.isLegalDelivery) return;
    const key = `${b.bowlerId}|${b.overNumber}`;
    overRunsByBowler[key] = (overRunsByBowler[key] || 0) + b.runsBat + b.extraRuns;
    overBallCountByBowler[key] = (overBallCountByBowler[key] || 0) + 1;
  });
  Object.keys(overBallCountByBowler).forEach((key) => {
    const [bowlerId] = key.split('|');
    if (overBallCountByBowler[key] === 6 && overRunsByBowler[key] === 0) {
      if (bowlingStats[bowlerId]) bowlingStats[bowlerId].maidens += 1;
    }
  });

  // --- Fall of wickets: rebuild in ball order ---
  const fallOfWickets: FallOfWicket[] = [];
  let runningScore = 0;
  let runningWickets = 0;
  balls.forEach((b: BallOutcome) => {
    runningScore += b.runsBat + b.extraRuns;
    if (b.isWicket) {
      runningWickets += 1;
      fallOfWickets.push({
        wicketNumber: runningWickets,
        score: runningScore,
        over: b.displayOver,
        playerId: b.dismissedPlayerId || b.strikerId,
        playerName: b.dismissedPlayerName || b.strikerName,
      });
    }
  });

  return {
    ...innings,
    totalRuns,
    totalWickets,
    oversCompleted,
    ballsInCurrentOver,
    extras,
    battingStats,
    bowlingStats,
    fallOfWickets,
  };
}
