#!/usr/bin/env node
// Fixture CLI: print argv JSON payload and exit 0. Never talks to a real platform.
const payload = process.argv[2] ?? '{}';
process.stdout.write(payload);
