import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Match,
  BallOutcome,
  ExtraType,
  WicketType,
  BatsmanStats,
  BowlerStats,
  Innings,
  Player,
  ShotZone,
} from '../types/cricket';
import { cricketAudio } from '../utils/audio';
import {
  generateCommentary,
  getPressureBatsmanText,
  getPressureBowlerText,
  getHatTrickText,
  getMaidenOverText,
} from '../utils/commentary';
import { calculateMatchMVP, getRecommendedMOM, type PlayerMVPScore } from '../utils/mvp';
import { PointsSystemModal } from './PointsSystemModal';
import { WagonWheelModal } from './WagonWheelModal';
import { WagonWheelView } from './WagonWheelView';
import confetti from 'canvas-confetti';
import {
  Settings,
  RotateCcw,
  User,
  Users,
  Share2,
  FileText,
  AlertTriangle,
  ArrowRightLeft,
  ArrowLeft,
  Flame,
  Shield,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Trash2,
  Edit3,
  Flag,
  CheckCircle2,
  X,
  Award,
  HelpCircle,
  TrendingUp,
  BarChart3,
  ListOrdered,
  Plus,
  Target,
  Compass,
  BatteryMedium,
  UserCheck,
  Lock,
  Unlock,
  Key,
  Eye,
  Trophy,
} from 'lucide-react';

interface LiveMatchScorerProps {
  match: Match;
  onUpdateMatch: (match: Match) => void;
  onOpenScorecard: () => void;
  onOpenShareCard: () => void;
  onOpenSquadModal: () => void;
  onDeleteMatch: () => void;
  isDarkMode: boolean;
  loggedInPlayer?: Player | null;
  allPlayers?: Player[];
  onOpenLoginModal?: () => void;
  onBackToFeed?: () => void;
}

// Helper function for accurate ordinal text (1st, 2nd, 3rd, 4th)
const formatInningsOrdinal = (num: number, isShort: boolean = false): string => {
  if (num === 1) return isShort ? '1st Inn' : '1st Innings';
  if (num === 2) return isShort ? '2nd Inn' : '2nd Innings';
  if (num === 3) return isShort ? '3rd Inn' : '3rd Innings';
  if (num === 4) return isShort ? '4th Inn' : '4th Innings';
  return isShort ? `${num}th Inn` : `${num}th Innings`;
};

