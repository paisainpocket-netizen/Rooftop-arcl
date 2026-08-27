/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Match, Team, Tournament, Player } from './types/cricket';
import { defaultTeams, defaultTournaments, createDefaultSampleMatch, defaultPlayersList } from './data/defaultData';
import {
  sanitizeAndDeduplicatePlayers,
  getNextSequentialProfileId,
  sanitizeAndDeduplicateTeams,
  getNextSequentialTeamId,
  sanitizeAndDeduplicateTournaments,
} from './utils/playerSequence';
import { Navbar } from './components/Navbar';
import { LiveFeedView } from './components/LiveFeedView';
import { LiveMatchScorer } from './components/LiveMatchScorer';
import { ScorecardView } from './components/ScorecardView';
import { TournamentManager } from './components/TournamentManager';
import { TeamsManager } from './components/TeamsManager';
import { PlayersManager } from './components/PlayersManager';
import { MatchesListView } from './components/MatchesListView';
import { EditCompletedMatchModal } from './components/EditCompletedMatchModal';
import { RooftopRulesModal } from './components/RooftopRulesModal';
import { CreateMatchModal } from './components/CreateMatchModal';
import { MatchSquadModal } from './components/MatchSquadModal';
import { CreateTeamModal } from './components/CreateTeamModal';
import { CreatePlayerModal } from './components/CreatePlayerModal';
import { CreateTournamentModal } from './components/CreateTournamentModal';
import { MatchSettingsModal } from './components/MatchSettingsModal';
import { PlayerAccountModal } from './components/PlayerAccountModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { ShareMatchCard } from './components/ShareMatchCard';
import { Play, Trophy, Users, User, Shield, Sparkles, HelpCircle, AlertTriangle, X } from 'lucide-react';
import { cricketAudio } from './utils/audio';
import { cloudDb, isFirestoreQuotaExceeded, onQuotaStateChange, onSyncErrorChange, getLastSyncError, clearSyncError, SyncErrorInfo } from './lib/firebase';
import { applyMatchStatsToPlayers, recalculateCareerStats } from './utils/careerStats';

