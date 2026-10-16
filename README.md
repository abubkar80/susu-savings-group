# Susu Savings Group

A small command-line program (Node.js, no dependencies) that manages one rotating
savings group (susu): every member pays the same fixed amount each week, and each
week the whole pot goes to one member, in the order they joined.

## Requirements
- Node.js 18 or newer (uses the built-in `node:test` runner). No `npm install` needed.

## Running the program
```
node src/cli.js create --amount 50.00        # create the group (GHS per member per week)
node src/cli.js add-member Ama               # join order = payout order
node src/cli.js pay Esi 30                   # record a (partial) contribution for the current week
node src/cli.js close-week                   # pay out if everyone paid in full
node src/cli.js report                       # current week, paid/owing, payout history
node src/cli.js help
```
State is saved to `./susu-state.json` between commands. Use `--state FILE` on any
command to use a different file. `create --force` replaces an existing group.
Errors are printed as `Error: ...` and the process exits with code 1.

## Running the tests
```
npm test          # same as: node --test
```

## Project layout
```
src/money.js    exact money: parse "50.00" -> 5000 pesewas, format back
src/errors.js   domain error classes (all extend SusuError)
src/group.js    SusuGroup domain model and business rules
src/storage.js  JSON file persistence (atomic write)
src/cli.js      argument parsing and output formatting
test/           node:test suites for money, domain and CLI
```

## Example session (the scenario from the brief)
```
$ node src/cli.js create --amount 50.00
Created group with weekly contribution GHS 50.00
$ node src/cli.js add-member Ama
Added Ama (position 1)
$ node src/cli.js add-member Kofi
Added Kofi (position 2)
$ node src/cli.js add-member Esi
Added Esi (position 3)
$ node src/cli.js pay Ama 50
Recorded 50.00 from Ama for week 1. Paid in full.
$ node src/cli.js pay Kofi 50
Recorded 50.00 from Kofi for week 1. Paid in full.
$ node src/cli.js pay Esi 30
Recorded 30.00 from Esi for week 1. Still owes 20.00.
$ node src/cli.js close-week
Week 1 cannot close. No payout. Esi owes 20.00
$ node src/cli.js pay Esi 20
Recorded 20.00 from Esi for week 1. Paid in full.
$ node src/cli.js close-week
Week 1 closed. Ama receives 150.00. Week 2 begins; Kofi is next.
$ node src/cli.js report
Weekly contribution: GHS 50.00
Current week: 2
Next recipient: Kofi
Paid in full: none
Owing:
  Ama owes 50.00
  Kofi owes 50.00
  Esi owes 50.00
Payout history:
  Week 1: Ama received 150.00
$ node src/cli.js pay Yaw 10
Error: Unknown member: Yaw
$ node src/cli.js pay Kofi 60
Error: Payment of 60.00 exceeds what Kofi owes (50.00)
```
