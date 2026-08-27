import { Player, Team, Tournament } from '../types/cricket';

const KNOWN_DEFAULT_TEAM_MAP: Record<string, number> = {
  'team-rar': 1,
  'team-gtg': 2,
  'team-lrl': 3,
  'team-mb': 4,
};

/**
 * Extracts numeric sequence number from player profile ID string (e.g. "ARCL-001" -> 1, "ARCL-014" -> 14)
 * Ignores corrupt/legacy high numbers (> 500) so they don't break sequential numbering.
 */
export function parseProfileIdNumber(profileId?: string): number | null {
  if (!profileId) return null;
  const trimmed = profileId.trim().toUpperCase();
  const match = trimmed.match(/^ARCL-?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0 && num < 500) {
      return num;
    }
  }
  return null;
}

/**
 * Formats a number into standard ARCL profile ID (e.g. 1 -> "ARCL-001", 14 -> "ARCL-014")
 */
export function formatProfileId(num: number): string {
  return `ARCL-${String(num).padStart(3, '0')}`;
}

/**
 * Determines the next strictly sequential Player Profile ID (ARCL-001, ARCL-002, ARCL-003...).
 * Uses smallest unused positive integer to guarantee NO duplicate IDs and NO skips.
 */
export function getNextSequentialProfileId(existingPlayers: Player[] = []): string {
  const usedNumbers = new Set<number>();
  const existingProfileIds = new Set<string>();

  for (const p of existingPlayers || []) {
    if (!p) continue;
    if (p.profileId) {
      const cleanId = p.profileId.trim().toUpperCase();
      existingProfileIds.add(cleanId);
      const num = parseProfileIdNumber(cleanId);
      if (num !== null) {
        usedNumbers.add(num);
      }
    }
  }

  // Find lowest positive integer starting from 1
  let candidateNum = 1;
  while (usedNumbers.has(candidateNum) || existingProfileIds.has(formatProfileId(candidateNum))) {
    candidateNum++;
  }

  return formatProfileId(candidateNum);
}

/**
 * Extracts numeric sequence number from team ID string (e.g. "TEAM-001" -> 1, "TEAM-014" -> 14)
 */
export function parseTeamIdNumber(teamIdStr?: string): number | null {
  if (!teamIdStr) return null;
  const trimmed = teamIdStr.trim().toUpperCase();
  
  if (KNOWN_DEFAULT_TEAM_MAP[teamIdStr.toLowerCase()]) {
    return KNOWN_DEFAULT_TEAM_MAP[teamIdStr.toLowerCase()];
  }

  const match = trimmed.match(/^TEAM-?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0 && num < 500) {
      return num;
    }
  }
  return null;
}

/**
 * Formats a number into standard TEAM ID (e.g. 1 -> "TEAM-001", 2 -> "TEAM-002")
 */
export function formatTeamId(num: number): string {
  return `TEAM-${String(num).padStart(3, '0')}`;
}

/**
 * Determines the next strictly sequential Team ID (TEAM-001, TEAM-002, TEAM-003...).
 * Uses smallest unused positive integer to guarantee NO duplicates and distinct team numbers.
 */
export function getNextSequentialTeamId(existingTeams: Team[] = []): string {
  const usedNumbers = new Set<number>();
  const existingTeamIds = new Set<string>();

  for (const t of existingTeams || []) {
    if (!t) continue;
    const rawId = t.teamId || t.profileId || t.id;
    if (rawId) {
      const cleanId = rawId.trim().toUpperCase();
      existingTeamIds.add(cleanId);
      const num = parseTeamIdNumber(rawId);
      if (num !== null) {
        usedNumbers.add(num);
      }
    }
  }

  let candidateNum = 1;
  while (usedNumbers.has(candidateNum) || existingTeamIds.has(formatTeamId(candidateNum))) {
    candidateNum++;
  }

  return formatTeamId(candidateNum);
}

/**
 * Sanitizes and deduplicates a players list:
 * 1. Ensures each player has a valid, strictly unique profileId (ARCL-001, ARCL-002...).
 * 2. Cleans any legacy high IDs (e.g. ARCL-4379) into proper sequential IDs.
 * 3. Removes any duplicate records by id or profileId.
 */