const STORAGE_KEY_MATCH = 'arcl_current_match_v2';
const STORAGE_KEY_SAVED_MATCHES = 'arcl_saved_matches_v2';
const STORAGE_KEY_TEAMS = 'arcl_teams_v2';
const STORAGE_KEY_PLAYERS = 'arcl_players_v2';
const STORAGE_KEY_TOURNAMENTS = 'arcl_tournaments_v2';
const STORAGE_KEY_THEME = 'arcl_theme_mode';
const STORAGE_KEY_LOGGED_USER = 'arcl_logged_player_id';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'live' | 'matches' | 'teams' | 'players' | 'tournaments' | 'rules' | 'saved_matches'
  >('live');

  // Scoring console view state for live match
  const [isScoringConsoleOpen, setIsScoringConsoleOpen] = useState(false);
  const [selectedScorecardMatch, setSelectedScorecardMatch] = useState<Match | null>(null);

  // High-Contrast Theme State (Dark vs Light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme !== null) return savedTheme === 'dark';
    } catch {}
    return true; // Default high-contrast dark
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_THEME, next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  // Match State
  const [currentMatch, setCurrentMatch] = useState<Match>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATCH);
      if (saved) return JSON.parse(saved);
    } catch {}
    return createDefaultSampleMatch();
  });

  // Saved Matches History
  const [savedMatches, setSavedMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED_MATCHES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Teams Roster
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAMS);
      if (saved) {
        const parsed: Team[] = JSON.parse(saved);
        if (parsed.length > 0) {
          return sanitizeAndDeduplicateTeams(parsed);
        }
      }
    } catch {}
    return sanitizeAndDeduplicateTeams(defaultTeams);
  });

  // Standalone Master Players Pool with deduplication and ARCL-001..ARCL-013 guarantee
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
      if (saved) {
        const parsed: Player[] = JSON.parse(saved);
        return sanitizeAndDeduplicatePlayers(parsed);
      }
    } catch {}
    return defaultPlayersList;
  });

  // Logged-in Player
  const [loggedInPlayerId, setLoggedInPlayerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LOGGED_USER) || null;
    } catch {
      return null;
    }
  });

  const loggedInPlayer = useMemo(() => {
    return players.find((p) => p.id === loggedInPlayerId) || null;
  }, [players, loggedInPlayerId]);

  const isAdmin = Boolean(
    loggedInPlayer &&
    (loggedInPlayer.profileId === 'ARCL-001')
  );

  const handleLogin = (player: Player) => {
    setLoggedInPlayerId(player.id);
    try {
      localStorage.setItem(STORAGE_KEY_LOGGED_USER, player.id);
    } catch {}
  };

  const handleLogout = () => {
    setLoggedInPlayerId(null);
    try {
      localStorage.removeItem(STORAGE_KEY_LOGGED_USER);
    } catch {}
  };

  // Tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TOURNAMENTS);
      if (saved) return sanitizeAndDeduplicateTournaments(JSON.parse(saved));
    } catch {}
    return sanitizeAndDeduplicateTournaments(defaultTournaments);
  });

  // Master combined matches list (memoized to prevent duplicate recalculations)
  const allMatchesCombined = useMemo(() => {
    const list: Match[] = [];
    const seen = new Set<string>();

    if (currentMatch) {
      list.push(currentMatch);
      seen.add(currentMatch.id);
    }

    (savedMatches || []).forEach((m) => {
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        list.push(m);
      }
    });

    return list;
  }, [currentMatch, savedMatches]);

  // Modals
  const [isCreateMatchOpen, setIsCreateMatchOpen] = useState(false);
  const [isMatchSquadOpen, setIsMatchSquadOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreatePlayerOpen, setIsCreatePlayerOpen] = useState(false);
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);
  const [isMatchSettingsOpen, setIsMatchSettingsOpen] = useState(false);
  const [selectedMatchForSettings, setSelectedMatchForSettings] = useState<Match | null>(null);
  const [initialTournamentIdForNewMatch, setInitialTournamentIdForNewMatch] = useState<string>('');
  const [targetTeamIdForPlayer, setTargetTeamIdForPlayer] = useState<string>('');
  const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [isShareAppOpen, setIsShareAppOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  // Only the player's id is tracked here — the actual Player object is
  // always looked up live from the authoritative `players` array below.
  // Various screens (Teams squad list, Team Profile modal, etc.) pass in
  // whatever player copy they happen to be rendering, which can be a STALE
  // embedded copy (e.g. inside team.players) that never got the latest
  // match stats applied to it. Resolving by id against the live `players`
  // array guarantees the profile modal always shows a player's real,
  // current record — never a copy that looks like it "lost" recent scores.
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [hasQuotaExceeded, setHasQuotaExceeded] = useState<boolean>(() => isFirestoreQuotaExceeded());
  const [isQuotaDismissed, setIsQuotaDismissed] = useState<boolean>(false);
  // Surfaces the actual raw Firestore error (e.g. permission-denied) in the
  // UI instead of it only ever sitting in a console.warn nobody sees on a
  // phone. If two phones' scores/deletes aren't syncing to each other, this
  // banner is the fastest way to see WHY — most commonly it means
  // firestore.rules hasn't been published to the exact database this app
  // is connected to.
  const [syncError, setSyncError] = useState<SyncErrorInfo | null>(() => getLastSyncError());

  // Listen for cloud sync errors (permission-denied, etc.)
  useEffect(() => {
    const unsub = onSyncErrorChange((err) => setSyncError(err));
    return unsub;
  }, []);

  // Always resolve to the CURRENT player record from the live `players`
  // array — re-derives automatically whenever `players` updates too, so the
  // open profile modal never goes stale even mid-view.
  const inspectedPlayer = useMemo(() => {
    if (!inspectedPlayerId) return null;
    return players.find((p) => p.id === inspectedPlayerId) || null;
  }, [inspectedPlayerId, players]);

  // Listen to Firestore Quota state
  useEffect(() => {
    const unsub = onQuotaStateChange((exceeded) => {
      setHasQuotaExceeded(exceeded);
    });
    return unsub;
  }, []);

  // Firestore Real-time Cloud Synchronization & Initial Seeding
  useEffect(() => {
    // 1. Initial Seed to Firebase if database is empty
    cloudDb.seedInitialDataIfEmpty(defaultTeams, defaultTournaments, defaultPlayersList, currentMatch).catch(console.warn);

    // 2. Real-time subscription to Matches — split into two listeners to
    // stop the read-amplification that caused ~2.1K reads for a single
    // over: `subscribeToLiveMatches` tracks only matches with status
    // 'live'/'innings_break' (no orderBy on a constantly-changing field, so
    // a ball update only ever bills a read for that one match), while
    // `subscribeToMatches` keeps covering the recent/completed browsing
    // feed (which rarely changes, so its orderBy cost is no longer an
    // issue in practice). Results are merged by id — the live listener
    // wins on conflicts since it's always the freshest for anything
    // actually in progress.
    const liveMatchesRef = { current: [] as Match[] };
    const recentMatchesRef = { current: [] as Match[] };
    const applyMergedMatches = () => {
      const map = new Map<string, Match>();
      recentMatchesRef.current.forEach((m) => map.set(m.id, m));
      liveMatchesRef.current.forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values());
      setSavedMatches(merged);
      if (merged.length > 0) {
        setCurrentMatch((prev) => {
          const cloudCurrent = merged.find((m) => m.id === prev.id);
          if (cloudCurrent && (cloudCurrent.updatedAt || 0) > (prev.updatedAt || 0)) {
            return cloudCurrent;
          }
          return prev;
        });
      }
    };
    const unsubLiveMatches = cloudDb.subscribeToLiveMatches((cloudMatches) => {
      liveMatchesRef.current = cloudMatches || [];
      applyMergedMatches();
    });
    const unsubMatches = cloudDb.subscribeToMatches((cloudMatches) => {
      recentMatchesRef.current = cloudMatches || [];
      applyMergedMatches();
    });

    // 3. Real-time subscription to Teams
    const unsubTeams = cloudDb.subscribeToTeams((cloudTeams) => {
      if (cloudTeams && cloudTeams.length > 0) {
        setTeams(sanitizeAndDeduplicateTeams(cloudTeams));
      }
    });

    // 4. Real-time subscription to Players
    const unsubPlayers = cloudDb.subscribeToPlayers((cloudPlayers) => {
      if (cloudPlayers && cloudPlayers.length > 0) {
        setPlayers(sanitizeAndDeduplicatePlayers(cloudPlayers));
      }
    });

    // 5. Real-time subscription to Tournaments
    const unsubTournaments = cloudDb.subscribeToTournaments((cloudTournaments) => {
      if (cloudTournaments && cloudTournaments.length > 0) {
        setTournaments(sanitizeAndDeduplicateTournaments(cloudTournaments));
      }
    });

    return () => {
      unsubLiveMatches();
      unsubMatches();
      unsubTeams();
      unsubPlayers();
      unsubTournaments();
    };
  }, []);

  // Live ball-by-ball subscription for whichever ONE match is currently
  // open (being scored or watched). Only ever tracks a single match's
  // `balls` subcollection — never all matches — so this scales with how
  // many balls the open match has, not with how many matches exist.
  // Merges in a monotonic way (only accepts a cloud ball count that's
  // GREATER than what's already in local state) so the device that's
  // actively scoring never sees its own just-tapped ball flicker away
  // while waiting for the debounced cloud write to round-trip back.
  useEffect(() => {
    const openMatchId = currentMatch?.id;
    if (!openMatchId) return;
    const unsub = cloudDb.subscribeToMatchBalls(openMatchId, (byInnings) => {
      setCurrentMatch((prev) => {
        if (!prev || prev.id !== openMatchId) return prev;
        let changed = false;
        const next: any = { ...prev };
        (['innings1', 'innings2', 'innings3', 'innings4'] as const).forEach((key) => {
          const cloudBalls = byInnings[key];
          const localInnings: any = (prev as any)[key];
          if (cloudBalls && localInnings) {
            const localCount = (localInnings.balls || []).length;
            if (cloudBalls.length > localCount) {
              next[key] = { ...localInnings, balls: cloudBalls };
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    });
    return unsub;
  }, [currentMatch?.id]);

  // Sync to LocalStorage (Instant local cache fallback)
  useEffect(() => {
    try {
      if (currentMatch) {
        localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(currentMatch));
      }
    } catch {}
  }, [currentMatch]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_MATCHES, JSON.stringify(savedMatches));
    } catch {}
  }, [savedMatches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
    } catch {}
  }, [teams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    } catch {}
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOURNAMENTS, JSON.stringify(tournaments));
    } catch {}
  }, [tournaments]);

  // Update live match
  const handleUpdateMatch = (updatedMatch: Match) => {
    const withTimestamp: Match = {
      ...updatedMatch,
      updatedAt: Date.now(),
    };

    // Detect the exact moment a match transitions into 'completed' status,
    // so career stats are applied exactly once and never double-counted
    // (e.g. on page reload where currentMatch is already loaded as completed).
    const isNewlyCompleted = currentMatch.status !== 'completed' && withTimestamp.status === 'completed';

    setCurrentMatch(withTimestamp);

    // Save to Firestore in real-time
    cloudDb.saveMatch(withTimestamp).catch(console.warn);

    if (withTimestamp.status === 'completed') {
      setSavedMatches((prev) => {
        const filtered = prev.filter((m) => m.id !== withTimestamp.id);
        return [withTimestamp, ...filtered];
      });
    }

    if (isNewlyCompleted) {
      // Update every involved player's overall career stats AND their
      // format-specific (T10/T20/Club/Test) stats using this match's real data.
      setPlayers((prev) => {
        const updated = applyMatchStatsToPlayers(prev, withTimestamp);
        // CRITICAL: persist the recalculated stats to Firestore too. Without
        // this, the new runs/wickets only ever lived in local React state +
        // localStorage — the very next Firestore `subscribeToPlayers` push
        // (which fires on every load) would overwrite them with the old,
        // pre-match cloud copy, making the fresh stats "disappear on refresh".
        updated.forEach((p, idx) => {
          if (p !== prev[idx]) {
            cloudDb.savePlayer(p).catch(console.warn);
          }
        });
        return updated;
      });
    }
  };

  // Start new match
  const handleStartNewMatch = (newMatch: Match, openSquadFirst = false) => {
    const withTimestamp: Match = {
      ...newMatch,
      updatedAt: Date.now(),
    };

    if (currentMatch && (currentMatch.innings1.balls.length > 0 || currentMatch.status !== 'setup')) {
      setSavedMatches((prev) => {
        const filtered = prev.filter((m) => m.id !== currentMatch.id);
        return [currentMatch, ...filtered];
      });
      cloudDb.saveMatch(currentMatch).catch(console.warn);
    }

    setCurrentMatch(withTimestamp);
    setSavedMatches((prev) => {
      const filtered = prev.filter((m) => m.id !== withTimestamp.id);
      return [withTimestamp, ...filtered];
    });
    cloudDb.saveMatch(withTimestamp).catch(console.warn);
    setIsCreateMatchOpen(false);

    if (openSquadFirst) {
      setIsMatchSquadOpen(true);
    } else {
      setIsScoringConsoleOpen(true);
      setActiveTab('live');
    }
  };

  const handleSaveFixture = (newMatch: Match) => {
    const withTimestamp: Match = {
      ...newMatch,
      status: 'setup',
      updatedAt: Date.now(),
    };

    setSavedMatches((prev) => {
      const filtered = prev.filter((m) => m.id !== withTimestamp.id);
      return [withTimestamp, ...filtered];
    });
    cloudDb.saveMatch(withTimestamp).catch(console.warn);
    setIsCreateMatchOpen(false);
    setActiveTab('matches');
  };

  const handleSaveMatchSquad = (updatedMatch: Match) => {
    // Permission verification: Only creator, delegated scorer, or admin can update squads
    const isMatchAdmin = Boolean(
      loggedInPlayer &&
      (loggedInPlayer.profileId === 'ARCL-001')
    );
    const isMatchCreator = Boolean(
      loggedInPlayer &&
      ((currentMatch.creatorId && currentMatch.creatorId === loggedInPlayer.id) ||
       (currentMatch.creatorProfileId && currentMatch.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
       (!currentMatch.creatorId && !currentMatch.creatorProfileId && isMatchAdmin))
    );
    const isDelegatedScorer = Boolean(
      loggedInPlayer &&
      currentMatch.delegatedScorerProfileId &&
      (currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
       currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase() ||
       (loggedInPlayer.phoneNumber && currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.phoneNumber.toLowerCase()))
    );

    if (!isMatchCreator && !isDelegatedScorer && !isMatchAdmin) {
      alert(`Permission Denied: Only the match creator (${currentMatch.creatorName || currentMatch.creatorProfileId || 'Host'}) or delegated scorer can modify this match squad.`);
      setIsMatchSquadOpen(false);
      return;
    }

    const withTimestamp: Match = {
      ...updatedMatch,
      updatedAt: Date.now(),
    };
    setCurrentMatch(withTimestamp);
    cloudDb.saveMatch(withTimestamp).catch(console.warn);
    setIsMatchSquadOpen(false);
    setIsScoringConsoleOpen(true);
    setActiveTab('live');
  };

  const handleCreateNewTeam = (newTeam: Team) => {
    setTeams((prev) => {
      const existingTeamIds = new Set(prev.map((t) => (t.teamId || t.profileId)?.trim().toUpperCase()));
      let finalTeam = newTeam;
      if (!newTeam.teamId || existingTeamIds.has(newTeam.teamId.trim().toUpperCase())) {
        const seqId = getNextSequentialTeamId(prev);
        finalTeam = {
          ...newTeam,
          teamId: seqId,
          profileId: seqId,
        };
      }
      const sanitized = sanitizeAndDeduplicateTeams([finalTeam, ...prev]);
      cloudDb.saveTeam(finalTeam).catch(console.warn);
      return sanitized;
    });
  };

  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers((prev) => {
      // Deduplicate and ensure no duplicate IDs exist
      const existingProfileIds = new Set(prev.map((p) => p.profileId?.trim().toUpperCase()));
      let finalPlayer = newPlayer;

      if (!newPlayer.profileId || existingProfileIds.has(newPlayer.profileId.trim().toUpperCase())) {
        finalPlayer = {
          ...newPlayer,
          profileId: getNextSequentialProfileId(prev),
        };
      }

      const sanitized = sanitizeAndDeduplicatePlayers([...prev, finalPlayer]);
      cloudDb.savePlayer(finalPlayer).catch(console.warn);
      return sanitized;
    });
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) => {
      const updatedList = prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p));
      return sanitizeAndDeduplicatePlayers(updatedList);
    });
    cloudDb.savePlayer(updatedPlayer).catch(console.warn);

    // Also update player inside teams
    setTeams((prev) =>
      prev.map((t) => {
        const updatedTeam = {
          ...t,
          players: t.players.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p)),
        };
        if (t.players.some((p) => p.id === updatedPlayer.id)) {
          cloudDb.saveTeam(updatedTeam).catch(console.warn);
        }
        return updatedTeam;
      })
    );
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => {
      const filtered = prev.filter((p) => p.id !== playerId);
      return sanitizeAndDeduplicatePlayers(filtered);
    });
    cloudDb.deletePlayer(playerId).catch(console.warn);

    setTeams((prev) =>
      prev.map((t) => {
        const updatedTeam = {
          ...t,
          players: t.players.filter((p) => p.id !== playerId),
        };
        if (t.players.some((p) => p.id === playerId)) {
          cloudDb.saveTeam(updatedTeam).catch(console.warn);
        }
        return updatedTeam;
      })
    );
  };

  const handlePurgeSamplePlayers = () => {
    setPlayers(() => {
      return defaultPlayersList;
    });
  };

  const handleResetDatabaseCleanSlate = async () => {
    try {
      const cleanMatch = createDefaultSampleMatch();
      setPlayers(defaultPlayersList);
      setTeams(defaultTeams);
      setTournaments(defaultTournaments);
      setSavedMatches([]);
      setCurrentMatch(cleanMatch);

      try {
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(defaultPlayersList));
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(defaultTeams));
        localStorage.setItem(STORAGE_KEY_TOURNAMENTS, JSON.stringify(defaultTournaments));
        localStorage.setItem(STORAGE_KEY_SAVED_MATCHES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(cleanMatch));
      } catch {}

      await cloudDb.resetDatabaseToCleanSlate(
        defaultTeams,
        defaultTournaments,
        defaultPlayersList,
        cleanMatch
      );
      alert('Success: Database wiped and all records reset to 00 starting with ARCL-001!');
    } catch (err) {
      console.error('Failed to reset database:', err);
      alert('Error resetting database. Please check connection.');
    }
  };

  const handleCreateNewPlayerForTeam = (newPlayer: Player, teamId?: string) => {
    handleAddPlayer(newPlayer);
    if (teamId) {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === teamId) {
            const updated = { ...t, players: [...t.players, newPlayer] };
            cloudDb.saveTeam(updated).catch(console.warn);
            return updated;
          }
          return t;
        })
      );
      // If current match involves this team, update live match too
      if (currentMatch?.teamA?.id === teamId) {
        const updated = {
          ...currentMatch,
          teamA: { ...currentMatch.teamA, players: [...(currentMatch.teamA.players || []), newPlayer] },
          updatedAt: Date.now(),
        };
        setCurrentMatch(updated);
        cloudDb.saveMatch(updated).catch(console.warn);
      } else if (currentMatch?.teamB?.id === teamId) {
        const updated = {
          ...currentMatch,
          teamB: { ...currentMatch.teamB, players: [...(currentMatch.teamB.players || []), newPlayer] },
          updatedAt: Date.now(),
        };
        setCurrentMatch(updated);
        cloudDb.saveMatch(updated).catch(console.warn);
      }
    }
  };

  const openCreatePlayerForTeam = (teamId: string) => {
    setTargetTeamIdForPlayer(teamId);
    setIsCreatePlayerOpen(true);
  };

  const handleCreateTournament = (newTournament: Tournament) => {
    setTournaments((prev) => sanitizeAndDeduplicateTournaments([newTournament, ...prev]));
    cloudDb.saveTournament(newTournament).catch(console.warn);
    setIsCreateTournamentOpen(false);
  };

  const handleOpenMatchSettings = (match: Match) => {
    setSelectedMatchForSettings(match);
    setIsMatchSettingsOpen(true);
  };

  const handleSaveMatchSettings = (
    matchId: string,
    updatedSettings: any,
    extraUpdates?: { tournamentId?: string; tournamentName?: string; format?: 'limited_overs' | 'test' }
  ) => {
    const applyUpdate = (m: Match): Match => ({
      ...m,
      settings: updatedSettings,
      totalOvers: updatedSettings.maxOvers || m.totalOvers,
      venue: updatedSettings.venue || m.venue,
      date: updatedSettings.date || m.date,
      tournamentId: extraUpdates ? extraUpdates.tournamentId : m.tournamentId,
      tournamentName: extraUpdates ? extraUpdates.tournamentName : m.tournamentName,
      format: extraUpdates?.format !== undefined ? extraUpdates.format : m.format,
      updatedAt: Date.now(),
    });

    // If it's current match, update currentMatch
    if (currentMatch && currentMatch.id === matchId) {
      const updated = applyUpdate(currentMatch);
      setCurrentMatch(updated);
      cloudDb.saveMatch(updated).catch(console.warn);
    }

    // Also update in savedMatches
    setSavedMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const updated = applyUpdate(m);
          cloudDb.saveMatch(updated).catch(console.warn);
          return updated;
        }
        return m;
      })
    );

    setIsMatchSettingsOpen(false);
    setSelectedMatchForSettings(null);
  };

  const handleUpdateTournament = (updatedTour: Tournament) => {
    setTournaments((prev) =>
      prev.map((t) => (t.id === updatedTour.id ? updatedTour : t))
    );
    cloudDb.saveTournament(updatedTour).catch(console.warn);
  };

  const handleUpdateTeams = (updatedTeams: Team[]) => {
    const sanitized = sanitizeAndDeduplicateTeams(updatedTeams);
    setTeams(sanitized);

    const newIds = new Set(sanitized.map((t) => t.id));
    // Detect and delete teams removed from Firestore
    teams.forEach((t) => {
      if (!newIds.has(t.id)) {
        cloudDb.deleteTeam(t.id).catch(console.warn);
      }
    });

    // Save/Update each team in Firestore
    sanitized.forEach((t) => {
      cloudDb.saveTeam(t).catch(console.warn);
    });
  };

  const handleAddPlayerToTeam = (teamId: string, player: Player) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          const updated = {
            ...t,
            players: [...(t.players || []).filter((p) => p.id !== player.id), player],
          };
          cloudDb.saveTeam(updated).catch(console.warn);
          return updated;
        }
        return t;
      });
      return next;
    });
  };

  const handleRemovePlayerFromTeam = (teamId: string, playerId: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          const updated = {
            ...t,
            players: (t.players || []).filter((p) => p.id !== playerId),
          };
          cloudDb.saveTeam(updated).catch(console.warn);
          return updated;
        }
        return t;
      });
      return next;
    });
  };

  const [isLoadingOlderMatches, setIsLoadingOlderMatches] = useState(false);
  const [hasMoreOlderMatches, setHasMoreOlderMatches] = useState(true);
  const [matchBeingEdited, setMatchBeingEdited] = useState<Match | null>(null);

  const handleSaveMatchCorrections = (correctedMatch: Match) => {
    const withTimestamp: Match = { ...correctedMatch, updatedAt: Date.now() };

    setSavedMatches((prev) => {
      const updated = prev.map((m) => (m.id === withTimestamp.id ? withTimestamp : m));
      // Recalculate every player's career + format stats from scratch, since
      // a manual correction can change runs/wickets/records for anyone
      // involved in this match.
      setPlayers((prevPlayers) => {
        const recalculated = recalculateCareerStats(prevPlayers, updated);
        // Persist to Firestore so the correction survives a page refresh
        // instead of being silently overwritten by the next cloud sync.
        // recalculateCareerStats always returns fresh object references, so
        // compare the actual stats payload (not reference identity) to avoid
        // re-saving every single player on every correction.
        recalculated.forEach((p, idx) => {
          const prevP = prevPlayers[idx];
          const changed =
            !prevP ||
            JSON.stringify(p.stats) !== JSON.stringify(prevP.stats) ||
            JSON.stringify(p.formatStats) !== JSON.stringify(prevP.formatStats);
          if (changed) {
            cloudDb.savePlayer(p).catch(console.warn);
          }
        });
        return recalculated;
      });
      return updated;
    });

    if (currentMatch && currentMatch.id === withTimestamp.id) {
      setCurrentMatch(withTimestamp);
    }

    cloudDb.saveMatch(withTimestamp).catch(console.warn);
  };

  const handleLoadOlderMatches = async () => {
    if (isLoadingOlderMatches) return;
    setIsLoadingOlderMatches(true);
    try {
      const oldestUpdatedAt = savedMatches.reduce(
        (min, m) => Math.min(min, m.updatedAt || 0),
        Date.now()
      );
      const older = await cloudDb.fetchOlderMatches(oldestUpdatedAt, 60);
      if (older.length === 0) {
        setHasMoreOlderMatches(false);
      } else {
        setSavedMatches((prev) => {
          const map = new Map<string, Match>();
          prev.forEach((m) => map.set(m.id, m));
          older.forEach((m) => map.set(m.id, m));
          return Array.from(map.values());
        });
        if (older.length < 60) setHasMoreOlderMatches(false);
      }
    } catch (err) {
      console.warn('Failed to load older matches:', err);
    } finally {
      setIsLoadingOlderMatches(false);
    }
  };

  const handleDeleteMatchGeneral = (matchId: string) => {
    const targetMatch = savedMatches.find((m) => m.id === matchId) || (currentMatch?.id === matchId ? currentMatch : null);
    if (targetMatch) {
      const isCreator = Boolean(
        loggedInPlayer &&
        (targetMatch.creatorId === loggedInPlayer.id ||
         targetMatch.creatorProfileId === loggedInPlayer.profileId ||
         (!targetMatch.creatorId && !targetMatch.creatorProfileId))
      );
      const isUserAdmin = Boolean(
        loggedInPlayer &&
        (loggedInPlayer.profileId === 'ARCL-001')
      );

      if (!isCreator && !isUserAdmin) {
        alert(`Only the match creator (${targetMatch.creatorName || targetMatch.creatorProfileId || 'Creator'}) or Admin can delete this match.`);
        return;
      }
    }

    const remainingMatches = savedMatches.filter((m) => m.id !== matchId);
    setSavedMatches(remainingMatches);
    cloudDb.deleteMatch(matchId).catch(console.warn);

    // Recalculate every player's career + format stats from scratch using only
    // the matches that remain, so a deleted match's runs/wickets/etc. are
    // correctly removed instead of staying counted forever.
    setPlayers((prev) => {
      const recalculated = recalculateCareerStats(prev, remainingMatches);
      // Persist to Firestore so the deletion's effect on stats survives a
      // page refresh instead of being overwritten by stale cloud data.
      recalculated.forEach((p, idx) => {
        const prevP = prev[idx];
        const changed =
          !prevP ||
          JSON.stringify(p.stats) !== JSON.stringify(prevP.stats) ||
          JSON.stringify(p.formatStats) !== JSON.stringify(prevP.formatStats);
        if (changed) {
          cloudDb.savePlayer(p).catch(console.warn);
        }
      });
      return recalculated;
    });

    if (currentMatch && currentMatch.id === matchId) {
      const otherMatches = remainingMatches;
      if (otherMatches.length > 0) {
        setCurrentMatch(otherMatches[0]);
      } else {
        const fresh = createDefaultSampleMatch();
        setCurrentMatch(fresh);
      }
    }
    setIsMatchSettingsOpen(false);
    setSelectedMatchForSettings(null);
  };

  const handleResumeMatchGeneral = (match: Match) => {
    setCurrentMatch(match);
    setIsMatchSettingsOpen(false);
    setSelectedMatchForSettings(null);
    setIsScoringConsoleOpen(true);
    setActiveTab('live');
  };

  const targetTeam = teams.find((t) => t.id === targetTeamIdForPlayer);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isDarkMode 
        ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950' 
        : 'bg-slate-50 text-slate-900 selection:bg-emerald-600 selection:text-white'
    }`}>
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'live') {
            setIsScoringConsoleOpen(false);
          }
          setActiveTab(tab);
        }}
        onNewMatch={() => setIsCreateMatchOpen(true)}
        onOpenCreateTeam={() => setIsCreateTeamOpen(true)}
        onOpenCreatePlayer={() => {
          setTargetTeamIdForPlayer('');
          setIsCreatePlayerOpen(true);
        }}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        loggedInPlayerName={loggedInPlayer?.name}
        onShareApp={() => setIsShareAppOpen(true)}
        hasActiveMatch={currentMatch?.status === 'live'}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 space-y-6">
        {syncError && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-lg shadow-rose-950/20">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-rose-200">
                  Cloud Sync Error — score/match updates may not reach other phones
                </p>
                <p className="text-slate-300 mt-0.5 text-xs leading-relaxed break-words">
                  <code className="font-mono text-rose-300">{syncError.code}</code>: {syncError.message}
                  {syncError.code === 'permission-denied' && (
                    <>
                      {' '}— this usually means the Firestore security rules haven't been published to
                      the exact database this app uses. Check Firebase Console → Firestore Database →
                      select the correct database from the dropdown → Rules tab.
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => { clearSyncError(); setSyncError(null); }}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasQuotaExceeded && !isQuotaDismissed && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-lg shadow-amber-950/20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">
                  Daily Cloud Sync Quota Reached (Spark Free Tier)
                </p>
                <p className="text-slate-300 mt-0.5 text-xs leading-relaxed">
                  The app has automatically switched to <strong>Local Offline Mode</strong>. All your scores, matches, teams, and tournament edits are safely preserved on your device and will seamlessly re-sync when the daily quota resets.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsQuotaDismissed(true)}
              className="p-1 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Tab 1: Live Broadcast Feed vs Scoring Console */}
        {activeTab === 'live' && (
          isScoringConsoleOpen ? (
            <LiveMatchScorer
              match={currentMatch}
              onUpdateMatch={handleUpdateMatch}
              onOpenScorecard={() => {
                setSelectedScorecardMatch(currentMatch);
                setIsScorecardModalOpen(true);
              }}
              onOpenShareCard={() => setIsShareCardOpen(true)}
              onOpenSquadModal={() => setIsMatchSquadOpen(true)}
              onDeleteMatch={() => {
                handleDeleteMatchGeneral(currentMatch.id);
                setIsScoringConsoleOpen(false);
              }}
              isDarkMode={isDarkMode}
              loggedInPlayer={loggedInPlayer}
              allPlayers={players}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              onBackToFeed={() => setIsScoringConsoleOpen(false)}
            />
          ) : (
            <LiveFeedView
              matches={allMatchesCombined}
              tournaments={tournaments}
              teams={teams}
              loggedInPlayer={loggedInPlayer}
              onWatchMatch={(m) => {
                setSelectedScorecardMatch(m);
                setIsScorecardModalOpen(true);
              }}
              onOpenScoring={(m) => {
                setCurrentMatch(m);
                setIsScoringConsoleOpen(true);
              }}
              onNewMatch={() => setIsCreateMatchOpen(true)}
              onOpenTournaments={() => setActiveTab('tournaments')}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              isDarkMode={isDarkMode}
            />
          )
        )}

        {/* Tab 2: Matches Hub (with private My Matches tab for logged-in users) */}
        {activeTab === 'matches' && (
          <MatchesListView
            matches={allMatchesCombined}
            currentMatch={currentMatch}
            teams={teams}
            loggedInPlayer={loggedInPlayer}
            onSelectMatch={(m) => {
              setCurrentMatch(m);
              setIsScoringConsoleOpen(true);
              setActiveTab('live');
            }}
            onOpenCreateMatch={() => {
              setInitialTournamentIdForNewMatch('');
              setIsCreateMatchOpen(true);
            }}
            onOpenMatchSquad={(m) => {
              setCurrentMatch(m);
              setIsMatchSquadOpen(true);
            }}
            onOpenScorecard={(m) => {
              setSelectedScorecardMatch(m);
              setIsScorecardModalOpen(true);
            }}
            onOpenMatchSettings={handleOpenMatchSettings}
            onDeleteMatch={(id) => {
              handleDeleteMatchGeneral(id);
            }}
            onLoadOlderMatches={handleLoadOlderMatches}
            isLoadingOlderMatches={isLoadingOlderMatches}
            hasMoreOlderMatches={hasMoreOlderMatches}
            onEditCompletedMatch={(m) => setMatchBeingEdited(m)}
            isDarkMode={isDarkMode}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* Tab 3: My Teams */}
        {activeTab === 'teams' && (
          <TeamsManager
            teams={teams}
            allPlayers={players}
            allMatches={allMatchesCombined}
            loggedInPlayer={loggedInPlayer}
            isAdmin={isAdmin}
            onUpdateTeams={handleUpdateTeams}
            onOpenCreateTeamModal={() => setIsCreateTeamOpen(true)}
            onOpenCreatePlayerModal={openCreatePlayerForTeam}
            onAddPlayerToTeam={handleAddPlayerToTeam}
            onRemovePlayerFromTeam={handleRemovePlayerFromTeam}
            onViewPlayerProfile={(p) => setInspectedPlayerId(p.id)}
            onOpenScorecard={(m) => {
              setSelectedScorecardMatch(m);
              setIsScorecardModalOpen(true);
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Tab 4: Players Hub (My Player) */}
        {activeTab === 'players' && (
          <PlayersManager
            players={players}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onViewProfile={(p) => setInspectedPlayerId(p.id)}
            onPurgeSamplePlayers={handlePurgeSamplePlayers}
            onOpenCreatePlayerModal={() => {
              setTargetTeamIdForPlayer('');
              setIsCreatePlayerOpen(true);
            }}
            isDarkMode={isDarkMode}
            loggedInPlayer={loggedInPlayer}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* Tab 5: Tournaments & Points Table */}
        {activeTab === 'tournaments' && (
          <TournamentManager
            tournaments={tournaments}
            teams={teams}
            allMatches={allMatchesCombined}
            onOpenCreateTournament={() => setIsCreateTournamentOpen(true)}
            onOpenMatchSettings={handleOpenMatchSettings}
            onOpenScorecard={(m) => {
              setSelectedScorecardMatch(m);
              setIsScorecardModalOpen(true);
            }}
            onAddNewMatchForTournament={(tournamentId) => {
              setInitialTournamentIdForNewMatch(tournamentId || '');
              setIsCreateMatchOpen(true);
            }}
            onSelectMatchToScore={(match) => {
              handleResumeMatchGeneral(match);
            }}
            onUpdateTournament={handleUpdateTournament}
            loggedInPlayer={loggedInPlayer}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* Tab 6: Rooftop Rules */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className={`p-6 rounded-3xl border shadow-xl ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-2xl text-white">
                  🏏
                </div>
                <div>
                  <h2 className="text-xl font-black text-emerald-400">Amritsar Rooftop Cricket Rules (ARCL)</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Official rules and scoring guidelines for terrace & roof-box matches.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className="font-black text-sm text-amber-400 mb-2">1. Direct Roof Out (ਛੱਤ ਤੋਂ ਬਾਹਰ ਆਊਟ)</h3>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    Ball hit directly over the boundary net or outside the rooftop terrace perimeter is declared <strong>OUT immediately</strong> to preserve balls and surrounding safety.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className="font-black text-sm text-cyan-400 mb-2">2. Single-Wall Catch (ਕੰਧ ਲੱਗ ਕੇ ਕੈਚ)</h3>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    A clean one-hand catch taken after the ball bounces off only one side wall / safety net counts as a legitimate dismissal.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className="font-black text-sm text-emerald-400 mb-2">3. Over Limit & Bowler Restrictions</h3>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    Custom overs from 5 to 20 overs. In 6-over games, maximum 2 overs per bowler are permitted.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className="font-black text-sm text-purple-400 mb-2">4. Free Hit on No-Balls</h3>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    Every front-foot or height no-ball awards 1 extra run plus a mandatory Free Hit on the subsequent delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Floating Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md transition-colors ${
        isDarkMode 
          ? 'bg-slate-950/95 border-slate-800 text-white' 
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-lg'
      }`}>
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-2">
          {[
            { id: 'live', label: 'Scorer', icon: Play },
            { id: 'matches', label: 'Matches', icon: Trophy },
            { id: 'teams', label: 'Teams', icon: Shield },
            { id: 'players', label: 'Players', icon: User },
            { id: 'tournaments', label: 'Points', icon: Sparkles },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  cricketAudio.playClick();
                }}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'text-emerald-500 font-black'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-black' : 'font-bold'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {isCreateMatchOpen && (
        <CreateMatchModal
          isOpen={isCreateMatchOpen}
          onClose={() => {
            setIsCreateMatchOpen(false);
            setInitialTournamentIdForNewMatch('');
          }}
          teams={teams.filter(
            (t) =>
              loggedInPlayer &&
              (t.creatorId === loggedInPlayer.id || t.creatorProfileId === loggedInPlayer.profileId)
          )}
          allTeams={teams}
          tournaments={tournaments}
          initialTournamentId={initialTournamentIdForNewMatch}
          onOpenCreateTeam={() => {
            setIsCreateMatchOpen(false);
            setIsCreateTeamOpen(true);
          }}
          onStartMatch={handleStartNewMatch}
          onSaveFixture={handleSaveFixture}
          allGlobalPlayers={players}
          loggedInPlayer={loggedInPlayer}
        />
      )}

      {isCreateTournamentOpen && (
        <CreateTournamentModal
          isOpen={isCreateTournamentOpen}
          onClose={() => setIsCreateTournamentOpen(false)}
          teams={teams}
          onCreateTournament={handleCreateTournament}
          loggedInPlayer={loggedInPlayer}
        />
      )}

      {isMatchSettingsOpen && selectedMatchForSettings && (
        <MatchSettingsModal
          isOpen={isMatchSettingsOpen}
          onClose={() => {
            setIsMatchSettingsOpen(false);
            setSelectedMatchForSettings(null);
          }}
          match={selectedMatchForSettings}
          tournaments={tournaments}
          onUpdateMatchSettings={handleSaveMatchSettings}
          onDeleteMatch={handleDeleteMatchGeneral}
          onResumeMatch={handleResumeMatchGeneral}
        />
      )}

      {isMatchSquadOpen && (
        <MatchSquadModal
          isOpen={isMatchSquadOpen}
          onClose={() => setIsMatchSquadOpen(false)}
          match={currentMatch}
          onSaveMatchSquad={handleSaveMatchSquad}
          allGlobalPlayers={players}
          loggedInPlayer={loggedInPlayer}
          onAddPlayerToTeam={(teamId, player) => {
            const isMatchAdmin = Boolean(
              loggedInPlayer &&
              (loggedInPlayer.profileId === 'ARCL-001')
            );
            const isMatchCreator = Boolean(
              loggedInPlayer &&
              ((currentMatch.creatorId && currentMatch.creatorId === loggedInPlayer.id) ||
               (currentMatch.creatorProfileId && currentMatch.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
               (!currentMatch.creatorId && !currentMatch.creatorProfileId && isMatchAdmin))
            );
            const isDelegatedScorer = Boolean(
              loggedInPlayer &&
              currentMatch.delegatedScorerProfileId &&
              (currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
               currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase() ||
               (loggedInPlayer.phoneNumber && currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.phoneNumber.toLowerCase()))
            );

            if (!isMatchCreator && !isDelegatedScorer && !isMatchAdmin) {
              alert('Permission Denied: Only the match creator, delegated scorer, or admin can add players to this match squad.');
              return;
            }

            // Add player to team in teams state
            setTeams((prev) =>
              prev.map((t) => {
                if (t.id === teamId) {
                  const exists = t.players.some((p) => p.id === player.id || p.profileId === player.profileId);
                  if (exists) return t;
                  return { ...t, players: [...t.players, player] };
                }
                return t;
              })
            );
            // Also ensure global players list has this player
            setPlayers((prev) => {
              const exists = prev.some((p) => p.id === player.id || p.profileId === player.profileId);
              if (exists) return prev;
              return [...prev, player];
            });
            // Update in current match team as well
            setCurrentMatch((prev) => {
              if (!prev) return prev;
              if (prev.teamA?.id === teamId) {
                const exists = (prev.teamA.players || []).some((p) => p.id === player.id || p.profileId === player.profileId);
                return exists ? prev : { ...prev, teamA: { ...prev.teamA, players: [...(prev.teamA.players || []), player] } };
              } else if (prev.teamB?.id === teamId) {
                const exists = (prev.teamB.players || []).some((p) => p.id === player.id || p.profileId === player.profileId);
                return exists ? prev : { ...prev, teamB: { ...prev.teamB, players: [...(prev.teamB.players || []), player] } };
              }
              return prev;
            });
          }}
          onRemovePlayerFromTeam={(teamId, playerId) => {
            const isMatchAdmin = Boolean(
              loggedInPlayer &&
              (loggedInPlayer.profileId === 'ARCL-001')
            );
            const isMatchCreator = Boolean(
              loggedInPlayer && currentMatch &&
              ((currentMatch.creatorId && currentMatch.creatorId === loggedInPlayer.id) ||
               (currentMatch.creatorProfileId && currentMatch.creatorProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase()) ||
               (!currentMatch.creatorId && !currentMatch.creatorProfileId && isMatchAdmin))
            );
            const isDelegatedScorer = Boolean(
              loggedInPlayer && currentMatch &&
              currentMatch.delegatedScorerProfileId &&
              (currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.profileId?.toLowerCase() ||
               currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.id.toLowerCase() ||
               (loggedInPlayer.phoneNumber && currentMatch.delegatedScorerProfileId.toLowerCase() === loggedInPlayer.phoneNumber.toLowerCase()))
            );

            if (!isMatchCreator && !isDelegatedScorer && !isMatchAdmin) {
              alert('Permission Denied: Only the match creator, delegated scorer, or admin can remove players from this match squad.');
              return;
            }

            setTeams((prev) =>
              prev.map((t) => {
                if (t.id === teamId) {
                  return { ...t, players: (t.players || []).filter((p) => p.id !== playerId) };
                }
                return t;
              })
            );
            setCurrentMatch((prev) => {
              if (!prev) return prev;
              if (prev.teamA?.id === teamId) {
                return { ...prev, teamA: { ...prev.teamA, players: (prev.teamA.players || []).filter((p) => p.id !== playerId) } };
              } else if (prev.teamB?.id === teamId) {
                return { ...prev, teamB: { ...prev.teamB, players: (prev.teamB.players || []).filter((p) => p.id !== playerId) } };
              }
              return prev;
            });
          }}
        />
      )}

      {isCreateTeamOpen && (
        <CreateTeamModal
          isOpen={isCreateTeamOpen}
          onClose={() => setIsCreateTeamOpen(false)}
          onSaveTeam={handleCreateNewTeam}
          allExistingPlayers={players}
          allExistingTeams={teams}
          loggedInPlayer={loggedInPlayer}
        />
      )}

      {isCreatePlayerOpen && (
        <CreatePlayerModal
          isOpen={isCreatePlayerOpen}
          onClose={() => setIsCreatePlayerOpen(false)}
          teamId={targetTeamIdForPlayer || undefined}
          teamName={targetTeam?.name}
          existingPlayers={players}
          onSavePlayer={handleCreateNewPlayerForTeam}
          loggedInPlayer={loggedInPlayer}
        />
      )}

      {isLoginModalOpen && (
        <PlayerAccountModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          players={players}
          teams={teams}
          matches={allMatchesCombined}
          loggedInPlayer={loggedInPlayer}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onUpdatePlayer={handleUpdatePlayer}
          onRegisterPlayer={(newP) => handleAddPlayer(newP)}
          onOpenCreatePlayer={() => {
            setTargetTeamIdForPlayer('');
            setIsCreatePlayerOpen(true);
          }}
          onResetAllRecordsToZero={handleResetDatabaseCleanSlate}
          isDarkMode={isDarkMode}
        />
      )}

      {inspectedPlayer && (
        <PlayerProfileModal
          isOpen={!!inspectedPlayer}
          onClose={() => setInspectedPlayerId(null)}
          player={inspectedPlayer}
          allMatches={allMatchesCombined}
          teams={teams}
          isDarkMode={isDarkMode}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      )}

      {matchBeingEdited && (
        <EditCompletedMatchModal
          isOpen={!!matchBeingEdited}
          onClose={() => setMatchBeingEdited(null)}
          match={matchBeingEdited}
          onSaveCorrections={handleSaveMatchCorrections}
        />
      )}

      {isScorecardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border p-4 sm:p-6 shadow-2xl relative ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <ScorecardView
              match={selectedScorecardMatch || currentMatch}
              onClose={() => {
                setIsScorecardModalOpen(false);
                setSelectedScorecardMatch(null);
              }}
            />
          </div>
        </div>
      )}

      {isShareCardOpen && (
        <ShareMatchCard
          isOpen={isShareCardOpen}
          match={currentMatch}
          onClose={() => setIsShareCardOpen(false)}
        />
      )}

      {isRulesModalOpen && (
        <RooftopRulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
      )}
    </div>
  );
}
