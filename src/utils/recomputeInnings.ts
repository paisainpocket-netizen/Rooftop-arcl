/**
 * Rebuilds an innings' totals and stats from its ball-by-ball list.
 *
 * Why this exists: the ball list (innings.balls) is the source of truth, but
 * totalRuns / totalWickets / oversCompleted / battingStats / bowlingStats /
 * extras / fallOfWickets are saved separately. If a device receives newer balls
 * than the saved totals (e.g. the main match document failed to sync), the two
 * drift apart. This replays every ball with exactly the same rules the scorer
 * uses when a ball is added, so the result is identical to having scored the
 * balls one by one.
 *
 * Pure function: no side effects, input is never mutated.
 */

type AnyObj = Record<string, any>;

function formatDismissalText(type: string | undefined, bName: string, fName?: string): string {
  switch (type) {
    case 'direct_roof_out':
      return `Direct Roof Out (ਛੱਤ ਤੋਂ ਬਾਹਰ) b ${bName}`;
    case 'wall_catch':
      return `c ${fName || 'Fielder'} b ${bName} (Wall Catch)`;
    case 'bowled':
      return `b ${bName}`;
    case 'caught':
      return `c ${fName || 'Fielder'} b ${bName}`;
    case 'lbw':
      return `lbw b ${bName}`;
    case 'stumped':
      return `st ${fName || 'Keeper'} b ${bName}`;
    case 'runout':
      return `run out (${fName || 'Fielder'})`;
    case 'hitwicket':
      return `hit wicket b ${bName}`;
    case 'retired_hurt':
      return 'retired hurt (not out)';
    case 'retired':
      return 'retired out';
    default:
      return `out b ${bName}`;
  }
}

const NON_BOWLER_WICKETS = ['runout', 'timed_out', 'retired', 'retired_hurt'];

