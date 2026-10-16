'use strict';
/** Domain errors. All extend SusuError so callers can catch one type. */
class SusuError extends Error {
  constructor(message) { super(message); this.name = this.constructor.name; }
}
class InvalidAmountError extends SusuError {}
class DuplicateMemberError extends SusuError {}
class UnknownMemberError extends SusuError {}
class OverpaymentError extends SusuError {}
class GroupStateError extends SusuError {}

module.exports = {
  SusuError, InvalidAmountError, DuplicateMemberError,
  UnknownMemberError, OverpaymentError, GroupStateError,
};
