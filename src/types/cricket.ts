export type PlayerRole = 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
export type BattingStyle = 'Right-hand bat' | 'Left-hand bat';
export type BowlingStyle = 'Right-arm fast' | 'Right-arm medium' | 'Right-arm spin' | 'Left-arm fast' | 'Left-arm spin';

export type ShotZone = 
  | 'cover'
  | 'point'
  | 'third_man'
  | 'fine_leg'
  | 'square_leg'
  | 'mid_wicket'
  | 'long_on'
  | 'straight'
  | 'long_off';

export interface PlayerStats {
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  thirties?: number; // 30+ scores for terrace cricket
  fifties: number;
  centuries: number;
  ducks?: number; // 0 dismissed
  highestScore: number;
  highestScoreNotOut: boolean;
  strikeRate: number;
  battingAverage: number;
  
  // Bowling
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  economy: number;
  bowlingAverage: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;

  // Fielding & Rooftop
  catches: number;
  runOuts: number;
  stumpings: number;
  directRoofOuts?: number;
  momAwards: number;
}

export interface Player {
  id: string;
  profileId: string; // e.g. "ARCL-001" or "ARCL-002"
  pin?: string; // 4-digit PIN e.g. "1234"
  isClaimed?: boolean; // true once claimed/logged in by user
  creatorId?: string; // id of user/captain who created this player profile
  creatorProfileId?: string; // profileId of creator e.g. "ARCL-001"
  creatorName?: string; // name of creator
  name: string;
  jerseyNumber?: number;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  avatar?: string;
  isCustom?: boolean;
  phoneNumber?: string;
  stats: PlayerStats;
  formatStats?: {
    t10?: PlayerStats;
    t20?: PlayerStats;
    club?: PlayerStats;
    test?: PlayerStats;
  };
}

export interface Team {
  id: string;
  teamId?: string; // Auto-sequential Team ID (e.g. 'TEAM-001')
  profileId?: string; // Optional alias
  name: string;
  shortName: string;
  city: string;
  color: string;
  logoIcon?: string;
  logoUrl?: string; // Custom team logo photo/badge URL
  bannerUrl?: string;
  players: Player[];
  isCustom?: boolean;
  creatorId?: string;
  creatorProfileId?: string;
  creatorName?: string;
}

export type ExtraType = 'none' | 'wide' | 'noBall' | 'bye' | 'legBye' | 'penalty';

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'runout'
  | 'stumped'
  | 'hitwicket'
  | 'direct_roof_out'
  | 'wall_catch'
  | 'retired'
  | 'retired_hurt'
  | 'timed_out';

export interface BallOutcome {
  id: string;
  ballNumber: number; // 1 to 6 in over
  overNumber: number; // 0-indexed (e.g. 0.1, 0.2)
  legalBallNumber: number; // Total legal deliveries so far in innings
  displayOver: string; // e.g. "2.4"
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsBat: number;
  extraRuns: number;
  extraType: ExtraType;
  isLegalDelivery: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  dismissedPlayerName?: string;
  fielderId?: string;
  fielderName?: string;
  shotZone?: ShotZone;
  commentary: string;
  isFour: boolean;
  isSix: boolean;
  isFreeHit: boolean;
  nextBallIsFreeHit: boolean;
  timestamp: number;
}

export interface BatsmanStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  isRetiredHurt?: boolean;
  dismissalText?: string;
  battingOrder: number;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number; // completed overs e.g. 2
  balls: number; // remaining balls e.g. 3 (meaning 2.3 overs)
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  over: string;
  playerId: string;
  playerName: string;
}

