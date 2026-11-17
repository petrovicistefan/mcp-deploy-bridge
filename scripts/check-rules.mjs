#!/usr/bin/env node
// Automated checks for the hard rules in AGENTS.md. Exit code 1 on any violation.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG = {
  srcExt: '.ts',
  versionModule: 'src/version.ts',
  serverEntries: ['src/server.ts'],
  stdioFiles: ['src/server.ts'],
  // Adapters and the opt-in hosted path may use the network.
  networkFiles: [
    'src/hosted.ts',
    'src/control-plane-client.ts',
  ],
  // Only these may use child_process.
  spawnFiles: ['src/cli-runner.ts'],
  // Write tool names that must gate on confirm: true.
  writeTools: ['redeploy', 'rollback'],
  secretArgName: /token|secret|password|api.?key|credential/i,
};

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const fail = (rule, message) => errors.push(`[${rule}] ${message}`);
const readText = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(readText(path));

function walk(dir) {
  if (!existsSync(join(root, dir))) return [];
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else if (rel.endsWith(CONFIG.srcExt) && !rel.endsWith('.test.ts')) out.push(rel);
  }
  return out;
}

function walkTests(dir) {
  if (!existsSync(join(root, dir))) return [];
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walkTests(rel));
    else if (rel.endsWith('.test.ts') || rel.endsWith('.test.js')) out.push(rel);
  }
  return out;
}

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const stripStrings = (text) =>
  text.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, '""');

const pkg = readJson('package.json');
const server = readJson('server.json');
const sources = walk('src').map((file) => ({ file, text: readText(file) }));
const tests = [...walkTests('src'), ...walkTests('test')].map((file) => ({
  file,
  text: readText(file),
}));

// 1. version sync
if (!pkg.version) fail('version-sync', 'package.json has no version');
if (server.version !== pkg.version) {
  fail('version-sync', `server.json version ${server.version} !== package.json ${pkg.version}`);
}
if (!Array.isArray(server.packages) || server.packages.length === 0) {
  fail('version-sync', 'server.json has no packages[]');
}
for (const [i, entry] of (server.packages ?? []).entries()) {
  if (entry.version !== pkg.version) {
    fail('version-sync', `server.json packages[${i}].version ${entry.version} !== package.json ${pkg.version}`);
  }
}

