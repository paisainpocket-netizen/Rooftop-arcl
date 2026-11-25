import { Match } from '../types/cricket';

// Season-wise numbers for ONE player. A "season" is one tournament; matches that belong to
// no tournament are grouped as "Friendly Matches". Everything is worked out on screen from
// matches the app already has, so nothing extra is saved and no extra reads are made.

export interface SeasonRow {
  key: string;
  name: string;
  lastAt: number;
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  timesOut: number;
  highest: number;
  highestNotOut: boolean;
  fifties: number;
  hundreds: number;
  wickets: number;
  legalBalls: number;
  runsConceded: number;
  bestW: number;
  bestR: number;
  average: number;
  strikeRate: number;
  economy: number;
}

export function computeSeasons(items: { match: Match }[], playerId: string): SeasonRow[] {
  const map = new Map<string, SeasonRow>();
  items.forEach(({ match: m }) => {
    if (m.status !== 'completed') return;
    const key = m.tournamentId || '__friendly__';
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        name: m.tournamentName || 'Friendly Matches',
        lastAt: 0,
        matches: 0, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, timesOut: 0,
        highest: 0, highestNotOut: false, fifties: 0, hundreds: 0,
        wickets: 0, legalBalls: 0, runsConceded: 0, bestW: 0, bestR: 0,
        average: 0, strikeRate: 0, economy: 0,
      };
      map.set(key, row);
    }
    const r = row;
    r.matches += 1;
    const t = Number(m.updatedAt) || Date.parse(m.date || '') || 0;
    if (t > r.lastAt) r.lastAt = t;

    [m.innings1, m.innings2, m.innings3, m.innings4].forEach((inn) => {
      if (!inn) return;
      const bat: any = inn.battingStats?.[playerId];
      if (bat) {
        const runs = bat.runs || 0;
        r.innings += 1;
        r.runs += runs;
        r.balls += bat.balls || 0;
        r.fours += bat.fours || 0;
        r.sixes += bat.sixes || 0;
        if (bat.isOut) r.timesOut += 1;
        if (runs >= 100) r.hundreds += 1;
        else if (runs >= 50) r.fifties += 1;
        if (runs > r.highest) {
          r.highest = runs;
          r.highestNotOut = !bat.isOut;
        } else if (runs === r.highest && !bat.isOut) {
          r.highestNotOut = true;
        }
      }
      const bowl: any = inn.bowlingStats?.[playerId];
      if (bowl) {
        const w = bowl.wickets || 0;
        const rc = bowl.runs ?? bowl.runsConceded ?? 0;
        r.wickets += w;
        r.legalBalls += (bowl.overs || 0) * 6 + (bowl.balls || 0);
        r.runsConceded += rc;
        if (w > r.bestW || (w === r.bestW && w > 0 && rc < r.bestR)) {
          r.bestW = w;
          r.bestR = rc;
        }
      }
    });
  });

  const rows = Array.from(map.values());
  rows.forEach((r) => {
    r.average = r.timesOut > 0 ? r.runs / r.timesOut : r.runs;
    r.strikeRate = r.balls > 0 ? (r.runs / r.balls) * 100 : 0;
    r.economy = r.legalBalls > 0 ? r.runsConceded / (r.legalBalls / 6) : 0;
  });
  return rows.sort((a, b) => b.lastAt - a.lastAt);
}