export const LiveMatchScorer: React.FC<LiveMatchScorerProps> = ({
  match,
  onUpdateMatch,
  onOpenScorecard,
  onOpenShareCard,
  onOpenSquadModal,
  onDeleteMatch,
  isDarkMode,
  loggedInPlayer,
  allPlayers = [],
  onOpenLoginModal,
  onBackToFeed,
}) => {
  const [centreTab, setCentreTab] = useState<'scoring' | 'scorecard' | 'wheel' | 'stats' | 'superstars' | 'balls' | 'squads'>(
    () => (match.status === 'completed' ? 'scorecard' : 'scoring')
  );

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => cricketAudio.getIsVoiceEnabled());
  const [commentaryLang, setCommentaryLang] = useState<'pa' | 'hi' | 'en'>(() => cricketAudio.getCommentaryLanguage());

  const [isWagonWheelModalOpen, setIsWagonWheelModalOpen] = useState(false);
  const [pendingWagonBall, setPendingWagonBall] = useState<{
    runsBat: number;
    extraType: ExtraType;
    extraRunsVal: number;
    isWicket: boolean;
    wicketDetails?: {
      wicketType: WicketType;
      dismissedPlayerId: string;
      dismissedPlayerName: string;
      fielderId?: string;
      fielderName?: string;
    };
  } | null>(null);

  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('caught');
  const [dismissedRole, setDismissedRole] = useState<'striker' | 'nonStriker'>('striker');
  const [fielderId, setFielderId] = useState<string>('');
  const [isBowlerModalOpen, setIsBowlerModalOpen] = useState(false);
  // Point 3: all-out confirmation (ball is held here until scorer confirms)
  const [pendingAllOut, setPendingAllOut] = useState<any[] | null>(null);
  const skipAllOutConfirmRef = useRef(false);
  const [isDeclareConfirmOpen, setIsDeclareConfirmOpen] = useState(false);
  const [activeExtraPanel, setActiveExtraPanel] = useState<'wide' | 'noBall' | null>(null);
  const [newInningsStrikerId, setNewInningsStrikerId] = useState('');
  const [newInningsNonStrikerId, setNewInningsNonStrikerId] = useState('');
  const [newInningsBowlerId, setNewInningsBowlerId] = useState('');
  const [confirmedInningsSetupFor, setConfirmedInningsSetupFor] = useState<number | null>(null);
  const [isBatsmanModalOpen, setIsBatsmanModalOpen] = useState(false);
  const [batsmanModalRole, setBatsmanModalRole] = useState<'striker' | 'nonStriker'>('striker');
  const [isCustomRunsModalOpen, setIsCustomRunsModalOpen] = useState(false);
  const [customRunsValue, setCustomRunsValue] = useState<number>(5);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(match?.teamA?.id || '');
  const [selectedMomId, setSelectedMomId] = useState<string>('');
  const [isMomModalOpen, setIsMomModalOpen] = useState(false);
  const [customResultSummary, setCustomResultSummary] = useState<string>('');
  const [showMvpRulesModal, setShowMvpRulesModal] = useState(false);
  const [mvpFilterTab, setMvpFilterTab] = useState<'best_economy' | 'most_maidens' | 'bowl_dots' | 'mvp' | 'top_scorers' | 'most_wickets'>('mvp');
  const [selectedBallDetail, setSelectedBallDetail] = useState<BallOutcome | null>(null);
  const [mvpDetailFor, setMvpDetailFor] = useState<PlayerMVPScore | null>(null);

  const [viewInningsNum, setViewInningsNum] = useState<number>(match.currentInningsNumber || 1);

  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [delegateSearchQuery, setDelegateSearchQuery] = useState('');
  const [delegateSuccessMsg, setDelegateSuccessMsg] = useState<string | null>(null);
  const [delegateErrorMsg, setDelegateErrorMsg] = useState<string | null>(null);

  const isAdminUser = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const isCreator = Boolean(
    loggedInPlayer &&
    ((match.creatorId && match.creatorId === loggedInPlayer.id) ||
     (match.creatorProfileId && match.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
     (!match.creatorId && !match.creatorProfileId && isAdminUser))
  );

  const isDelegatedScorer = Boolean(
    loggedInPlayer &&
    match.delegatedScorerProfileId &&
    (match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
     match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase() ||
     (loggedInPlayer.phoneNumber && match.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.phoneNumber.toLowerCase()))
  );

  const canScore = Boolean(isCreator || isDelegatedScorer || isAdminUser);
  const canDelete = Boolean(isCreator || isAdminUser);
  const canDelegate = Boolean(isCreator || isAdminUser);

  const isTestMatch = match.matchFormat === 'test' || match.settings.matchType === 'Test Match (4 Innings)';
  const currentInningsNum = match.currentInningsNumber || 1;

  const getCurrentInnings = (): Innings => {
    if (currentInningsNum === 1) return match.innings1;
    if (currentInningsNum === 2) return match.innings2;
    if (currentInningsNum === 3 && match.innings3) return match.innings3;
    if (currentInningsNum === 4 && match.innings4) return match.innings4;
    return match.innings1;
  };

  const currentInnings = getCurrentInnings();

  const getDisplayInnings = (num: number): Innings => {
    if (num === 1) return match.innings1;
    if (num === 2) return match.innings2;
    if (num === 3 && match.innings3) return match.innings3;
    if (num === 4 && match.innings4) return match.innings4;
    return match.innings1;
  };

  const displayInnings = getDisplayInnings(viewInningsNum);

  const playingPlayersA = useMemo(() => {
    if (match.playingSquadA && match.playingSquadA.length > 0) {
      const filtered = match?.teamA?.players?.filter(
        (p) => match.playingSquadA?.includes(p.id) || (p.profileId && match.playingSquadA?.includes(p.profileId))
      );
      if (filtered && filtered.length > 0) return filtered;
    }
    return match?.teamA?.players || [];
  }, [match.playingSquadA, match?.teamA?.players]);

  const playingPlayersB = useMemo(() => {
    if (match.playingSquadB && match.playingSquadB.length > 0) {
      const filtered = match?.teamB?.players?.filter(
        (p) => match.playingSquadB?.includes(p.id) || (p.profileId && match.playingSquadB?.includes(p.profileId))
      );
      if (filtered && filtered.length > 0) return filtered;
    }
    return match?.teamB?.players || [];
  }, [match.playingSquadB, match?.teamB?.players]);


  const teamA = match?.teamA || { id: 'team-a', name: 'Team A', shortName: 'TMA', color: '#10b981', players: [] };
  const teamB = match?.teamB || { id: 'team-b', name: 'Team B', shortName: 'TMB', color: '#f59e0b', players: [] };

  const getTeamsForInningsNum = (innNum: number) => {
    const isTeamABattingFirst =
      match?.tossWinnerTeamId === teamA.id
        ? match?.tossDecision === 'bat'
        : match?.tossDecision === 'bowl';

    const isFollowOnEnforced = match?.followOnDecision === 'enforce_follow_on';
    let isTeamABatting: boolean;
    if (innNum === 1) {
      isTeamABatting = isTeamABattingFirst;
    } else if (innNum === 2) {
      isTeamABatting = !isTeamABattingFirst;
    } else if (innNum === 3) {
      isTeamABatting = isFollowOnEnforced ? !isTeamABattingFirst : isTeamABattingFirst;
    } else {
      isTeamABatting = isFollowOnEnforced ? isTeamABattingFirst : !isTeamABattingFirst;
    }

    return {
      battingTeam: isTeamABatting ? teamA : teamB,
      bowlingTeam: isTeamABatting ? teamB : teamA,
      battingSquad: isTeamABatting ? playingPlayersA : playingPlayersB,
      bowlingSquad: isTeamABatting ? playingPlayersB : playingPlayersA,
    };
  };

  const { battingTeam, bowlingTeam, battingSquad, bowlingSquad } = getTeamsForInningsNum(currentInningsNum);
  const displayTeams = getTeamsForInningsNum(viewInningsNum);

  // Point 4: "Last man stands" - the last batsman can bat alone, so all-out = every player out.
  const lastManStands = !!match.settings?.lastManBattingAllowed;
  const maxWicketsForTeam = lastManStands
    ? Math.max(1, battingSquad.length)
    : Math.max(1, battingSquad.length - 1);
  const isTeamAllOut = battingSquad.length > 1 && currentInnings.totalWickets >= maxWicketsForTeam;

  const needsNewInningsSetup =
    currentInningsNum > 1 &&
    (currentInnings?.balls?.length || 0) === 0 &&
    match.status !== 'completed' &&
    confirmedInningsSetupFor !== currentInningsNum;

  // Point 4 Fix: All-out hone par striker/non-striker ID blank nahi hoti,
  // safe fallback ke liye current id ya pehla player hi rakha jata hai.
  const aliveBatsmen = lastManStands
    ? battingSquad.filter((p) => !currentInnings?.battingStats?.[p.id]?.isOut)
    : [];
  const isSoloBatting = lastManStands && aliveBatsmen.length === 1 && battingSquad.length > 1;

  const striker = isSoloBatting
    ? aliveBatsmen[0]
    : battingSquad.find((p) => p?.id === match?.currentStrikerId) || battingSquad[0];

  const nonStriker = isSoloBatting
    ? undefined
    : battingSquad.find((p) => p?.id === match?.currentNonStrikerId && p?.id !== striker?.id) || 
      battingSquad.find((p) => p?.id !== striker?.id) || 
      battingSquad[0];

  const bowler = bowlingSquad.find((p) => p?.id === match?.currentBowlerId) || bowlingSquad[0];

  const strikerStats: BatsmanStats = (striker && currentInnings?.battingStats && currentInnings.battingStats[striker.id]) || {
    playerId: striker?.id || 'p1',
    playerName: striker?.name || 'Striker',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    battingOrder: 1,
  };

  const nonStrikerStats: BatsmanStats = (nonStriker && currentInnings?.battingStats && currentInnings.battingStats[nonStriker.id]) || {
    playerId: nonStriker?.id || 'p2',
    playerName: nonStriker?.name || 'Non-Striker',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    battingOrder: 2,
  };

  const bowlerStats: BowlerStats = (bowler && currentInnings?.bowlingStats && currentInnings.bowlingStats[bowler.id]) || {
    playerId: bowler?.id || 'b1',
    playerName: bowler?.name || 'Bowler',
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

  const totalLegalBalls = currentInnings.oversCompleted * 6 + currentInnings.ballsInCurrentOver;
  const currentOversFloat = currentInnings.oversCompleted + currentInnings.ballsInCurrentOver / 6;
  const currentRunRate = currentOversFloat > 0 ? (currentInnings.totalRuns / currentOversFloat).toFixed(2) : '0.00';

  const currentPartnershipRuns = (striker ? strikerStats.runs : 0) + (nonStriker ? nonStrikerStats.runs : 0);
  const currentPartnershipBalls = (striker ? strikerStats.balls : 0) + (nonStriker ? nonStrikerStats.balls : 0);

  const inn1Runs = match.innings1?.totalRuns || 0;
  const inn2Runs = match.innings2?.totalRuns || 0;

  let testLeadTrailText = '';
  let testTargetRuns: number | undefined = undefined;

  if (isTestMatch) {
    if (currentInningsNum === 2) {
      const diff = inn1Runs - currentInnings.totalRuns;
      if (diff > 0) {
        testLeadTrailText = `${battingTeam.name} trails by ${diff} runs`;
      } else if (diff < 0) {
        testLeadTrailText = `${battingTeam.name} leads by ${Math.abs(diff)} runs`;
      } else {
        testLeadTrailText = `Scores Level`;
      }
    } else if (currentInningsNum === 3) {
      const isFollowOn = match.followOnDecision === 'enforce_follow_on';
      const battingTeamTotalSoFar = (isFollowOn ? inn2Runs : inn1Runs) + currentInnings.totalRuns;
      const bowlingTeamTotal = isFollowOn ? inn1Runs : inn2Runs;
      const diff = battingTeamTotalSoFar - bowlingTeamTotal;

      if (diff < 0) {
        testLeadTrailText = `${battingTeam.name} trails by ${Math.abs(diff)} runs`;
      } else if (diff > 0) {
        testLeadTrailText = `${battingTeam.name} leads by ${diff} runs`;
      } else {
        testLeadTrailText = `Scores Level`;
      }
    } else if (currentInningsNum === 4) {
      const isFollowOn = match.followOnDecision === 'enforce_follow_on';
      const leaderTotal = (isFollowOn ? inn2Runs : inn1Runs) + (match.innings3?.totalRuns || 0);
      const target = leaderTotal - (isFollowOn ? inn1Runs : inn2Runs) + 1;
      testTargetRuns = target;
      const diff = target - currentInnings.totalRuns;
      testLeadTrailText = diff > 0 ? `${battingTeam.name} needs ${diff} runs to win` : `${battingTeam.name} won!`;
    }
  }

  const targetRuns = isTestMatch ? testTargetRuns : (match.targetRuns || (match.innings1 ? match.innings1.totalRuns + 1 : undefined));
  const remainingRuns = targetRuns ? targetRuns - currentInnings.totalRuns : 0;
  const remainingBalls = match.totalOvers * 6 - totalLegalBalls;
  const requiredRunRate = remainingBalls > 0 && remainingRuns > 0 ? ((remainingRuns / remainingBalls) * 6).toFixed(2) : '0.00';

  const lastProcessedBallIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (canScore) return;
    if (!voiceEnabled) return;

    const ballsList = currentInnings?.balls || [];
    if (ballsList.length === 0) return;

    const latestBall = ballsList[ballsList.length - 1];
    
    if (!lastProcessedBallIdRef.current) {
      lastProcessedBallIdRef.current = latestBall.id;
      return;
    }

    if (latestBall.id !== lastProcessedBallIdRef.current) {
      lastProcessedBallIdRef.current = latestBall.id;

      let eventType: 'dot' | 'single' | 'two' | 'three' | 'four' | 'six' | 'wicket' | 'wide' | 'noball' | 'direct_roof' | 'wall_catch' | 'retired_hurt' = 'dot';
      
      if (latestBall.isWicket) {
        if (latestBall.wicketType === 'direct_roof_out') eventType = 'direct_roof';
        else if (latestBall.wicketType === 'wall_catch') eventType = 'wall_catch';
        else if (latestBall.wicketType === 'retired_hurt') eventType = 'retired_hurt';
        else eventType = 'wicket';
      } else if (latestBall.extraType === 'wide') {
        eventType = 'wide';
      } else if (latestBall.extraType === 'noBall') {
        eventType = 'noball';
      } else {
        if (latestBall.runsBat === 0) eventType = 'dot';
        else if (latestBall.runsBat === 1) eventType = 'single';
        else if (latestBall.runsBat === 2) eventType = 'two';
        else if (latestBall.runsBat === 3) eventType = 'three';
        else if (latestBall.runsBat === 4) eventType = 'four';
        else if (latestBall.runsBat === 6) eventType = 'six';
        else eventType = 'single';
      }

      cricketAudio.announceBallEvent({
        eventType,
        batterName: latestBall.strikerName || 'Batsman',
        bowlerName: latestBall.bowlerName || 'Bowler',
        runs: latestBall.runsBat + latestBall.extraRuns,
        wicketType: latestBall.wicketType,
      });

      if (latestBall.isWicket) {
        if (latestBall.wicketType === 'direct_roof_out') {
          cricketAudio.playRoofOut();
        } else if (latestBall.wicketType !== 'retired_hurt') {
          cricketAudio.playWicket();
        }
      } else if (latestBall.isSix) {
        cricketAudio.playSix();
        launchCelebration();
      } else if (latestBall.isFour) {
        cricketAudio.playFour();
      } else {
        cricketAudio.playBatHit();
      }
    }
  }, [currentInnings?.balls, canScore, voiceEnabled]);


  // Point 3 Fix: Balls tab over summary strictly ignores retired_hurt in team and over wickets
  const getSnapshotsForInnings = (inn: Innings) => {
    const snapshots = new Map<number, {
      strikerId: string; strikerName: string; strikerRuns: number; strikerBalls: number;
      nonStrikerId: string; nonStrikerName: string; nonStrikerRuns: number; nonStrikerBalls: number;
      bowlerName: string; bowlerFigure: string;
      teamOvers: number; teamRuns: number; teamWickets: number;
      overRuns: number; overWickets: number;
    }>();

    const batRuns: Record<string, number> = {};
    const batBalls: Record<string, number> = {};
    const bowlLegalBalls: Record<string, number> = {};
    const bowlRuns: Record<string, number> = {};
    const bowlWickets: Record<string, number> = {};
    const bowlMaidens: Record<string, number> = {};

    let teamLegalBalls = 0;
    let teamRuns = 0;
    let teamWickets = 0;
    let legalBallsSinceOverStart = 0;
    let runsThisOverForBowler = 0;
    let totalRunsThisOver = 0;
    let wicketsThisOver = 0;
    
        inn?.balls?.forEach((b) => {
      batRuns[b.strikerId] = (batRuns[b.strikerId] || 0) + b.runsBat;
      batBalls[b.strikerId] = (batBalls[b.strikerId] || 0) + (b.extraType === 'wide' ? 0 : 1);

      const bowlerRunsAdded = (b.extraType === 'bye' || b.extraType === 'legBye') ? 0 : (b.runsBat + b.extraRuns);
      bowlRuns[b.bowlerId] = (bowlRuns[b.bowlerId] || 0) + bowlerRunsAdded;
      runsThisOverForBowler += bowlerRunsAdded;
      totalRunsThisOver += b.runsBat + b.extraRuns;

      const isRealWkt = b.isWicket && b.wicketType !== 'retired_hurt';

      if (isRealWkt && !['runout', 'timed_out', 'retired'].includes(b.wicketType || '')) {
        bowlWickets[b.bowlerId] = (bowlWickets[b.bowlerId] || 0) + 1;
      }

      teamRuns += b.runsBat + b.extraRuns;
      if (isRealWkt) {
        teamWickets += 1;
        wicketsThisOver += 1;
      }

      if (b.isLegalDelivery) {
        teamLegalBalls += 1;
        bowlLegalBalls[b.bowlerId] = (bowlLegalBalls[b.bowlerId] || 0) + 1;
        legalBallsSinceOverStart += 1;

        if (legalBallsSinceOverStart === 6) {
          if (runsThisOverForBowler === 0) {
            bowlMaidens[b.bowlerId] = (bowlMaidens[b.bowlerId] || 0) + 1;
          }
          const bOvers = Math.floor((bowlLegalBalls[b.bowlerId] || 0) / 6);
          const bBalls = (bowlLegalBalls[b.bowlerId] || 0) % 6;
          snapshots.set(b.overNumber, {
            strikerId: b.strikerId,
            strikerName: b.strikerName,
            strikerRuns: batRuns[b.strikerId] || 0,
            strikerBalls: batBalls[b.strikerId] || 0,
            nonStrikerId: b.nonStrikerId,
            nonStrikerName: b.nonStrikerName,
            nonStrikerRuns: batRuns[b.nonStrikerId] || 0,
            nonStrikerBalls: batBalls[b.nonStrikerId] || 0,
            bowlerName: b.bowlerName,
            bowlerFigure: `${bOvers}.${bBalls}-${bowlMaidens[b.bowlerId] || 0}-${bowlRuns[b.bowlerId] || 0}-${bowlWickets[b.bowlerId] || 0}`,
            teamOvers: Math.floor(teamLegalBalls / 6),
            teamRuns,
            teamWickets,
            overRuns: totalRunsThisOver,
            overWickets: wicketsThisOver,
          });
          legalBallsSinceOverStart = 0;
          runsThisOverForBowler = 0;
          totalRunsThisOver = 0;
          wicketsThisOver = 0;
        }
      }
    });

    return snapshots;
  };

  const overEndSnapshots = useMemo(() => getSnapshotsForInnings(displayInnings), [displayInnings]);

    const currentOverBalls = currentInnings?.balls?.filter(
    (b) => b.overNumber === currentInnings?.oversCompleted
  ) || [];

  const isMatchFinished = match.status === 'completed';

  const mvpScores = useMemo(() => calculateMatchMVP(match), [match]);
  const recommendedMom = useMemo(() => getRecommendedMOM(match), [match]);

  const toggleVoiceCommentary = () => {
    const nextVal = cricketAudio.toggleVoice();
    setVoiceEnabled(nextVal);
    if (nextVal) {
      cricketAudio.speak('Voice commentary enabled');
    }
  };

  const launchCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleScoreBall = (
    runsBat: number,
    extraType: ExtraType = 'none',
    extraRunsVal: number = 0,
    isWicket: boolean = false,
    wicketDetails?: {
      wicketType: WicketType;
      dismissedPlayerId: string;
      dismissedPlayerName: string;
      fielderId?: string;
      fielderName?: string;
    },
    shotZone?: ShotZone
  ) => {
    if (isMatchFinished || isTeamAllOut) return;

    // Point 3: ask before the innings ends because of an all-out wicket.
    // Not asked when overs finish on this ball, or when the chase is won on this ball.
    if (skipAllOutConfirmRef.current) {
      skipAllOutConfirmRef.current = false;
    } else if (
      isWicket &&
      wicketDetails?.wicketType !== 'retired_hurt' &&
      battingSquad.length > 1 &&
      currentInnings.totalWickets + 1 >= maxWicketsForTeam
    ) {
      const isLegalBall = extraType !== 'wide' && extraType !== 'noBall';
      const oversLimit = Number(match.totalOvers) > 0 ? Number(match.totalOvers) : match.settings?.maxOvers || 0;
      const lastBallOfInnings =
        oversLimit > 0 &&
        isLegalBall &&
        currentInnings.ballsInCurrentOver === 5 &&
        currentInnings.oversCompleted + 1 >= oversLimit;
      const isChasing = isTestMatch ? currentInningsNum === 4 : currentInningsNum === 2;
      const extraForChase = extraType === 'noBall' ? Math.max(extraRunsVal, match.settings?.noBallRuns ?? 1) : extraRunsVal;
      const chaseWonOnThisBall =
        isChasing && !!targetRuns && currentInnings.totalRuns + runsBat + extraForChase >= targetRuns;
      if (!lastBallOfInnings && !chaseWonOnThisBall) {
        setPendingAllOut([runsBat, extraType, extraRunsVal, isWicket, wicketDetails, shotZone]);
        return;
      }
    }

    cricketAudio.playBatHit();

    let extraRuns = extraRunsVal;
    let isLegalDelivery = true;
    let nextBallIsFreeHit = false;

    let eventType: 'dot' | 'single' | 'two' | 'three' | 'four' | 'six' | 'wicket' | 'wide' | 'noball' | 'direct_roof' | 'wall_catch' | 'retired_hurt' = 'dot';
    if (isWicket) {
      if (wicketDetails?.wicketType === 'direct_roof_out') eventType = 'direct_roof';
      else if (wicketDetails?.wicketType === 'wall_catch') eventType = 'wall_catch';
      else if (wicketDetails?.wicketType === 'retired_hurt') eventType = 'retired_hurt';
      else eventType = 'wicket';
    } else if (extraType === 'wide') {
      eventType = 'wide';
      isLegalDelivery = false;
      extraRuns = extraRunsVal > 0 ? extraRunsVal : match.settings.wideRuns || 1;
    } else if (extraType === 'noBall') {
      eventType = 'noball';
      isLegalDelivery = false;
      extraRuns = extraRunsVal > 0 ? extraRunsVal : match.settings.noBallRuns || 1;
      if (match.settings.freeHitOnNoBall) {
        nextBallIsFreeHit = true;
      }
    } else {
      if (runsBat === 0) eventType = 'dot';
      else if (runsBat === 1) eventType = 'single';
      else if (runsBat === 2) eventType = 'two';
      else if (runsBat === 3) eventType = 'three';
      else if (runsBat === 4) eventType = 'four';
      else if (runsBat === 6) eventType = 'six';
      else eventType = 'single';
    }

    cricketAudio.announceBallEvent({
      eventType,
      batterName: striker?.name || 'Batsman',
      bowlerName: bowler?.name || 'Bowler',
      runs: runsBat + extraRuns,
      wicketType: wicketDetails?.wicketType,
    });

    const isFour = runsBat === 4;
    const isSix = runsBat === 6;

    if (isSix) {
      cricketAudio.playSix();
      launchCelebration();
    } else if (isFour) {
      cricketAudio.playFour();
    } else if (isWicket) {
      if (wicketDetails?.wicketType === 'direct_roof_out') {
        cricketAudio.playRoofOut();
      } else if (wicketDetails?.wicketType !== 'retired_hurt') {
        cricketAudio.playWicket();
      }
    }

    const currentBallInOver = isLegalDelivery
      ? currentInnings.ballsInCurrentOver + 1
      : currentInnings.ballsInCurrentOver;

    const displayOver = `${currentInnings.oversCompleted}.${currentBallInOver}`;

    const newBall: BallOutcome = {
      id: `ball-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ballNumber: currentBallInOver,
      overNumber: currentInnings.oversCompleted,
      legalBallNumber: isLegalDelivery ? totalLegalBalls + 1 : totalLegalBalls,
      displayOver,
      bowlerId: bowler?.id || 'b1',
      bowlerName: bowler?.name || 'Bowler',
      strikerId: striker?.id || 'p1',
      strikerName: striker?.name || 'Striker',
      nonStrikerId: isSoloBatting ? '' : nonStriker?.id || 'p2',
      nonStrikerName: isSoloBatting ? '' : nonStriker?.name || 'Non-Striker',
      runsBat,
      extraRuns,
      extraType,
      isLegalDelivery,
      isWicket,
      wicketType: wicketDetails?.wicketType,
      dismissedPlayerId: wicketDetails?.dismissedPlayerId,
      dismissedPlayerName: wicketDetails?.dismissedPlayerName,
      fielderId: wicketDetails?.fielderId,
      fielderName: wicketDetails?.fielderName,
      shotZone: shotZone || (isSix ? 'straight' : isFour ? 'cover' : undefined),
      commentary: generateCommentary(
        {
          runsBat,
          extraType,
          isWicket,
          wicketType: wicketDetails?.wicketType,
          isFour,
          isSix,
          isFreeHit: match.isFreeHit,
        },
        striker?.name || 'Striker',
        bowler?.name || 'Bowler',
        currentInnings.totalRuns + runsBat + extraRuns,
        currentInnings.totalWickets + (isWicket && wicketDetails?.wicketType !== 'retired_hurt' ? 1 : 0)
      ),
      isFour,
      isSix,
      isFreeHit: match.isFreeHit,
      nextBallIsFreeHit,
      timestamp: Date.now(),
    };

    const isRetiredHurt = isWicket && wicketDetails?.wicketType === 'retired_hurt';
    const isRealWicket = isWicket && !isRetiredHurt;

    const totalRunsAdded = runsBat + extraRuns;
    const newTotalRuns = currentInnings.totalRuns + totalRunsAdded;
    const newTotalWickets = currentInnings.totalWickets + (isRealWicket ? 1 : 0);

    const updatedBattingStats = { ...currentInnings.battingStats };
    if (striker) {
      const currentStrikerData: BatsmanStats = updatedBattingStats[striker.id] || {
        playerId: striker.id,
        playerName: striker.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        battingOrder: Object.keys(updatedBattingStats).length + 1,
      };

      const newStrikerRuns = currentStrikerData.runs + runsBat;
      const newStrikerBalls = currentStrikerData.balls + (extraType === 'wide' ? 0 : 1);
      const newStrikerFours = currentStrikerData.fours + (isFour ? 1 : 0);
      const newStrikerSixes = currentStrikerData.sixes + (isSix ? 1 : 0);
      const newStrikerSR = newStrikerBalls > 0 ? Number(((newStrikerRuns / newStrikerBalls) * 100).toFixed(1)) : 0;

      let strikerDismissal = currentStrikerData.dismissalText;
      let strikerIsOut = currentStrikerData.isOut;
      let strikerIsRetiredHurt = currentStrikerData.isRetiredHurt || false;

      if (isWicket && wicketDetails?.dismissedPlayerId === striker.id) {
        if (isRetiredHurt) {
          strikerIsOut = false;
          strikerIsRetiredHurt = true;
          strikerDismissal = 'retired hurt (not out)';
        } else {
          strikerIsOut = true;
          strikerIsRetiredHurt = false;
          strikerDismissal = formatDismissalText(wicketDetails.wicketType, bowler?.name || 'Bowler', wicketDetails.fielderName);
        }
      }

      updatedBattingStats[striker.id] = {
        ...currentStrikerData,
        runs: newStrikerRuns,
        balls: newStrikerBalls,
        fours: newStrikerFours,
        sixes: newStrikerSixes,
        strikeRate: newStrikerSR,
        isOut: strikerIsOut,
        isRetiredHurt: strikerIsRetiredHurt,
        dismissalText: strikerDismissal,
      };
    }

    if (isWicket && nonStriker && wicketDetails?.dismissedPlayerId === nonStriker.id) {
      const nonStrikerData: BatsmanStats = updatedBattingStats[nonStriker.id] || {
        playerId: nonStriker.id,
        playerName: nonStriker.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        battingOrder: Object.keys(updatedBattingStats).length + 1,
      };

      updatedBattingStats[nonStriker.id] = {
        ...nonStrikerData,
        isOut: !isRetiredHurt,
        isRetiredHurt: isRetiredHurt,
        dismissalText: isRetiredHurt ? 'retired hurt (not out)' : `run out (${wicketDetails.fielderName || 'fielder'})`,
      };
    }

    const updatedBowlingStats = { ...currentInnings.bowlingStats };
    const currentBowlerData = updatedBowlingStats[bowler.id] || {
      playerId: bowler.id,
      playerName: bowler.name,
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

    const newBowlerBallsTotal = (currentBowlerData.overs * 6) + currentBowlerData.balls + (isLegalDelivery ? 1 : 0);
    const newBowlerOvers = Math.floor(newBowlerBallsTotal / 6);
    const newBowlerBallsRemainder = newBowlerBallsTotal % 6;
    const bowlerRunsAdded = (extraType === 'bye' || extraType === 'legBye') ? 0 : (runsBat + extraRuns);
    const newBowlerRuns = currentBowlerData.runs + bowlerRunsAdded;
    
    const isBowlerWicket = isRealWicket && !['runout', 'timed_out', 'retired', 'retired_hurt'].includes(wicketDetails?.wicketType || '');
    const newBowlerWickets = currentBowlerData.wickets + (isBowlerWicket ? 1 : 0);
    const newBowlerDots = currentBowlerData.dots + (runsBat === 0 && extraType === 'none' && !isWicket ? 1 : 0);
    const newBowlerWides = currentBowlerData.wides + (extraType === 'wide' ? 1 : 0);
    const newBowlerNoBalls = currentBowlerData.noBalls + (extraType === 'noBall' ? 1 : 0);
    const bowlerOversFloat = newBowlerOvers + (newBowlerBallsRemainder / 6);
    const newBowlerEconomy = bowlerOversFloat > 0 ? Number((newBowlerRuns / bowlerOversFloat).toFixed(2)) : 0;

    let newMaidens = currentBowlerData.maidens;
    if (isLegalDelivery && newBowlerBallsRemainder === 0) {
      const thisOverNumber = currentInnings.oversCompleted;
      const overBalls = currentInnings.balls.filter((b) => b.bowlerId === bowler.id && b.overNumber === thisOverNumber);
      const overRuns = overBalls.reduce((acc, b) => acc + b.runsBat + ((b.extraType === 'wide' || b.extraType === 'noBall') ? b.extraRuns : 0), 0) + bowlerRunsAdded;
      if (overRuns === 0) {
        newMaidens += 1;
        cricketAudio.speak(getMaidenOverText(bowler?.name || 'Bowler', commentaryLang));
      }
    }

    const isDotBallForStriker = !isWicket && extraType === 'none' && runsBat === 0;
    if (isDotBallForStriker && striker) {
      const strikerBalls = currentInnings.balls.filter((b) => b.strikerId === striker.id);
      let dotStreak = 1;
      for (let i = strikerBalls.length - 1; i >= 0; i--) {
        const b = strikerBalls[i];
        const wasDot = !b.isWicket && b.extraType === 'none' && b.runsBat === 0;
        if (!wasDot) break;
        dotStreak += 1;
      }
      if (dotStreak === 3) {
        cricketAudio.speak(getPressureBatsmanText(striker?.name || 'Batsman', commentaryLang));
      }
    }

    const isBoundaryOffBowler = !isWicket && extraType === 'none' && (runsBat === 4 || runsBat === 6);
    if (isBoundaryOffBowler) {
      const priorBoundariesOffBowler = currentInnings.balls.filter(
        (b) => b.bowlerId === bowler.id && (b.isFour || b.isSix)
      ).length;
      const totalBoundariesOffBowler = priorBoundariesOffBowler + 1;
      if (totalBoundariesOffBowler % 3 === 0) {
        cricketAudio.speak(getPressureBowlerText(bowler?.name || 'Bowler', commentaryLang));
      }
    }

    if (isBowlerWicket) {
      const bowlerLegalBalls = currentInnings.balls.filter(
        (b) => b.bowlerId === bowler.id && b.isLegalDelivery
      );
      const isBowlerCreditedWicket = (b: typeof bowlerLegalBalls[number]) =>
        b.isWicket && !['runout', 'timed_out', 'retired', 'retired_hurt'].includes(b.wicketType || '');
      let wicketStreak = 1;
      for (let i = bowlerLegalBalls.length - 1; i >= 0; i--) {
        if (!isBowlerCreditedWicket(bowlerLegalBalls[i])) break;
        wicketStreak += 1;
      }
      if (wicketStreak === 3) {
        cricketAudio.playHatTrick();
        cricketAudio.speak(getHatTrickText(bowler?.name || 'Bowler', commentaryLang));
        launchCelebration();
      }
    }

    updatedBowlingStats[bowler.id] = {
      ...currentBowlerData,
      overs: newBowlerOvers,
      balls: newBowlerBallsRemainder,
      runs: newBowlerRuns,
      wickets: newBowlerWickets,
      dots: newBowlerDots,
      wides: newBowlerWides,
      noBalls: newBowlerNoBalls,
      economy: newBowlerEconomy,
      maidens: newMaidens,
    };

    const updatedExtras = {
      wides: (currentInnings.extras?.wides || 0) + (extraType === 'wide' ? extraRuns : 0),
      noBalls: (currentInnings.extras?.noBalls || 0) + (extraType === 'noBall' ? extraRuns : 0),
      byes: (currentInnings.extras?.byes || 0) + (extraType === 'bye' ? extraRuns : 0),
      legByes: (currentInnings.extras?.legByes || 0) + (extraType === 'legBye' ? extraRuns : 0),
      penalty: currentInnings.extras?.penalty || 0,
      total: (currentInnings.extras?.total || 0) + extraRuns,
    };

    let updatedFOW = [...currentInnings.fallOfWickets];
    if (isWicket && wicketDetails && wicketDetails.wicketType !== 'retired_hurt') {
      updatedFOW.push({
        wicketNumber: newTotalWickets,
        score: newTotalRuns,
        over: displayOver,
        playerId: wicketDetails.dismissedPlayerId,
        playerName: wicketDetails.dismissedPlayerName,
      });
    }

    let newOversCompleted = currentInnings.oversCompleted;
    let newBallsInCurrentOver = currentInnings.ballsInCurrentOver;
    let shouldSwapStrikeOnOver = false;

    if (isLegalDelivery) {
      if (currentInnings.ballsInCurrentOver + 1 === 6) {
        newOversCompleted += 1;
        newBallsInCurrentOver = 0;
        shouldSwapStrikeOnOver = true;
        cricketAudio.playOverComplete();
        cricketAudio.speak(`Over complete. ${newTotalRuns} for ${newTotalWickets}`);
      } else {
        newBallsInCurrentOver += 1;
      }
    }

    // Strike rotation logic
    let nextStrikerId = striker?.id || '';
    let nextNonStrikerId = nonStriker?.id || '';

    if (isWicket && wicketDetails) {
      const remainingUnbatted = battingSquad.filter(
        (p) => !updatedBattingStats[p.id]?.isOut && p.id !== striker?.id && p.id !== nonStriker?.id
      );
      const nextBatsman = remainingUnbatted[0];

      if (wicketDetails.dismissedPlayerId === striker?.id) {
        nextStrikerId = nextBatsman ? nextBatsman.id : (nextStrikerId || '');
        // Last man stands: nobody left to come in -> the surviving partner bats alone.
        if (lastManStands && !nextBatsman && wicketDetails.wicketType !== 'retired_hurt' && nonStriker) {
          nextStrikerId = nonStriker.id;
          nextNonStrikerId = '';
        }
      } else if (wicketDetails.dismissedPlayerId === nonStriker?.id) {
        nextNonStrikerId = nextBatsman ? nextBatsman.id : (nextNonStrikerId || '');
        if (lastManStands && !nextBatsman && wicketDetails.wicketType !== 'retired_hurt') {
          nextNonStrikerId = '';
        }
      }
    }

    // Physical runs ran (bat or bye/leg-bye)
    const physicalRunsRan = runsBat + (extraType === 'bye' || extraType === 'legBye' ? extraRuns : 0);
    const isOddRuns = physicalRunsRan % 2 !== 0;
    const canSwapStrike = !!nextStrikerId && !!nextNonStrikerId;
    if (isOddRuns && canSwapStrike) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    if (shouldSwapStrikeOnOver && canSwapStrike) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    const updatedInnings: Innings = {
      ...currentInnings,
      totalRuns: newTotalRuns,
      totalWickets: newTotalWickets,
      oversCompleted: newOversCompleted,
      ballsInCurrentOver: newBallsInCurrentOver,
      balls: [...currentInnings.balls, newBall],
      battingStats: updatedBattingStats,
      bowlingStats: updatedBowlingStats,
      extras: updatedExtras,
      fallOfWickets: updatedFOW,
    };

    let updatedMatch: Match = {
      ...match,
      innings1: currentInningsNum === 1 ? updatedInnings : match.innings1,
      innings2: currentInningsNum === 2 ? updatedInnings : match.innings2,
      innings3: currentInningsNum === 3 ? updatedInnings : match.innings3,
      innings4: currentInningsNum === 4 ? updatedInnings : match.innings4,
      currentStrikerId: nextStrikerId,
      currentNonStrikerId: nextNonStrikerId,
      isFreeHit: nextBallIsFreeHit,
      updatedAt: Date.now(),
    };

    const isAllOut = battingSquad.length > 1 && newTotalWickets >= maxWicketsForTeam;
    const safeTotalOvers = Number(match.totalOvers) > 0 ? Number(match.totalOvers) : match.settings?.maxOvers || 0;
    const isOversFinished = safeTotalOvers > 0 && newOversCompleted >= safeTotalOvers;

    if (isTestMatch) {
      if (currentInningsNum === 1 && (isAllOut || isOversFinished)) {
        cricketAudio.speak(`1st Innings closed at ${newTotalRuns} runs. 2nd Innings begins.`);
        updatedMatch = {
          ...updatedMatch,
          currentInningsNumber: 2,
          currentStrikerId: bowlingSquad[0]?.id || 'p1',
          currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
          currentBowlerId: battingSquad[0]?.id || 'b1',
        };
      } else if (currentInningsNum === 2 && (isAllOut || isOversFinished)) {
        cricketAudio.speak(`2nd Innings closed. ${bowlingTeam.name}'s captain to decide: bat or bowl?`);
        updatedMatch = {
          ...updatedMatch,
          status: 'innings_break',
          awaitingFollowOnDecision: true,
        };
      } else if (currentInningsNum === 3 && (isAllOut || isOversFinished)) {
        const isFollowOn = match.followOnDecision === 'enforce_follow_on';
        const leaderTotal = (isFollowOn ? inn2Runs : inn1Runs) + newTotalRuns;
        const chaserSoFar = isFollowOn ? inn1Runs : inn2Runs;
        const target4th = leaderTotal - chaserSoFar + 1;
        cricketAudio.speak(`3rd Innings finished. Final Target for 4th Innings is ${target4th} runs.`);
        updatedMatch = {
          ...updatedMatch,
          currentInningsNumber: 4,
          targetRuns: target4th,
          currentStrikerId: bowlingSquad[0]?.id || 'p1',
          currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
          currentBowlerId: battingSquad[0]?.id || 'b1',
        };
      } else if (currentInningsNum === 4) {
        const isFollowOn = match.followOnDecision === 'enforce_follow_on';
        const leaderTotal = (isFollowOn ? inn2Runs : inn1Runs) + (match.innings3?.totalRuns || 0);
        const chaserTotal = (isFollowOn ? inn1Runs : inn2Runs) + newTotalRuns;
        const target4th =
          typeof match.targetRuns === 'number' && match.targetRuns > 0
            ? match.targetRuns
            : leaderTotal - (isFollowOn ? inn1Runs : inn2Runs) + 1;

        if (newTotalRuns >= target4th) {
          cricketAudio.playVictory();
          cricketAudio.speak(`${battingTeam.name} won the Test match!`);
          launchCelebration();
          const wicketsLeft = maxWicketsForTeam - newTotalWickets;
          updatedMatch = {
            ...updatedMatch,
            status: 'completed',
            result: {
              winnerTeamId: battingTeam.id,
              winnerTeamName: battingTeam.name,
              marginWickets: wicketsLeft,
              summary: `${battingTeam.name} won the Test match by ${wicketsLeft} wicket(s)! 🏆`,
            },
          };
        } else if (isAllOut || isOversFinished) {
          cricketAudio.playVictory();
          if (chaserTotal === leaderTotal) {
            cricketAudio.speak('Test match TIED!');
            updatedMatch = {
              ...updatedMatch,
              status: 'completed',
              result: {
                isTie: true,
                summary: `Test match TIED! What a historic finish! 🤝`,
              },
            };
          } else if (chaserTotal < leaderTotal) {
            const margin = leaderTotal - chaserTotal;
            cricketAudio.speak(`${bowlingTeam.name} won the Test match by ${margin} runs!`);
            launchCelebration();
            updatedMatch = {
              ...updatedMatch,
              status: 'completed',
              result: {
                winnerTeamId: bowlingTeam.id,
                winnerTeamName: bowlingTeam.name,
                marginRuns: margin,
                summary: `${bowlingTeam.name} won the Test match by ${margin} run(s)! 🏆`,
              },
            };
          }
        }
      }
    } else {
      if (currentInningsNum === 1) {
        if (isAllOut || isOversFinished) {
          cricketAudio.speak(`1st Innings finished! Target is ${newTotalRuns + 1} runs.`);
          updatedMatch = {
            ...updatedMatch,
            currentInningsNumber: 2,
            targetRuns: newTotalRuns + 1,
            isFreeHit: false,
            currentStrikerId: bowlingSquad[0]?.id || 'p1',
            currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
            currentBowlerId: battingSquad[0]?.id || 'b1',
          };
        }
      } else {
        const target =
          typeof match.targetRuns === 'number' && match.targetRuns > 0
            ? match.targetRuns
            : match.innings1.totalRuns + 1;
        if (newTotalRuns >= target) {
          cricketAudio.playVictory();
          launchCelebration();
          const wicketsLeft = maxWicketsForTeam - newTotalWickets;
          cricketAudio.speak(`${battingTeam.name} won the match by ${wicketsLeft} wickets!`);
          updatedMatch = {
            ...updatedMatch,
            status: 'completed',
            result: {
              winnerTeamId: battingTeam.id,
              winnerTeamName: battingTeam.name,
              marginWickets: wicketsLeft,
              summary: `${battingTeam.name} won by ${wicketsLeft} wicket(s)! 🏆`,
            },
          };
        } else if (isAllOut || isOversFinished) {
          if (newTotalRuns === match.innings1.totalRuns) {
            cricketAudio.playVictory();
            cricketAudio.speak('Match TIED!');
            updatedMatch = {
              ...updatedMatch,
              status: 'completed',
              result: {
                isTie: true,
                summary: `Match TIED! Thrilling finish! 🤝`,
              },
            };
          } else {
            const runMargin = match.innings1.totalRuns - newTotalRuns;
            cricketAudio.playVictory();
            launchCelebration();
            cricketAudio.speak(`${bowlingTeam.name} won by ${runMargin} runs!`);
            updatedMatch = {
              ...updatedMatch,
              status: 'completed',
              result: {
                winnerTeamId: bowlingTeam.id,
                winnerTeamName: bowlingTeam.name,
                marginRuns: runMargin,
                summary: `${bowlingTeam.name} won by ${runMargin} run(s)! 🏆`,
              },
            };
          }
        }
      }
    }

    onUpdateMatch(updatedMatch);

    if (shouldSwapStrikeOnOver && !isMatchFinished && !isOversFinished && !isAllOut) {
      setIsBowlerModalOpen(true);
    }
  };

  const isUndoingRef = useRef(false);
  // Point 10: go back from an empty new innings to the previous innings, so its
  // last ball can be undone (e.g. last wicket was entered by mistake).
  const handleGoBackToPreviousInnings = () => {
    if (currentInningsNum <= 1) return;
    if ((currentInnings?.balls?.length || 0) > 0) return;
    cricketAudio.playClick('Back to previous innings');
    const prevNum = currentInningsNum - 1;
    setIsBowlerModalOpen(false);
    setNewInningsStrikerId('');
    setNewInningsNonStrikerId('');
    setNewInningsBowlerId('');
    setConfirmedInningsSetupFor(null);
    onUpdateMatch({
      ...match,
      status: 'live',
      result: undefined,
      awaitingFollowOnDecision: false,
      // Follow-on choice is made after the 2nd innings, so it is cleared when going back to it.
      followOnDecision: prevNum <= 2 ? undefined : match.followOnDecision,
      // Target is recalculated when the previous innings ends again.
      targetRuns: prevNum === 1 || prevNum === 3 ? undefined : match.targetRuns,
      currentInningsNumber: prevNum,
      updatedAt: Date.now(),
    } as Match);
  };

  const handleUndoLastBall = () => {
    if (isUndoingRef.current) return;
    if (currentInnings.balls.length === 0) {
      // Nothing to undo here: if a later innings has just started, step back to the earlier one.
      if (currentInningsNum > 1) handleGoBackToPreviousInnings();
      return;
    }
    isUndoingRef.current = true;
    cricketAudio.playClick('Last ball undone');
    setIsBowlerModalOpen(false);

    const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
    const newBalls = currentInnings.balls.slice(0, -1);

    const totalRunsSub = lastBall.runsBat + lastBall.extraRuns;
    const newTotalRuns = Math.max(0, currentInnings.totalRuns - totalRunsSub);

    // Point 2 & 6 Fix: Only decrement team wicket if not retired_hurt
    const wasRealWicket = lastBall.isWicket && lastBall.wicketType !== 'retired_hurt';
    const newTotalWickets = Math.max(0, currentInnings.totalWickets - (wasRealWicket ? 1 : 0));

    const remainingLegalBalls = newBalls.filter((b) => b.isLegalDelivery).length;
    let newOversCompleted = Math.floor(remainingLegalBalls / 6);
    let newBallsInCurrentOver = remainingLegalBalls % 6;

    const updatedBattingStats = { ...currentInnings.battingStats };
    const strikerData = updatedBattingStats[lastBall.strikerId];
    if (strikerData) {
      const newRuns = Math.max(0, strikerData.runs - lastBall.runsBat);
      const newBallsCount = Math.max(0, strikerData.balls - (lastBall.extraType === 'wide' ? 0 : 1));
      const newFours = Math.max(0, strikerData.fours - (lastBall.isFour ? 1 : 0));
      const newSixes = Math.max(0, strikerData.sixes - (lastBall.isSix ? 1 : 0));
      const newSR = newBallsCount > 0 ? Number(((newRuns / newBallsCount) * 100).toFixed(1)) : 0;

      const wasStrikerDismissed = lastBall.isWicket && lastBall.dismissedPlayerId === lastBall.strikerId;

      updatedBattingStats[lastBall.strikerId] = {
        ...strikerData,
        runs: newRuns,
        balls: newBallsCount,
        fours: newFours,
        sixes: newSixes,
        strikeRate: newSR,
        isOut: wasStrikerDismissed ? false : strikerData.isOut,
        isRetiredHurt: wasStrikerDismissed && lastBall.wicketType === 'retired_hurt' ? false : strikerData.isRetiredHurt,
        dismissalText: wasStrikerDismissed ? undefined : strikerData.dismissalText,
      };
    }

    // Point 1 Fix: Non-striker run out Undo restores isOut to false
    if (lastBall.isWicket && lastBall.dismissedPlayerId && lastBall.dismissedPlayerId !== lastBall.strikerId) {
      const nonStrikerData = updatedBattingStats[lastBall.dismissedPlayerId];
      if (nonStrikerData) {
        updatedBattingStats[lastBall.dismissedPlayerId] = {
          ...nonStrikerData,
          isOut: false,
          isRetiredHurt: false,
          dismissalText: undefined,
        };
      }
    }

    const updatedBowlingStats = { ...currentInnings.bowlingStats };
    const bowlerData = updatedBowlingStats[lastBall.bowlerId];
    if (bowlerData) {
      const runsSub = (lastBall.extraType === 'bye' || lastBall.extraType === 'legBye') ? 0 : totalRunsSub;
      const newRuns = Math.max(0, bowlerData.runs - runsSub);
      const isBowlerW = wasRealWicket && !['runout', 'timed_out', 'retired', 'retired_hurt'].includes(lastBall.wicketType || '');
      const newWickets = Math.max(0, bowlerData.wickets - (isBowlerW ? 1 : 0));
      const newDots = Math.max(0, bowlerData.dots - (lastBall.runsBat === 0 && lastBall.extraType === 'none' && !lastBall.isWicket ? 1 : 0));

      const bowlerLegalBalls = newBalls.filter((b) => b.bowlerId === lastBall.bowlerId && b.isLegalDelivery).length;
      const newBOvers = Math.floor(bowlerLegalBalls / 6);
      const newBBalls = bowlerLegalBalls % 6;
      const bOversFloat = newBOvers + (newBBalls / 6);
      const newEcon = bOversFloat > 0 ? Number((newRuns / bOversFloat).toFixed(2)) : 0;

      // Point 2 Fix: If undoing the 6th ball of a maiden over, decrement maiden count
      let newMaidens = bowlerData.maidens;
      if (lastBall.isLegalDelivery && currentInnings.ballsInCurrentOver === 0) {
        const undoneOverNumber = currentInnings.oversCompleted - 1;
        const undoneOverBalls = currentInnings.balls.filter(
          (b) => b.bowlerId === lastBall.bowlerId && b.overNumber === undoneOverNumber
        );
        const undoneOverRuns = undoneOverBalls.reduce(
          (sum, b) => sum + b.runsBat + ((b.extraType === 'wide' || b.extraType === 'noBall') ? b.extraRuns : 0),
          0
        );
        if (undoneOverRuns === 0 && newMaidens > 0) {
          newMaidens -= 1;
        }
      }

      updatedBowlingStats[lastBall.bowlerId] = {
        ...bowlerData,
        overs: newBOvers,
        balls: newBBalls,
        runs: newRuns,
        wickets: newWickets,
        dots: newDots,
        maidens: newMaidens,
        economy: newEcon,
      };
    }

    const updatedExtras = { ...currentInnings.extras };
    if (lastBall.extraType === 'wide') {
      updatedExtras.wides = Math.max(0, (updatedExtras.wides || 0) - lastBall.extraRuns);
    } else if (lastBall.extraType === 'noBall') {
      updatedExtras.noBalls = Math.max(0, (updatedExtras.noBalls || 0) - lastBall.extraRuns);
    } else if (lastBall.extraType === 'bye') {
      updatedExtras.byes = Math.max(0, (updatedExtras.byes || 0) - lastBall.extraRuns);
    } else if (lastBall.extraType === 'legBye') {
      updatedExtras.legByes = Math.max(0, (updatedExtras.legByes || 0) - lastBall.extraRuns);
    }
    updatedExtras.total = Math.max(0, (updatedExtras.total || 0) - lastBall.extraRuns);

    const updatedInnings: Innings = {
      ...currentInnings,
      totalRuns: newTotalRuns,
      totalWickets: newTotalWickets,
      oversCompleted: newOversCompleted,
      ballsInCurrentOver: newBallsInCurrentOver,
      balls: newBalls,
      battingStats: updatedBattingStats,
      bowlingStats: updatedBowlingStats,
      extras: updatedExtras,
      fallOfWickets: currentInnings.fallOfWickets.filter((f) => f.over !== lastBall.displayOver),
    };

    onUpdateMatch({
      ...match,
      status: 'live',
      result: undefined,
      awaitingFollowOnDecision: false,
      currentStrikerId: lastBall.strikerId,
      currentNonStrikerId: lastBall.nonStrikerId,
      currentBowlerId: lastBall.bowlerId,
      isFreeHit: lastBall.isFreeHit,
      innings1: currentInningsNum === 1 ? updatedInnings : match.innings1,
      innings2: currentInningsNum === 2 ? updatedInnings : match.innings2,
      innings3: currentInningsNum === 3 ? updatedInnings : match.innings3,
      innings4: currentInningsNum === 4 ? updatedInnings : match.innings4,
      updatedAt: Date.now(),
    });

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 400);
  };

  const handleSwapStrike = () => {
    cricketAudio.playClick('Strike rotated');
    onUpdateMatch({
      ...match,
      currentStrikerId: match.currentNonStrikerId,
      currentNonStrikerId: match.currentStrikerId,
      updatedAt: Date.now(),
    });
  };

    const handleDeclareInnings = () => {
    setIsDeclareConfirmOpen(true);
  };

  const handleConfirmDeclareInnings = () => {
    cricketAudio.playClick('Innings declared');
    setIsDeclareConfirmOpen(false);
    if (currentInningsNum === 1) {
      onUpdateMatch({
        ...match,
        currentInningsNumber: 2,
        targetRuns: !isTestMatch ? currentInnings.totalRuns + 1 : match.targetRuns,
        currentStrikerId: bowlingSquad[0]?.id || 'p1',
        currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
        currentBowlerId: battingSquad[0]?.id || 'b1',
        updatedAt: Date.now(),
      });
    } else if (currentInningsNum === 2) {
      if (isTestMatch) {
        onUpdateMatch({
          ...match,
          status: 'innings_break',
          awaitingFollowOnDecision: true,
          updatedAt: Date.now(),
        });
      } else {
        handleOpenEndMatchModal();
      }
    } else if (currentInningsNum === 3) {
      const isFollowOn = match.followOnDecision === 'enforce_follow_on';
      const leaderTotal = (isFollowOn ? inn2Runs : inn1Runs) + currentInnings.totalRuns;
      const chaserSoFar = isFollowOn ? inn1Runs : inn2Runs;
      const target4th = leaderTotal - chaserSoFar + 1;
      onUpdateMatch({
        ...match,
        currentInningsNumber: 4,
        targetRuns: target4th,
        currentStrikerId: bowlingSquad[0]?.id || 'p1',
        currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
        currentBowlerId: battingSquad[0]?.id || 'b1',
        updatedAt: Date.now(),
      });
    }
  };


  const handleOpenMomModal = () => {
    const existing = match?.result?.playerOfTheMatch?.playerId;
    if (existing) {
      setSelectedMomId(existing);
    } else if (recommendedMom) {
      setSelectedMomId(recommendedMom.playerId);
    }
    setIsMomModalOpen(true);
  };

  const handleSaveMomOnly = () => {
    if (!match?.result) return;
    const momPlayer = [...(match?.teamA?.players || []), ...(match?.teamB?.players || [])].find((p) => p.id === selectedMomId);
    const momScore = mvpScores.find((s) => s.playerId === selectedMomId);

    onUpdateMatch({
      ...match,
      result: {
        ...match.result,
        playerOfTheMatch: momPlayer
          ? {
              playerId: momPlayer.id,
              playerName: momPlayer.name,
              teamName: match.teamA.players.some((p) => p.id === momPlayer.id) ? match.teamA.name : match.teamB.name,
              reason: momScore
                ? `${momScore.totalPoints} MVP Pts (${momScore.battingSummary || '0 runs'}, ${momScore.bowlingSummary || '0 wkts'})`
                : 'Match winning performance',
            }
          : undefined,
      },
      updatedAt: Date.now(),
    });
    setIsMomModalOpen(false);
  };

  const handleOpenEndMatchModal = () => {
    if (!selectedMomId && recommendedMom) {
      setSelectedMomId(recommendedMom.playerId);
    }
    setIsEndMatchModalOpen(true);
  };

    const handleFinalizeEndMatch = () => {
    const winnerTeam = [match?.teamA, match?.teamB].find((t) => t?.id === selectedWinnerId);
    const momPlayer = [...(match?.teamA?.players || []), ...(match?.teamB?.players || [])].find((p) => p.id === selectedMomId);
    const momScore = mvpScores.find((s) => s.playerId === selectedMomId);

    const summaryText = customResultSummary.trim() ||
      (winnerTeam ? `${winnerTeam.name} won the match! 🏆` : 'Match Concluded');

    cricketAudio.playVictory();
    cricketAudio.speak(`${winnerTeam?.name || 'Match'} declared finished!`);
    launchCelebration();

    const finalizedMatch: Match = {
      ...match,
      status: 'completed',
      result: {
        winnerTeamId: winnerTeam?.id,
        winnerTeamName: winnerTeam?.name,
        summary: summaryText,
        playerOfTheMatch: momPlayer
          ? {
              playerId: momPlayer.id,
              playerName: momPlayer.name,
              teamName: match.teamA.players.some((p) => p.id === momPlayer.id) ? match.teamA.name : match.teamB.name,
              reason: momScore
                ? `${momScore.totalPoints} MVP Pts (${momScore.battingSummary || '0 runs'}, ${momScore.bowlingSummary || '0 wkts'})`
                : 'Match winning performance',
            }
          : undefined,
      },
      updatedAt: Date.now(),
    };

    onUpdateMatch(finalizedMatch);
    setIsEndMatchModalOpen(false);
  };

  const handleConfirmWicket = () => {
    const isDismissedStriker = dismissedRole === 'striker';
    const dismissedPlayer = isDismissedStriker ? striker : nonStriker;
    const needsFielder = ['caught', 'wall_catch', 'runout', 'stumped'].includes(wicketType);
    if (needsFielder && !fielderId) return; // fielder is compulsory for these dismissals
    const fielder = needsFielder ? bowlingSquad.find((p) => p.id === fielderId) : undefined;

    handleScoreBall(0, 'none', 0, true, {
      wicketType,
      dismissedPlayerId: dismissedPlayer?.id || 'p1',
      dismissedPlayerName: dismissedPlayer?.name || 'Batsman',
      fielderId: fielder?.id,
      fielderName: fielder?.name,
    });

    setIsWicketModalOpen(false);
    setFielderId('');
  };

  function formatDismissalText(type: WicketType, bName: string, fName?: string): string {
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

  const availableInningsList = useMemo(() => {
    const list = [1];
    if (match.innings2 && (match.innings2.balls?.length > 0 || currentInningsNum >= 2 || isMatchFinished)) list.push(2);
    if (isTestMatch) {
      if (match.innings3 && (match.innings3.balls?.length > 0 || currentInningsNum >= 3 || isMatchFinished)) list.push(3);
      if (match.innings4 && (match.innings4.balls?.length > 0 || currentInningsNum >= 4 || isMatchFinished)) list.push(4);
    }
    return list;
  }, [match, currentInningsNum, isMatchFinished, isTestMatch]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 sm:space-y-4 select-none pb-8">
      {/* 1. TOP HEADER & CONTROLS */}
      <div
        className={`p-3 sm:p-4 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-2 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {onBackToFeed && (
            <button
              onClick={onBackToFeed}
              title="Return to Live Broadcast Feed"
              className="p-2 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition mr-1"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Live Feed</span>
            </button>
          )}

          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white text-base font-bold shadow-md">
            🏏
          </div>
          <div>
            <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-2 group">
            <h1 className="text-sm sm:text-base font-black truncate max-w-[190px] sm:max-w-xs">{match.name}</h1>
            {canScore && (
              <button
                onClick={() => {
                  const newName = window.prompt('Naya Match Title likhein:', match.name);
                  if (newName && newName.trim() !== '' && newName !== match.name) {
                    onUpdateMatch({ ...match, name: newName.trim(), updatedAt: Date.now() });
                  }
                }}
                className="p-1.5 rounded-md bg-slate-800/50 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all cursor-pointer"
                title="Edit Match Name"
              >
                ✏️
              </button>
            )}
          </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase ${
                  isMatchFinished
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                }`}
              >
                {isMatchFinished ? 'COMPLETED' : `INN ${currentInningsNum} ${isTestMatch ? '(TEST)' : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md">
              <span>{match.venue} • {match.settings.pitchType}</span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-slate-300">
                By: <strong className="text-emerald-400 font-bold">{match.creatorName || match.creatorProfileId || 'Public'}</strong>
              </span>
              {match.delegatedScorerProfileId && (
                <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                  🔋 Scorer: {match.delegatedScorerName || match.delegatedScorerProfileId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-0.5">
            <button
              onClick={toggleVoiceCommentary}
              title={voiceEnabled ? 'Voice Active (Click to Mute)' : 'Voice Muted'}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                voiceEnabled
                  ? 'bg-emerald-600/30 text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-0.5 px-1 border-l border-slate-700">
              {(['pa', 'hi', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    cricketAudio.setCommentaryLanguage(lang);
                    setCommentaryLang(lang);
                    cricketAudio.speak(lang === 'pa' ? 'ਪੰਜਾਬੀ ਕੁਮੈਂਟਰੀ ਚਾਲੂ' : lang === 'hi' ? 'हिंदी कमेंट्री शुरू' : 'English commentary active');
                  }}
                  title={lang === 'pa' ? 'ਪੰਜਾਬੀ (Punjabi)' : lang === 'hi' ? 'हिंदी (Hindi)' : 'English'}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase transition cursor-pointer ${
                    commentaryLang === lang
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'pa' ? 'ਪੰ' : lang === 'hi' ? 'हि' : 'EN'}
                </button>
              ))}
            </div>
          </div>

          {canDelegate && !isMatchFinished && (
            <button
              onClick={() => setIsDelegateModalOpen(true)}
              title="Battery Low? Authorize a friend by Profile ID to score this match"
              className={`p-2 px-2.5 rounded-xl border text-xs font-black flex items-center gap-1 cursor-pointer transition ${
                match.delegatedScorerProfileId
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
              }`}
            >
              <BatteryMedium className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {match.delegatedScorerProfileId ? 'Scorer: Delegated' : 'Battery Low?'}
              </span>
            </button>
          )}

          {!isMatchFinished && canScore && (
            <button
              onClick={handleDeclareInnings}
              title="Declare Innings"
              className="p-2 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Declare</span>
            </button>
          )}

          {canScore && !isMatchFinished && (
            <button
              onClick={handleOpenEndMatchModal}
              title="Declare Result or Finish Match"
              className="p-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-purple-600/30 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>End Match</span>
            </button>
          )}

          <button
            onClick={onOpenShareCard}
            title="Share Match"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* More-options menu: Delete now lives behind a tap here instead of
              sitting right next to Share, so it can't be hit by accident. */}
          {canDelete && (
            <div className="relative">
              <button
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                title="More Options"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {isHeaderMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsHeaderMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-40 overflow-hidden py-1">
                    <button
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        if (window.confirm(`Are you sure you want to delete "${match.name}"? Only you (creator) can perform this.`)) {
                          onDeleteMatch();
                        }
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Match</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MATCH TOP NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-950 border border-slate-800 pb-2">
        <button
          onClick={() => setCentreTab('scoring')}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'scoring'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Scoring</span>
        </button>

        <button
          onClick={() => {
            setViewInningsNum(currentInningsNum);
            setCentreTab('scorecard');
          }}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'scorecard'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Scorecard</span>
        </button>

        <button
          onClick={() => setCentreTab('wheel')}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'wheel'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-300" />
          <span>🎯 Shot Wheel</span>
        </button>

        <button
          onClick={() => setCentreTab('superstars')}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'superstars'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Super Stars (MVP)</span>
        </button>

        <button
          onClick={() => setCentreTab('stats')}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'stats'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Stats</span>
        </button>

        <button
          onClick={() => {
            setViewInningsNum(currentInningsNum);
            setCentreTab('balls');
          }}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'balls'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Balls</span>
        </button>

        <button
          onClick={() => setCentreTab('squads')}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
            centreTab === 'squads'
              ? 'bg-slate-700 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Squads</span>
        </button>
      </div>

      {/* 3. RESULT BANNER */}
      {match.result && (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-emerald-600/20 via-teal-600/30 to-cyan-600/20 border border-emerald-500/40 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-base sm:text-lg font-black">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{match.result.summary}</span>
          </div>
          {match.result.playerOfTheMatch && (
            <p className="text-xs font-bold text-amber-300 mt-1">
              🌟 Player of the Match: {match.result.playerOfTheMatch.playerName} ({match.result.playerOfTheMatch.teamName})
            </p>
          )}
          {canScore && isMatchFinished && (
            <button
              type="button"
              onClick={handleOpenMomModal}
              className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black cursor-pointer hover:bg-amber-500/30"
            >
              🌟 {match.result.playerOfTheMatch ? 'Change Player of the Match' : 'Set Player of the Match'}
            </button>
          )}
        </div>
      )}

      {/* TAB 1: LIVE SCORING VIEW */}
      {centreTab === 'scoring' && (
        <div className="space-y-3">
          {(!isMatchFinished) && (
            <>
              {!isTestMatch && currentInningsNum === 2 && targetRuns && (
                <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-sm border border-black/20 flex items-center justify-center text-2xl font-black shrink-0">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-black text-amber-400 px-2 py-0.5 rounded-full font-mono">
                          TARGET: {targetRuns}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          (1st Inn: {match.innings1.totalRuns}/{match.innings1.totalWickets})
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 mt-0.5">
                        {remainingRuns > 0 ? (
                          <>Need <span className="underline decoration-2">{remainingRuns} Runs</span> in <span className="underline decoration-2">{Math.max(0, remainingBalls)} Balls</span></>
                        ) : (
                          <>Target Achieved! {battingTeam.name} won! 🏆</>
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs bg-black/15 px-3.5 py-2 rounded-2xl border border-black/10 shrink-0">
                    <div>
                      <span className="text-[9px] uppercase font-sans font-black text-slate-800 block">Req. Rate (RRR)</span>
                      <span className="font-black text-base text-slate-950">{requiredRunRate}</span>
                    </div>
                    <div className="w-px h-7 bg-black/20 mx-1" />
                    <div>
                      <span className="text-[9px] uppercase font-sans font-black text-slate-800 block">Curr. Rate (CRR)</span>
                      <span className="font-bold text-sm text-slate-900">{currentRunRate}</span>
                    </div>
                  </div>
                </div>
              )}

              {isTestMatch && testLeadTrailText && (
                <div className="p-3.5 rounded-3xl bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 border border-indigo-500/40 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🏏</span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                        Test Match • Inning {currentInningsNum} of 4
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-amber-300">
                        {testLeadTrailText}
                      </h3>
                    </div>
                  </div>
                  {testTargetRuns && currentInningsNum === 4 && (
                    <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-indigo-400/30 text-right font-mono">
                      <span className="text-[9px] uppercase text-slate-400 block">Target</span>
                      <span className="font-black text-amber-400 text-sm">{testTargetRuns}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Main Live Scoreboard Card */}
          <div
            className={`p-3.5 sm:p-5 rounded-3xl border shadow-xl space-y-3.5 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wide block">
                  {battingTeam.name}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {formatInningsOrdinal(currentInningsNum)}
                </span>
                {isTeamAllOut && (
                  <span className="ml-2 inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white align-middle">
                    ALL OUT
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
                  {currentInnings.totalRuns}-{currentInnings.totalWickets}
                </span>
                <span className="text-base sm:text-xl font-bold font-mono text-slate-400 ml-1">
                  ({match.totalOvers})
                </span>
              </div>
            </div>

            {/* Match Stats Row — CRR/RRR and Partnership only make sense
                while the match is live, so a completed match just shows the
                final Extras and Overs. */}
            <div className={`grid grid-cols-2 gap-2 text-xs font-mono ${isMatchFinished ? '' : 'sm:grid-cols-4'}`}>
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-sans text-slate-400 font-bold block">Extras</span>
                <span className="font-black text-amber-400 text-sm">
                  {currentInnings.extras?.total || 0}
                  <span className="text-[9px] text-slate-500 font-normal ml-1">
                    (wd {currentInnings.extras?.wides || 0}, nb {currentInnings.extras?.noBalls || 0})
                  </span>
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-sans text-slate-400 font-bold block">Overs</span>
                <span className="font-black text-white text-sm">
                  {currentInnings.oversCompleted}.{currentInnings.ballsInCurrentOver} / {match.totalOvers}
                </span>
              </div>

              {!isMatchFinished && (
                <>
                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[9px] uppercase font-sans text-slate-400 font-bold block">CRR / RRR</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {currentRunRate}
                      {currentInningsNum === 2 && targetRuns && (
                        <span className="text-purple-400 ml-1">/ {requiredRunRate}</span>
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[9px] uppercase font-sans text-slate-400 font-bold block">Partnership</span>
                    <span className="font-black text-cyan-400 text-sm">
                      {currentPartnershipRuns}({currentPartnershipBalls})
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Batsmen Table (Point 4: Clean state if all out) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-black text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Batsmen</span>
                </span>
                {canScore && !isTeamAllOut && !isMatchFinished && (
                  <button
                    onClick={() => {
                      setBatsmanModalRole('striker');
                      setIsBatsmanModalOpen(true);
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Switch Batsman
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/50 text-slate-400 text-[10px] uppercase font-sans border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Batsman</th>
                      <th className="p-2.5 text-right">R</th>
                      <th className="p-2.5 text-right">B</th>
                      <th className="p-2.5 text-right">4s</th>
                      <th className="p-2.5 text-right">6s</th>
                      <th className="p-2.5 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isTeamAllOut ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-rose-400 font-bold italic">
                          Innings complete. All wickets down.
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="bg-amber-500/10 font-bold">
                          <td className="p-2.5 font-sans flex items-center gap-1 text-white">
                            <span className="text-amber-400 font-black">*</span>
                            <span className="truncate max-w-[120px]">{striker?.name || 'Striker'}</span>
                            {!isMatchFinished && (
                              <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black uppercase ml-1">
                                Strike
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-black text-amber-400">{strikerStats.runs}</td>
                          <td className="p-2.5 text-right text-slate-300">{strikerStats.balls}</td>
                          <td className="p-2.5 text-right text-slate-300">{strikerStats.fours}</td>
                          <td className="p-2.5 text-right text-purple-400 font-bold">{strikerStats.sixes}</td>
                          <td className="p-2.5 text-right text-cyan-400">{strikerStats.strikeRate}</td>
                        </tr>
                        <tr className="hover:bg-slate-900/40">
                          <td className="p-2.5 font-sans text-slate-200 truncate max-w-[120px]">
                            {nonStriker?.name || 'Non-Striker'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-white">{nonStrikerStats.runs}</td>
                          <td className="p-2.5 text-right text-slate-400">{nonStrikerStats.balls}</td>
                          <td className="p-2.5 text-right text-slate-400">{nonStrikerStats.fours}</td>
                          <td className="p-2.5 text-right text-purple-400">{nonStrikerStats.sixes}</td>
                          <td className="p-2.5 text-right text-slate-400">{nonStrikerStats.strikeRate}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowler Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-black text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bowler</span>
                </span>
                {canScore && !isTeamAllOut && !isMatchFinished && (
                  <button
                    onClick={() => setIsBowlerModalOpen(true)}
                    className="text-[10px] text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    Change Bowler
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/50 text-slate-400 text-[10px] uppercase font-sans border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Bowler</th>
                      <th className="p-2.5 text-right">O</th>
                      <th className="p-2.5 text-right">M</th>
                      <th className="p-2.5 text-right">R</th>
                      <th className="p-2.5 text-right">W</th>
                      <th className="p-2.5 text-right">Eco</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-cyan-500/10 font-bold">
                      <td className="p-2.5 font-sans text-cyan-300 truncate max-w-[120px]">
                        {bowler?.name}
                      </td>
                      <td className="p-2.5 text-right text-white">{bowlerStats.overs}.{bowlerStats.balls}</td>
                      <td className="p-2.5 text-right text-slate-400">{bowlerStats.maidens}</td>
                      <td className="p-2.5 text-right text-white">{bowlerStats.runs}</td>
                      <td className="p-2.5 text-right font-black text-emerald-400">{bowlerStats.wickets}</td>
                      <td className="p-2.5 text-right text-cyan-400">{bowlerStats.economy}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Over Deliveries Mini Pills (Point 6: RH badge on retired_hurt) */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans mr-1 flex-shrink-0">
                  Over {currentInnings.oversCompleted + 1}:
                </span>
                {currentOverBalls.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">This over balls will appear here</span>
                ) : (
                  currentOverBalls.map((b) => (
                    <span
                      key={b.id}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-[11px] flex-shrink-0 border shadow-sm ${
                        b.isWicket && b.wicketType === 'retired_hurt'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : b.isWicket
                          ? 'bg-rose-600 text-white border-rose-400 animate-bounce'
                          : b.isSix
                          ? 'bg-purple-600 text-white border-purple-400'
                          : b.isFour
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : b.extraType === 'wide' || b.extraType === 'noBall'
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : b.extraType === 'bye' || b.extraType === 'legBye'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {b.isWicket && b.wicketType === 'retired_hurt'
                        ? 'RH'
                        : b.isWicket
                        ? 'W'
                        : b.extraType === 'wide'
                        ? `${b.extraRuns}wd`
                        : b.extraType === 'noBall'
                        ? `${b.runsBat + b.extraRuns}nb`
                        : b.extraType === 'bye'
                        ? `${b.extraRuns}b`
                        : b.extraType === 'legBye'
                        ? `${b.extraRuns}lb`
                        : b.runsBat}
                    </span>
                  ))
                )}
              </div>

              {canScore && !isTeamAllOut && !isMatchFinished && (
                <button
                  onClick={handleSwapStrike}
                  className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Rotate Strike</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. KEYPAD */}
          {canScore ? (
            <div
              className={`p-3 sm:p-4 rounded-3xl border shadow-2xl space-y-2.5 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="grid grid-cols-5 gap-2">
                {[
                  { runs: 1, label: '1', bg: 'bg-gradient-to-b from-orange-500 to-amber-600' },
                  { runs: 2, label: '2', bg: 'bg-gradient-to-b from-orange-500 to-amber-600' },
                  { runs: 3, label: '3', bg: 'bg-gradient-to-b from-orange-500 to-amber-600' },
                  { runs: 4, label: '4', bg: 'bg-gradient-to-b from-orange-600 to-amber-700 font-black' },
                  { runs: 6, label: '6', bg: 'bg-gradient-to-b from-orange-600 to-amber-700 font-black' },
                ].map((item) => (
                  <button
                    key={item.runs}
                    onClick={() => handleScoreBall(item.runs, 'none', 0)}
                    disabled={isMatchFinished || isTeamAllOut}
                    className={`h-14 sm:h-16 rounded-2xl ${item.bg} text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-90 transition cursor-pointer disabled:opacity-40`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => handleScoreBall(0, 'legBye', 1)}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-13 sm:h-14 rounded-2xl bg-gradient-to-b from-orange-500/90 to-amber-600/90 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>LB</span>
                </button>

                <button
                  onClick={() => handleScoreBall(0, 'bye', 1)}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-13 sm:h-14 rounded-2xl bg-gradient-to-b from-orange-500/90 to-amber-600/90 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>Bye</span>
                </button>

                <button
                  onClick={() => setActiveExtraPanel('wide')}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-13 sm:h-14 rounded-2xl bg-gradient-to-b from-orange-500/90 to-amber-600/90 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>Wide</span>
                </button>

                <button
                  onClick={() => setActiveExtraPanel('noBall')}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-13 sm:h-14 rounded-2xl bg-gradient-to-b from-orange-500/90 to-amber-600/90 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>NB</span>
                </button>

                <button
                  onClick={() => handleScoreBall(0, 'none', 0)}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-13 sm:h-14 rounded-2xl bg-gradient-to-b from-orange-500 to-amber-600 text-white font-black text-2xl flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>•</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => setIsCustomRunsModalOpen(true)}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-12 sm:h-13 rounded-2xl bg-gradient-to-b from-orange-500/80 to-amber-600/80 text-white font-bold text-xs flex items-center justify-center shadow active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>More</span>
                </button>

                <button
                  onClick={() => {
                    setBatsmanModalRole('striker');
                    setIsBatsmanModalOpen(true);
                  }}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-12 sm:h-13 rounded-2xl bg-gradient-to-b from-orange-500/80 to-amber-600/80 text-white text-base flex items-center justify-center shadow active:scale-90 transition cursor-pointer disabled:opacity-40"
                  title="Change Striker / Bowler"
                >
                  <span>🏏</span>
                </button>

                <button
                  onClick={() => {
                    setPendingWagonBall({
                      runsBat: 0,
                      extraType: 'none',
                      extraRunsVal: 0,
                      isWicket: false,
                    });
                    setIsWagonWheelModalOpen(true);
                  }}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-12 sm:h-13 rounded-2xl bg-gradient-to-b from-cyan-600 to-blue-700 text-white font-mono font-black text-xs flex flex-col items-center justify-center shadow-md active:scale-90 transition cursor-pointer disabled:opacity-40"
                  title="Select Shot Direction & Runs (Wagon Wheel)"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="text-[9px]">Wheel</span>
                </button>

                <button
                  onClick={handleUndoLastBall}
                  disabled={(currentInnings.balls.length === 0 && currentInningsNum <= 1) || isUndoingRef.current}
                  className="h-12 sm:h-13 rounded-2xl bg-gradient-to-b from-orange-500/80 to-amber-600/80 text-white font-bold text-xs flex items-center justify-center shadow active:scale-90 transition cursor-pointer disabled:opacity-30"
                >
                  <span>Undo</span>
                </button>

                <button
                  onClick={() => setIsWicketModalOpen(true)}
                  disabled={isMatchFinished || isTeamAllOut}
                  className="h-12 sm:h-13 rounded-2xl bg-gradient-to-b from-rose-600 to-red-700 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-90 transition cursor-pointer disabled:opacity-40"
                >
                  <span>Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200 ${
                isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px] border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Spectator View
                    </span>
                    <span className="text-xs text-slate-400">
                      Scored by <strong className="text-amber-400 font-mono">{match.delegatedScorerName || match.creatorNa
