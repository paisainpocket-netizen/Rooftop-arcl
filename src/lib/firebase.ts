/**
 * Firebase Integration for Amritsar Rooftop Cricket League (ARCL)
 * Provides real-time cloud database synchronization for live scoring,
 * teams, players, and tournaments with automatic offline fallback and quota protection.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  Firestore,
} from 'firebase/firestore';
import { Match, Team, Tournament, Player } from '../types/cricket';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Firebase configuration from auto-generated config
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with MULTI-TAB persistent local cache. The old
// enableIndexedDbPersistence() only worked in a single browser tab — the
// moment a second tab/window of the same app was opened (very common while
// testing across multiple tabs), persistence silently failed in that second
// tab and EVERY read went straight to the server at full cost. This was a
// major contributor to burning through the daily free quota. The modern
// persistentMultipleTabManager lets any number of open tabs safely share one
// local cache, so reloads and extra tabs stop re-billing full reads.
const dbId = firebaseConfigJson.firestoreDatabaseId;
const useNamedDb = Boolean(dbId && dbId !== '(default)' && dbId.trim() !== '');

let dbInstance: Firestore;
try {
  const settings = {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  };
  dbInstance = useNamedDb ? initializeFirestore(app, settings, dbId) : initializeFirestore(app, settings);
} catch (e) {
  // Falls back to a plain (non-persistent) Firestore instance if the
  // browser doesn't support persistence (e.g. some private/incognito modes)
  // or persistence was already initialized elsewhere.
  console.warn('Firestore persistent cache unavailable, using default instance:', e);
  dbInstance = useNamedDb ? getFirestore(app, dbId) : getFirestore(app);
}
export const db: Firestore = dbInstance;

// Collections references
export const COLLECTIONS = {
  MATCHES: 'matches',
  TEAMS: 'teams',
  PLAYERS: 'players',
  TOURNAMENTS: 'tournaments',
  SETTINGS: 'system_settings',
} as const;

// Quota state tracker with daily persistence check
const TODAY_KEY = typeof window !== 'undefined' ? new Date().toDateString() : '';
// Only start "exceeded" if we actually recorded a quota hit earlier TODAY.
// A saved date from a previous day means the daily quota has since reset,
// so we start fresh and let Firebase connect normally.
function readStoredQuotaExceededToday(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const savedDate = localStorage.getItem('arcl_quota_exceeded_date');
    return savedDate === TODAY_KEY;
  } catch {
    return false;
  }
}
let isQuotaExceeded = readStoredQuotaExceededToday();
const quotaListeners: Array<(exceeded: boolean) => void> = [];

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function onQuotaStateChange(listener: (exceeded: boolean) => void) {
  quotaListeners.push(listener);
  return () => {
    const idx = quotaListeners.indexOf(listener);
    if (idx !== -1) quotaListeners.splice(idx, 1);
  };
}

function handleQuotaError(err: any) {
  const errMsg = err?.message || String(err);
  // IMPORTANT: only a genuine daily-quota exhaustion should permanently
  // disable cloud sync for the rest of the day. 'unavailable' is Firestore's
  // generic "couldn't reach the backend right now" code — it fires on
  // ordinary, temporary things like a rooftop WiFi drop or switching from
  // WiFi to mobile data mid-match. Treating it the same as quota-exhaustion
  // used to silently and PERMANENTLY switch that phone to offline-only mode
  // for the rest of the day (even after the network came back), which is
  // exactly why one phone's brief signal drop made scoring/deletes/etc.
  // stop reaching it: real-time sync AND writes were both switched off and
  // never retried. The Firestore SDK already auto-reconnects on 'unavailable'
  // by itself, so we simply let it — no flag, no lockout.
  const isGenuineQuotaExhaustion =
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    err?.code === 'resource-exhausted';

  if (isGenuineQuotaExhaustion) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('arcl_quota_exceeded_date', TODAY_KEY);
        }
      } catch {}
      console.warn('Firestore daily free quota reached. Offline persistence active.');
      quotaListeners.forEach((fn) => {
        try { fn(true); } catch {}
      });
    }
    return true;
  }

  if (err?.code === 'unavailable') {
    // Transient — log only, don't disable sync or unsubscribe listeners.
    console.warn('Firestore temporarily unavailable (network blip) — will auto-retry:', errMsg);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sync-error diagnostics: surfaces ANY non-quota Firestore error (most
// importantly 'permission-denied', which happens when firestore.rules
// hasn't actually been published to the specific named database this app
// connects to) so it's visible in the UI instead of only ever sitting in a
// console.warn that nobody on a phone will ever see. This is what lets us
// tell, at a glance, whether "sync isn't working across phones" is a rules/
// deployment problem versus something else.
// ---------------------------------------------------------------------------
export interface SyncErrorInfo {
  code: string;
  message: string;
  context: string;
  timestamp: number;
}
let lastSyncError: SyncErrorInfo | null = null;
const syncErrorListeners: Array<(err: SyncErrorInfo | null) => void> = [];

export function getLastSyncError(): SyncErrorInfo | null {
  return lastSyncError;
}

export function onSyncErrorChange(listener: (err: SyncErrorInfo | null) => void) {
  syncErrorListeners.push(listener);
  return () => {
    const idx = syncErrorListeners.indexOf(listener);
    if (idx !== -1) syncErrorListeners.splice(idx, 1);
  };
}

export function clearSyncError() {
  lastSyncError = null;
  syncErrorListeners.forEach((fn) => {
    try { fn(null); } catch {}
  });
}

function reportSyncError(err: any, context: string) {
  const code = err?.code || 'unknown';
  const message = err?.message || String(err);
  lastSyncError = { code, message, context, timestamp: Date.now() };
  if (code === 'permission-denied') {
    console.error(
      `[ARCL] PERMISSION DENIED on ${context}. This almost always means firestore.rules ` +
      `has not been published to the exact database this app is using ` +
      `("${firebaseConfigJson.firestoreDatabaseId}"), not the "(default)" database. ` +
      `Open Firebase Console → Firestore Database → pick that database from the ` +
      `dropdown at the top → Rules tab → publish the rules from firestore.rules there.`,
      err
    );
  } else {
    console.error(`[ARCL] Cloud sync error on ${context}:`, err);
  }
  syncErrorListeners.forEach((fn) => {
    try { fn(lastSyncError); } catch {}
  });
}

// Central place every catch block below routes through: records genuine
// quota exhaustion (existing behaviour) AND now also reports every other
// real error so it's visible in the UI rather than silently swallowed.
function handleSyncFailure(err: any, context: string): boolean {
  const isQuota = handleQuotaError(err);
  if (!isQuota) {
    reportSyncError(err, context);
  }
  return isQuota;
}

/**
 * Recursively strip undefined values from objects/arrays before passing to Firestore
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Throttling / Debouncing for Match Saves
const pendingMatchSaves = new Map<string, { timeout: any; match: Match }>();
// Tracks how many balls per innings we've already mirrored into the `balls`
// subcollection for each match, so saveMatch only ever writes the DELTA
// (new balls since the last save) instead of re-writing the whole history
// every single time. Lives only in memory — reset on page reload, in which
// case the first save of a session may harmlessly re-write already-saved
// ball docs (same id, same content, so idempotent — just a small amount of
// wasted write quota, not a correctness issue).
const lastSavedBallCounts = new Map<string, Record<string, number>>();
const INNINGS_KEYS = ['innings1', 'innings2', 'innings3', 'innings4'] as const;
// Keep Firestore documents comfortably under its 1MB-per-document hard
// limit. Ordinary T10/T20/club matches never come close to this, but a
// long, rain-interrupted 4-innings Test match with heavy commentary text
// per ball theoretically could — this is the safety net for that case, not
// the normal path.
const SAFE_DOC_LIMIT_BYTES = 900_000;

/**
 * Cloud Sync Service for ARCL
 */
