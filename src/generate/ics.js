import { createEvents } from 'ics';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { icsFile } from '../lib/paths.js';
import { shiftDays } from '../lib/date.js';

// Intl supplies the date-specific Eastern offset, including daylight saving.
export function marketTimeToUtc(date, hour, minute = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const wallClock = Date.UTC(y, m - 1, d, hour, minute);
  if (new Date(wallClock).toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid market date: ${date}`);
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  let instant = wallClock;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
    const observed = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const adjustment = wallClock - observed;
    if (adjustment === 0) return new Date(instant);
    instant += adjustment;
  }
  throw new Error(`Ambiguous or nonexistent market time: ${date} ${hour}:${minute}`);
}

export function buildEvent(entry) {
  const [y, m, d] = entry.date.split('-').map(Number);
  const session = entry.time === 'After-hours' ? '盘后' : entry.time === 'Pre-market' ? '盘前' : '';
  const instant = session ? marketTimeToUtc(entry.date, session === '盘后' ? 16 : 8) : null;
  const reference = instant ? new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(instant) : null;
  const period = entry.fiscalQuarterEnding || `${y}-Q${Math.ceil(m / 3)}`;
  const uid = [entry.symbol, period, 'earnings'].join('-').replace(/[^a-zA-Z0-9._-]/g, '_') + '@jojo0527.github.io';

  const description = [
    `🏢 ${entry.companyName}`,
    `📊 Symbol: ${entry.symbol}`,
    entry.industry ? `🏭 Industry: ${entry.industry}` : null,
    entry.fiscalQuarterEnding ? `📅 Fiscal quarter: ${entry.fiscalQuarterEnding}` : null,
    entry.epsForecast ? `💵 EPS forecast: ${entry.epsForecast}` : null,
    entry.marketCap && entry.marketCap !== 'N/A' ? `💰 Market cap: ${entry.marketCap}` : null,
    entry.time ? `⏰ Reporting: ${entry.time}` : null,
    `美国市场日期：${entry.date}（America/New_York）`,
    instant ? `北京时间提醒参考：${reference}，${session}。` : '时间待确认：这是美国市场日期的全天占位，不是北京时间的财报发布日。',
    instant ? `仅知道${session}，暂用美东${session === '盘后' ? '16:00' : '08:00'}作为提醒参考，实际发布可能更早或更晚。` : null,
    'Nasdaq 日期可能为预计日期；参考时刻不代表公司确认的发布时间，也不是电话会时间。以公司公告为准。',
    '',
    `📱 Open in Stocks app: stocks://?symbol=${entry.symbol}`,
    `🌐 Yahoo Finance: https://finance.yahoo.com/quote/${entry.symbol}`,
    '',
    '管理、停用与删除：https://github.com/JOJO0527/my-stock-earnings-calendar',
    'Earnings calendar by Beavern · https://beavern.com',
  ].filter((line) => line !== null).join('\n');

  return {
    uid,
    title: instant ? `${entry.symbol} 财报｜${session}参考（预计）` : `${entry.symbol} 财报｜美国日期 ${entry.date}・时间待确认`,
    description,
    start: instant ? [instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(), instant.getUTCHours(), instant.getUTCMinutes()] : [y, m, d],
    ...(instant ? { duration: { minutes: 0 } } : { end: shiftDays(entry.date, 1).split('-').map(Number) }),
    startInputType: 'utc',
    startOutputType: 'utc',
    sequence: 2,
    lastModified: Date.now(),
    status: 'TENTATIVE',
    busyStatus: 'FREE',
    alarms: instant ? [
      { action: 'display', description: 'Earnings reminder', trigger: { hours: 2, minutes: 0, before: true } },
    ] : [],
  };
}

export function buildIcs(events, slug, label) {
  return new Promise((resolve, reject) => {
    createEvents(
      events.map(buildEvent),
      {
        productId: `oh-earnings-cal/${slug}`,
        calName: slug === 'customstock' ? '自选股财报｜GitHub自动更新' : `${label} Earnings Calendar`,
        method: 'PUBLISH',
      },
      (err, value) => (err ? reject(err) : resolve(value)),
    );
  });
}

export async function writeIcsFile({ slug, label, events }) {
  const content = await buildIcs(events, slug, label);
  const file = icsFile(slug);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
  console.log(`[ics] wrote ${slug}.ics — ${events.length} events`);
  return file;
}
