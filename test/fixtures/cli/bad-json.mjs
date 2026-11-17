#!/usr/bin/env node
// Fixture CLI: non-zero exit with stderr noise.
process.stderr.write('fixture failure\n');
process.exit(2);
