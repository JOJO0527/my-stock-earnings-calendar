import { fetchWithRetry, sleep } from '../lib/http.js';
import { writeJSON, readJSONIfExists } from '../lib/fs.js';
import { earningsCacheFile } from '../lib/paths.js';
import { dateRange, parseNasdaqAsOf, shiftDays, todayISO } from '../lib/date.js';

const NASDAQ_URL = 'https://api.nasdaq.com/api/calendar/earnings';

// Window we keep on disk: yesterday + next 30 days.
const BEFORE_DAYS = 1;
const AHEAD_DAYS = 31;

export function parseEarningsResponse(payload, isoDate) {
  if (payload?.status?.rCode !== 200 || !Object.hasOwn(payload, 'data')) {
    throw new Error(`Invalid Nasdaq response for ${isoDate}`);
  }
  if (payload.data !== null && (typeof payload.data !== 'object' || !Object.hasOwn(payload.data, 'rows'))) {
    throw new Error('Missing earnings rows');
  }
  const rows = payload.data?.rows ?? null;
  if (rows !== null && !Array.isArray(rows)) throw new Error('Invalid earnings rows');
  if (rows?.some((row) => !row || typeof row.symbol !== 'string' || !row.symbol.trim())) {
    throw new Error('Invalid earnings symbol');
  }
  const asOf = parseNasdaqAsOf(payload.data?.asOf) ?? isoDate;
  if (asOf !== isoDate) throw new Error(`Nasdaq returned ${asOf} for ${isoDate}`);
  return { date: asOf, data: rows, fetchedAt: new Date().toISOString() };
}

export function assertHealthyFetch({ saved, kept, failed, rows }) {
  if (saved === 0 || failed > 0 || rows === 0) {
    throw new Error(`Fetch incomplete (fresh=${saved}, cached=${kept}, missing=${failed}, freshRows=${rows}); preserve the previously published calendar.`);
  }
}

async function fetchOneDay(isoDate) {
  const res = await fetchWithRetry(`${NASDAQ_URL}?date=${isoDate}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      origin: 'https://www.nasdaq.com',
      referer: 'https://www.nasdaq.com/',
    },
  });
  const payload = await res.json();
  return parseEarningsResponse(payload, isoDate);
}

/**
 * Fetch the rolling earnings window starting `BEFORE_DAYS` before `anchor`.
 * Writes one JSON file per date into `data/earnings/`.
 * Valid cached days can cover failures for 48 hours. Incomplete fetches throw
 * before Pages deployment so they cannot replace the last published calendar.
 */
export async function fetchEarningsWindow(anchor = todayISO()) {
  const start = shiftDays(anchor, -BEFORE_DAYS);
  const dates = [...dateRange(start, AHEAD_DAYS)];
  const results = { saved: 0, kept: 0, failed: 0, rows: 0 };

  for (const date of dates) {
    try {
      const day = await fetchOneDay(date);
      await writeJSON(earningsCacheFile(date), day);
      results.saved++;
      results.rows += day.data?.length ?? 0;
      console.log(`[earnings] saved ${date} (${day.data?.length ?? 0} rows)`);
    } catch (err) {
      const cached = await readJSONIfExists(earningsCacheFile(date));
      const age = Date.now() - Date.parse(cached?.fetchedAt);
      if (cached?.date === date && (cached.data === null || Array.isArray(cached.data)) && age >= 0 && age <= 48 * 60 * 60 * 1000) {
        results.kept++;
        console.warn(`[earnings] ${date} fetch failed, kept cached copy`);
      } else {
        results.failed++;
        console.error(`[earnings] ${date} failed and no cache: ${err.message}`);
      }
    }
    await sleep(120);
  }

  console.log(
    `[earnings] window done — saved=${results.saved} kept=${results.kept} failed=${results.failed}`,
  );
  assertHealthyFetch(results);
  return results;
}
