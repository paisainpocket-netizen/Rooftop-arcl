import { Match, Team } from '../types/cricket';

export interface FormBadge {
  matchId: string;
  result: 'W' | 'L' | 'T' | 'NR';
  opponentName: string;
  opponentId?: string;
  date: string;
  scoreText: string;
  summary: string;
  marginText: string;
  batFirst: boolean;
}

export interface TeamSplitStats {
  matches: number;
  won: number;
  lost: number;
  tied: number;
  winPercentage: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  highestDefendedOrChased?: number;
}

export interface TeamDetailedAnalytics {
  team: Team;
  totalMatches: number;
  last20Matches: Match[];
  overall: {
    matches: number;
    won: number;
    lost: number;
    tied: number;
    winPercentage: number;
    currentStreak: string;
    form: FormBadge[]; // Most recent first (up to 20)
  };
  batFirst: TeamSplitStats;
  chaseFirst: TeamSplitStats;
  toss: {
    tossesWon: number;
    tossesLost: number;
    tossWinMatchWon: number;
    tossWinConversionRate: number;
    choseBatCount: number;
    choseBowlCount: number;
  };
  benchmarks: {
    highestTotal: { score: number; wickets: number; overs: string; opponent: string; date: string } | null;
    lowestTotal: { score: number; wickets: number; overs: string; opponent: string; date: string } | null;
    highestDefended: { score: number; opponent: string; margin: string } | null;
    highestChased: { target: number; opponent: string; margin: string } | null;
    totalSixes: number;
    totalFours: number;
    averageRunRate: number;
  };
}

export interface HeadToHeadStats {
  teamA: Team;
  teamB: Team;
  totalMatches: number;
  teamAWins: number;
  teamBWins: number;
  ties: number;
  teamAWinPercentage: number;
  teamBWinPercentage: number;
  teamABatFirstWins: number;
  teamAChaseWins: number;
  teamBBatFirstWins: number;
  teamBChaseWins: number;
  teamAHighestScore: number;
  teamBHighestScore: number;
  matches: Match[];
}

/**
 * Normalizes checking if a team is part of a match
 */
export function isTeamInMatch(team: Team, match: Match): { isTeamA: boolean; isTeamB: boolean; isPresent: boolean } {
  if (!team || !match) return { isTeamA: false, isTeamB: false, isPresent: false };
  
  const tId = team.id?.trim().toLowerCase();
  const tCode = team.teamId?.trim().toLowerCase() || team.profileId?.trim().toLowerCase();
  const tName = team.name?.trim().toLowerCase();

  const matchAId = match.teamA?.id?.trim().toLowerCase();
  const matchACode = match.teamA?.teamId?.trim().toLowerCase() || match.teamA?.profileId?.trim().toLowerCase();
  const matchAName = match.teamA?.name?.trim().toLowerCase();

  const matchBId = match.teamB?.id?.trim().toLowerCase();
  const matchBCode = match.teamB?.teamId?.trim().toLowerCase() || match.teamB?.profileId?.trim().toLowerCase();
  const matchBName = match.teamB?.name?.trim().toLowerCase();

  const isTeamA = (tId && tId === matchAId) || (tCode && tCode === matchACode) || (tName && tName === matchAName);
  const isTeamB = (tId && tId === matchBId) || (tCode && tCode === matchBCode) || (tName && tName === matchBName);

  return { isTeamA, isTeamB, isPresent: isTeamA || isTeamB };
}

/**
 * Calculates complete team analytics up to last 20 matches
 */
