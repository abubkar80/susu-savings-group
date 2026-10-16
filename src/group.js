'use strict';
/**
 * Domain model for one rotating savings group (susu).
 * All money values are integer pesewas.
 */
const { formatAmount } = require('./money');
const {
  InvalidAmountError, DuplicateMemberError, UnknownMemberError,
  OverpaymentError, GroupStateError,
} = require('./errors');

const MIN_MEMBERS = 2;

class SusuGroup {
  /** @param {number} weeklyAmount contribution per member per week, in pesewas */
  constructor(weeklyAmount) {
    if (!Number.isSafeInteger(weeklyAmount) || weeklyAmount <= 0) {
      throw new InvalidAmountError('Weekly amount must be a positive whole number of pesewas');
    }
    this.weeklyAmount = weeklyAmount;
    this.members = [];          // names in join order = payout order
    this.currentWeek = 1;
    this.payments = {};         // { memberName: pesewasPaidThisWeek } for current week
    this.payouts = [];          // [{ week, member, amount }]
  }

  get isFinished() { return this.members.length > 0 && this.payouts.length === this.members.length; }
  get pot() { return this.weeklyAmount * this.members.length; }

  _key(name) { return String(name).trim().toLowerCase(); }

  _find(name) {
    const k = this._key(name);
    const m = this.members.find((x) => this._key(x) === k);
    if (!m) throw new UnknownMemberError(`Unknown member: ${name}`);
    return m;
  }

  _hasStarted() {
    return this.currentWeek > 1 || Object.values(this.payments).some((v) => v > 0);
  }

  addMember(name) {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) throw new GroupStateError('Member name must not be empty');
    if (this._hasStarted()) {
      throw new GroupStateError('Cannot add members after contributions for week 1 have started');
    }
    if (this.members.some((m) => this._key(m) === this._key(clean))) {
      throw new DuplicateMemberError(`Member already exists: ${clean}`);
    }
    this.members.push(clean);
    this.payments[clean] = 0;
    return clean;
  }

  paidBy(name) { return this.payments[this._find(name)] || 0; }
  owedBy(name) { return this.weeklyAmount - this.paidBy(name); }

  /** Record a (possibly partial) contribution for the current week. */
  pay(name, amount, week = this.currentWeek) {
    if (this.isFinished) throw new GroupStateError('The susu cycle is complete; no more payments');
    const member = this._find(name);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new InvalidAmountError('Payment must be greater than zero');
    }
    if (week !== this.currentWeek) {
      throw new GroupStateError(`Payments are only accepted for the current week (${this.currentWeek})`);
    }
    const owed = this.owedBy(member);
    if (owed === 0) throw new OverpaymentError(`${member} has already paid in full for week ${week}`);
    if (amount > owed) {
      throw new OverpaymentError(
        `Payment of ${formatAmount(amount)} exceeds what ${member} owes (${formatAmount(owed)})`);
    }
    this.payments[member] += amount;
    return this.owedBy(member);
  }

  debtors() {
    return this.members
      .filter((m) => this.owedBy(m) > 0)
      .map((m) => ({ member: m, owes: this.owedBy(m) }));
  }

  /**
   * Close the current week. Returns { closed: true, payout } on success or
   * { closed: false, debtors } if anyone still owes.
   */
  closeWeek() {
    if (this.isFinished) throw new GroupStateError('The susu cycle is complete');
    if (this.members.length < MIN_MEMBERS) {
      throw new GroupStateError(`A group needs at least ${MIN_MEMBERS} members to close a week`);
    }
    const debtors = this.debtors();
    if (debtors.length > 0) return { closed: false, week: this.currentWeek, debtors };

    const payout = {
      week: this.currentWeek,
      member: this.members[this.payouts.length],
      amount: this.pot,
    };
    this.payouts.push(payout);
    if (!this.isFinished) {
      this.currentWeek += 1;
      for (const m of this.members) this.payments[m] = 0;
    }
    return { closed: true, payout, nextRecipient: this.nextRecipient() };
  }

  nextRecipient() {
    return this.isFinished ? null : this.members[this.payouts.length] || null;
  }

  report() {
    return {
      weeklyAmount: this.weeklyAmount,
      currentWeek: this.currentWeek,
      finished: this.isFinished,
      nextRecipient: this.nextRecipient(),
      paidInFull: this.isFinished ? [] : this.members.filter((m) => this.owedBy(m) === 0),
      owing: this.isFinished ? [] : this.debtors(),
      payouts: this.payouts.slice(),
    };
  }

  toJSON() {
    return {
      weeklyAmount: this.weeklyAmount, members: this.members, currentWeek: this.currentWeek,
      payments: this.payments, payouts: this.payouts,
    };
  }

  static fromJSON(data) {
    const g = new SusuGroup(data.weeklyAmount);
    g.members = data.members.slice();
    g.currentWeek = data.currentWeek;
    g.payments = { ...data.payments };
    g.payouts = data.payouts.map((p) => ({ ...p }));
    return g;
  }
}

module.exports = { SusuGroup, MIN_MEMBERS };
