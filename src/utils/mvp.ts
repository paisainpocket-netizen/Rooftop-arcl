import { Match, Player, Innings } from '../types/cricket';

export interface MVPBreakdownLine {
  label: string;
  points: number;
}

export interface PlayerMVPScore {
  playerId: string;
  playerName: string;
  playerRole?: string;
  teamId: string;
  teamName: string;
  teamColor?: string;
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
  rank: number;
  battingSummary: string;
  bowlingSummary: string;
  fieldingSummary: string;
  runsScored: number;
  ballsFaced: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  wicketsTaken: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
  dotBalls: number;
  economy: number;
  avatar?: string;
  /** Point-by-point explanation shown in the MVP detail popup */
  breakdown: MVPBreakdownLine[];
}

interface PlayerAccumulator {
  player: Player;
  teamId: string;
  teamName: string;
  teamColor: string;
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  batted: boolean;
  wicketsTaken: number;
  legalBallsBowled: number;
  runsConceded: number;
  maidens: number;
  dotBalls: number;
  bowled: boolean;
  breakdown: MVPBreakdownLine[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function createEntry(
  player: Player,
  teamId: string,
  teamName: string,
  teamColor: string
): PlayerAccumulator {
  return {
    player,
    teamId,
    teamName,
    teamColor,
    battingPoints: 0,
    bowlingPoints: 0,
    fieldingPoints: 0,
    runsScored: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    batted: false,
    wicketsTaken: 0,
    legalBallsBowled: 0,
    runsConceded: 0,
    maidens: 0,
    dotBalls: 0,
    bowled: false,
    breakdown: [],
  };
}

// Same label across innings (Test matches) gets merged into one line.
function addLine(entry: PlayerAccumulator, label: string, points: number) {
  if (points <= 0) return;
  const existing = entry.breakdown.find((l) => l.label === label);
  if (existing) {
    existing.points += points;
  } else {
    entry.breakdown.push({ label, points });
  }
}

export function calculateMatchMVP(match: Match): PlayerMVPScore[] {
  const playerMap = new Map<string, PlayerAccumulator>();

  const teamA = match?.teamA || { id: 'team-a', name: 'Team A', shortName: 'TMA', color: '#10b981', players: [] };
  const teamB = match?.teamB || { id: 'team-b', name: 'Team B', shortName: 'TMB', color: '#f59e0b', players: [] };

  const squadPlayersA = match?.playingSquadA && match.playingSquadA.length > 0
    ? (teamA.players || []).filter((p) => match.playingSquadA?.includes(p.id) || (p.profileId && match.playingSquadA?.includes(p.profileId)))
    : (teamA.players || []);

  const squadPlayersB = match?.playingSquadB && match.playingSquadB.length > 0
    ? (teamB.players || []).filter((p) => match.playingSquadB?.includes(p.id) || (p.profileId && match.playingSquadB?.includes(p.profileId)))
    : (teamB.players || []);

  const allTeamPlayers = [
    ...squadPlayersA.map((p) => ({ p, teamId: teamA.id, teamName: teamA.name, teamColor: teamA.color || '#10b981' })),
    ...squadPlayersB.map((p) => ({ p, teamId: teamB.id, teamName: teamB.name, teamColor: teamB.color || '#f59e0b' })),
  ];

  for (const { p, teamId, teamName, teamColor } of allTeamPlayers) {
    if (!playerMap.has(p.id)) {
      playerMap.set(p.id, createEntry(p, teamId, teamName, teamColor));
    }
  }

  const inningsList: Innings[] = [
    match.innings1,
    match.innings2,
    match.innings3,
    match.innings4,
  ].filter(Boolean) as Innings[];

  for (const inn of inningsList) {
    // ---------- BATTING ----------
    for (const bStat of Object.values(inn.battingStats || {})) {
      if (!playerMap.has(bStat.playerId)) {
        playerMap.set(
          bStat.playerId,
          createEntry(
            {
              id: bStat.playerId,
              name: bStat.playerName,
              profileId: `p-${bStat.playerId.slice(0, 6)}`,
              role: 'batsman',
              battingStyle: 'Right-hand bat',
              bowlingStyle: 'Right-arm medium',
              stats: {} as any,
            },
            inn.teamId,
            inn.teamName,
            '#10b981'
          )
        );
      }

      const pEntry = playerMap.get(bStat.playerId)!;
      pEntry.runsScored += bStat.runs;
      pEntry.ballsFaced += bStat.balls;
      pEntry.fours += bStat.fours || 0;
      pEntry.sixes += bStat.sixes || 0;
      if (bStat.balls > 0 || bStat.runs > 0 || bStat.isOut) pEntry.batted = true;

      let bPts = 0;

      // Bat runs / 10
      if (bStat.runs > 0) {
        const pts = bStat.runs / 10;
        bPts += pts;
        addLine(pEntry, 'Bat Runs (runs ÷ 10)', pts);
      }
      // 50+ runs
      if (bStat.runs >= 50) {
        bPts += 1;
        addLine(pEntry, '50+ Runs bonus', 1);
      }
      // 100+ runs
      if (bStat.runs >= 100) {
        bPts += 1;
        addLine(pEntry, '100+ Runs bonus', 1);
      }
      // Strike rate 130+ (min 10 runs)
      if (bStat.runs >= 10 && bStat.strikeRate >= 130) {
        bPts += 1;
        addLine(pEntry, 'Strike Rate 130+ bonus', 1);
      }

      pEntry.battingPoints += bPts;
    }

    // ---------- BOWLING ----------
    for (const bwStat of Object.values(inn.bowlingStats || {})) {
      if (!playerMap.has(bwStat.playerId)) {
        playerMap.set(
          bwStat.playerId,
          createEntry(
            {
              id: bwStat.playerId,
              name: bwStat.playerName,
              profileId: `p-${bwStat.playerId.slice(0, 6)}`,
              role: 'bowler',
              battingStyle: 'Right-hand bat',
              bowlingStyle: 'Right-arm medium',
              stats: {} as any,
            },
            '',
            '',
            '#f59e0b'
          )
        );
      }

      const pEntry = playerMap.get(bwStat.playerId)!;
      const wkts = bwStat.wickets || 0;
      const maidens = bwStat.maidens || 0;

      pEntry.wicketsTaken += wkts;
      // Count in balls, convert to overs.balls at the end
      pEntry.legalBallsBowled += (bwStat.overs || 0) * 6 + (bwStat.balls || 0);
      pEntry.runsConceded += bwStat.runs || 0;
      pEntry.maidens += maidens;
      pEntry.dotBalls += bwStat.dots || 0;
      if ((bwStat.overs || 0) > 0 || (bwStat.balls || 0) > 0) pEntry.bowled = true;

      let bwPts = 0;

      // Wicket: 2 pts each
      if (wkts > 0) {
        bwPts += wkts * 2;
        addLine(pEntry, 'Wickets (2 pts each)', wkts * 2);
      }
      // 3 wickets
      if (wkts >= 3) {
        bwPts += 1;
        addLine(pEntry, '3 Wickets bonus', 1);
      }
      // 5 wickets
      if (wkts >= 5) {
        bwPts += 1;
        addLine(pEntry, '5 Wickets bonus', 1);
      }
      pEntry.bowlingPoints += bwPts;
    }

    // ---------- FIELDING ----------
    for (const ball of inn.balls || []) {
      if (ball.isWicket && ball.fielderId && playerMap.has(ball.fielderId)) {
        const fEntry = playerMap.get(ball.fielderId)!;
        if (ball.wicketType === 'caught' || ball.wicketType === 'wall_catch') {
          fEntry.fieldingPoints += 1;
          addLine(fEntry, 'Catches (1 pt each)', 1);
        } else if (ball.wicketType === 'stumped') {
          fEntry.fieldingPoints += 1;
          addLine(fEntry, 'Stumpings (1 pt each)', 1);
        } else if (ball.wicketType === 'runout') {
          fEntry.fieldingPoints += 1;
          addLine(fEntry, 'Run Outs (1 pt each)', 1);
        }
      }
    }
  }

  // ---------- BUILD FINAL ARRAY ----------
  const scores: PlayerMVPScore[] = Array.from(playerMap.values()).map((item) => {
    const total = round1(item.battingPoints + item.bowlingPoints + item.fieldingPoints);

    const strikeRate = item.ballsFaced > 0 ? (item.runsScored / item.ballsFaced) * 100 : 0;

    const bowlOvers = Math.floor(item.legalBallsBowled / 6);
    const bowlBalls = item.legalBallsBowled % 6;
    const oversBowled = Number(`${bowlOvers}.${bowlBalls}`);
    const economy = item.legalBallsBowled > 0
      ? Number(((item.runsConceded / item.legalBallsBowled) * 6).toFixed(2))
      : 0;

    const battingSummary = item.batted
      ? `${item.runsScored} (${item.ballsFaced}b, ${item.fours}x4, ${item.sixes}x6, SR: ${strikeRate.toFixed(1)})`
      : 'Did not bat';

    const bowlingSummary = item.bowled
      ? `${item.wicketsTaken}/${item.runsConceded} (${bowlOvers}.${bowlBalls} ov, ${item.maidens}M, ${item.dotBalls} dots, Eco: ${economy.toFixed(1)})`
      : 'Did not bowl';

    return {
      playerId: item.player.id,
      playerName: item.player.name,
      playerRole: item.player.role,
      teamId: item.teamId,
      teamName: item.teamName,
      teamColor: item.teamColor,
      battingPoints: round1(item.battingPoints),
      bowlingPoints: round1(item.bowlingPoints),
      fieldingPoints: round1(item.fieldingPoints),
      totalPoints: total,
      rank: 1,
      battingSummary,
      bowlingSummary,
      fieldingSummary: item.fieldingPoints > 0 ? `${item.fieldingPoints} pts` : '-',
      runsScored: item.runsScored,
      ballsFaced: item.ballsFaced,
      strikeRate,
      fours: item.fours,
      sixes: item.sixes,
      wicketsTaken: item.wicketsTaken,
      oversBowled,
      runsConceded: item.runsConceded,
      maidens: item.maidens,
      dotBalls: item.dotBalls,
      economy,
      avatar: item.player.avatar,
      breakdown: item.breakdown.map((l) => ({ label: l.label, points: round1(l.points) })),
    };
  });

  scores.sort((a, b) => b.totalPoints - a.totalPoints);
  scores.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return scores;
}

export function getRecommendedMOM(match: Match): PlayerMVPScore | null {
  const mvpList = calculateMatchMVP(match);
  if (mvpList.length === 0) return null;
  return mvpList[0];
}

export const MVP_POINTS_RULES = {
  batting: [
    { label: 'Bat Runs/10 - Min. 10 Runs', points: '1' },
    { label: '50+ Runs', points: '1' },
    { label: '100+ Runs', points: '1' },
    { label: 'Strike Rate 130+ - Min. 10 Runs', points: '1' },
  ],
  bowling: [
    { label: 'Wicket', points: '2' },
    { label: '3 Wickets', points: '1' },
    { label: '5 Wickets', points: '1' },
  ],
  fielding: [
    { label: 'Catch', points: '1' },
    { label: 'Stumping', points: '1' },
    { label: 'Run Out', points: '1' },
  ],
};
