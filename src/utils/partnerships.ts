import { Match } from '../types/cricket';

// Partnerships: two batsmen at the crease together.
// A "stand" = a run of consecutive balls with the same two batsmen. A new stand starts when
// either batsman changes (wicket, retired). If a batsman retires and later returns with the
// same partner, that is a NEW stand; the pair's TOTAL runs add all their stands together.
// Worked out from ball-by-ball records already on the phone: no Firebase read/write.

export interface PairStat {
  key: string;
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  runs: number; // all runs scored while the two were together (incl. extras)
  balls: number; // legal balls
  aRuns: number; // bat runs by a
  bRuns: number; // bat runs by b
  stands: number; // how many separate partnerships
  best: number; // biggest single stand
}

export interface PartnershipResult {
  pairs: PairStat[];
  matchesUsed: number;
  matchesWithoutPartnerInfo: number;
}

const INNINGS_KEYS = ['innings1', 'innings2', 'innings3', 'innings4'];

export function computePartnerships(list: Match[]): PartnershipResult {
  const uniq = new Map<string, Match>();
  (list || []).forEach((m) => {
    if (m && m.id) uniq.set(m.id, m);
  });
  const map = new Map<string, PairStat>();
  let used = 0;
  let without = 0;

  uniq.forEach((m) => {
    let hadBalls = false;
    let hadPartner = false;
    INNINGS_KEYS.forEach((k) => {
      const balls: any[] = (m as any)[k]?.balls || [];
      if (balls.length) hadBalls = true;
      let cur: { key: string; ids: string[]; names: string[]; runs: number; balls: number; r: number[] } | null = null;
      const flush = () => {
        if (!cur) return;
        let p = map.get(cur.key);
        if (!p) {
          p = {
            key: cur.key,
            aId: cur.ids[0],
            aName: cur.names[0],
            bId: cur.ids[1],
            bName: cur.names[1],
            runs: 0,
            balls: 0,
            aRuns: 0,
            bRuns: 0,
            stands: 0,
            best: 0,
          };
          map.set(cur.key, p);
        }
        p.runs += cur.runs;
        p.balls += cur.balls;
        p.aRuns += cur.r[0];
        p.bRuns += cur.r[1];
        p.stands += 1;
        if (cur.runs > p.best) p.best = cur.runs;
        cur = null;
      };
      balls.forEach((b) => {
        if (!b.strikerId || !b.nonStrikerId || b.strikerId === b.nonStrikerId) {
          flush();
          return;
        }
        hadPartner = true;
        const swap = b.strikerId > b.nonStrikerId;
        const ids = swap ? [b.nonStrikerId, b.strikerId] : [b.strikerId, b.nonStrikerId];
        const names = swap ? [b.nonStrikerName, b.strikerName] : [b.strikerName, b.nonStrikerName];
        const key = ids.join('|');
        if (!cur || cur.key !== key) {
          flush();
          cur = { key, ids, names: names.map((n: any) => String(n || '')), runs: 0, balls: 0, r: [0, 0] };
        }
        const bat = Number(b.runsBat) || 0;
        const extra = Number(b.extraRuns) || 0;
        cur.runs += bat + extra;
        if (b.isLegalDelivery) cur.balls += 1;
        // bat runs belong to the striker
        cur.r[b.strikerId === ids[0] ? 0 : 1] += bat;
        if (b.isWicket) flush(); // any wicket / retirement ends the stand
      });
      flush();
    });
    if (hadBalls) {
      if (hadPartner) used += 1;
      else without += 1;
    }
  });

  const pairs = Array.from(map.values())
    .filter((p) => p.runs > 0 || p.balls > 0)
    .map((p) =>
      p.bRuns > p.aRuns
        ? { ...p, aId: p.bId, aName: p.bName, bId: p.aId, bName: p.aName, aRuns: p.bRuns, bRuns: p.aRuns }
        : p
    )
    .sort((x, y) => y.runs - x.runs || y.best - x.best);
  return { pairs, matchesUsed: used, matchesWithoutPartnerInfo: without };
}

export interface PartnershipTier {
  min: number;
  label: string;
  color: string; // main colour
  text: string; // text colour on top of main colour
}

// highest first
export const PARTNERSHIP_TIERS: PartnershipTier[] = [
  { min: 5000, label: 'DIAMOND', color: '#67e8f9', text: '#083344' },
  { min: 2500, label: 'GOLD', color: '#fbbf24', text: '#451a03' },
  { min: 2000, label: 'SILVER', color: '#cbd5e1', text: '#0f172a' },
  { min: 1000, label: 'BRONZE', color: '#c2763a', text: '#ffffff' },
  { min: 500, label: '500 CLUB', color: '#3b82f6', text: '#ffffff' },
  { min: 250, label: '250 CLUB', color: '#10b981', text: '#052e1f' },
  { min: 100, label: '100 CLUB', color: '#64748b', text: '#ffffff' },
];

export function tierFor(runs: number): PartnershipTier | null {
  return PARTNERSHIP_TIERS.find((t) => runs >= t.min) || null;
}

// next badge to reach (lowest tier above current runs)
export function nextTier(runs: number): PartnershipTier | null {
  const above = PARTNERSHIP_TIERS.filter((t) => t.min > runs);
  return above.length ? above[above.length - 1] : null;
}
