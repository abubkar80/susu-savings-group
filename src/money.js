'use strict';
/**
 * Exact money handling. Amounts are kept as integer pesewas
 * (1 GHS = 100 pesewas) and parsed from strings, never via floating point.
 */
const { InvalidAmountError } = require('./errors');

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

/** Parse "50", "50.5", "50.00" into pesewas. Rejects <= 0, >2 decimals, junk. */
function parseAmount(input) {
  if (typeof input !== 'string') {
    throw new InvalidAmountError('Amount must be given as a string like "50.00"');
  }
  const s = input.trim();
  if (/^-/.test(s)) throw new InvalidAmountError(`Amount must be greater than zero: ${s}`);
  if (!AMOUNT_RE.test(s)) {
    throw new InvalidAmountError(`Invalid amount "${s}" (use digits with at most 2 decimal places)`);
  }
  const [whole, frac = ''] = s.split('.');
  const pesewas = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(pesewas)) throw new InvalidAmountError(`Amount too large: ${s}`);
  if (pesewas <= 0) throw new InvalidAmountError(`Amount must be greater than zero: ${s}`);
  return pesewas;
}

/** Format pesewas as GHS string: 2000 -> "20.00". */
function formatAmount(pesewas) {
  const sign = pesewas < 0 ? '-' : '';
  const p = Math.abs(pesewas);
  return `${sign}${Math.floor(p / 100)}.${String(p % 100).padStart(2, '0')}`;
}

module.exports = { parseAmount, formatAmount };