export interface Innings {
  teamId: string;
  teamName: string;
  totalRuns: number;
  totalWickets: number;
  oversCompleted: number; // integer overs
  ballsInCurrentOver: number; // 0 to 5
  balls: BallOutcome[];
  battingStats: { [playerId: string]: BatsmanStats };
  bowlingStats: { [playerId: string]: BowlerStats };
  fallOfWickets: FallOfWicket[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
  isDeclared?: boolean;
}

export interface MatchSettings {
  maxOvers: number;
  ballsPerOver: number;
  maxOversPerBowler: number;
  playersPerSide?: number;
  maxWickets?: number;
  allowDirectRoofOut: boolean; // Direct roof boundary is OUT
  allowSingleWallCatch: boolean; // 1 wall bounce catch is OUT
  freeHitOnNoBall: boolean;
  wideRuns: number;
  noBallRuns: number;
  lastManBattingAllowed: boolean;
  pitchType: 'Concrete Terrace' | 'Turf Mat' | 'Tile Roof' | 'Box Net';
  ballType: 'Tennis Heavy (Cosco)' | 'Tennis Light' | 'Leather' | 'Tape Ball' | 'Rubber Ball';
  venue: string;
  date: string;
  matchType: 'ARCL T6' | 'ARCL T10' | 'T20' | 'Test Match (4 Innings)' | 'Custom Terrace Match';
  matchFormat?: 'limited_overs' | 'test';
  oversPerInningsInTest?: number;
}

export interface MatchResult {
  winnerTeamId?: string;
  winnerTeamName?: string;
  isTie?: boolean;
  isDraw?: boolean;
  marginRuns?: number;
  marginWickets?: number;
  marginInnings?: boolean;
  playerOfTheMatch?: {
    playerId: string;
    playerName: string;
    teamName: string;
    reason: string;
  };
  summary: string;
}

export interface Match {
  id: string;
  name: string;
  creatorId?: string; // ID of player who created the match
  creatorProfileId?: string; // e.g. "ARCL-001" or "ARCL-002"
  creatorName?: string;
  delegatedScorerProfileId?: string; // Friend's Profile ID authorized to score if phone battery is low
  delegatedScorerName?: string;
  tournamentId?: string;
  tournamentName?: string;
  // Which stage of the tournament this match belongs to. Undefined/'league'
  // means a normal points-table match; anything else is a knockout/playoff
  // fixture and is excluded from points table & NRR calculations.
  matchStage?: 'league' | 'eliminator' | 'qualifier1' | 'qualifier2' | 'semifinal1' | 'semifinal2' | 'final';
  format?: 'limited_overs' | 'test';
  matchFormat?: 'limited_overs' | 'test';
  teamA: Team;
  teamB: Team;
  playingSquadA: string[]; // player ids
  playingSquadB: string[]; // player ids
  captainA?: string;
  captainB?: string;
  viceCaptainA?: string;
  viceCaptainB?: string;
  keeperA?: string;
  keeperB?: string;
  tossWinnerTeamId: string;
  tossDecision: 'bat' | 'bowl';
  status: 'setup' | 'live' | 'innings_break' | 'completed' | 'abandoned';
  currentInningsNumber: 1 | 2 | 3 | 4;
  // Test match follow-on: set once the leading team's captain decides,
  // after innings 2 ends, whether to bat again normally or enforce the
  // follow-on (make the trailing team bat again immediately in innings 3).
  followOnDecision?: 'bat_again' | 'enforce_follow_on';
  // True right after innings 2 ends in a test match where the team that
  // batted first has a lead — blocks scoring until the captain decides.
  awaitingFollowOnDecision?: boolean;
  innings1: Innings;
  innings2?: Innings;
  innings3?: Innings;
  innings4?: Innings;
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  totalOvers: number;
  targetRuns?: number;
  isFreeHit: boolean;
  settings: MatchSettings;
  result?: MatchResult;
  venue: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

export interface PointsTableRow {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number; // Net Run Rate
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
  form: ('W' | 'L' | 'T' | 'NR')[];
}

export type TeamTournamentStatus = 'none' | 'qualified' | 'eliminated' | 'semi_final' | 'final' | 'champion';

export interface Tournament {
  id: string;
  tournamentId?: string; // Sequential ID (e.g. "TRN-001")
  name: string;
  season: string;
  bannerImage?: string;
  location: string;
  startDate: string;
  endDate: string;
  teams: string[]; // teamIds
  teamStatuses?: { [teamId: string]: TeamTournamentStatus }; // e.g. 'qualified', 'eliminated', 'semi_final', 'final', 'champion'
  format: 'Round Robin + Knockout' | 'League' | 'Knockout';
  status: 'upcoming' | 'ongoing' | 'completed';
  trophyName: string;
  oversPerMatch: number;
  creatorId?: string;
  creatorProfileId?: string;
  creatorName?: string;
}
