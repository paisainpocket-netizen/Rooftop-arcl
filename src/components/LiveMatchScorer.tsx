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
import { calculateMatchMVP, getRecommendedMOM } from '../utils/mvp';
import { PointsSystemModal } from './PointsSystemModal';
import { WagonWheelModal } from './WagonWheelModal';
import { WagonWheelView } from './WagonWheelView';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  User,
  Users,
  Trophy,
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
  const [customResultSummary, setCustomResultSummary] = useState<string>('');
  const [showMvpRulesModal, setShowMvpRulesModal] = useState(false);
  const [mvpFilterTab, setMvpFilterTab] = useState<'best_economy' | 'most_maidens' | 'bowl_dots' | 'mvp' | 'top_scorers' | 'most_wickets'>('mvp');
  const [selectedBallDetail, setSelectedBallDetail] = useState<BallOutcome | null>(null);

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

  const maxWicketsForTeam = Math.max(1, battingSquad.length - 1);
  const isTeamAllOut = battingSquad.length > 1 && currentInnings.totalWickets >= maxWicketsForTeam;

  const needsNewInningsSetup =
    currentInningsNum > 1 &&
    (currentInnings?.balls?.length || 0) === 0 &&
    match.status !== 'completed' &&
    confirmedInningsSetupFor !== currentInningsNum;

  // Active players with clean All-Out handling (Point 4: no invalid batsman fallback on all out)
  const striker = isTeamAllOut
    ? null
    : (battingSquad.find((p) => p?.id === match?.currentStrikerId) || battingSquad[0]);

  const nonStriker = isTeamAllOut
    ? null
    : (battingSquad.find((p) => p?.id === match?.currentNonStrikerId && p?.id !== striker?.id) || battingSquad.find((p) => p?.id !== striker?.id) || battingSquad[0]);

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
      nonStrikerId: nonStriker?.id || 'p2',
      nonStrikerName: nonStriker?.name || 'Non-Striker',
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
      } else if (wicketDetails.dismissedPlayerId === nonStriker?.id) {
        nextNonStrikerId = nextBatsman ? nextBatsman.id : (nextNonStrikerId || '');
      }
    }

    // Physical runs ran (bat or bye/leg-bye)
    const physicalRunsRan = runsBat + (extraType === 'bye' || extraType === 'legBye' ? extraRuns : 0);
    const isOddRuns = physicalRunsRan % 2 !== 0;
    if (isOddRuns) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    if (shouldSwapStrikeOnOver) {
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
  const handleUndoLastBall = () => {
    if (isUndoingRef.current) return;
    if (currentInnings.balls.length === 0) return;
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
    const fielder = bowlingSquad.find((p) => p.id === fielderId);

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
        return 'Direct Roof Out (ਛੱਤ ਤੋਂ ਬਾਹਰ)';
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
                  disabled={currentInnings.balls.length === 0 || isUndoingRef.current}
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
                      Scored by <strong className="text-amber-400 font-mono">{match.delegatedScorerName || match.creatorName || match.creatorProfileId || 'Match Official'}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Live ball-by-ball updates, wagon wheels, and stats are updating automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setCentreTab('scorecard')}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scorecard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCentreTab('wheel')}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition border border-slate-700"
                >
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Wagon</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: WAGON WHEEL VISUALIZER */}
      {centreTab === 'wheel' && (
        <div className="space-y-4">
          <WagonWheelView
            balls={currentInnings.balls}
            strikerName={striker?.name}
            battingTeamName={battingTeam.name}
          />
        </div>
      )}

      {/* TAB 2: SCORECARD VIEW (Read-Only) */}
      {centreTab === 'scorecard' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {availableInningsList.map((innNum) => {
              const inn = getDisplayInnings(innNum);
              const teams = getTeamsForInningsNum(innNum);
              const isSelected = viewInningsNum === innNum;
              return (
                <button
                  key={innNum}
                  type="button"
                  onClick={() => setViewInningsNum(innNum)}
                  className={`px-4 py-2 rounded-2xl border text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{formatInningsOrdinal(innNum, true)}</span>
                  <span className="font-mono text-[10px] opacity-90">
                    ({teams.battingTeam.shortName || teams.battingTeam.name.slice(0, 3)}: {inn.totalRuns}/{inn.totalWickets})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{displayTeams.battingTeam.name}</h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {formatInningsOrdinal(viewInningsNum)}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-emerald-400 text-lg font-black block">
                  {displayInnings.totalRuns}/{displayInnings.totalWickets}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {displayInnings.oversCompleted}.{displayInnings.ballsInCurrentOver} overs
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Batsman</th>
                    <th className="p-2.5">Dismissal</th>
                    <th className="p-2.5 text-right">R</th>
                    <th className="p-2.5 text-right">B</th>
                    <th className="p-2.5 text-right">4s</th>
                    <th className="p-2.5 text-right">6s</th>
                    <th className="p-2.5 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(displayInnings.battingStats || {}).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 italic">No batting data recorded.</td>
                    </tr>
                  ) : (
                    Object.values(displayInnings.battingStats || {}).map((b) => (
                      <tr key={b.playerId} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-sans font-bold text-white">
                          {b.playerName} {!b.isOut && <span className="text-amber-400">*</span>}
                        </td>
                        <td className="p-2.5 font-sans text-slate-400 text-[11px]">
                          {b.isOut ? (
                            <span className="text-rose-300 font-medium">{b.dismissalText || 'out'}</span>
                          ) : (
                            <span className="text-emerald-400 font-black">not out</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-white">{b.runs}</td>
                        <td className="p-2.5 text-right text-slate-400">{b.balls}</td>
                        <td className="p-2.5 text-right text-slate-300">{b.fours}</td>
                        <td className="p-2.5 text-right text-purple-400 font-bold">{b.sixes}</td>
                        <td className="p-2.5 text-right text-cyan-400 font-bold">{b.strikeRate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
              <span className="font-sans font-bold uppercase text-[10px] text-slate-400">Extras</span>
              <span>
                <strong className="text-amber-400 font-black">{displayInnings.extras?.total || 0}</strong>{' '}
                <span className="text-slate-500 text-[10px]">
                  (b {displayInnings.extras?.byes || 0}, lb {displayInnings.extras?.legByes || 0}, wd {displayInnings.extras?.wides || 0}, nb {displayInnings.extras?.noBalls || 0})
                </span>
              </span>
            </div>

            <div className="overflow-x-auto pt-2">
              <span className="text-[11px] font-sans font-black uppercase text-slate-400 block mb-1">
                Bowling Figures ({displayTeams.bowlingTeam.name})
              </span>
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-sans border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Bowler</th>
                    <th className="p-2.5 text-right">O</th>
                    <th className="p-2.5 text-right">M</th>
                    <th className="p-2.5 text-right">R</th>
                    <th className="p-2.5 text-right">W</th>
                    <th className="p-2.5 text-right">Econ</th>
                    <th className="p-2.5 text-right">0s</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(displayInnings.bowlingStats || {}).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 italic">No bowling data recorded.</td>
                    </tr>
                  ) : (
                    Object.values(displayInnings.bowlingStats || {}).map((bw) => (
                      <tr key={bw.playerId} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-sans font-bold text-white">{bw.playerName}</td>
                        <td className="p-2.5 text-right text-slate-300 font-bold">{bw.overs}.{bw.balls}</td>
                        <td className="p-2.5 text-right text-slate-400">{bw.maidens}</td>
                        <td className="p-2.5 text-right text-slate-200">{bw.runs}</td>
                        <td className="p-2.5 text-right font-black text-emerald-400">{bw.wickets}</td>
                        <td className="p-2.5 text-right text-cyan-400">{bw.economy}</td>
                        <td className="p-2.5 text-right text-slate-400">{bw.dots}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {displayInnings.fallOfWickets && displayInnings.fallOfWickets.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-sans font-black uppercase text-slate-400 block mb-1">
                  Fall of Wickets
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {displayInnings.fallOfWickets.map((f, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                      <strong className="text-white">{f.score}-{f.wicketNumber}</strong> ({f.playerName}, {f.over} ov)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUPER STARS (MVP RANKINGS) */}
      {centreTab === 'superstars' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 rounded-2xl bg-slate-950 border border-slate-800 scrollbar-none">
              {[
                { key: 'best_economy', label: 'Best Economy' },
                { key: 'most_maidens', label: 'Most Maidens' },
                { key: 'bowl_dots', label: 'Bowl Dots' },
                { key: 'mvp', label: 'MVP' },
                { key: 'top_scorers', label: 'Top Scorers' },
                { key: 'most_wickets', label: 'Most Wickets' },
              ].map((sub) => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setMvpFilterTab(sub.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    mvpFilterTab === sub.key
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMvpRulesModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto sm:ml-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>MVP Rules</span>
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {mvpScores.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 italic">
                No match performance recorded yet. Start scoring to see live MVP rankings!
              </div>
            ) : (
              (() => {
                let displayedPlayers = [...mvpScores];
                if (mvpFilterTab === 'top_scorers') {
                  displayedPlayers.sort((a, b) => b.runsScored - a.runsScored);
                } else if (mvpFilterTab === 'most_wickets') {
                  displayedPlayers.sort((a, b) => b.wicketsTaken - a.wicketsTaken);
                } else if (mvpFilterTab === 'best_economy') {
                  displayedPlayers = displayedPlayers
                    .filter((p) => p.oversBowled > 0)
                    .sort((a, b) => a.economy - b.economy);
                } else if (mvpFilterTab === 'most_maidens') {
                  displayedPlayers = displayedPlayers
                    .filter((p) => p.maidens > 0)
                    .sort((a, b) => b.maidens - a.maidens);
                } else if (mvpFilterTab === 'bowl_dots') {
                  displayedPlayers = displayedPlayers
                    .filter((p) => p.dotBalls > 0)
                    .sort((a, b) => b.dotBalls - a.dotBalls);
                } else {
                  displayedPlayers.sort((a, b) => b.totalPoints - a.totalPoints);
                }

                return displayedPlayers.map((p, idx) => {
                  const isMom = match.result?.playerOfTheMatch?.playerId === p.playerId;
                  const barTotal = Math.max(0.0001, p.battingPoints + p.bowlingPoints + p.fieldingPoints);
                  const batPct = Math.max(0, (p.battingPoints / barTotal) * 100);
                  const bowlPct = Math.max(0, (p.bowlingPoints / barTotal) * 100);
                  const fieldPct = Math.max(0, (p.fieldingPoints / barTotal) * 100);
                  return (
                    <div
                      key={p.playerId}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-teal-600/30 border border-teal-500 text-teal-300 font-mono text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>

                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-black text-white shrink-0 border border-slate-700">
                            {p.playerName.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white truncate">{p.playerName}</span>
                              {isMom && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shrink-0">
                                  MOM
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-bold block truncate">{p.teamName}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          {mvpFilterTab === 'top_scorers' ? (
                            <>
                              <span className="font-black text-amber-400 text-base">{p.runsScored} runs</span>
                              <span className="text-[11px] text-slate-400 block">{p.ballsFaced} balls (SR: {p.strikeRate.toFixed(1)})</span>
                            </>
                          ) : mvpFilterTab === 'most_wickets' ? (
                            <>
                              <span className="font-black text-emerald-400 text-base">{p.wicketsTaken} wkts</span>
                              <span className="text-[11px] text-slate-400 block">{p.oversBowled} ov • {p.runsConceded} runs</span>
                            </>
                          ) : mvpFilterTab === 'best_economy' ? (
                            <>
                              <span className="font-black text-cyan-400 text-base">{p.economy.toFixed(2)} Econ</span>
                              <span className="text-[11px] text-slate-400 block">{p.oversBowled} ov ({p.runsConceded}r/{p.wicketsTaken}w)</span>
                            </>
                          ) : mvpFilterTab === 'most_maidens' ? (
                            <>
                              <span className="font-black text-purple-400 text-base">{p.maidens} Maidens</span>
                              <span className="text-[11px] text-slate-400 block">{p.oversBowled} overs bowled</span>
                            </>
                          ) : mvpFilterTab === 'bowl_dots' ? (
                            <>
                              <span className="font-black text-teal-400 text-base">{p.dotBalls} Dot Balls</span>
                              <span className="text-[11px] text-slate-400 block">{p.oversBowled} overs bowled</span>
                            </>
                          ) : (
                            <>
                              <span className="font-black text-amber-400 text-base">{p.totalPoints.toFixed(1)}</span>
                              <span className="text-[11px] text-slate-400 block font-sans">
                                Bat <strong className="text-slate-200">{p.battingPoints.toFixed(1)}</strong>{' '}
                                Bowl <strong className="text-slate-200">{p.bowlingPoints.toFixed(1)}</strong>{' '}
                                Field <strong className="text-slate-200">{p.fieldingPoints.toFixed(1)}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {mvpFilterTab === 'mvp' && (
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-900">
                          {batPct > 0 && <div className="bg-amber-400" style={{ width: `${batPct}%` }} />}
                          {bowlPct > 0 && <div className="bg-emerald-400" style={{ width: `${bowlPct}%` }} />}
                          {fieldPct > 0 && <div className="bg-cyan-400" style={{ width: `${fieldPct}%` }} />}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STATS */}
      {centreTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                🏏 Top Scorers
              </span>
              <div className="space-y-1.5">
                {Object.values(currentInnings.battingStats || {})
                  .sort((a, b) => b.runs - a.runs)
                  .slice(0, 3)
                  .map((b, i) => (
                    <div key={b.playerId} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 truncate">{i + 1}. {b.playerName}</span>
                      <span className="font-mono font-bold text-white">{b.runs} ({b.balls}b)</span>
                    </div>
                  ))}
              </div>
            </div>


            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                🎯 Top Bowlers
              </span>
              <div className="space-y-1.5">
                {Object.values(currentInnings.bowlingStats || {})
                  .sort((a, b) => b.wickets - a.wickets)
                  .slice(0, 3)
                  .map((bw, i) => (
                    <div key={bw.playerId} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 truncate">{i + 1}. {bw.playerName}</span>
                      <span className="font-mono font-bold text-emerald-400">{bw.wickets}/{bw.runs}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
                ⚡ Best Economy
              </span>
              <div className="space-y-1.5">
                {Object.values(currentInnings.bowlingStats || {})
                  .filter((bw) => bw.overs > 0 || bw.balls > 0)
                  .sort((a, b) => a.economy - b.economy)
                  .slice(0, 3)
                  .map((bw, i) => (
                    <div key={bw.playerId} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 truncate">{i + 1}. {bw.playerName}</span>
                      <span className="font-mono font-bold text-cyan-400">{bw.economy} ({bw.dots} dots)</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BALLS */}
      {centreTab === 'balls' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {availableInningsList.map((innNum) => {
                const teams = getTeamsForInningsNum(innNum);
                const isSelected = viewInningsNum === innNum;
                return (
                  <button
                    key={innNum}
                    type="button"
                    onClick={() => setViewInningsNum(innNum)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {formatInningsOrdinal(innNum, true)} ({teams.battingTeam.shortName || teams.battingTeam.name.slice(0, 3)})
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {displayInnings.balls.length} total deliveries
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {displayInnings.balls.length === 0 ? (
              <p className="text-center text-slate-500 italic py-6">No deliveries bowled in this innings yet.</p>
            ) : (
              (() => {
                const overGroups = new Map<number, typeof displayInnings.balls>();
                displayInnings.balls.forEach((b) => {
                  const key = b.overNumber;
                  if (!overGroups.has(key)) overGroups.set(key, []);
                  overGroups.get(key)!.push(b);
                });
                const sortedOverNumbers = Array.from(overGroups.keys()).sort((a, b) => b - a);

                return sortedOverNumbers.map((overNum) => {
                  const ballsInOver = overGroups.get(overNum)!;
                  const snap = overEndSnapshots.get(overNum);

          
                              return (
            <div key={overNum} className="space-y-1.5">
              {/* OVER SUMMARY AB UPAR HAI */}
              {snap && (
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 p-3.5 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-xs border border-emerald-500/30">
                        Over {overNum + 1}
                      </span>
                      <span className="text-xs font-black text-amber-400">
                        Runs in this over: {snap.overRuns} {snap.overWickets > 0 ? `(${snap.overWickets} W)` : ''}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-white">
                      Total: {snap.teamRuns}-{snap.teamWickets}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ballsInOver.map((b) => (
                      <span
                        key={b.id}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                          b.isWicket && b.wicketType === 'retired_hurt'
                            ? 'bg-blue-600 text-white'
                            : b.isWicket
                            ? 'bg-rose-600 text-white'
                            : b.isSix
                            ? 'bg-purple-600 text-white'
                            : b.isFour
                            ? 'bg-blue-600 text-white'
                            : b.extraType !== 'none'
                            ? 'bg-transparent border border-slate-500 text-slate-300'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {b.isWicket && b.wicketType === 'retired_hurt'
                          ? 'RH'
                          : b.isWicket
                          ? 'W'
                          : b.extraType === 'wide'
                          ? 'Wd'
                          : b.extraType === 'noBall'
                          ? 'Nb'
                          : b.extraType === 'bye'
                          ? 'B'
                          : b.extraType === 'legBye'
                          ? 'Lb'
                          : b.runsBat}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-slate-800/80 pt-2">
                    <span className="text-slate-200 font-bold truncate">
                      {snap.strikerName} <span className="text-slate-400 font-mono">{snap.strikerRuns}({snap.strikerBalls})</span>
                    </span>
                    <span className="text-slate-200 font-bold truncate text-right">{snap.bowlerName}</span>
                    <span className="text-slate-200 font-bold truncate">
                      {snap.nonStrikerName} <span className="text-slate-400 font-mono">{snap.nonStrikerRuns}({snap.nonStrikerBalls})</span>
                    </span>
                    <span className="text-slate-400 font-mono text-right">{snap.bowlerFigure}</span>
                  </div>
                </div>
              )}

              {/* BALLS WALA LOOP AB SUMMARY KE NICHE HAI */}
              {[...ballsInOver].reverse().map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBallDetail(b)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                    b.isWicket && b.wicketType === 'retired_hurt'
                      ? 'bg-blue-950/30 border-blue-800/60 hover:bg-blue-950/50'
                      : b.isWicket
                      ? 'bg-rose-950/30 border-rose-800/60 hover:bg-rose-950/50'
                      : b.isSix
                      ? 'bg-purple-950/30 border-purple-800/60 hover:bg-purple-950/50'
                      : b.isFour
                      ? 'bg-emerald-950/30 border-emerald-800/60 hover:bg-emerald-950/50'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-black text-xs text-white">
                      {b.displayOver}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{b.bowlerName} to {b.strikerName}</span>
                        {b.isWicket && (
                          <span className={`px-1.5 py-0.2 rounded text-white font-black text-[9px] uppercase ${b.wicketType === 'retired_hurt' ? 'bg-blue-600' : 'bg-rose-600'}`}>
                            {b.wicketType === 'retired_hurt' ? 'Retired Hurt' : 'Wicket'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md">{b.commentary}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-base font-black font-mono ${
                      b.isWicket && b.wicketType === 'retired_hurt' ? 'text-blue-400' : b.isWicket ? 'text-rose-400' : b.isSix ? 'text-purple-400' : b.isFour ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {b.isWicket && b.wicketType === 'retired_hurt' ? 'RH' : b.isWicket ? 'W' : b.extraType === 'wide' ? `${b.extraRuns}wd` : b.extraType === 'noBall' ? `${b.runsBat + b.extraRuns}nb` : b.extraType === 'bye' ? `${b.extraRuns}b` : b.extraType === 'legBye' ? `${b.extraRuns}lb` : b.runsBat}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        });
      })()
    )}
          </div>
        </div>
      )}

      {/* TAB 6: SQUADS */}
      {centreTab === 'squads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-white">Match Squads</h3>
            {canScore && (
              <button
                onClick={onOpenSquadModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Squad</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-emerald-400 block">{match.teamA.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {playingPlayersA.length} Playing
                </span>
              </div>
              <div className="space-y-1">
                {playingPlayersA.map((p) => {
                  const isC = (match.captainA || match.teamA.captainId) === p.id;
                  const isVC = (match.viceCaptainA || match.teamA.viceCaptainId) === p.id;
                  const isWK = (match.keeperA || match.teamA.wicketKeeperId) === p.id;
                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.profileId}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-black">
                        {isC && <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">C</span>}
                        {isVC && <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">VC</span>}
                        {isWK && <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">WK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-amber-400 block">{match.teamB.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {playingPlayersB.length} Playing
                </span>
              </div>
              <div className="space-y-1">
                {playingPlayersB.map((p) => {
                  const isC = (match.captainB || match.teamB.captainId) === p.id;
                  const isVC = (match.viceCaptainB || match.teamB.viceCaptainId) === p.id;
                  const isWK = (match.keeperB || match.teamB.wicketKeeperId) === p.id;
                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.profileId}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-black">
                        {isC && <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">C</span>}
                        {isVC && <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">VC</span>}
                        {isWK && <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">WK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM RUNS MODAL */}
      {isCustomRunsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-white text-base">Record Custom Runs</h4>
              <button
                onClick={() => setIsCustomRunsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5, 7, 8, 10].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    handleScoreBall(r, 'none', 0);
                    setIsCustomRunsModalOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-orange-600 text-white font-mono font-black text-xl transition cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold block">Or enter exact runs:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={customRunsValue}
                  onChange={(e) => setCustomRunsValue(Number(e.target.value))}
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold font-mono text-center text-lg"
                />
                <button
                  onClick={() => {
                    handleScoreBall(customRunsValue, 'none', 0);
                    setIsCustomRunsModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs cursor-pointer"
                >
                  Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SWITCH BATSMAN MODAL */}
      {isBatsmanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-white text-base">Switch / Select Active Batsman</h4>
              <button
                onClick={() => setIsBatsmanModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBatsmanModalRole('striker')}
                className={`p-2.5 rounded-xl border text-xs font-bold ${
                  batsmanModalRole === 'striker' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Striker ({striker?.name || 'Empty'})
              </button>
              <button
                onClick={() => setBatsmanModalRole('nonStriker')}
                className={`p-2.5 rounded-xl border text-xs font-bold ${
                  batsmanModalRole === 'nonStriker' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Non-Striker ({nonStriker?.name || 'Empty'})
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {battingSquad.map((p) => {
                const bStats = currentInnings.battingStats[p.id];
                const isCurrent = p.id === (batsmanModalRole === 'striker' ? striker?.id : nonStriker?.id);
                const isOut = bStats?.isOut && !bStats?.isRetiredHurt;
                const isRetiredHurt = bStats?.isRetiredHurt;

                return (
                  <button
                    key={p.id}
                    disabled={isOut}
                    onClick={() => {
                      if (batsmanModalRole === 'striker') {
                        onUpdateMatch({ ...match, currentStrikerId: p.id, updatedAt: Date.now() });
                      } else {
                        onUpdateMatch({ ...match, currentNonStrikerId: p.id, updatedAt: Date.now() });
                      }
                      setIsBatsmanModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : isRetiredHurt
                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/40 font-bold'
                        : isOut
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-500'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{p.name}</span>
                      {isRetiredHurt && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                          🏥 Retired Hurt (Eligible to Bat)
                        </span>
                      )}
                      {isOut && <span className="ml-1.5 text-rose-400 font-bold">(Out)</span>}
                    </div>
                    <span className="font-mono text-slate-400">{bStats ? `${bStats.runs}(${bStats.balls}b)` : '0(0)'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-ON / 3RD INNINGS CAPTAIN DECISION MODAL */}
      {match.awaitingFollowOnDecision && canScore && (
        <div className="fixed inset-0 z-[62] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-lg shadow-orange-500/20">
                👑
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Test Match • Captain's Strategic Call
                </span>
                <h3 className="font-black text-lg text-white">3rd Innings Declaration</h3>
              </div>
            </div>

            {(() => {
              const leadMargin = inn1Runs - inn2Runs;
              const hasLead = leadMargin > 0;
              const isLevel = leadMargin === 0;

              return (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 divide-x divide-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{teamA.name}</span>
                      <span className="text-base font-black font-mono text-white">
                        1st Inn: {inn1Runs}/{match.innings1?.totalWickets || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{teamB.name}</span>
                      <span className="text-base font-black font-mono text-white">
                        1st Inn: {inn2Runs}/{match.innings2?.totalWickets || 0}
                      </span>
                    </div>
                  </div>

                  <div className="text-center pt-2 border-t border-slate-800/80">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase font-mono ${
                        isLevel
                          ? 'bg-slate-800 text-slate-300'
                          : hasLead
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isLevel
                        ? 'Scores are Level'
                        : hasLead
                        ? `${teamA.name} leads by ${leadMargin} runs`
                        : `${teamB.name} leads by ${Math.abs(leadMargin)} runs`}
                    </span>
                  </div>
                </div>
              );
            })()}

            <p className="text-xs text-slate-400 text-center">
              Both teams have completed their 1st innings. <strong className="text-white">{bowlingTeam.name}</strong> captain, choose whether to bat now or enforce follow-on:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  cricketAudio.playClick(`${bowlingTeam.name} chose to bat again`);
                  onUpdateMatch({
                    ...match,
                    status: 'live',
                    awaitingFollowOnDecision: false,
                    followOnDecision: 'bat_again',
                    currentInningsNumber: 3,
                    currentStrikerId: bowlingSquad[0]?.id || 'p1',
                    currentNonStrikerId: bowlingSquad[1]?.id || 'p2',
                    currentBowlerId: battingSquad[0]?.id || 'b1',
                    updatedAt: Date.now(),
                  });
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-left transition shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95 border border-emerald-500/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">🏏</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">Standard</span>
                </div>
                <h4 className="font-black text-sm text-white">Bat Again</h4>
                <p className="text-[10px] text-emerald-100 opacity-90 mt-0.5">
                  {bowlingTeam.name} bats in 3rd innings to set target.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  cricketAudio.playClick(`${bowlingTeam.name} enforced follow on`);
                  onUpdateMatch({
                    ...match,
                    status: 'live',
                    awaitingFollowOnDecision: false,
                    followOnDecision: 'enforce_follow_on',
                    currentInningsNumber: 3,
                    currentStrikerId: battingSquad[0]?.id || 'p1',
                    currentNonStrikerId: battingSquad[1]?.id || 'p2',
                    currentBowlerId: bowlingSquad[0]?.id || 'b1',
                    updatedAt: Date.now(),
                  });
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white text-left transition shadow-lg shadow-amber-600/20 cursor-pointer active:scale-95 border border-amber-500/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">🎯</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">Aggressive</span>
                </div>
                <h4 className="font-black text-sm text-white">Enforce Follow-On</h4>
                <p className="text-[10px] text-amber-100 opacity-90 mt-0.5">
                  Make {battingTeam.name} bat again immediately.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE BOWLER MODAL (Point 5 Fix: Scorer override without hard-freeze) */}
      {needsNewInningsSetup && canScore && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-emerald-400">
                🏏 {formatInningsOrdinal(currentInningsNum)} Begins
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {battingTeam.name} batting, {bowlingTeam.name} bowling. Pick the openers and opening
                bowler to start.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Striker (on strike)
                </label>
                <select
                  value={newInningsStrikerId || match.currentStrikerId || ''}
                  onChange={(e) => setNewInningsStrikerId(e.target.value)}
                  className="w-full mt-1 text-sm font-bold bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  {battingSquad.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Non-Striker
                </label>
                <select
                  value={newInningsNonStrikerId || match.currentNonStrikerId || ''}
                  onChange={(e) => setNewInningsNonStrikerId(e.target.value)}
                  className="w-full mt-1 text-sm font-bold bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  {battingSquad
                    .filter((p) => p.id !== (newInningsStrikerId || match.currentStrikerId))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Opening Bowler
                </label>
                <select
                  value={newInningsBowlerId || match.currentBowlerId || ''}
                  onChange={(e) => setNewInningsBowlerId(e.target.value)}
                  className="w-full mt-1 text-sm font-bold bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  {bowlingSquad.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                const finalStriker = newInningsStrikerId || match.currentStrikerId;
                const finalNonStriker = newInningsNonStrikerId || match.currentNonStrikerId;
                const finalBowler = newInningsBowlerId || match.currentBowlerId;
                cricketAudio.playClick(`Innings ${currentInningsNum} starting`);
                onUpdateMatch({
                  ...match,
                  currentStrikerId: finalStriker,
                  currentNonStrikerId: finalNonStriker,
                  currentBowlerId: finalBowler,
                  updatedAt: Date.now(),
                });
                setNewInningsStrikerId('');
                setNewInningsNonStrikerId('');
                setNewInningsBowlerId('');
                setConfirmedInningsSetupFor(currentInningsNum);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm cursor-pointer"
            >
              Start {formatInningsOrdinal(currentInningsNum)}
            </button>
          </div>
        </div>
      )}

      {isBowlerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-black text-sm">
                  ⚡
                </div>
                <h3 className="font-black text-base text-cyan-400">Select Next Bowler</h3>
              </div>
              <button
                onClick={() => setIsBowlerModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const justFinishedOverNumber = currentInnings.oversCompleted - 1;
              const thisOverBalls = currentInnings.balls.filter((b) => b.overNumber === justFinishedOverNumber);
              if (thisOverBalls.length === 0) return null;
              const overRuns = thisOverBalls.reduce((sum, b) => sum + b.runsBat + b.extraRuns, 0);
              const overWickets = thisOverBalls.filter((b) => b.isWicket && b.wicketType !== 'retired_hurt').length;
              const overBowlerId = thisOverBalls[0]?.bowlerId || '';
              const bowlerName = thisOverBalls[0]?.bowlerName || '';
              const bowlerFig = currentInnings.bowlingStats[overBowlerId];
              const lastBallOfOver = thisOverBalls[thisOverBalls.length - 1];
              const strikerWasOut = lastBallOfOver.isWicket && lastBallOfOver.dismissedPlayerId === lastBallOfOver.strikerId;
              const nonStrikerWasOut = lastBallOfOver.isWicket && lastBallOfOver.dismissedPlayerId === lastBallOfOver.nonStrikerId;
              const strikerStat = currentInnings.battingStats[lastBallOfOver.strikerId];
              const nonStrikerStat = currentInnings.battingStats[lastBallOfOver.nonStrikerId];
              return (
                <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-300">
                      Over {justFinishedOverNumber + 1} • {bowlerName}
                    </span>
                    <span className="text-xs font-mono font-black text-white">
                      {overRuns} run{overRuns === 1 ? '' : 's'}{overWickets > 0 ? ` • ${overWickets} wkt${overWickets === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {thisOverBalls.map((b) => (
                      <span
                        key={b.id}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-black ${
                          b.isWicket && b.wicketType === 'retired_hurt'
                            ? 'bg-blue-600 text-white'
                            : b.isWicket
                            ? 'bg-rose-600 text-white'
                            : b.isSix
                            ? 'bg-purple-600 text-white'
                            : b.isFour
                            ? 'bg-emerald-600 text-white'
                            : b.extraType !== 'none'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-200'
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
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-cyan-900/40 pt-2">
                    <span className="text-slate-200 font-bold truncate">
                      {strikerStat?.playerName || 'Striker'} <span className="text-slate-400 font-mono">{strikerWasOut ? 'out' : `${strikerStat?.runs ?? 0}(${strikerStat?.balls ?? 0})`}</span>
                    </span>
                    <span className="text-slate-200 font-bold truncate text-right">
                      {bowlerName}
                    </span>
                    <span className="text-slate-200 font-bold truncate">
                      {nonStrikerStat?.playerName || 'Non-Striker'} <span className="text-slate-400 font-mono">{nonStrikerWasOut ? 'out' : `${nonStrikerStat?.runs ?? 0}(${nonStrikerStat?.balls ?? 0})`}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-right">
                      {bowlerFig ? `${bowlerFig.overs}.${bowlerFig.balls}-${bowlerFig.maidens}-${bowlerFig.runs}-${bowlerFig.wickets}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-cyan-900/40 pt-2 text-[11px] font-black">
                    <span className="text-emerald-400">Overs {currentInnings.oversCompleted}</span>
                    <span className="text-emerald-400">Runs {currentInnings.totalRuns}</span>
                    <span className="text-emerald-400">Score {currentInnings.totalRuns}-{currentInnings.totalWickets}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {bowlingSquad.map((p) => {
                const bStats = currentInnings.bowlingStats[p.id];
                const isCurrent = p.id === match.currentBowlerId;
                const oversDone = bStats ? `${bStats.overs}.${bStats.balls}` : '0.0';
                const maxOversLimit = match.settings.maxOversPerBowler || 2;
                const isOverLimit = !isTestMatch && bStats && bStats.overs >= maxOversLimit;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      cricketAudio.playClick(`New bowler ${p.name}`);
                      onUpdateMatch({
                        ...match,
                        currentBowlerId: p.id,
                        updatedAt: Date.now(),
                      });
                      setIsBowlerModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-black'
                        : isOverLimit
                        ? 'bg-amber-950/20 border-amber-800/60 text-amber-300 hover:bg-amber-900/30'
                        : isDarkMode
                        ? 'bg-slate-950 border-slate-800 hover:border-cyan-500/50'
                        : 'bg-slate-50 border-slate-200 hover:bg-cyan-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs block text-white">{p.name}</span>
                        {isOverLimit && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                            Quota Finished
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{p.bowlingStyle}</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-cyan-400">
                        {bStats ? `${bStats.wickets}/${bStats.runs}` : '0/0'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {oversDone}{!isTestMatch ? `/${maxOversLimit} ov` : ' ov'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsBowlerModalOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Declare Innings confirmation */}
      {isDeclareConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-xl shrink-0">
                🏳️
              </div>
              <div>
                <h3 className="font-black text-base text-white">Declare Innings?</h3>
                <p className="text-[11px] text-slate-400">This ends the innings early and moves to the next one.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">{battingTeam.name}</span>
              <span className="text-2xl font-black text-white font-mono">
                {currentInnings.totalRuns}/{currentInnings.totalWickets}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsDeclareConfirmOpen(false)}
                className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeclareInnings}
                className="py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Declare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wide / No Ball quick-select */}
      {activeExtraPanel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setActiveExtraPanel(null)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-amber-500 p-4 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveExtraPanel(null)}
                className="p-1.5 rounded-xl bg-black/10 text-slate-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-lg text-slate-950">
                {activeExtraPanel === 'wide' ? 'Wide' : 'No Ball'}
              </h3>
              <div className="w-8" />
            </div>

            {activeExtraPanel === 'wide' ? (
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((extraRun) => (
                  <button
                    key={extraRun}
                    onClick={() => {
                      const wideBase = match.settings.wideRuns || 1;
                      handleScoreBall(0, 'wide', wideBase + extraRun);
                      setActiveExtraPanel(null);
                    }}
                    className="py-3 rounded-2xl bg-slate-950 text-white font-black text-sm cursor-pointer active:scale-90 transition"
                  >
                    {extraRun === 0 ? 'Wd' : `${extraRun}+Wd`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map((runsOffBat) => (
                  <button
                    key={runsOffBat}
                    onClick={() => {
                      const noBallBase = match.settings.noBallRuns || 1;
                      handleScoreBall(runsOffBat, 'noBall', noBallBase);
                      setActiveExtraPanel(null);
                    }}
                    className="py-3 rounded-2xl bg-slate-950 text-white font-black text-sm cursor-pointer active:scale-90 transition"
                  >
                    {runsOffBat === 0 ? 'NB' : `${runsOffBat}NB`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WICKET RECORD MODAL */}
      {isWicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white font-black text-sm">
                  🚨
                </div>
                <h3 className="font-black text-base text-rose-400">Record Wicket (OUT)</h3>
              </div>
              <button
                onClick={() => setIsWicketModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block uppercase">
                Who was dismissed?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDismissedRole('striker')}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition ${
                    dismissedRole === 'striker'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 font-black'
                      : isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] block text-slate-400">Striker</span>
                  <span className="font-bold text-xs">{striker?.name || 'Striker'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedRole('nonStriker')}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition ${
                    dismissedRole === 'nonStriker'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 font-black'
                      : isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] block text-slate-400">Non-Striker</span>
                  <span className="font-bold text-xs">{nonStriker?.name || 'Non-Striker'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block uppercase">
                Dismissal Method
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { type: 'direct_roof_out', label: '⚠️ Direct Roof Out', desc: 'ਛੱਤ ਤੋਂ ਬਾਹਰ' },
                  { type: 'wall_catch', label: '🧱 Wall Catch', desc: 'ਕੰਧ ਲੱਗ ਕੇ' },
                  { type: 'bowled', label: '🎯 Bowled', desc: 'Clean bowled' },
                  { type: 'caught', label: '🧤 Caught (Field)', desc: 'Field catch' },
                  { type: 'runout', label: '⚡ Run Out', desc: 'Run out' },
                  { type: 'stumped', label: '⚡ Stumped', desc: 'Keeper stumping' },
                  { type: 'lbw', label: '☝️ LBW', desc: 'Leg before' },
                  { type: 'hitwicket', label: '🤦‍♂️ Hit Wicket', desc: 'Dislodged stumps' },
                  { type: 'retired_hurt', label: '🏥 Retired Hurt', desc: 'Injured / Out' },
                  { type: 'retired', label: '🚪 Retired Out', desc: 'Tactical retirement' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setWicketType(item.type as WicketType)}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                      wicketType === item.type
                        ? 'bg-rose-600 text-white border-rose-400 font-black shadow-md'
                        : isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="font-black block text-xs">{item.label}</span>
                    <span className={`text-[9px] ${wicketType === item.type ? 'text-rose-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {['caught', 'wall_catch', 'runout', 'stumped'].includes(wicketType) && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">
                  Fielder / Catcher
                </label>
                <select
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="">Select Fielder...</option>
                  {bowlingSquad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsWicketModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWicket}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END MATCH MODAL */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-base font-bold shadow-md">
                  🏆
                </div>
                <div>
                  <h3 className="font-black text-base text-white">End Match & Declare Result</h3>
                  <p className="text-[10px] text-slate-400">Award Player of the Match & finalize scorecards</p>
                </div>
              </div>
              <button
                onClick={() => setIsEndMatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1.5 uppercase">Select Winning Team *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWinnerId(match.teamA.id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                      selectedWinnerId === match.teamA.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-black ring-2 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black block">{match.teamA.name}</span>
                    <span className="text-[10px] text-slate-400">Team 1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWinnerId(match.teamB.id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                      selectedWinnerId === match.teamB.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-black ring-2 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black block">{match.teamB.name}</span>
                    <span className="text-[10px] text-slate-400">Team 2</span>
                  </button>
                </div>
              </div>

              {recommendedMom && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Recommended Player of the Match (Rank #1 MVP)
                    </span>
                    <span className="font-mono font-black text-amber-300 text-xs">
                      {recommendedMom.totalPoints} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-white block">{recommendedMom.playerName}</span>
                      <span className="text-[10px] text-slate-400">
                        {recommendedMom.teamName} • {recommendedMom.battingSummary || '0 runs'} • {recommendedMom.bowlingSummary || '0 wkts'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMomId(recommendedMom.playerId)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                        selectedMomId === recommendedMom.playerId
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {selectedMomId === recommendedMom.playerId ? '✓ Selected' : 'Select MOM'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase">
                  Player of the Match (MOM) Selection (Ranked by MVP points)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {mvpScores.map((p, idx) => (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => setSelectedMomId(p.playerId)}
                      className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        selectedMomId === p.playerId
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-white">{p.playerName}</span>
                          <span className="text-[10px] text-slate-400 block">{p.teamName}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-black text-amber-400 text-xs">{p.totalPoints} pts</span>
                        <span className="text-[9px] text-slate-400 block">
                          Bat {p.battingPoints} • Bowl {p.bowlingPoints}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1 uppercase">Custom Victory Summary (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Kings won by 18 runs (Great captaincy!)"
                  value={customResultSummary}
                  onChange={(e) => setCustomResultSummary(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEndMatchModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalizeEndMatch}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Confirm & End Match 🏆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MVP RULES MODAL */}
      <PointsSystemModal isOpen={showMvpRulesModal} onClose={() => setShowMvpRulesModal(false)} />

      {/* BALL DETAIL MODAL */}
      {selectedBallDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-white text-base">Ball Detail • Over {selectedBallDetail.displayOver}</h4>
              <button
                onClick={() => setSelectedBallDetail(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Commentary</span>
                <p className="font-bold text-white text-sm mt-0.5">{selectedBallDetail.commentary}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Bowler</span>
                  <span className="font-bold text-cyan-400 text-xs">{selectedBallDetail.bowlerName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Striker</span>
                  <span className="font-bold text-emerald-400 text-xs">{selectedBallDetail.strikerName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Runs Off Bat</span>
                  <span className="font-bold text-white text-xs">{selectedBallDetail.runsBat}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block font-sans">Extras</span>
                  <span className="font-bold text-amber-400 text-xs">
                    {selectedBallDetail.extraType !== 'none' ? `${selectedBallDetail.extraRuns} (${selectedBallDetail.extraType})` : '0'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedBallDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* WAGON WHEEL MODAL */}
      {isWagonWheelModalOpen && (
        <WagonWheelModal
          isOpen={isWagonWheelModalOpen}
          runs={pendingWagonBall?.runsBat || 0}
          isWicket={pendingWagonBall?.isWicket}
          batterName={striker?.name}
          onClose={() => {
            setIsWagonWheelModalOpen(false);
            setPendingWagonBall(null);
          }}
          onSelectZone={(zone, selectedRuns, isWkt) => {
            setIsWagonWheelModalOpen(false);
            setPendingWagonBall(null);

            if (isWkt) {
              setIsWicketModalOpen(true);
            } else {
              handleScoreBall(
                selectedRuns,
                pendingWagonBall?.extraType || 'none',
                pendingWagonBall?.extraRunsVal || 0,
                false,
                undefined,
                zone
              );
            }
          }}
        />
      )}

      {/* BATTERY LOW DELEGATE MODAL */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <BatteryMedium className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Transfer Scoring Permission</h3>
                  <p className="text-xs text-amber-400 font-bold">🔋 Low Battery / Delegate to Friend</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDelegateModalOpen(false);
                  setDelegateSearchQuery('');
                  setDelegateSuccessMsg(null);
                  setDelegateErrorMsg(null);
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Is your mobile battery running low? Enter your friend's <strong>Profile ID (e.g. ARCL-002)</strong> or search below. Only they will receive permission to enter ball-by-ball score data for this match while you remain the official Match Creator.
            </p>

            {match.delegatedScorerProfileId ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">Currently Authorized Scorer</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {match.delegatedScorerName || 'Friend'} ({match.delegatedScorerProfileId})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated: Match = {
                      ...match,
                      delegatedScorerProfileId: undefined,
                      delegatedScorerName: undefined,
                    };
                    onUpdateMatch(updated);
                    cricketAudio.playClick('Scorer permission revoked');
                    setDelegateSuccessMsg('Scorer permission revoked. You now have exclusive scoring control.');
                    setTimeout(() => {
                      setDelegateSuccessMsg(null);
                    }, 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow transition"
                >
                  Revoke & Take Back
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">🔒 No friend delegated:</span>
                <span>You currently hold sole scoring rights for this match.</span>
              </div>
            )}

            {delegateSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{delegateSuccessMsg}</span>
              </div>
            )}
            {delegateErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{delegateErrorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Search Friend by Profile ID or Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={delegateSearchQuery}
                  onChange={(e) => {
                    setDelegateSearchQuery(e.target.value);
                    setDelegateErrorMsg(null);
                  }}
                  placeholder="e.g. ARCL-002, Raman, 98765..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                {delegateSearchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const q = delegateSearchQuery.trim().toLowerCase();
                      const pool = [...allPlayers, ...match.teamA.players, ...match.teamB.players];
                      const found = pool.find(
                        (p) =>
                          p.profileId?.toLowerCase() === q ||
                          p.id.toLowerCase() === q ||
                          p.name.toLowerCase() === q ||
                          (p.phoneNumber && p.phoneNumber.toLowerCase() === q)
                      );

                      if (found) {
                        const updated: Match = {
                          ...match,
                          delegatedScorerProfileId: found.profileId || found.id,
                          delegatedScorerName: found.name,
                        };
                        onUpdateMatch(updated);
                        cricketAudio.playClick('Scorer permission delegated');
                        setDelegateSuccessMsg(`Scoring permission granted to ${found.name} (${found.profileId || found.id})!`);
                        setTimeout(() => {
                          setDelegateSuccessMsg(null);
                          setIsDelegateModalOpen(false);
                        }, 2000);
                      } else {
                        const updated: Match = {
                          ...match,
                          delegatedScorerProfileId: delegateSearchQuery.trim().toUpperCase(),
                          delegatedScorerName: `Friend (${delegateSearchQuery.trim().toUpperCase()})`,
                        };
                        onUpdateMatch(updated);
                        cricketAudio.playClick('Scorer permission delegated');
                        setDelegateSuccessMsg(`Scoring permission assigned to Profile ID "${delegateSearchQuery.trim().toUpperCase()}"!`);
                        setTimeout(() => {
                          setDelegateSuccessMsg(null);
                          setIsDelegateModalOpen(false);
                        }, 2000);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition"
                  >
                    Authorize
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                Quick Select from Registered Players
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(() => {
                  const pool = [...(allPlayers || []), ...(match?.teamA?.players || []), ...(match?.teamB?.players || [])];
                  const uniquePool: Player[] = [];
                  const seen = new Set<string>();
                  pool.forEach((p) => {
                    if (p && p.id && !seen.has(p.id)) {
                      seen.add(p.id);
                      if (p.id !== loggedInPlayer?.id && p.profileId !== loggedInPlayer?.profileId) {
                        uniquePool.push(p);
                      }
                    }
                  });

                  const filtered = uniquePool.filter((p) => {
                    if (!delegateSearchQuery.trim()) return true;
                    const q = delegateSearchQuery.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.profileId && p.profileId.toLowerCase().includes(q)) ||
                      (p.phoneNumber && p.phoneNumber.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-center text-xs text-slate-500 py-3">
                        No matching players found. Type a Profile ID above to authorize.
                      </p>
                    );
                  }

                  return filtered.map((p) => {
                    const isCurrentDelegated =
                      match.delegatedScorerProfileId &&
                      (match.delegatedScorerProfileId.toLowerCase() === p.profileId?.toLowerCase() ||
                        match.delegatedScorerProfileId.toLowerCase() === p.id.toLowerCase());

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                          isCurrentDelegated
                            ? 'bg-amber-500/20 border-amber-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-slate-200">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{p.name}</h4>
                            <span className="font-mono text-[10px] text-amber-400 font-bold">
                              {p.profileId || `ID: ${p.id.slice(0, 8)}`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated: Match = {
                              ...match,
                              delegatedScorerProfileId: p.profileId || p.id,
                              delegatedScorerName: p.name,
                            };
                            onUpdateMatch(updated);
                            cricketAudio.playClick('Scorer permission delegated');
                            setDelegateSuccessMsg(`Scoring permission transferred to ${p.name} (${p.profileId || p.id})!`);
                            setTimeout(() => {
                              setDelegateSuccessMsg(null);
                              setIsDelegateModalOpen(false);
                            }, 2000);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition ${
                            isCurrentDelegated
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isCurrentDelegated ? '✓ Authorized' : 'Grant Scorer'}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDelegateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
