// Shared helper for all hooks — appends a timestamped line to hooks.log.
// Not application code; just tiny tooling glue reused by protect-files.cjs,
// format-files.cjs, and build-check.cjs.

const fs = require('node:fs');
const path = require('node:path');

const LOG_FILE = path.join(__dirname, 'hooks.log');

function logEvent(line) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
}

module.exports = { logEvent };
