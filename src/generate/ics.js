import { createEvents } from 'ics';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { icsFile } from '../lib/paths.js';

function buildEvent(entry) {
  const [y, m, d] = entry.date.split('-').map(Number);
  const timeSuffix = entry.time ? ` (${entry.time})` : '';
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
    '日期来自 Nasdaq，可能为预计日期；盘前/盘后按美国市场理解，以公司公告为准。',
    '',
    `📱 Open in Stocks app: stocks://?symbol=${entry.symbol}`,
    `🌐 Yahoo Finance: https://finance.yahoo.com/quote/${entry.symbol}`,
    '',
    '管理、停用与删除：https://github.com/JOJO0527/my-stock-earnings-calendar',
    'Earnings calendar by Beavern · https://beavern.com',
  ].filter((line) => line !== null).join('\n');

  return {
    uid,
    title: `${entry.symbol} ${entry.companyName}${timeSuffix} earnings`,
    description,
    start: [y, m, d],
    startInputType: 'utc',
    status: 'TENTATIVE',
    busyStatus: 'FREE',
    alarms: [
      { action: 'display', description: 'Earnings reminder', trigger: { hours: 2, minutes: 0, before: true } },
    ],
  };
}

function buildIcs(events, slug, label) {
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
