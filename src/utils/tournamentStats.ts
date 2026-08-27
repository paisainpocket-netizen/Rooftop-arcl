import { Match, Innings } from '../types/cricket';

// Aggregated per-player performance across every completed match of a single
// tournament. Built directly from match innings/ball data so it works for
// ANY player who appeared in a tournament match — even guest/custom players
// who aren't part of the global players[] roster.
export interface TournamentPlayerStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;

  matches: number;
  innings: number;
  timesOut: number;

  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  fifties: number;
  centuries: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  strikeRate: number;
  battingAverage: number;

  legalBallsBowled: number;
  oversBowled: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  economy: number;
  threeWicketHauls: number;

  catches: number;
  runOuts: number;
  stumpings: number;
  fieldingDismissals: number;

  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  mvpPoints: number;
  momAwards: number;
}

function emptyStat(playerId: string, playerName: string, teamId: string, teamName: string, teamColor: string): TournamentPlayerStat {
  return {
    playerId,
    playerName,
    teamId,
    teamName,
    teamColor,
    matches: 0,
    innings: 0,
    timesOut: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    centuries: 0,
    highestScore: 0,
    highestScoreNotOut: false,
    strikeRate: 0,
    battingAverage: 0,
    legalBallsBowled: 0,
    oversBowled: 0,
    runsConceded: 0,
    wickets: 0,
    maidens: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    economy: 0,
    threeWicketHauls: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
    fieldingDismissals: 0,
    battingPoints: 0,
    bowlingPoints: 0,
    fieldingPoints: 0,
    mvpPoints: 0,
    momAwards: 0,
  };
}

/**
 * Build a Most-Runs / Most-Wickets / MVP-ready leaderboard for an entire
 * tournament by replaying every completed match belonging to it. Call with
 * the matches already filtered to a single tournament (e.g. via
 * `allMatches.filter(m => m.tournamentId === tournament.id)`).
 */
