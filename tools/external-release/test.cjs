'use strict';
// Run the reviewed source suite without replacing the deployed external entry.
// Historical variants are preserved in the repository and reported separately.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const assert = require('assert');
const { spawn } = require('child_process');
const { reassemble } = require('./reassemble-source.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const options = { repository: path.resolve(__dirname, '../..'), reportDir: null, rebuildTo: null, keepTemp: false };
for (let index = 2; index < process.argv.length; index++) {
  const option = process.argv[index];
  if (option === '--keep-temp') options.keepTemp = true;
  else if (['--repository', '--report-dir', '--rebuild-to'].includes(option)) {
    const value = process.argv[++index];
    if (!value) throw Error('Missing value for ' + option);
    options[{ '--repository': 'repository', '--report-dir': 'reportDir', '--rebuild-to': 'rebuildTo' }[option]] = path.resolve(value);
  } else throw Error('Unknown option: ' + option);
}
const repository = options.repository;
const releaseDir = path.join(repository, 'releases/reconstructed-20261106');
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'regression-inputs.json'), 'utf8'));
const reportDir = options.reportDir || fs.mkdtempSync(path.join(os.tmpdir(), 'docchi-test-report-'));
if (options.reportDir && fs.existsSync(reportDir) && fs.readdirSync(reportDir).length) throw Error('The report directory must be absent or empty.');
fs.mkdirSync(reportDir, { recursive: true });
const worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'docchi-reconstructed-source-'));
const protectedInputs = new Map();
function readRepository(relative) {
  assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'Unsafe repository-relative input.');
  const bytes = fs.readFileSync(path.join(repository, relative));
  const digest = sha(bytes);
  if (protectedInputs.has(relative)) assert.equal(digest, protectedInputs.get(relative), 'Repository input changed between reads: ' + relative);
  else protectedInputs.set(relative, digest);
  return bytes;
}
function stage(record) {
  const bytes = readRepository(record.source);
  assert.equal(sha(bytes), record.sha256, 'Reviewed input changed: ' + record.source);
  const destination = path.join(worktree, record.target);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}
