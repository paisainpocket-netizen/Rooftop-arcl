import { Match, Team, Tournament, Player, PlayerStats } from '../types/cricket';

/**
 * Creates clean, empty 00 statistics for any player
 */
export const createZeroPlayerStats = (): PlayerStats => ({
  matches: 0,
  innings: 0,
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
  momAwards: 0,
});

/**
 * Starter players list: ONLY ARCL-001 (League Admin) with 00 stats.
 * All subsequent players are created on demand as ARCL-002, ARCL-003, etc.
 */
export const defaultPlayersList: Player[] = [
  {
    id: 'p1',
    profileId: 'ARCL-001',
    pin: '1234',
    isClaimed: true,
    name: 'Gurpreet Singh (Admin / Lalli)',
    jerseyNumber: 1,
    role: 'allrounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    stats: createZeroPlayerStats(),
    formatStats: {
      t10: createZeroPlayerStats(),
      t20: createZeroPlayerStats(),
      club: createZeroPlayerStats(),
      test: createZeroPlayerStats(),
    },
  },
];

export const defaultTeams: Team[] = [
  {
    id: 'team-rar',
    teamId: 'TEAM-001',
    profileId: 'TEAM-001',
    name: 'Ranjit Avenue Royals',
    shortName: 'RAR',
    city: 'Ranjit Avenue, Amritsar',
    color: '#3b82f6', // Blue
    logoIcon: '👑',
    players: [defaultPlayersList[0]],
  },
  {
    id: 'team-gtg',
    teamId: 'TEAM-002',
    profileId: 'TEAM-002',
    name: 'Golden Temple Gladiators',
    shortName: 'GTG',
    city: 'Heritage Street, Amritsar',
    color: '#eab308', // Gold
    logoIcon: '🦁',
    players: [],
  },
  {
    id: 'team-lrl',
    teamId: 'TEAM-003',
    profileId: 'TEAM-003',
    name: 'Lawrence Road Lions',
    shortName: 'LRL',
    city: 'Lawrence Road, Amritsar',
    color: '#ef4444', // Red
    logoIcon: '🔥',
    players: [],
  },
  {
    id: 'team-mb',
    teamId: 'TEAM-004',
    profileId: 'TEAM-004',
    name: 'Majitha Blasters',
    shortName: 'MBL',
    city: 'Majitha Road, Amritsar',
    color: '#10b981', // Emerald
    logoIcon: '⚡',
    players: [],
  },
];

export const defaultTournaments: Tournament[] = [
  {
    id: 'tour-arcl-2026',
    tournamentId: 'TRN-001',
    name: 'ARCL Super Rooftop League 2026',
    season: 'Season 1',
    trophyName: 'Golden Terrace Trophy',
    location: 'Amritsar Rooftop Arena',
    startDate: '2026-08-01',
    endDate: '2026-08-30',
    teams: ['team-rar', 'team-gtg', 'team-lrl', 'team-mb'],
    format: 'Round Robin + Knockout',
    status: 'ongoing',
    oversPerMatch: 6,
  },
];

export function createDefaultSampleMatch(): Match {
  const teamA = defaultTeams[0]; // Ranjit Avenue Royals
  const teamB = defaultTeams[1]; // Golden Temple Gladiators
  const player1 = defaultPlayersList[0]; // ARCL-001 Admin

  return {
    id: 'match-live-sample-1',
    name: 'RAR vs GTG - Match 1',
    tournamentId: 'tour-arcl-2026',
    tournamentName: 'ARCL Super Rooftop League 2026',
    format: 'limited_overs',
    matchFormat: 'limited_overs',
    teamA,
    teamB,
    playingSquadA: teamA.players.map((p) => p.id),
    playingSquadB: teamB.players.map((p) => p.id),
    captainA: player1.id,
    captainB: '',
    keeperA: player1.id,
    keeperB: '',
    tossWinnerTeamId: teamA.id,
    tossDecision: 'bat',
    status: 'live',
    currentInningsNumber: 1,
    totalOvers: 6,
    isFreeHit: false,
    venue: 'Ranjit Avenue Rooftop Box, Amritsar',
    date: new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      maxOvers: 6,
      ballsPerOver: 6,
      maxOversPerBowler: 2,
      allowDirectRoofOut: true,
      allowSingleWallCatch: true,
      freeHitOnNoBall: true,
      wideRuns: 1,
      noBallRuns: 1,
      lastManBattingAllowed: false,
      pitchType: 'Concrete Terrace',
      ballType: 'Tennis Heavy (Cosco)',
      venue: 'Ranjit Avenue Rooftop Box, Amritsar',
      date: new Date().toISOString().split('T')[0],
      matchType: 'ARCL T6',
    },
    currentStrikerId: player1.id,
    currentNonStrikerId: '',
    currentBowlerId: '',
    innings1: {
      teamId: teamA.id,
      teamName: teamA.name,
      totalRuns: 0,
      totalWickets: 0,
      oversCompleted: 0,
      ballsInCurrentOver: 0,
      isDeclared: false,
      extras: {
        wides: 0,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        penalty: 0,
        total: 0,
      },
      fallOfWickets: [],
      battingStats: {},
      bowlingStats: {},
      balls: [],
    },
  };
}