// 2. package.json is the only version source for serverInfo
if (!existsSync(join(root, CONFIG.versionModule))) {
  fail('version-source', `${CONFIG.versionModule} is missing`);
} else {
  const text = stripComments(readText(CONFIG.versionModule));
  if (
    !/package\.json/.test(text) ||
    !/readFileSync|createRequire/.test(text) ||
    !/export\s+const\s+VERSION\b/.test(text)
  ) {
    fail('version-source', `${CONFIG.versionModule} must read package.json and export VERSION`);
  }
}
for (const entry of CONFIG.serverEntries) {
  if (!existsSync(join(root, entry))) {
    fail('version-source', `${entry} is missing`);
    continue;
  }
  const text = stripComments(readText(entry));
  if (!/from\s+['"]\.\/version\.(?:js|ts)['"]/.test(text) || !/\bversion\s*:\s*VERSION\b/.test(text)) {
    fail('version-source', `${entry} must import VERSION from ./version and use it for serverInfo`);
  }
}
for (const { file, text } of sources) {
  const code = stripComments(text);
  if (/\bversion\s*:\s*['"`]\d+\.\d+\.\d+/.test(code)) {
    fail('hardcoded-version', `${file} has a hardcoded version literal`);
  }
  if (pkg.version && (code.includes(`'${pkg.version}'`) || code.includes(`"${pkg.version}"`))) {
    fail('hardcoded-version', `${file} contains the package version "${pkg.version}" as a string literal`);
  }
}

// 3. required project docs and release scripts
for (const doc of ['AGENTS.md', 'docs/PRODUCT.md', 'docs/DECISIONS.md', 'CHANGELOG.md']) {
  if (!existsSync(join(root, doc))) fail('docs', `${doc} is missing`);
}
if (existsSync(join(root, 'CHANGELOG.md'))) {
  const changelog = readText('CHANGELOG.md');
  const escaped = pkg.version.replace(/\./g, '\\.');
  if (!new RegExp(`^##\\s+(?:Unreleased|\\[?${escaped}\\]?)\\b`, 'mi').test(changelog)) {
    fail('docs', `CHANGELOG.md has no "Unreleased" or "${pkg.version}" heading`);
  }
}
for (const script of ['check', 'check:rules', 'test', 'test:integration', 'build', 'prepublishOnly']) {
  if (!pkg.scripts?.[script]) fail('scripts', `package.json is missing the "${script}" script`);
}
for (const part of ['check:rules', 'test', 'build', 'test:integration']) {
  if (pkg.scripts?.prepublishOnly && !pkg.scripts.prepublishOnly.includes(part)) {
    fail('scripts', `prepublishOnly does not run "${part}"`);
  }
}

// 4. no telemetry
const TELEMETRY =
  /posthog|mixpanel|segment\.(?:io|com)|@segment|amplitude|sentry|datadog|newrelic|applicationinsights|google-analytics|googletagmanager|plausible|hotjar|rudderstack|logrocket|bugsnag|telemetry|analytics/i;
const allDeps = Object.keys({
  ...pkg.dependencies,
  ...pkg.devDependencies,
  ...pkg.optionalDependencies,
  ...pkg.peerDependencies,
});
for (const dep of allDeps) {
  if (TELEMETRY.test(dep)) fail('no-telemetry', `dependency "${dep}" looks like telemetry/analytics`);
}
for (const { file, text } of sources) {
  const code = stripComments(text);
  code.split('\n').forEach((line, i) => {
    if (
      TELEMETRY.test(stripStrings(line)) ||
      /https?:\/\/[^'"`\s]*(?:posthog|mixpanel|segment|amplitude|sentry|datadog|google-analytics)/i.test(line)
    ) {
      fail('no-telemetry', `${file}:${i + 1} references telemetry/analytics`);
    }
  });
}

// 5. no network outside adapters + hosted path
const NETWORK =
  /\bfetch\s*\(|from\s+['"](?:node:)?(?:https?|net|tls|dgram|http2)['"]|require\(\s*['"](?:node:)?(?:https?|net|tls|dgram|http2)['"]\s*\)|\bXMLHttpRequest\b|\bWebSocket\b/;
const isNetworkAllowed = (file) =>
  file.startsWith('src/adapters/') || CONFIG.networkFiles.includes(file);
for (const { file, text } of sources) {
  const code = stripComments(text);
  if (!isNetworkAllowed(file) && NETWORK.test(code)) {
    fail(
      'no-network',
      `${file} uses the network but is not under src/adapters/ or the hosted path (${CONFIG.networkFiles.join(', ')})`,
    );
  }
}

// 6. child_process only in adapters + cli-runner; shell: true forbidden
const CHILD =
  /from\s+['"](?:node:)?child_process['"]|require\(\s*['"](?:node:)?child_process['"]\s*\)|\b(?:spawn|exec|execFile|fork)\s*\(/;
const isSpawnAllowed = (file) =>
  file.startsWith('src/adapters/') || CONFIG.spawnFiles.includes(file);
for (const { file, text } of sources) {
  const code = stripComments(text);
  if (!isSpawnAllowed(file) && CHILD.test(code)) {
    fail('adapters-only-spawn', `${file} uses child_process / spawn outside src/adapters/ and src/cli-runner.ts`);
  }
  if (/shell\s*:\s*true/.test(code)) {
    fail('no-shell', `${file} sets shell: true (argument arrays only)`);
  }
}

// 7. no secrets / user data in logs; stdio server must not use console.*
function callArguments(text, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return text.slice(openIndex + 1, i);
  }
  return text.slice(openIndex + 1);
}
const SENSITIVE =
  /secret|token|api[_-]?key|apikey|password|passwd|authorization|credential|process\.env/i;
for (const { file, text } of sources) {
  const code = stripComments(text);
  for (const match of code.matchAll(/\bconsole\.(\w+)\s*\(/g)) {
    const line = code.slice(0, match.index).split('\n').length;
    const method = match[1];
    const args = callArguments(code, match.index + match[0].length - 1);
    if (CONFIG.stdioFiles.includes(file)) {
      fail('no-logs-on-stdio', `${file}:${line} console.${method} in a stdio protocol file`);
    } else if (['log', 'info', 'debug', 'warn', 'error'].includes(method) && !/^\s*(?:'[^'\n]*'|"[^"\n]*")\s*$/.test(args)) {
      fail('no-logs-on-stdio', `${file}:${line} console.${method} must only print a constant string`);
    } else if (SENSITIVE.test(stripStrings(args))) {
      fail('no-logs-on-stdio', `${file}:${line} console.${method} arguments reference possibly sensitive data`);
    }
  }
}

// 8. no secret arguments on any registerTool inputSchema
const serverText = existsSync(join(root, 'src/server.ts')) ? stripComments(readText('src/server.ts')) : '';
for (const match of serverText.matchAll(/registerTool\(\s*['"]([^'"]+)['"]/g)) {
  const toolName = match[1];
  // Find a window after the tool name and look for schema field names that look like secrets.
  const window = serverText.slice(match.index, match.index + 2500);
  for (const field of window.matchAll(/\b([A-Za-z_][\w]*)\s*:\s*z\./g)) {
    if (CONFIG.secretArgName.test(field[1])) {
      fail('no-secret-args', `tool "${toolName}" has secret-like input field "${field[1]}"`);
    }
  }
}

// 9. write tools: confirm gate + destructiveHint + tests for both paths
const registeredWriteTools = [];
for (const match of serverText.matchAll(/registerTool\(\s*['"]([^'"]+)['"]/g)) {
  if (CONFIG.writeTools.includes(match[1])) registeredWriteTools.push(match[1]);
}
for (const tool of registeredWriteTools) {
  const window = [...serverText.matchAll(new RegExp(`registerTool\\(\\s*['"]${tool}['"]([\\s\\S]{0,3000})`))][0]?.[1] ?? '';
  if (!/confirm\s*:/.test(window)) {
    fail('confirm-gate', `write tool "${tool}" must declare a confirm input`);
  }
  if (!/destructiveHint\s*:\s*true/.test(window)) {
    fail('confirm-gate', `write tool "${tool}" must set destructiveHint: true`);
  }
  const relatedTests = tests.filter(
    (t) => t.text.includes(tool) && /confirm/i.test(t.text),
  );
  if (relatedTests.length === 0) {
    fail('confirm-gate', `write tool "${tool}" needs a test covering confirm true and dry-run`);
  } else {
    const blob = relatedTests.map((t) => t.text).join('\n');
    const hasTrue = /confirm\s*:\s*true/.test(blob) || /confirm:\s*true/.test(blob);
    const hasDry =
      /confirm\s*:\s*false/.test(blob) ||
      /without\s+confirm/i.test(blob) ||
      /dry[- ]?run/i.test(blob) ||
      /confirm\s*(?:is\s+)?(?:missing|absent|undefined|omitted)/i.test(blob);
    if (!hasTrue || !hasDry) {
      fail('confirm-gate', `write tool "${tool}" tests must cover both confirm:true and dry-run`);
    }
  }
}

// 10. runtime deps stay at the approved pair unless Stefan adds more
const allowedRuntime = new Set(['@modelcontextprotocol/sdk', 'zod']);
for (const dep of Object.keys(pkg.dependencies ?? {})) {
  if (!allowedRuntime.has(dep)) {
    fail('deps', `runtime dependency "${dep}" is not in the approved set (${[...allowedRuntime].join(', ')}); ask Stefan first`);
  }
}

if (errors.length) {
  console.error(`check:rules failed (${errors.length}):`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`check:rules passed (${relative(process.cwd(), root) || '.'}, version ${pkg.version})`);
