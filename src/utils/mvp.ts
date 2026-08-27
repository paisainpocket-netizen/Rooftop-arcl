import { Match, Player, Innings } from '../types/cricket';

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
}

export function calculateMatchMVP(match: Match): PlayerMVPScore[] {
  const playerMap = new Map<string, {
    player: Player;
    teamId: string;
    teamName: string;
    teamColor: string;
    battingPoints: number;
    bowlingPoints: number;
    fieldingPoints: number;
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
  }>();

  // Populate players from both teams (strictly respecting playing squads)
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
      playerMap.set(p.id, {
        player: p,
        teamId,
        teamName,
        teamColor,
        battingPoints: 0,
        bowlingPoints: 0,
        fieldingPoints: 0,
        battingSummary: 'Did not bat',
        bowlingSummary: 'Did not bowl',
        fieldingSummary: '-',
        runsScored: 0,
        ballsFaced: 0,
        strikeRate: 0,
        fours: 0,
        sixes: 0,
        wicketsTaken: 0,
        oversBowled: 0,
        runsConceded: 0,
        maidens: 0,
        dotBalls: 0,
        economy: 0,
      });
    }
  }

  const inningsList: Innings[] = [
    match.innings1,
    match.innings2,
    match.innings3,
    match.innings4,
  ].filter(Boolean) as Innings[];

  // Accumulate Batting and Bowling from all innings
  for (const inn of inningsList) {
    // Batting stats
    for (const bStat of Object.values(inn.battingStats || {})) {
      if (!playerMap.has(bStat.playerId)) {
        playerMap.set(bStat.playerId, {
          player: {
            id: bStat.playerId,
            name: bStat.playerName,
            profileId: `p-${bStat.playerId.slice(0, 6)}`,
            role: 'batsman',
            battingStyle: 'Right-hand bat',
            bowlingStyle: 'Right-arm medium',
            stats: {} as any,
          },
          teamId: inn.teamId,
          teamName: inn.teamName,
          teamColor: '#10b981',
          battingPoints: 0,
          bowlingPoints: 0,
          fieldingPoints: 0,
          battingSummary: '',
          bowlingSummary: '',
          fieldingSummary: '-',
          runsScored: 0,
          ballsFaced: 0,
          strikeRate: 0,
          fours: 0,
          sixes: 0,
          wicketsTaken: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          dotBalls: 0,
          economy: 0,
        });
      }

      const pEntry = playerMap.get(bStat.playerId)!;
      pEntry.runsScored += bStat.runs;
      pEntry.ballsFaced += bStat.balls;
      pEntry.fours += (bStat.fours || 0);
      pEntry.sixes += (bStat.sixes || 0);
      pEntry.strikeRate = pEntry.ballsFaced > 0 ? (pEntry.runsScored / pEntry.ballsFaced) * 100 : 0;

      let bPts = 0;
      // Bat Runs / 10 (e.g. 54 runs = 5.4 pts, 10 runs = 1.0 pt)
      if (bStat.runs > 0) {
        bPts += bStat.runs / 10;
      }
      // 50+ Runs (1 bonus pt)
      if (bStat.runs >= 50) {
        bPts += 1;
      }
      // 100+ Runs (1 bonus pt)
      if (bStat.runs >= 100) {
        bPts += 1;
      }
      // Strike Rate 130+ - Min. 10 Runs (1 bonus pt)
      if (bStat.runs >= 10 && bStat.strikeRate >= 130) {
        bPts += 1;
      }

      pEntry.battingPoints += bPts;
      pEntry.battingSummary = `${bStat.runs} (${bStat.balls}b, ${bStat.fours}x4, ${bStat.sixes}x6, SR: ${bStat.strikeRate.toFixed(1)})`;
    }

    // Bowling stats
    for (const bwStat of Object.values(inn.bowlingStats || {})) {
      if (!playerMap.has(bwStat.playerId)) {
        playerMap.set(bwStat.playerId, {
          player: {
            id: bwStat.playerId,
            name: bwStat.playerName,
            profileId: `p-${bwStat.playerId.slice(0, 6)}`,
            role: 'bowler',
            battingStyle: 'Right-hand bat',
            bowlingStyle: 'Right-arm medium',
            stats: {} as any,
          },
          teamId: '',
          teamName: '',
          teamColor: '#f59e0b',
          battingPoints: 0,
          bowlingPoints: 0,
          fieldingPoints: 0,
          battingSummary: '-',
          bowlingSummary: '',
          fieldingSummary: '-',
          runsScored: 0,
          ballsFaced: 0,
          strikeRate: 0,
          fours: 0,
          sixes: 0,
          wicketsTaken: 0,
          oversBowled: 0,
          runsConceded: 0,
          maidens: 0,
          dotBalls: 0,
          economy: 0,
        });
      }

      const pEntry = playerMap.get(bwStat.playerId)!;
      pEntry.wicketsTaken += (bwStat.wickets || 0);
      pEntry.oversBowled += Number(`${bwStat.overs}.${bwStat.balls}`);
      pEntry.runsConceded += (bwStat.runs || 0);
      pEntry.maidens += (bwStat.maidens || 0);
      pEntry.dotBalls += (bwStat.dots || 0);
      pEntry.economy = bwStat.economy || 0;

      let bwPts = 0;
      // Wicket: 2 pts per wicket
      bwPts += (bwStat.wickets || 0) * 2;
      // 3 Wickets (1 bonus pt)
      if (bwStat.wickets >= 3) bwPts += 1;
      // 5 Wickets (1 bonus pt)
      if (bwStat.wickets >= 5) bwPts += 1;
      // Maiden over (1 pt)
      bwPts += (bwStat.maidens || 0) * 1;

      pEntry.bowlingPoints += bwPts;
      pEntry.bowlingSummary = `${bwStat.wickets}/${bwStat.runs} (${bwStat.overs}.${bwStat.balls} ov, ${bwStat.maidens}M, ${bwStat.dots} dots, Eco: ${bwStat.economy.toFixed(1)})`;
    }

    // Fielding (Catches, Stumpings, Runouts from ball records)
    for (const ball of inn.balls || []) {
      if (ball.isWicket && ball.fielderId) {
        if (playerMap.has(ball.fielderId)) {
          const fEntry = playerMap.get(ball.fielderId)!;
          if (ball.wicketType === 'caught' || ball.wicketType === 'wall_catch') {
            // Catch: 1 pt
            fEntry.fieldingPoints += 1;
          } else if (ball.wicketType === 'stumped') {
            // Stumping: 1 pt
            fEntry.fieldingPoints += 1;
          } else if (ball.wicketType === 'runout') {
            // Run Out: 1 pt
            fEntry.fieldingPoints += 1;
          }
        }
      }
    }
  }

  // Convert to sorted MVP array
  const scores: PlayerMVPScore[] = Array.from(playerMap.values()).map((item) => {
    const total = Math.round((item.battingPoints + item.bowlingPoints + item.fieldingPoints) * 10) / 10;
    return {
      playerId: item.player.id,
      playerName: item.player.name,
      playerRole: item.player.role,
      teamId: item.teamId,
      teamName: item.teamName,
      teamColor: item.teamColor,
      battingPoints: Math.round(item.battingPoints * 10) / 10,
      bowlingPoints: Math.round(item.bowlingPoints * 10) / 10,
      fieldingPoints: Math.round(item.fieldingPoints * 10) / 10,
      totalPoints: total,
      rank: 1,
      battingSummary: item.battingSummary,
      bowlingSummary: item.bowlingSummary,
      fieldingSummary: item.fieldingPoints > 0 ? `${item.fieldingPoints} pts` : '-',
      runsScored: item.runsScored,
      ballsFaced: item.ballsFaced,
      strikeRate: item.strikeRate,
      fours: item.fours,
      sixes: item.sixes,
      wicketsTaken: item.wicketsTaken,
      oversBowled: item.oversBowled,
      runsConceded: item.runsConceded,
      maidens: item.maidens,
      dotBalls: item.dotBalls,
      economy: item.economy,
      avatar: item.player.avatar,
    };
  });

  // Sort descending by totalPoints
  scores.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign ranks
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
