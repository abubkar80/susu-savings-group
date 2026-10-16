'use strict';
/** JSON file persistence so the CLI keeps state between invocations. */
const fs = require('node:fs');
const { SusuGroup } = require('./group');
const { GroupStateError } = require('./errors');

function load(file) {
  if (!fs.existsSync(file)) {
    throw new GroupStateError(`No group found at ${file}. Run "create --amount <GHS>" first.`);
  }
  return SusuGroup.fromJSON(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function save(file, group) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(group, null, 2));
  fs.renameSync(tmp, file); // atomic replace
}

module.exports = { load, save, exists: (f) => fs.existsSync(f) };