function runNode(args, cwd, logFile, environment = {}) {
  return new Promise(resolve => {
    const start = Date.now();
    const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let launchError = null, timedOut = false;
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => chunks.push(chunk));
    child.on('error', error => { launchError = error.message; });
    const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 300000);
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.writeFileSync(logFile, Buffer.concat(chunks));
      resolve({ status: launchError ? 'error' : timedOut ? 'timeout' : code === 0 ? 'pass' : 'fail', exit: code, signal, seconds: (Date.now() - start) / 1000, ...(launchError ? { error: launchError } : {}), log: path.relative(reportDir, logFile) });
    });
  });
}
async function runSuite(names, label) {
  const results = new Array(names.length);
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const index = next++, name = names[index];
      results[index] = { test: name, ...await runNode(['tests/' + name], worktree, path.join(reportDir, label, name.replace(/\.cjs$/, '.txt')), {
        GAME_HTML: path.join(worktree, 'index.html'), COUNTER_HTML: path.join(worktree, 'index.html'),
        BOSS_TEST_HARNESS: '', CAPACITY_FIXTURE: '', REQUIRE_NEW_ABILITIES: ''
      }) };
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, names.length) }, worker));
  return { total: results.length, passed: results.filter(result => result.status === 'pass').length, failed: results.filter(result => result.status !== 'pass').length, results };
}
async function main() {
  const report = {
    sourceSha256: plan.sourceSha256,
    scope: 'External entry verification and the explicitly staged canonical source suite; historical variants run separately as compatibility diagnostics.',
    browserVerified: false,
    browserTestsNotRun: plan.browserTests,
    sourceWorktree: options.keepTemp ? worktree : 'temporary directory removed after the run',
    reportDirectory: reportDir
  };
  let passed = false;
  try {
    const entry = readRepository('index.html');
    const current = JSON.parse(readRepository('CURRENT_PREVIEW_MANIFEST.json'));
    assert.equal(current.indexSHA256, sha(entry), 'Published entry metadata must describe the external root.');
    assert.equal(current.reconstructedSourceSHA256, plan.sourceSha256);
    assert.equal(current.releaseManifestSHA256, sha(readRepository('releases/reconstructed-20261106/manifest.json')));
    const reconstructed = reassemble(releaseDir);
    assert.equal(sha(reconstructed.source), plan.sourceSha256);
    fs.writeFileSync(path.join(worktree, 'index.html'), reconstructed.source);
    fs.cpSync(path.join(repository, 'tests'), path.join(worktree, 'tests'), { recursive: true });
    for (const test of plan.tests) {
      if (test.historicalSha256) assert.equal(sha(readRepository(test.target)), test.historicalSha256, 'Preserved historical test changed: ' + test.target);
      stage(test);
    }
    for (const helper of plan.helpers) stage(helper);
    for (const metadata of plan.sourceMetadata) stage(metadata);
    for (const name of ['ARTWORK.md', 'GRAVITY_INTEGRATION.md']) fs.copyFileSync(path.join(releaseDir, name), path.join(worktree, name));
    fs.cpSync(path.join(releaseDir, 'licenses'), path.join(worktree, 'licenses'), { recursive: true });
    const names = fs.readdirSync(path.join(worktree, 'tests')).filter(name => name.endsWith('.cjs') && !plan.browserTests.includes(name)).sort();
    assert(names.length >= plan.expectedCanonicalNodeTests, 'The published tree is missing canonical regression tests.');
    const expectedNames = plan.tests.map(item => item.target).filter(name => /^tests\/[^/]+\.cjs$/.test(name)).map(name => path.basename(name)).filter(name => !plan.browserTests.includes(name));
    assert.equal(expectedNames.length, plan.expectedCanonicalNodeTests);
    assert(expectedNames.every(name => names.includes(name)), 'A required canonical test is missing.');
    report.external = await runNode([path.join(__dirname, 'verify-external-release.cjs'), repository, path.join(worktree, 'tests')], repository, path.join(reportDir, 'external-checks.json'));
    report.canonical = await runSuite(names, 'canonical');
    // Do not discard historical failures or disguise them as canonical passes.
    // Restore the nine exact originals only in this disposable source worktree.
    const originals = plan.tests.filter(item => item.historicalSha256);
    for (const item of originals) fs.writeFileSync(path.join(worktree, item.target), readRepository(item.target));
    report.historical = await runSuite(originals.map(item => path.basename(item.target)), 'historical');
    report.historical.scope = 'Preserved original variants, unchanged. Their differences are diagnostics, not part of the canonical PASS count.';
    assert.equal(sha(fs.readFileSync(path.join(worktree, 'index.html'))), plan.sourceSha256, 'A test modified the reconstructed source.');
    if (options.rebuildTo) {
      report.rebuild = await runNode([path.join(__dirname, 'build-external-release.cjs'), path.join(worktree, 'index.html'), options.rebuildTo], repository, path.join(reportDir, 'rebuild.json'));
      if (report.rebuild.status === 'pass') {
        const paths = ['index.html', 'GRAVITY_EXTERNAL_ENTRY.html', 'releases/reconstructed-20261106/manifest.json', ...reconstructed.manifest.files.map(item => 'releases/reconstructed-20261106/' + item.file)];
        for (const relative of paths) assert.equal(sha(fs.readFileSync(path.join(options.rebuildTo, relative))), sha(readRepository(relative)), 'Rebuild differs: ' + relative);
        report.rebuild.byteIdenticalFiles = paths.length;
      }
    }
    passed = report.external.status === 'pass' && report.canonical.failed === 0 && (!report.rebuild || report.rebuild.status === 'pass');
    report.status = passed ? (report.historical.failed ? 'PASS_CURRENT_RELEASE_WITH_HISTORICAL_DIFFERENCES' : 'PASS_CURRENT_RELEASE') : 'FAIL_CURRENT_RELEASE';
  } catch (error) {
    report.status = 'FAIL_CURRENT_RELEASE';
    report.error = error.stack;
  } finally {
    try {
      for (const [relative, digest] of protectedInputs) assert.equal(sha(fs.readFileSync(path.join(repository, relative))), digest, 'Repository input changed during verification: ' + relative);
      report.repositoryInputsUnchanged = true;
    } catch (error) { passed = false; report.status = 'FAIL_CURRENT_RELEASE'; report.preservationError = error.stack; }
    fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
    if (!options.keepTemp) fs.rmSync(worktree, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ status: report.status, sourceSha256: report.sourceSha256, external: report.external?.status, canonical: report.canonical && { total: report.canonical.total, passed: report.canonical.passed, failed: report.canonical.failed }, historical: report.historical && { total: report.historical.total, passed: report.historical.passed, failed: report.historical.failed }, browserTestsNotRun: report.browserTestsNotRun, rebuild: report.rebuild, repositoryInputsUnchanged: report.repositoryInputsUnchanged, reportDirectory: reportDir, error: report.error, preservationError: report.preservationError }, null, 2));
  process.exitCode = passed ? 0 : 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
