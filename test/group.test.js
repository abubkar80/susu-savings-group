'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SusuGroup } = require('../src/group');
const { parseAmount: ghs, formatAmount } = require('../src/money');
const E = require('../src/errors');

function threeMembers() {
  const g = new SusuGroup(ghs('50.00'));
  ['Ama', 'Kofi', 'Esi'].forEach((m) => g.addMember(m));
  return g;
}

test('full Ama/Kofi/Esi example from the spec', () => {
  const g = threeMembers();
  g.pay('Ama', ghs('50'));
  g.pay('Kofi', ghs('50'));
  g.pay('Esi', ghs('30'));

  const fail = g.closeWeek();
  assert.equal(fail.closed, false);
  assert.deepEqual(fail.debtors, [{ member: 'Esi', owes: ghs('20.00') }]);
  assert.equal(g.currentWeek, 1);
  assert.equal(g.payouts.length, 0);

  g.pay('Esi', ghs('20'));
  const ok = g.closeWeek();
  assert.equal(ok.closed, true);
  assert.equal(ok.payout.member, 'Ama');
  assert.equal(formatAmount(ok.payout.amount), '150.00');
  assert.equal(g.currentWeek, 2);
  assert.equal(g.nextRecipient(), 'Kofi');
  assert.equal(g.owedBy('Ama'), ghs('50')); // balances reset for week 2
});

test('partial payments accumulate', () => {
  const g = threeMembers();
  assert.equal(g.pay('Esi', ghs('10.25')), ghs('39.75'));
  assert.equal(g.pay('Esi', ghs('39.75')), 0);
  assert.equal(g.paidBy('Esi'), ghs('50'));
});

test('week cannot close when anyone owes; reports all debtors', () => {
  const g = threeMembers();
  g.pay('Ama', ghs('50'));
  const res = g.closeWeek();
  assert.equal(res.closed, false);
  assert.deepEqual(res.debtors.map((d) => [d.member, formatAmount(d.owes)]),
    [['Kofi', '50.00'], ['Esi', '50.00']]);
  assert.equal(g.payouts.length, 0);
});

test('rejects unknown and duplicate members (case-insensitive)', () => {
  const g = threeMembers();
  assert.throws(() => g.addMember('ama'), E.DuplicateMemberError);
  assert.throws(() => g.addMember('  '), E.GroupStateError);
  assert.throws(() => g.pay('Yaw', ghs('10')), E.UnknownMemberError);
});

test('rejects zero/negative payments and overpayments', () => {
  const g = threeMembers();
  assert.throws(() => g.pay('Ama', 0), E.InvalidAmountError);
  assert.throws(() => g.pay('Ama', -100), E.InvalidAmountError);
  assert.throws(() => g.pay('Ama', ghs('50.01')), E.OverpaymentError);
  g.pay('Ama', ghs('30'));
  assert.throws(() => g.pay('Ama', ghs('20.01')), E.OverpaymentError);
  g.pay('Ama', ghs('20'));
  assert.throws(() => g.pay('Ama', ghs('0.01')), E.OverpaymentError);
});

test('payments only for the current week', () => {
  const g = threeMembers();
  assert.throws(() => g.pay('Ama', ghs('10'), 2), E.GroupStateError);
});

test('no new members once week 1 contributions started', () => {
  const g = threeMembers();
  g.pay('Ama', ghs('1'));
  assert.throws(() => g.addMember('Yaw'), E.GroupStateError);
});

test('needs at least 2 members to close a week', () => {
  const g = new SusuGroup(ghs('50'));
  g.addMember('Ama');
  g.pay('Ama', ghs('50'));
  assert.throws(() => g.closeWeek(), E.GroupStateError);
});

test('full cycle pays every member once in join order, then ends', () => {
  const g = threeMembers();
  for (let w = 0; w < 3; w++) {
    g.members.forEach((m) => g.pay(m, ghs('50')));
    assert.equal(g.closeWeek().closed, true);
  }
  assert.deepEqual(g.payouts.map((p) => [p.week, p.member]), [[1, 'Ama'], [2, 'Kofi'], [3, 'Esi']]);
  assert.equal(g.isFinished, true);
  assert.throws(() => g.pay('Ama', ghs('1')), E.GroupStateError);
  assert.throws(() => g.closeWeek(), E.GroupStateError);
});

test('report shows week, paid in full, owing and history', () => {
  const g = threeMembers();
  g.pay('Ama', ghs('50'));
  g.pay('Kofi', ghs('25'));
  const r = g.report();
  assert.equal(r.currentWeek, 1);
  assert.deepEqual(r.paidInFull, ['Ama']);
  assert.deepEqual(r.owing, [{ member: 'Kofi', owes: 2500 }, { member: 'Esi', owes: 5000 }]);
  assert.deepEqual(r.payouts, []);
});

test('JSON round trip preserves state', () => {
  const g = threeMembers();
  g.pay('Kofi', ghs('12.34'));
  const copy = SusuGroup.fromJSON(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(copy.report(), g.report());
});
