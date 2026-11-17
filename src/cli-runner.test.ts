import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parseJsonOutput, runCli, CliError } from './cli-runner.ts';

const fixture = fileURLToPath(new URL('../test/fixtures/cli/echo-json.mjs', import.meta.url));
const hang = fileURLToPath(new URL('../test/fixtures/cli/hang.mjs', import.meta.url));
const badJson = fileURLToPath(new URL('../test/fixtures/cli/bad-json.mjs', import.meta.url));

test('parseJsonOutput parses a recorded CLI JSON fixture', async () => {
  const raw = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../test/fixtures/cli/sample-output.json', import.meta.url), 'utf8'),
  );
  const parsed = parseJsonOutput<{ deployments: Array<{ id: string }> }>(raw);
  assert.equal(parsed.deployments[0]?.id, 'dpl_example');
});

test('parseJsonOutput rejects non-JSON', () => {
  assert.throws(() => parseJsonOutput('not-json'), /JSON/);
});

test('runCli captures JSON stdout from a fixture script (no real platform CLI)', async () => {
  const result = await runCli(process.execPath, [fixture, '{"ok":true,"id":"example"}'], {
    timeoutMs: 5_000,
  });
  assert.equal(result.code, 0);
  assert.deepEqual(parseJsonOutput(result.stdout), { ok: true, id: 'example' });
});

test('runCli times out and kills a hanging process', async () => {
  await assert.rejects(
    () => runCli(process.execPath, [hang], { timeoutMs: 200 }),
    (err: unknown) => {
      assert.ok(err instanceof CliError);
      assert.equal(err.code, 'timeout');
      return true;
    },
  );
});

test('runCli surfaces non-zero exit as CliError', async () => {
  await assert.rejects(
    () => runCli(process.execPath, [badJson], { timeoutMs: 5_000 }),
    (err: unknown) => {
      assert.ok(err instanceof CliError);
      assert.equal(err.code, 'exit');
      assert.equal(err.exitCode, 2);
      return true;
    },
  );
});
