'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount, formatAmount } = require('../src/money');
const { InvalidAmountError } = require('../src/errors');

test('parses amounts into integer pesewas', () => {
  assert.equal(parseAmount('50'), 5000);
  assert.equal(parseAmount('50.5'), 5050);
  assert.equal(parseAmount('50.00'), 5000);
  assert.equal(parseAmount('0.01'), 1);
});

test('money is exact: 0.10 + 0.20 is exactly 0.30', () => {
  assert.equal(formatAmount(parseAmount('0.10') + parseAmount('0.20')), '0.30');
  let total = 0;
  for (let i = 0; i < 10; i++) total += parseAmount('0.10');
  assert.equal(formatAmount(total), '1.00');
});

test('rejects zero, negative, too many decimals and junk', () => {
  for (const bad of ['0', '0.00', '-5', '-0.01', '10.001', 'abc', '', '1e3', '5.', 5]) {
    assert.throws(() => parseAmount(bad), InvalidAmountError, `should reject ${bad}`);
  }
});

test('formats pesewas', () => {
  assert.equal(formatAmount(2000), '20.00');
  assert.equal(formatAmount(15000), '150.00');
  assert.equal(formatAmount(5), '0.05');
});