export const cloudDb = {
  /**
   * Save or update a match in Firestore with debouncing & quota protection.
   *
   * Every ball is ALSO mirrored into a `matches/{id}/balls` subcollection
   * (delta-only — only balls added since the last successful save are
   * written), independent of what happens to the main document. This means
   * ball-by-ball history is never lost even in the rare case the main
   * document has to be trimmed below for size reasons.
   */
  async saveMatch(match: Match): Promise<void> {
    if (!match || !match.id) return;
    if (isQuotaExceeded) {
      return; // Offline local state will preserve data
    }

    // Debounce rapid ball updates (500ms)
    if (pendingMatchSaves.has(match.id)) {
      clearTimeout(pendingMatchSaves.get(match.id)!.timeout);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        pendingMatchSaves.delete(match.id);
        try {
          // 1) Mirror any NEW balls (since our last save of this match) into
          // the `balls` subcollection. Doc id is deterministic
          // (`${inningsKey}_${index}`) so this is safe to re-run/overlap.
          const savedCounts = lastSavedBallCounts.get(match.id) || {};
          const newSavedCounts: Record<string, number> = { ...savedCounts };
          const ballWrites: { ref: any; data: any }[] = [];
          for (const key of INNINGS_KEYS) {
            const innings = (match as any)[key];
            if (!innings) continue;
            const balls: any[] = innings.balls || [];
            const prevCount = savedCounts[key] || 0;
            for (let i = prevCount; i < balls.length; i++) {
              const ballRef = doc(db, COLLECTIONS.MATCHES, match.id, 'balls', `${key}_${i}`);
              ballWrites.push({
                ref: ballRef,
                data: sanitizeForFirestore({ ...balls[i], inningsKey: key, ballIndex: i }),
              });
            }
            newSavedCounts[key] = balls.length;
          }
          for (let i = 0; i < ballWrites.length; i += 400) {
            const batch = writeBatch(db);
            ballWrites.slice(i, i + 400).forEach(({ ref, data }) => batch.set(ref, data));
            await batch.commit();
          }
          lastSavedBallCounts.set(match.id, newSavedCounts);

          // 2) Write the main match document (innings totals, batting/
          // bowling stat maps, squads, result, etc — everything EXCEPT raw
          // balls stay here as before, so nothing else in the app has to
          // change). If, in the rare edge case, the document is still
          // pushing toward the 1MB limit even without full recompute, drop
          // the ball arrays from the main doc only — they remain fully
          // available via the subcollection written above.
          const docRef = doc(db, COLLECTIONS.MATCHES, match.id);
          let sanitized: any = sanitizeForFirestore({
            ...match,
            updatedAt: typeof match.updatedAt === 'number' ? match.updatedAt : Date.now(),
          });
          const approxSize = new Blob([JSON.stringify(sanitized)]).size;
          if (approxSize > SAFE_DOC_LIMIT_BYTES) {
            const trimmed: any = { ...sanitized };
            for (const key of INNINGS_KEYS) {
              if (trimmed[key]) {
                trimmed[key] = { ...trimmed[key], ballCount: (trimmed[key].balls || []).length, balls: [] };
              }
            }
            sanitized = trimmed;
            console.warn(
              `[ARCL] Match ${match.id} document was ~${Math.round(approxSize / 1024)}KB — trimmed ball ` +
              `arrays from the main doc to stay under Firestore's 1MB limit. Full ball history is safe in ` +
              `the balls subcollection.`
            );
          }
          await setDoc(docRef, sanitized, { merge: true });
          resolve();
        } catch (error) {
          if (!handleSyncFailure(error, 'saveMatch')) {
            console.warn('Error saving match to Firebase:', error);
          }
          resolve(); // Resolve silently so app doesn't break
        }
      }, 500);

      pendingMatchSaves.set(match.id, { timeout, match });
    });
  },

  /**
   * Delete a match from Firestore, including its `balls` subcollection
   * (Firestore does NOT cascade-delete subcollections when a parent
   * document is deleted — without this cleanup step the ball history would
   * silently linger forever, invisible but still taking up storage).
   */
  async deleteMatch(matchId: string): Promise<void> {
    if (!matchId || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.MATCHES, matchId);
      await deleteDoc(docRef);
      try {
        const ballsCol = collection(db, COLLECTIONS.MATCHES, matchId, 'balls');
        const ballsSnap = await getDocs(ballsCol);
        const docs = ballsSnap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db);
          docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn('Could not clean up ball subcollection for deleted match:', subErr);
      }
      lastSavedBallCounts.delete(matchId);
    } catch (error) {
      if (!handleSyncFailure(error, 'deleteMatch')) {
        console.warn('Error deleting match from Firebase:', error);
      }
    }
  },

  /**
   * Live, real-time subscription for matches that are ACTUALLY in progress
   * right now (status 'live' or 'innings_break'). Deliberately has NO
   * orderBy and NO limit — ordering a live-listened query by a field that
   * changes on every single ball (like `updatedAt`) is what caused the
   * "~2,100 reads for one over" read-amplification: Firestore has to
   * re-evaluate the sorted window on every change to the sort key, which
   * re-bills reads for documents in that window, not just the one that
   * changed. A plain equality filter on `status` has no such cost — a
   * change to one live match only ever bills a read for that one document,
   * for each connected viewer. The number of matches simultaneously 'live'
   * is always small in practice, so no limit is needed either.
   */
  subscribeToLiveMatches(callback: (matches: Match[]) => void) {
    if (isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.MATCHES);
      const q = query(colRef, where('status', 'in', ['live', 'innings_break']));
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const matches: Match[] = [];
          snapshot.forEach((docSnap) => {
            matches.push(docSnap.data() as Match);
          });
          callback(matches);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToLiveMatches')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Live subscription to a SINGLE match's ball-by-ball subcollection.
   * Used only for the one match currently open in the scorer/viewer screen
   * — not for every match in a list — so this never scales with how many
   * matches exist, only with how many balls the one open match has.
   */
  subscribeToMatchBalls(matchId: string, callback: (ballsByInnings: Record<string, any[]>) => void) {
    if (!matchId || isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.MATCHES, matchId, 'balls');
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const byInnings: Record<string, any[]> = {};
          snapshot.forEach((docSnap) => {
            const data: any = docSnap.data();
            const key = data.inningsKey || 'innings1';
            if (!byInnings[key]) byInnings[key] = [];
            byInnings[key].push(data);
          });
          Object.keys(byInnings).forEach((k) => {
            byInnings[k].sort((a, b) => (a.ballIndex ?? 0) - (b.ballIndex ?? 0));
          });
          callback(byInnings);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToMatchBalls')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Subscribe to real-time (LIVE) updates for the most recently-updated
   * matches only — this powers the "recent/completed matches" browsing
   * feed and is capped so it doesn't re-read the entire historical match
   * archive on every load. NOTE: this is intentionally NOT used for
   * actively-scoring matches anymore — see subscribeToLiveMatches() above —
   * because completed/upcoming matches change rarely, the orderBy-on-a-
   * changing-field cost this query still technically carries almost never
   * triggers in practice for them.
   * Older matches are NOT part of this live feed — use fetchOlderMatches()
   * (a one-time, non-listening read) to pull them in on demand, e.g. when a
   * user searches for an older match by team name.
   */
  subscribeToMatches(callback: (matches: Match[]) => void) {
    if (isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.MATCHES);
      const q = query(colRef, orderBy('updatedAt', 'desc'), limit(60));
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const matches: Match[] = [];
          snapshot.forEach((docSnap) => {
            matches.push(docSnap.data() as Match);
          });
          callback(matches);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToMatches')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * One-time (non-listening) fetch of older matches, older than the given
   * `beforeUpdatedAt` cursor. Used for "Load Older Matches" / searching for
   * a match that's outside the live-synced window — this reads Firestore
   * exactly once per call (no ongoing listener), so it doesn't add to the
   * continuous quota drain the way a live subscription would.
   */
  async fetchOlderMatches(beforeUpdatedAt: number, pageSize: number = 60): Promise<Match[]> {
    try {
      const colRef = collection(db, COLLECTIONS.MATCHES);
      const q = query(
        colRef,
        orderBy('updatedAt', 'desc'),
        startAfter(beforeUpdatedAt),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const matches: Match[] = [];
      snapshot.forEach((docSnap) => {
        matches.push(docSnap.data() as Match);
      });
      return matches;
    } catch (error) {
      console.error('Error fetching older matches:', error);
      return [];
    }
  },

  /**
   * Save or update a team in Firestore
   */
  async saveTeam(team: Team): Promise<void> {
    if (!team || !team.id || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.TEAMS, team.id);
      const sanitized = sanitizeForFirestore(team);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      if (!handleSyncFailure(error, 'saveTeam')) {
        console.warn('Error saving team to Firebase:', error);
      }
    }
  },

  /**
   * Delete a team from Firestore
   */
  async deleteTeam(teamId: string): Promise<void> {
    if (!teamId || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.TEAMS, teamId);
      await deleteDoc(docRef);
    } catch (error) {
      if (!handleSyncFailure(error, 'deleteTeam')) {
        console.warn('Error deleting team from Firebase:', error);
      }
    }
  },

  /**
   * Subscribe to real-time updates for teams
   */
  subscribeToTeams(callback: (teams: Team[]) => void) {
    if (isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.TEAMS);
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const teams: Team[] = [];
          snapshot.forEach((docSnap) => {
            teams.push(docSnap.data() as Team);
          });
          callback(teams);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToTeams')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Save or update a player in Firestore
   */
  async savePlayer(player: Player): Promise<void> {
    if (!player || !player.id || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.PLAYERS, player.id);
      const sanitized = sanitizeForFirestore(player);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      if (!handleSyncFailure(error, 'savePlayer')) {
        console.warn('Error saving player to Firebase:', error);
      }
    }
  },

  /**
   * Delete a player from Firestore
   */
  async deletePlayer(playerId: string): Promise<void> {
    if (!playerId || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.PLAYERS, playerId);
      await deleteDoc(docRef);
    } catch (error) {
      if (!handleSyncFailure(error, 'deletePlayer')) {
        console.warn('Error deleting player from Firebase:', error);
      }
    }
  },

  /**
   * Subscribe to real-time updates for players
   */
  subscribeToPlayers(callback: (players: Player[]) => void) {
    if (isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.PLAYERS);
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const players: Player[] = [];
          snapshot.forEach((docSnap) => {
            players.push(docSnap.data() as Player);
          });
          callback(players);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToPlayers')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Save or update a tournament in Firestore
   */
  async saveTournament(tournament: Tournament): Promise<void> {
    if (!tournament || !tournament.id || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.TOURNAMENTS, tournament.id);
      const sanitized = sanitizeForFirestore(tournament);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      if (!handleSyncFailure(error, 'saveTournament')) {
        console.warn('Error saving tournament to Firebase:', error);
      }
    }
  },

  /**
   * Delete a tournament from Firestore
   */
  async deleteTournament(tournamentId: string): Promise<void> {
    if (!tournamentId || isQuotaExceeded) return;
    try {
      const docRef = doc(db, COLLECTIONS.TOURNAMENTS, tournamentId);
      await deleteDoc(docRef);
    } catch (error) {
      if (!handleSyncFailure(error, 'deleteTournament')) {
        console.warn('Error deleting tournament from Firebase:', error);
      }
    }
  },

  /**
   * Subscribe to real-time updates for tournaments
   */
  subscribeToTournaments(callback: (tournaments: Tournament[]) => void) {
    if (isQuotaExceeded) {
      return () => {};
    }
    try {
      const colRef = collection(db, COLLECTIONS.TOURNAMENTS);
      let unsub: () => void = () => {};
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const tournaments: Tournament[] = [];
          snapshot.forEach((docSnap) => {
            tournaments.push(docSnap.data() as Tournament);
          });
          callback(tournaments);
        },
        (error) => {
          if (handleSyncFailure(error, 'subscribeToTournaments')) {
            try { unsub(); } catch {}
          }
        }
      );
      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Seed initial data to Firestore ONLY IF collections are completely empty on first run
   */
  async seedInitialDataIfEmpty(
    defaultTeams: Team[],
    defaultTournaments: Tournament[],
    defaultPlayers: Player[],
    defaultMatch: Match
  ): Promise<void> {
    if (isQuotaExceeded) return;
    try {
      const playersSnap = await getDocs(collection(db, COLLECTIONS.PLAYERS));
      if (playersSnap.empty) {
        console.log('Seeding initial ARCL Admin (ARCL-001) to Firebase...');
        const batch = writeBatch(db);
        defaultPlayers.forEach((p) => {
          batch.set(doc(db, COLLECTIONS.PLAYERS, p.id), sanitizeForFirestore(p));
        });
        await batch.commit();
      }

      const teamsSnap = await getDocs(collection(db, COLLECTIONS.TEAMS));
      if (teamsSnap.empty) {
        console.log('Seeding initial ARCL teams to Firebase...');
        const batch = writeBatch(db);
        defaultTeams.forEach((t) => {
          batch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeForFirestore(t));
        });
        await batch.commit();
      }

      const tournamentsSnap = await getDocs(collection(db, COLLECTIONS.TOURNAMENTS));
      if (tournamentsSnap.empty) {
        console.log('Seeding initial ARCL tournaments to Firebase...');
        const batch = writeBatch(db);
        defaultTournaments.forEach((tour) => {
          batch.set(doc(db, COLLECTIONS.TOURNAMENTS, tour.id), sanitizeForFirestore(tour));
        });
        await batch.commit();
      }
    } catch (err) {
      if (!handleSyncFailure(err, 'seedInitialDataIfEmpty')) {
        console.warn('Initial data seeding note:', err);
      }
    }
  },

  /**
   * Reset all records and wipe dummy data to a clean 00 state
   */
  async resetDatabaseToCleanSlate(
    defaultTeams: Team[],
    defaultTournaments: Tournament[],
    defaultPlayers: Player[],
    defaultMatch: Match
  ): Promise<void> {
    try {
      // 1. Wipe and re-seed players
      const playersSnap = await getDocs(collection(db, COLLECTIONS.PLAYERS));
      const pBatch = writeBatch(db);
      playersSnap.forEach((docSnap) => pBatch.delete(docSnap.ref));
      defaultPlayers.forEach((p) => {
        pBatch.set(doc(db, COLLECTIONS.PLAYERS, p.id), sanitizeForFirestore(p));
      });
      await pBatch.commit();

      // 2. Re-seed teams
      const teamsSnap = await getDocs(collection(db, COLLECTIONS.TEAMS));
      const tBatch = writeBatch(db);
      teamsSnap.forEach((docSnap) => tBatch.delete(docSnap.ref));
      defaultTeams.forEach((t) => {
        tBatch.set(doc(db, COLLECTIONS.TEAMS, t.id), sanitizeForFirestore(t));
      });
      await tBatch.commit();

      // 3. Re-seed tournaments
      const tourSnap = await getDocs(collection(db, COLLECTIONS.TOURNAMENTS));
      const tourBatch = writeBatch(db);
      tourSnap.forEach((docSnap) => tourBatch.delete(docSnap.ref));
      defaultTournaments.forEach((tour) => {
        tourBatch.set(doc(db, COLLECTIONS.TOURNAMENTS, tour.id), sanitizeForFirestore(tour));
      });
      await tourBatch.commit();

      // 4. Set single clean match
      const matchesSnap = await getDocs(collection(db, COLLECTIONS.MATCHES));
      const mBatch = writeBatch(db);
      matchesSnap.forEach((docSnap) => mBatch.delete(docSnap.ref));
      mBatch.set(doc(db, COLLECTIONS.MATCHES, defaultMatch.id), sanitizeForFirestore(defaultMatch));
      await mBatch.commit();

      console.log('Database reset to clean 00 state successfully!');
    } catch (err) {
      if (!handleSyncFailure(err, 'resetDatabaseToCleanSlate')) {
        console.error('Error resetting database:', err);
      }
      throw err;
    }
  },
};
