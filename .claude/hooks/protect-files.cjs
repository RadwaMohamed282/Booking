#!/usr/bin/env node
// PreToolUse hook — demonstrates blocking a tool call before it runs.
// Runs before Write/Edit (see .claude/settings.json) and refuses to let
// Claude touch sensitive/local files: .env files, appsettings.Production.json,
// and SQLite database files (*.db, *.sqlite).

const path = require('node:path');
const fs = require('node:fs');
const { logEvent } = require('./log.cjs');

function isSensitivePath(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();

  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base === 'appsettings.Production.json') return true;
  if (ext === '.db') return true;
  if (ext === '.sqlite') return true;

  return false;
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    // No/invalid input on stdin — nothing to check, allow the tool call.
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path;
  if (!filePath) {
    process.exit(0);
  }

  if (isSensitivePath(filePath)) {
    logEvent(`PreToolUse BLOCKED file=${filePath}`);
    console.error(
      `Blocked: "${filePath}" is a protected file (.env, appsettings.Production.json, *.db, or *.sqlite).\n` +
        'This file is protected by the protect-files PreToolUse hook and should not be modified by Claude.'
    );
    process.exit(2);
  }

  process.exit(0);
}

main();
