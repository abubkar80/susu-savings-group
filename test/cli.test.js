'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('../src/cli');
const { SusuError } = require('../src/errors');

test('CLI end-to-end example scenario with a state file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'susu-'));
  const s = ['--state', path.join(dir, 'state.json')];
  const r = (...a) => run([...a, ...s]);
  r('create', '--amount', '50.00');
  ['Ama', 'Kofi', 'Esi'].forEach((m) => r('add-member', m));
  r('pay', 'Ama', '50'); r('pay', 'Kofi', '50'); r('pay', 'Esi', '30');
  assert.match(r('close-week'), /cannot close.*Esi owes 20\.00/);
  r('pay', 'Esi', '20');
  assert.match(r('close-week'), /Ama receives 150\.00.*Week 2 begins; Kofi is next/);
  const rep = r('report');
  assert.match(rep, /Current week: 2/);
  assert.match(rep, /Week 1: Ama received 150\.00/);
  assert.throws(() => r('create', '--amount', '10'), SusuError);
  assert.throws(() => r('pay', 'Ama', '-1'), SusuError);
});