export function sanitizeAndDeduplicatePlayers(playersList: Player[]): Player[] {
  if (!playersList || !Array.isArray(playersList)) {
    return [];
  }

  const seenIds = new Set<string>();
  const seenProfileIds = new Set<string>();
  const cleaned: Player[] = [];

  for (const p of playersList) {
    if (!p) continue;
    if (seenIds.has(p.id)) continue;

    let finalProfileId = p.profileId ? p.profileId.trim().toUpperCase() : '';
    const parsedNum = parseProfileIdNumber(finalProfileId);

    // If ID is missing, duplicate, or an invalid random high number (> 500)
    if (!finalProfileId || parsedNum === null || seenProfileIds.has(finalProfileId)) {
      finalProfileId = getNextSequentialProfileId(cleaned);
    }

    const playerToAdd: Player = {
      ...p,
      profileId: finalProfileId,
    };

    cleaned.push(playerToAdd);
    seenIds.add(playerToAdd.id);
    seenProfileIds.add(finalProfileId.toUpperCase());
  }

  return cleaned;
}

/**
 * Sanitizes and deduplicates a teams list:
 * 1. Ensures each team has a valid, strictly unique teamId (TEAM-001, TEAM-002, TEAM-003, TEAM-004, TEAM-005...).
 * 2. Removes duplicates and cleans up player references.
 */
export function sanitizeAndDeduplicateTeams(teamsList: Team[]): Team[] {
  if (!teamsList || !Array.isArray(teamsList)) {
    return [];
  }

  const seenIds = new Set<string>();
  const seenTeamIds = new Set<string>();
  const cleaned: Team[] = [];

  for (const t of teamsList) {
    if (!t) continue;
    if (seenIds.has(t.id)) continue;

    let finalTeamId = t.teamId || t.profileId;
    if (finalTeamId) finalTeamId = finalTeamId.trim().toUpperCase();

    const parsedNum = parseTeamIdNumber(finalTeamId || t.id);

    if (!finalTeamId || parsedNum === null || seenTeamIds.has(finalTeamId)) {
      finalTeamId = getNextSequentialTeamId(cleaned);
    }

    const teamToAdd: Team = {
      ...t,
      teamId: finalTeamId,
      profileId: finalTeamId,
      players: sanitizeAndDeduplicatePlayers(t.players || []),
    };

    cleaned.push(teamToAdd);
    seenIds.add(teamToAdd.id);
    seenTeamIds.add(finalTeamId.toUpperCase());
  }

  return cleaned;
}

/**
 * Extracts numeric sequence number from tournament ID string (e.g. "TRN-001" -> 1, "TRN-014" -> 14)
 */
export function parseTournamentIdNumber(tournamentIdStr?: string): number | null {
  if (!tournamentIdStr) return null;
  const trimmed = tournamentIdStr.trim().toUpperCase();

  const match = trimmed.match(/^TRN-?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0 && num < 500) {
      return num;
    }
  }
  return null;
}

/**
 * Formats a number into standard TOURNAMENT ID (e.g. 1 -> "TRN-001", 2 -> "TRN-002")
 */
export function formatTournamentId(num: number): string {
  return `TRN-${String(num).padStart(3, '0')}`;
}

/**
 * Determines the next strictly sequential Tournament ID (TRN-001, TRN-002, TRN-003...).
 */
export function getNextSequentialTournamentId(existingTournaments: Tournament[] = []): string {
  const usedNumbers = new Set<number>();
  const existingTourIds = new Set<string>();

  for (const t of existingTournaments || []) {
    if (!t) continue;
    const rawId = t.tournamentId || t.id;
    if (rawId) {
      const cleanId = rawId.trim().toUpperCase();
      existingTourIds.add(cleanId);
      const num = parseTournamentIdNumber(rawId);
      if (num !== null) {
        usedNumbers.add(num);
      }
    }
  }

  let candidateNum = 1;
  while (usedNumbers.has(candidateNum) || existingTourIds.has(formatTournamentId(candidateNum))) {
    candidateNum++;
  }

  return formatTournamentId(candidateNum);
}

/**
 * Sanitizes and deduplicates a tournaments list
 */
export function sanitizeAndDeduplicateTournaments(tournamentsList: Tournament[]): Tournament[] {
  if (!tournamentsList || !Array.isArray(tournamentsList)) {
    return [];
  }

  const seenIds = new Set<string>();
  const seenTourIds = new Set<string>();
  const cleaned: Tournament[] = [];

  for (const t of tournamentsList) {
    if (!t) continue;
    if (seenIds.has(t.id)) continue;

    let finalTourId = t.tournamentId;
    if (finalTourId) finalTourId = finalTourId.trim().toUpperCase();

    const parsedNum = parseTournamentIdNumber(finalTourId || t.id);

    if (!finalTourId || parsedNum === null || seenTourIds.has(finalTourId)) {
      finalTourId = getNextSequentialTournamentId(cleaned);
    }

    const tourToAdd: Tournament = {
      ...t,
      tournamentId: finalTourId,
    };

    cleaned.push(tourToAdd);
    seenIds.add(tourToAdd.id);
    seenTourIds.add(finalTourId.toUpperCase());
  }

  return cleaned;
}

