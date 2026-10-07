#!/usr/bin/env node
// Stop hook — demonstrates a final verification gate before Claude finishes.
// Checks the repo's existing frontend/backend structure and, if present,
// runs their existing build/test commands (no servers, no new dependencies).
// Exits 2 (blocking) if a command fails, so Claude sees the failure and can
// keep working instead of ending the turn on broken code.

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { logEvent } = require('./log.cjs');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'backend', 'BookingApp.Api');
const frontendDir = path.join(repoRoot, 'frontend');

function run(label, command, args, cwd) {
  const result = spawnSync(command, args, { cwd, shell: true, encoding: 'utf-8' });
  const failed = result.status !== 0 || result.error;
  return {
    label,
    failed,
    output: (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''),
  };
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    input = {};
  }

  // Avoid an infinite loop if this hook itself already blocked once.
  if (input.stop_hook_active) {
    process.exit(0);
  }

  const results = [];

  if (fs.existsSync(path.join(backendDir, 'BookingApp.Api.csproj'))) {
    results.push(run('backend: dotnet build', 'dotnet', ['build'], backendDir));
  }

  if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
    results.push(run('frontend: npx ng build', 'npx', ['ng', 'build'], frontendDir));
    results.push(run('frontend: npx ng test --watch=false', 'npx', ['ng', 'test', '--watch=false'], frontendDir));
  }

  const failures = results.filter((r) => r.failed);
  const commandLabels = results.map((r) => r.label).join(';') || 'none';

  if (failures.length > 0) {
    logEvent(`Stop result=FAIL commands=${commandLabels} failed=${failures.map((f) => f.label).join(';')}`);
    console.error('Final verification failed:');
    for (const f of failures) {
      console.error(`\n--- ${f.label} ---`);
      console.error(f.output.slice(-2000));
    }
    process.exit(2);
  }

  logEvent(`Stop result=PASS commands=${commandLabels}`);
  console.log(`Final verification passed (${results.map((r) => r.label).join(', ') || 'nothing to check'}).`);
  process.exit(0);
}

main();
