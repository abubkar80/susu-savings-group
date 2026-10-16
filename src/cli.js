#!/usr/bin/env node
'use strict';
/** Command-line interface. Thin layer: parse args, call domain, print. */
const { SusuGroup } = require('./group');
const { parseAmount, formatAmount } = require('./money');
const storage = require('./storage');
const { SusuError } = require('./errors');

const USAGE = `Usage: node src/cli.js <command> [options] [--state FILE]

Commands:
  create --amount <GHS> [--force]     Create a group (e.g. --amount 50.00)
  add-member <name>                   Add a member (join order = payout order)
  pay <name> <amount> [--week N]      Record a (partial) contribution
  close-week                          Close the current week and pay out if all paid
  report                              Show current week, balances and payout history

Default state file: ./susu-state.json`;

function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) opts[key] = true;
      else { opts[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, opts };
}

function formatReport(r) {
  const lines = [];
  lines.push(`Weekly contribution: GHS ${formatAmount(r.weeklyAmount)}`);
  if (r.finished) {
    lines.push('Status: cycle complete - every member has received the pot');
  } else {
    lines.push(`Current week: ${r.currentWeek}`);
    lines.push(`Next recipient: ${r.nextRecipient || '-'}`);
    lines.push(`Paid in full: ${r.paidInFull.length ? r.paidInFull.join(', ') : 'none'}`);
    lines.push('Owing:');
    if (r.owing.length === 0) lines.push('  nobody');
    for (const d of r.owing) lines.push(`  ${d.member} owes ${formatAmount(d.owes)}`);
  }
  lines.push('Payout history:');
  if (r.payouts.length === 0) lines.push('  none yet');
  for (const p of r.payouts) lines.push(`  Week ${p.week}: ${p.member} received ${formatAmount(p.amount)}`);
  return lines.join('\n');
}

/** Runs one command. Returns output text; throws SusuError on rule violations. */
function run(argv) {
  const { positional, opts } = parseArgs(argv);
  const [cmd, ...args] = positional;
  const file = opts.state || 'susu-state.json';

  switch (cmd) {
    case 'create': {
      if (!opts.amount || opts.amount === true) throw new SusuError('create requires --amount <GHS>');
      if (storage.exists(file) && !opts.force) {
        throw new SusuError(`A group already exists at ${file} (use --force to replace it)`);
      }
      const g = new SusuGroup(parseAmount(opts.amount));
      storage.save(file, g);
      return `Created group with weekly contribution GHS ${formatAmount(g.weeklyAmount)}`;
    }
    case 'add-member': {
      if (args.length !== 1) throw new SusuError('add-member requires exactly one <name> (quote names with spaces)');
      const g = storage.load(file);
      const name = g.addMember(args[0]);
      storage.save(file, g);
      return `Added ${name} (position ${g.members.length})`;
    }
    case 'pay': {
      if (args.length !== 2) throw new SusuError('pay requires <name> <amount>');
      const g = storage.load(file);
      const week = opts.week !== undefined ? Number(opts.week) : g.currentWeek;
      if (!Number.isInteger(week)) throw new SusuError('--week must be a whole number');
      const amount = parseAmount(args[1]);
      const remaining = g.pay(args[0], amount, week);
      storage.save(file, g);
      return `Recorded ${formatAmount(amount)} from ${args[0]} for week ${week}. ` +
        (remaining === 0 ? 'Paid in full.' : `Still owes ${formatAmount(remaining)}.`);
    }
    case 'close-week': {
      const g = storage.load(file);
      const res = g.closeWeek();
      if (!res.closed) {
        const owed = res.debtors.map((d) => `${d.member} owes ${formatAmount(d.owes)}`).join(', ');
        return `Week ${res.week} cannot close. No payout. ${owed}`;
      }
      storage.save(file, g);
      const p = res.payout;
      return `Week ${p.week} closed. ${p.member} receives ${formatAmount(p.amount)}. ` +
        (res.nextRecipient ? `Week ${g.currentWeek} begins; ${res.nextRecipient} is next.`
          : 'Cycle complete: every member has received the pot.');
    }
    case 'report':
      return formatReport(storage.load(file).report());
    case undefined: case 'help': case '--help':
      return USAGE;
    default:
      throw new SusuError(`Unknown command "${cmd}"\n\n${USAGE}`);
  }
}

if (require.main === module) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (err) {
    if (err instanceof SusuError) { console.error(`Error: ${err.message}`); process.exit(1); }
    throw err;
  }
}

module.exports = { run, parseArgs, formatReport };