export function calculateTeamAnalytics(team: Team, allMatches: Match[] = []): TeamDetailedAnalytics {
  // 1. Filter completed matches for this team
  const relevantMatches = (allMatches || [])
    .filter((m) => m && (m.status === 'completed' || m.result?.winnerTeamName || m.result?.isTie))
    .filter((m) => isTeamInMatch(team, m).isPresent)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Most recent first

  // Slice up to last 20 matches
  const last20Matches = relevantMatches.slice(0, 20);

  const form: FormBadge[] = [];
  let overallWon = 0;
  let overallLost = 0;
  let overallTied = 0;

  // Bat First buckets
  let batFirstMatches = 0;
  let batFirstWon = 0;
  let batFirstLost = 0;
  let batFirstTied = 0;
  const batFirstScores: number[] = [];

  // Chase First buckets
  let chaseMatches = 0;
  let chaseWon = 0;
  let chaseLost = 0;
  let chaseTied = 0;
  const chaseScores: number[] = [];

  // Toss buckets
  let tossesWon = 0;
  let tossesLost = 0;
  let tossWinMatchWon = 0;
  let choseBatCount = 0;
  let choseBowlCount = 0;

  // Benchmarks
  let totalSixes = 0;
  let totalFours = 0;
  let totalTeamRuns = 0;
  let totalTeamLegalBalls = 0;

  let highestTotal: { score: number; wickets: number; overs: string; opponent: string; date: string } | null = null;
  let lowestTotal: { score: number; wickets: number; overs: string; opponent: string; date: string } | null = null;
  let highestDefended: { score: number; opponent: string; margin: string } | null = null;
  let highestChased: { target: number; opponent: string; margin: string } | null = null;

  for (const m of last20Matches) {
    const { isTeamA } = isTeamInMatch(team, m);
    const opponent = isTeamA ? m.teamB : m.teamA;
    const opponentName = opponent?.name || 'Opponent';
    const oppId = opponent?.id;

    // Check Toss
    const tossWonByTeam =
      (m.tossWinnerTeamId && (m.tossWinnerTeamId === team.id || m.tossWinnerTeamId === (isTeamA ? m.teamA?.id : m.teamB?.id))) ||
      false;

    if (tossWonByTeam) {
      tossesWon++;
      if (m.tossDecision === 'bat') choseBatCount++;
      else choseBowlCount++;
    } else {
      tossesLost++;
    }

    // Check who batted first
    // Default: If toss winner chose bat -> toss winner batted 1st; if chose bowl -> other team batted 1st
    let batFirst = false;
    if (m.innings1?.teamId) {
      batFirst = m.innings1.teamId === team.id || m.innings1.teamName === team.name;
    } else if (tossWonByTeam) {
      batFirst = m.tossDecision === 'bat';
    } else {
      batFirst = m.tossDecision === 'bowl';
    }

    // Determine Result
    const isTie = Boolean(m.result?.isTie);
    const winnerId = m.result?.winnerTeamId;
    const winnerName = m.result?.winnerTeamName?.trim().toLowerCase();
    const teamNameLower = team.name?.trim().toLowerCase();

    let isWin = false;
    if (!isTie) {
      if (winnerId) {
        isWin = winnerId === team.id || (isTeamA && winnerId === m.teamA?.id) || (!isTeamA && winnerId === m.teamB?.id);
      } else if (winnerName) {
        isWin = winnerName === teamNameLower || (isTeamA && winnerName === m.teamA?.name?.trim().toLowerCase());
      }
    }

    let badgeResult: 'W' | 'L' | 'T' | 'NR' = 'NR';
    if (isTie) {
      badgeResult = 'T';
      overallTied++;
    } else if (isWin) {
      badgeResult = 'W';
      overallWon++;
      if (tossWonByTeam) tossWinMatchWon++;
    } else {
      badgeResult = 'L';
      overallLost++;
    }

    // Batting & Bowling innings scores
    const myInnings = batFirst ? m.innings1 : m.innings2;
    const oppInnings = batFirst ? m.innings2 : m.innings1;

    const myRuns = myInnings?.totalRuns ?? 0;
    const myWkts = myInnings?.totalWickets ?? 0;
    const myOvers = `${myInnings?.oversCompleted ?? 0}.${myInnings?.ballsInCurrentOver ?? 0}`;
    const oppRuns = oppInnings?.totalRuns ?? 0;

    // Boundaries & balls
    if (myInnings) {
      totalTeamRuns += myRuns;
      const oversVal = (myInnings.oversCompleted || 0) * 6 + (myInnings.ballsInCurrentOver || 0);
      totalTeamLegalBalls += oversVal > 0 ? oversVal : 36;

      // Extract 4s and 6s from battingStats or balls
      if (myInnings.battingStats) {
        Object.values(myInnings.battingStats).forEach((b) => {
          totalFours += b.fours || 0;
          totalSixes += b.sixes || 0;
        });
      }

      // Track highest & lowest totals
      if (!highestTotal || myRuns > highestTotal.score) {
        highestTotal = {
          score: myRuns,
          wickets: myWkts,
          overs: myOvers,
          opponent: opponentName,
          date: m.date || 'Recent',
        };
      }
      if (!lowestTotal || (myRuns < lowestTotal.score && myRuns > 0)) {
        lowestTotal = {
          score: myRuns,
          wickets: myWkts,
          overs: myOvers,
          opponent: opponentName,
          date: m.date || 'Recent',
        };
      }
    }

    // Split stats
    if (batFirst) {
      batFirstMatches++;
      batFirstScores.push(myRuns);
      if (isWin) {
        batFirstWon++;
        if (!highestDefended || myRuns > highestDefended.score) {
          highestDefended = {
            score: myRuns,
            opponent: opponentName,
            margin: m.result?.summary || `Defended ${myRuns}`,
          };
        }
      } else if (isTie) {
        batFirstTied++;
      } else {
        batFirstLost++;
      }
    } else {
      chaseMatches++;
      chaseScores.push(myRuns);
      if (isWin) {
        chaseWon++;
        if (!highestChased || oppRuns > highestChased.target) {
          highestChased = {
            target: oppRuns,
            opponent: opponentName,
            margin: m.result?.summary || `Chased ${oppRuns + 1}`,
          };
        }
      } else if (isTie) {
        chaseTied++;
      } else {
        chaseLost++;
      }
    }

    // Score text
    const scoreText = `${myRuns}/${myWkts} (${myOvers} ov) vs ${oppRuns}/${oppInnings?.totalWickets || 0}`;
    const marginText = m.result?.summary || (isWin ? 'Won' : isTie ? 'Tied' : 'Lost');

    form.push({
      matchId: m.id,
      result: badgeResult,
      opponentName,
      opponentId: oppId,
      date: m.date || 'Recent',
      scoreText,
      summary: m.result?.summary || `${team.name} vs ${opponentName}`,
      marginText,
      batFirst,
    });
  }

  // Calculate Streak
  let currentStreak = 'No matches';
  if (form.length > 0) {
    const firstResult = form[0].result;
    let count = 0;
    for (const badge of form) {
      if (badge.result === firstResult) count++;
      else break;
    }
    if (firstResult === 'W') {
      currentStreak = `🔥 ${count} Win${count > 1 ? 's' : ''} in a row`;
    } else if (firstResult === 'L') {
      currentStreak = `📉 ${count} Loss${count > 1 ? 'es' : ''} in a row`;
    } else if (firstResult === 'T') {
      currentStreak = `🤝 ${count} Tie${count > 1 ? 's' : ''}`;
    }
  }

  const totalMatchesCount = last20Matches.length;
  const overallWinPct = totalMatchesCount > 0 ? Math.round((overallWon / totalMatchesCount) * 100) : 0;

  const avgBatFirst = batFirstScores.length > 0 ? Math.round(batFirstScores.reduce((a, b) => a + b, 0) / batFirstScores.length) : 0;
  const avgChase = chaseScores.length > 0 ? Math.round(chaseScores.reduce((a, b) => a + b, 0) / chaseScores.length) : 0;

  const batFirstWinPct = batFirstMatches > 0 ? Math.round((batFirstWon / batFirstMatches) * 100) : 0;
  const chaseWinPct = chaseMatches > 0 ? Math.round((chaseWon / chaseMatches) * 100) : 0;
  const tossWinConversionRate = tossesWon > 0 ? Math.round((tossWinMatchWon / tossesWon) * 100) : 0;

  const totalTeamOvers = totalTeamLegalBalls / 6;
  const averageRunRate = totalTeamOvers > 0 ? Number((totalTeamRuns / totalTeamOvers).toFixed(2)) : 0;

  return {
    team,
    totalMatches: relevantMatches.length,
    last20Matches,
    overall: {
      matches: totalMatchesCount,
      won: overallWon,
      lost: overallLost,
      tied: overallTied,
      winPercentage: overallWinPct,
      currentStreak,
      form,
    },
    batFirst: {
      matches: batFirstMatches,
      won: batFirstWon,
      lost: batFirstLost,
      tied: batFirstTied,
      winPercentage: batFirstWinPct,
      averageScore: avgBatFirst,
      highestScore: batFirstScores.length > 0 ? Math.max(...batFirstScores) : 0,
      lowestScore: batFirstScores.length > 0 ? Math.min(...batFirstScores) : 0,
      highestDefendedOrChased: highestDefended?.score,
    },
    chaseFirst: {
      matches: chaseMatches,
      won: chaseWon,
      lost: chaseLost,
      tied: chaseTied,
      winPercentage: chaseWinPct,
      averageScore: avgChase,
      highestScore: chaseScores.length > 0 ? Math.max(...chaseScores) : 0,
      lowestScore: chaseScores.length > 0 ? Math.min(...chaseScores) : 0,
      highestDefendedOrChased: highestChased?.target,
    },
    toss: {
      tossesWon,
      tossesLost,
      tossWinMatchWon,
      tossWinConversionRate,
      choseBatCount,
      choseBowlCount,
    },
    benchmarks: {
      highestTotal,
      lowestTotal,
      highestDefended,
      highestChased,
      totalSixes,
      totalFours,
      averageRunRate,
    },
  };
}