export function recomputeInningsFromBalls<T extends AnyObj>(innings: T, ballsOverride?: any[]): T {
  const balls: any[] = ballsOverride || innings?.balls || [];
  if (!innings) return innings;

  // Start from existing entries so placeholder rows (e.g. "did not bat") and
  // fields we don't derive are kept. Entries touched by a ball are reset and
  // rebuilt from scratch below.
  const batting: AnyObj = { ...(innings.battingStats || {}) };
  const bowling: AnyObj = { ...(innings.bowlingStats || {}) };
  const batTouched = new Set<string>();
  const bowlTouched = new Set<string>();

  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;
  const extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalty: innings.extras?.penalty || 0,
    total: 0,
  };
  const fallOfWickets: AnyObj[] = [];

  const touchBatsman = (id: string, name: string): AnyObj => {
    if (!batTouched.has(id)) {
      const prev = batting[id];
      batting[id] = {
        ...(prev || {}),
        playerId: id,
        playerName: prev?.playerName || name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        isRetiredHurt: false,
        dismissalText: undefined,
        battingOrder: prev?.battingOrder ?? Object.keys(batting).length + 1,
      };
      batTouched.add(id);
    }
    return batting[id];
  };

  const touchBowler = (id: string, name: string): AnyObj => {
    if (!bowlTouched.has(id)) {
      const prev = bowling[id];
      bowling[id] = {
        ...(prev || {}),
        playerId: id,
        playerName: prev?.playerName || name,
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
      bowlTouched.add(id);
    }
    return bowling[id];
  };

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const runsBat = b.runsBat || 0;
    const extraRuns = b.extraRuns || 0;
    const extraType = b.extraType || 'none';
    const isLegal = Boolean(b.isLegalDelivery);
    const isWicket = Boolean(b.isWicket);
    const isRetiredHurt = isWicket && b.wicketType === 'retired_hurt';
    const isRealWicket = isWicket && !isRetiredHurt;

    totalRuns += runsBat + extraRuns;
    if (isRealWicket) totalWickets += 1;
    if (isLegal) legalBalls += 1;

    // ---- Striker ----
    const s = touchBatsman(b.strikerId, b.strikerName);
    s.runs += runsBat;
    s.balls += extraType === 'wide' ? 0 : 1;
    s.fours += b.isFour ? 1 : 0;
    s.sixes += b.isSix ? 1 : 0;
    s.strikeRate = s.balls > 0 ? Number(((s.runs / s.balls) * 100).toFixed(1)) : 0;
    if (isWicket && b.dismissedPlayerId === b.strikerId) {
      if (isRetiredHurt) {
        s.isOut = false;
        s.isRetiredHurt = true;
        s.dismissalText = 'retired hurt (not out)';
      } else {
        s.isOut = true;
        s.isRetiredHurt = false;
        s.dismissalText = formatDismissalText(b.wicketType, b.bowlerName || 'Bowler', b.fielderName);
      }
    }

    // ---- Dismissed non-striker (run out at the other end) ----
    if (isWicket && b.nonStrikerId && b.dismissedPlayerId === b.nonStrikerId) {
      const ns = touchBatsman(b.nonStrikerId, b.nonStrikerName);
      ns.isOut = !isRetiredHurt;
      ns.isRetiredHurt = isRetiredHurt;
      ns.dismissalText = isRetiredHurt
        ? 'retired hurt (not out)'
        : `run out (${b.fielderName || 'fielder'})`;
    }

    // ---- Bowler ----
    const bw = touchBowler(b.bowlerId, b.bowlerName);
    const bowlerBallsTotal = bw.overs * 6 + bw.balls + (isLegal ? 1 : 0);
    const newOvers = Math.floor(bowlerBallsTotal / 6);
    const newRemainder = bowlerBallsTotal % 6;
    const bowlerRunsAdded = extraType === 'bye' || extraType === 'legBye' ? 0 : runsBat + extraRuns;
    const isBowlerWicket = isRealWicket && !NON_BOWLER_WICKETS.includes(b.wicketType || '');

    let maidens = bw.maidens;
    if (isLegal && newRemainder === 0) {
      let overRuns = bowlerRunsAdded;
      for (let j = 0; j < i; j++) {
        const pb = balls[j];
        if (pb.bowlerId === b.bowlerId && pb.overNumber === b.overNumber) {
          overRuns += (pb.runsBat || 0) + (pb.extraType === 'wide' || pb.extraType === 'noBall' ? pb.extraRuns || 0 : 0);
        }
      }
      if (overRuns === 0) maidens += 1;
    }

    bw.overs = newOvers;
    bw.balls = newRemainder;
    bw.runs += bowlerRunsAdded;
    bw.wickets += isBowlerWicket ? 1 : 0;
    bw.dots += runsBat === 0 && extraType === 'none' && !isWicket ? 1 : 0;
    bw.wides += extraType === 'wide' ? 1 : 0;
    bw.noBalls += extraType === 'noBall' ? 1 : 0;
    bw.maidens = maidens;
    const oversFloat = newOvers + newRemainder / 6;
    bw.economy = oversFloat > 0 ? Number((bw.runs / oversFloat).toFixed(2)) : 0;

    // ---- Extras ----
    if (extraType === 'wide') extras.wides += extraRuns;
    else if (extraType === 'noBall') extras.noBalls += extraRuns;
    else if (extraType === 'bye') extras.byes += extraRuns;
    else if (extraType === 'legBye') extras.legByes += extraRuns;
    extras.total += extraRuns;

    // ---- Fall of wickets ----
    if (isWicket && !isRetiredHurt && b.dismissedPlayerId) {
      fallOfWickets.push({
        wicketNumber: totalWickets,
        score: totalRuns,
        over: b.displayOver,
        playerId: b.dismissedPlayerId,
        playerName: b.dismissedPlayerName,
      });
    }
  }

  return {
    ...innings,
    balls,
    totalRuns,
    totalWickets,
    oversCompleted: Math.floor(legalBalls / 6),
    ballsInCurrentOver: legalBalls % 6,
    battingStats: batting,
    bowlingStats: bowling,
    extras,
    fallOfWickets,
  };
}

/** True when the saved totals disagree with what the ball list adds up to. */
export function inningsTotalsDifferFromBalls(innings: AnyObj, ballsOverride?: any[]): boolean {
  if (!innings) return false;
  const balls: any[] = ballsOverride || innings.balls || [];
  if (balls.length === 0) return false;
  let runs = 0;
  let wkts = 0;
  let legal = 0;
  for (const b of balls) {
    runs += (b.runsBat || 0) + (b.extraRuns || 0);
    if (b.isWicket && b.wicketType !== 'retired_hurt') wkts += 1;
    if (b.isLegalDelivery) legal += 1;
  }
  return (
    (innings.totalRuns || 0) !== runs ||
    (innings.totalWickets || 0) !== wkts ||
    (innings.oversCompleted || 0) !== Math.floor(legal / 6) ||
    (innings.ballsInCurrentOver || 0) !== legal % 6
  );
}
