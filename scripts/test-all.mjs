import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Run every Gatlykta check in sequence. Exits non-zero on first failure.
// Add new test scripts to the SUITES array below.

const root = fileURLToPath(new URL('../', import.meta.url));

const SUITES = [
  { name: 'static check', script: 'scripts/check-static.mjs' },
  { name: 'game-utils', script: 'scripts/test-game-utils.mjs' },
  { name: 'osm-pipeline', script: 'scripts/test-osm-pipeline.mjs' },
];

function run(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, script)], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

let failed = 0;
for (const suite of SUITES) {
  console.log(`\n── ${suite.name} ──`);
  const code = await run(suite.script);
  if (code !== 0) failed += 1;
}

console.log(`\n${SUITES.length - failed}/${SUITES.length} suites passed.`);
process.exitCode = failed ? 1 : 0;