/**
 * Calculates Head to Head comparison stats between two teams
 */
export function calculateHeadToHead(teamA: Team, teamB: Team, allMatches: Match[] = []): HeadToHeadStats {
  const directMatches = (allMatches || []).filter((m) => {
    if (!m) return false;
    const aIn = isTeamInMatch(teamA, m);
    const bIn = isTeamInMatch(teamB, m);
    return aIn.isPresent && bIn.isPresent;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;

  let teamABatFirstWins = 0;
  let teamAChaseWins = 0;
  let teamBBatFirstWins = 0;
  let teamBChaseWins = 0;

  let teamAHighestScore = 0;
  let teamBHighestScore = 0;

  for (const m of directMatches) {
    const isTie = Boolean(m.result?.isTie);
    const winnerId = m.result?.winnerTeamId;
    const winnerName = m.result?.winnerTeamName?.trim().toLowerCase();

    let teamAWon = false;
    let teamBWon = false;

    if (isTie) {
      ties++;
    } else {
      if (winnerId === teamA.id || winnerName === teamA.name?.trim().toLowerCase()) {
        teamAWon = true;
        teamAWins++;
      } else if (winnerId === teamB.id || winnerName === teamB.name?.trim().toLowerCase()) {
        teamBWon = true;
        teamBWins++;
      }
    }

    // Determine who batted first
    const aBattedFirst = m.innings1?.teamId === teamA.id || m.innings1?.teamName === teamA.name;
    const aRuns = (aBattedFirst ? m.innings1?.totalRuns : m.innings2?.totalRuns) || 0;
    const bRuns = (aBattedFirst ? m.innings2?.totalRuns : m.innings1?.totalRuns) || 0;

    if (aRuns > teamAHighestScore) teamAHighestScore = aRuns;
    if (bRuns > teamBHighestScore) teamBHighestScore = bRuns;

    if (teamAWon) {
      if (aBattedFirst) teamABatFirstWins++;
      else teamAChaseWins++;
    } else if (teamBWon) {
      if (aBattedFirst) teamBChaseWins++;
      else teamBBatFirstWins++;
    }
  }

  const totalMatches = directMatches.length;
  const teamAWinPercentage = totalMatches > 0 ? Math.round((teamAWins / totalMatches) * 100) : 0;
  const teamBWinPercentage = totalMatches > 0 ? Math.round((teamBWins / totalMatches) * 100) : 0;

  return {
    teamA,
    teamB,
    totalMatches,
    teamAWins,
    teamBWins,
    ties,
    teamAWinPercentage,
    teamBWinPercentage,
    teamABatFirstWins,
    teamAChaseWins,
    teamBBatFirstWins,
    teamBChaseWins,
    teamAHighestScore,
    teamBHighestScore,
    matches: directMatches,
  };
}
