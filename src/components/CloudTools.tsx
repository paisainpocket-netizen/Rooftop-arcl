import React, { useEffect, useState } from 'react';
import { doc, setDoc, waitForPendingWrites } from 'firebase/firestore';
import { db, getLastSyncError, getSyncState, isFirestoreQuotaExceeded } from '../lib/firebase';

/**
 * Small floating "Cloud" helper:
 *  1) Backup  -> downloads everything this phone has stored for the app
 *                (matches, teams, players, tournaments) as one JSON file.
 *  2) Test    -> tells, in plain words, whether this phone can actually write
 *                to the cloud, and whether older writes are stuck.
 * It never changes any match/tournament data.
 */

type Outcome = { status: 'ok' } | { status: 'timeout' } | { status: 'error'; error: any };

function withTimeout(p: Promise<unknown>, ms: number): Promise<Outcome> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ status: 'timeout' }), ms);
    p.then(
      () => {
        clearTimeout(t);
        resolve({ status: 'ok' });
      },
      (error) => {
        clearTimeout(t);
        resolve({ status: 'error', error });
      }
    );
  });
}

const errText = (e: any) => `${e?.code || ''} ${e?.message || e || ''}`.trim();

function readLocalMatchSummary(): string[] {
  const lines: string[] = [];
  try {
    const raw = localStorage.getItem('arcl_current_match_v2');
    if (!raw) {
      lines.push('Phone mein current match nahi mila.');
      return lines;
    }
    const m = JSON.parse(raw);
    lines.push(`Phone ka match: ${m.name || m.id} (status: ${m.status})`);
    (['innings1', 'innings2', 'innings3', 'innings4'] as const).forEach((k, i) => {
      const inn = m[k];
      if (inn) {
        lines.push(
          `  Innings ${i + 1}: ${inn.totalRuns}-${inn.totalWickets} (${inn.oversCompleted}.${inn.ballsInCurrentOver}), balls list: ${(inn.balls || []).length}`
        );
      }
    });
  } catch {
    lines.push('Phone ka match padh nahi paya.');
  }
  return lines;
}

type StatusView = { label: string; cls: string };

function describeSync(): StatusView {
  const st = getSyncState();
  if (st.quotaExceeded) return { label: '☁ Limit', cls: 'border-amber-500 text-amber-300' };
  if (!st.online) return { label: '☁ Offline', cls: 'border-slate-500 text-slate-300' };
  if (st.pending > 0) {
    // Pending for more than 20 seconds usually means the write is stuck.
    if (st.oldestPendingMs > 20000) {
      return { label: `☁ ⚠ ${st.pending} pending`, cls: 'border-rose-500 text-rose-300' };
    }
    return { label: '☁ Syncing…', cls: 'border-amber-500 text-amber-300' };
  }
  return { label: '☁ Saved ✓', cls: 'border-emerald-600 text-emerald-300' };
}

export const CloudTools: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusView>(() => describeSync());

  useEffect(() => {
    const id = setInterval(() => setStatus(describeSync()), 1500);
    return () => clearInterval(id);
  }, []);

  const doBackup = () => {
    try {
      const dump: Record<string, any> = {
        _exportedAt: new Date().toISOString(),
        _note: 'ARCL phone backup (localStorage)',
      };
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('arcl_')) {
          const val = localStorage.getItem(key);
          try {
            dump[key] = val ? JSON.parse(val) : val;
          } catch {
            dump[key] = val;
          }
        }
      }
      const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `arcl-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setReport((r) => [`Backup file download ho gayi (arcl-backup-${stamp}.json). Downloads folder dekho.`, ...r]);
    } catch (e: any) {
      setReport((r) => [`Backup fail: ${e?.message || e}`, ...r]);
    }
  };

  const runTest = async () => {
    setBusy(true);
    const out: string[] = [];
    try {
      out.push(`Internet: ${navigator.onLine ? 'ON' : 'OFF'}`);
      const ss = getSyncState();
      out.push(`Pending writes (abhi): ${ss.pending}${ss.pending ? `, sabse purana ${Math.round(ss.oldestPendingMs / 1000)}s se` : ''}`);
      out.push(`Daily quota flag: ${isFirestoreQuotaExceeded() ? 'LAGA HUA (cloud band)' : 'nahi laga'}`);
      const se = getLastSyncError();
      out.push(se ? `Last error: ${se.code} (${se.context}) ${se.message}` : 'Last error: koi nahi');
      out.push(...readLocalMatchSummary());

      const pending = await withTimeout(waitForPendingWrites(db), 8000);
      if (pending.status === 'ok') out.push('Purane writes: sab cloud tak pahunch chuke hain.');
      else if (pending.status === 'error') out.push(`Purane writes: error ${errText(pending.error)}`);
      else out.push('Purane writes: ABHI BHI ATKE HAIN (cloud tak nahi pahunche).');

      const ping = await withTimeout(
        setDoc(doc(db, 'system_settings', 'ping'), { t: Date.now(), from: 'cloud-test' }, { merge: true }),
        10000
      );
      if (ping.status === 'ok') out.push('Test write: CLOUD TAK PAHUNCH GAYA. Likhna chal raha hai.');
      else if (ping.status === 'error') out.push(`Test write: FAIL - ${errText(ping.error)}`);
      else out.push('Test write: 10 second mein jawab nahi aaya (ATKA HUA).');
    } catch (e: any) {
      out.push(`Test error: ${e?.message || e}`);
    }
    setReport(out);
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-24 left-3 z-[70] px-3 py-2 rounded-full bg-slate-900/90 border text-[11px] font-bold shadow-lg ${status.cls}`}
      >
        {status.label}
      </button>
      {open && (
        <div className="fixed bottom-36 left-3 right-3 sm:right-auto sm:w-96 z-[70] rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 p-3 space-y-2 shadow-2xl max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black">Cloud Tools</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 text-xs px-2">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={doBackup}
              className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-black"
            >
              💾 Backup
            </button>
            <button
              onClick={runTest}
              disabled={busy}
              className="py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black disabled:opacity-60"
            >
              {busy ? 'Test chal raha...' : '🔎 Cloud Test'}
            </button>
          </div>
          {report.length > 0 && (
            <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-words text-slate-300 bg-slate-900 rounded-xl p-2">
              {report.join('\n')}
            </pre>
          )}
        </div>
      )}
    </>
  );
};
