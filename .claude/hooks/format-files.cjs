#!/usr/bin/env node
// PostToolUse hook — demonstrates reacting after a tool call completes.
// Runs after Write/Edit (see .claude/settings.json). If the modified file
// is a C# source file, prints a message noting a formatting check would
// happen here. No external formatter is invoked — this is a demo only.

const path = require('node:path');
const fs = require('node:fs');
const { logEvent } = require('./log.cjs');

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path;
  const toolName = input?.tool_name ?? 'unknown';

  if (filePath) {
    logEvent(`PostToolUse file=${filePath} tool=${toolName}`);

    if (path.extname(filePath).toLowerCase() === '.cs') {
      logEvent(`PostToolUse file=${filePath} note=csharp-formatting-check`);
      console.log('PostToolUse: C# file changed — formatting check triggered.');
    }
  }

  process.exit(0);
}

main();