export function calculateTournamentStats(tournamentMatches: Match[]): TournamentPlayerStat[] {
  const map = new Map<string, TournamentPlayerStat>();

  const ensure = (playerId: string, playerName: string, teamId: string, teamName: string, teamColor: string) => {
    let entry = map.get(playerId);
    if (!entry) {
      entry = emptyStat(playerId, playerName, teamId, teamName, teamColor);
      map.set(playerId, entry);
    } else {
      // Keep the most recently seen team affiliation (players occasionally
      // switch teams between seasons/tournaments).
      if (teamName) {
        entry.teamId = teamId;
        entry.teamName = teamName;
        entry.teamColor = teamColor || entry.teamColor;
      }
    }
    return entry;
  };

  const completed = (tournamentMatches || []).filter((m) => m && m.status === 'completed');

  for (const match of completed) {
    const teamA = match.teamA;
    const teamB = match.teamB;

    // Track who actually featured in this match so `matches` only increments once per player.
    const seenThisMatch = new Set<string>();

    const registerSquad = (ids: string[] | undefined, team: typeof teamA) => {
      (ids || []).forEach((pid) => {
        const p = team?.players?.find((pl) => pl.id === pid || pl.profileId === pid);
        ensure(pid, p?.name || 'Player', team?.id || '', team?.name || '', team?.color || '#10b981');
      });
    };
    registerSquad(match.playingSquadA, teamA);
    registerSquad(match.playingSquadB, teamB);

    const innings: Innings[] = [match.innings1, match.innings2, match.innings3, match.innings4].filter(Boolean) as Innings[];

    for (const inn of innings) {
      const battingTeamIsA = teamA && inn.teamId === teamA.id;
      const fieldingTeam = battingTeamIsA ? teamB : teamA;

      // Batting
      for (const bat of Object.values(inn.battingStats || {})) {
        const battingTeam = battingTeamIsA ? teamA : teamB;
        const entry = ensure(bat.playerId, bat.playerName, battingTeam?.id || inn.teamId, battingTeam?.name || inn.teamName, battingTeam?.color || '#10b981');
        if (!seenThisMatch.has(entry.playerId)) {
          seenThisMatch.add(entry.playerId);
          entry.matches += 1;
        }
        entry.innings += 1;
        entry.runs += bat.runs;
        entry.ballsFaced += bat.balls;
        entry.fours += bat.fours || 0;
        entry.sixes += bat.sixes || 0;
        if (bat.isOut) entry.timesOut += 1;
        if (bat.runs >= 100) entry.centuries += 1;
        else if (bat.runs >= 50) entry.fifties += 1;
        if (bat.runs > entry.highestScore) {
          entry.highestScore = bat.runs;
          entry.highestScoreNotOut = !bat.isOut;
        } else if (bat.runs === entry.highestScore && !bat.isOut) {
          entry.highestScoreNotOut = true;
        }

        let bPts = 0;
        if (bat.runs > 0) bPts += bat.runs / 10;
        if (bat.runs >= 50) bPts += 1;
        if (bat.runs >= 100) bPts += 1;
        if (bat.runs >= 10 && bat.strikeRate >= 130) bPts += 1;
        entry.battingPoints += bPts;
      }

      // Bowling
      for (const bowl of Object.values(inn.bowlingStats || {})) {
        const entry = ensure(bowl.playerId, bowl.playerName, fieldingTeam?.id || '', fieldingTeam?.name || '', fieldingTeam?.color || '#f59e0b');
        if (!seenThisMatch.has(entry.playerId)) {
          seenThisMatch.add(entry.playerId);
          entry.matches += 1;
        }
        const legalBalls = (bowl.overs || 0) * 6 + (bowl.balls || 0);
        entry.legalBallsBowled += legalBalls;
        entry.runsConceded += bowl.runs || 0;
        entry.wickets += bowl.wickets || 0;
        entry.maidens += bowl.maidens || 0;
        if (bowl.wickets >= 3) entry.threeWicketHauls += 1;
        const isBetterSpell =
          bowl.wickets > entry.bestBowlingWickets ||
          (bowl.wickets === entry.bestBowlingWickets && bowl.wickets > 0 && bowl.runs < entry.bestBowlingRuns);
        if (isBetterSpell) {
          entry.bestBowlingWickets = bowl.wickets;
          entry.bestBowlingRuns = bowl.runs;
        }

        let bwPts = (bowl.wickets || 0) * 2;
        if (bowl.wickets >= 3) bwPts += 1;
        if (bowl.wickets >= 5) bwPts += 1;
        bwPts += (bowl.maidens || 0) * 1;
        entry.bowlingPoints += bwPts;
      }

      // Fielding — derived from ball-by-ball dismissal records
      for (const ball of inn.balls || []) {
        if (!ball.isWicket || !ball.fielderId) continue;
        const fielderTeam = fieldingTeam;
        const entry = ensure(ball.fielderId, ball.fielderName || 'Player', fielderTeam?.id || '', fielderTeam?.name || '', fielderTeam?.color || '#f59e0b');
        if (ball.wicketType === 'caught' || ball.wicketType === 'wall_catch') {
          entry.catches += 1;
          entry.fieldingPoints += 1;
        } else if (ball.wicketType === 'runout') {
          entry.runOuts += 1;
          entry.fieldingPoints += 1;
        } else if (ball.wicketType === 'stumped') {
          entry.stumpings += 1;
          entry.fieldingPoints += 1;
        }
        entry.fieldingDismissals = entry.catches + entry.runOuts + entry.stumpings;
      }
    }

    if (match.result?.playerOfTheMatch?.playerId) {
      const momId = match.result.playerOfTheMatch.playerId;
      if (map.has(momId)) {
        map.get(momId)!.momAwards += 1;
      }
    }
  }

  const stats = Array.from(map.values()).map((entry) => {
    entry.oversBowled = Number((Math.floor(entry.legalBallsBowled / 6) + (entry.legalBallsBowled % 6) / 10).toFixed(1));
    entry.strikeRate = entry.ballsFaced > 0 ? Number(((entry.runs / entry.ballsFaced) * 100).toFixed(2)) : 0;
    entry.battingAverage = entry.timesOut > 0 ? Number((entry.runs / entry.timesOut).toFixed(2)) : entry.runs;
    entry.economy = entry.legalBallsBowled > 0 ? Number((entry.runsConceded / (entry.legalBallsBowled / 6)).toFixed(2)) : 0;
    entry.fieldingDismissals = entry.catches + entry.runOuts + entry.stumpings;
    entry.mvpPoints = Math.round((entry.battingPoints + entry.bowlingPoints + entry.fieldingPoints) * 10) / 10;
    entry.battingPoints = Math.round(entry.battingPoints * 10) / 10;
    entry.bowlingPoints = Math.round(entry.bowlingPoints * 10) / 10;
    return entry;
  });

  return stats;
}

export function bestBowlingLabel(wickets: number, runs: number): string {
  if (wickets === 0 && runs === 0) return '-';
  return `${wickets}/${runs}`;
}
