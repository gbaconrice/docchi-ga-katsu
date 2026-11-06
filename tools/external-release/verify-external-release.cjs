'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const crypto = require('crypto');
const { reassemble } = require('./reassemble-source.cjs');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const releaseDir = path.join(root, 'releases/reconstructed-20261106');
const sourceTests = path.resolve(process.argv[3] || path.join(__dirname, '../../tests'));
const { source, manifest } = reassemble(releaseDir);
const checks = [];
function check(name, action) { action(); checks.push({ name, status: 'PASS' }); }
const read = file => fs.readFileSync(path.join(releaseDir, file), 'utf8');
check('All release files fit below the 16 MiB transport limit, and below 8 MiB in this release', () => {
  for (const item of manifest.files) assert(item.base64TransportBytes < 8 * 1024 * 1024, item.file);
  for (const item of manifest.bundles) assert(Buffer.byteLength(read(item.file)) < manifest.bundleByteLimit);
});
check('All JavaScript files parse without evaluation of game code', () => {
  for (const item of manifest.files.filter(item => item.file.endsWith('.js'))) new vm.Script(read(item.file), { filename: item.file });
});
check('All four entries preserve host shell, ordered defer and existing targets', () => {
  for (const [file, pageUrl, shell] of [
    ['index.html', 'https://gbaconrice.github.io/docchi-ga-katsu/index.html', 'standalone'],
    ['GRAVITY_EXTERNAL_ENTRY.html', 'https://example.invalid/gravity-host', 'gravity'],
    ['releases/reconstructed-20261106/index.html', manifest.releaseBase + 'index.html', 'standalone'],
    ['releases/reconstructed-20261106/gravity-entry.html', 'https://example.invalid/gravity-host', 'gravity']
  ]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert(html.includes(`data-host-shell="${shell}"`));
    assert(!/<iframe\b|\beval\s*\(|document\.write\s*\(/i.test(html));
    const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.equal(scriptTags.length, manifest.loadOrder.length);
    scriptTags.forEach((tag, index) => {
      assert.equal(tag[2], '');
      assert(/\bdefer\b/.test(tag[1]));
      assert(!/\basync\b/.test(tag[1]));
      const src = tag[1].match(/\bsrc="([^"]+)"/)[1];
      const resolved = new URL(src, pageUrl).href;
      assert.equal(resolved, manifest.releaseBase + manifest.loadOrder[index]);
      assert(fs.existsSync(path.join(releaseDir, manifest.loadOrder[index])));
    });
    const href = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/)[1];
    assert.equal(new URL(href, pageUrl).href, manifest.releaseBase + manifest.css.file);
  }
  assert(Buffer.byteLength(read('gravity-entry.html')) < 5000);
  const originalOrder = manifest.loadOrder.filter(file => manifest.scripts.some(script => script.file === file));
  assert.deepEqual(originalOrder, manifest.scripts.map(script => script.file));
  assert(manifest.loadOrder.indexOf(manifest.shell.file) < manifest.loadOrder.indexOf(manifest.scripts[1].file));
  assert(manifest.bundles.every(bundle => manifest.loadOrder.indexOf(bundle.file) < manifest.loadOrder.indexOf(manifest.scripts[3].file)));
});
check('Shell insertion preserves exact body markup and removes only the loading status', () => {
  let inserted = null, removed = false;
  const template = { innerHTML: '', content: { cloneNode(deep) { assert.equal(deep, true); return { html: template.innerHTML }; } } };
  const doc = {
    createElement(tag) { assert.equal(tag, 'template'); return template; },
    body: { appendChild(node) { inserted = node.html; } },
    getElementById(id) { assert.equal(id, 'entryStatus'); return { remove() { removed = true; } }; }
  };
  vm.runInNewContext(read(manifest.shell.file), { document: doc });
  assert.equal(inserted, read(manifest.shell.bodyFile));
  assert(removed);
  assert(!/<script\b/i.test(inserted));
  let expected = source.match(/<body>([\s\S]*)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const item of manifest.binaryAssets) {
    const bytes = fs.readFileSync(path.join(releaseDir, item.file));
    expected = expected.split('data:' + item.mime + ';base64,' + bytes.toString('base64')).join(item.url);
  }
  assert.equal(inserted, expected);
});
check('CSS and body asset URLs resolve only to the same immutable release and exact original bytes', () => {
  const css = read(manifest.css.file), body = read(manifest.shell.bodyFile);
  const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1]);
  urls.push(...[...body.matchAll(/\bsrc="([^"]+)"/g)].map(match => match[1]));
  assert.equal(urls.length, 4);
  for (const url of urls) assert(manifest.binaryAssets.some(asset => asset.url === url), url);
  assert(!/data:image\/(?:png|webp);base64,[A-Za-z0-9+/]{100}/.test(css + body));
});
check('Audio byte hashes still match all five original licensing records', () => {
  const license = read('licenses/SFXMINT.md');
  const audio = manifest.dataAssets.filter(item => item.mime === 'audio/mpeg');
  assert.equal(audio.length, 5);
  for (const item of audio) assert(license.includes(item.sha256), item.sha256);
});
const bootLogs = [];
check('Actual external data bundles and scripts pass the unmodified boot-smoke harness through battle and delayed image callbacks', () => {
  // The existing harness supplies a stub DOM. The actual shell is checked above;
  // this adapter feeds the actual external scripts to its existing inline-script reader.
  const externalHtml = manifest.loadOrder.filter(file => file !== manifest.shell.file)
    .map(file => '<script>\n' + read(file) + '\n</script>').join('\n');
  const fakeFs = Object.create(fs);
  fakeFs.readFileSync = (file, ...args) => file === 'index.html' ? externalHtml : fs.readFileSync(file, ...args);
  const bootHarness = fs.readFileSync(path.join(sourceTests, 'boot-smoke.cjs'), 'utf8');
  const processStub = { exit(code) { throw Error('The original boot harness called process.exit(' + code + ')'); } };
  vm.runInNewContext(bootHarness, {
    require(name) { return name === 'fs' ? fakeFs : require(name); },
    console: { log(...args) { bootLogs.push(args.map(String).join(' ')); } }, process: processStub,
    URLSearchParams, Uint8ClampedArray
  }, { filename: 'unchanged-boot-smoke.cjs', timeout: 60000 });
  assert(bootLogs.some(line => line.startsWith('PASS reached battle')));
  assert(bootLogs.some(line => line === 'PASS deferred image callbacks'));
  assert(!bootLogs.some(line => line.startsWith('FAIL')));
});
console.log(JSON.stringify({ result: 'PASS', sourceSha256: sha(source), checks, bootLogs, browserVerified: false, limitations: 'DOM and rendering were not tested in a real browser. The boot test uses the original test harness DOM stubs. GRAVITY SDK, networking, audio playback, CSP, iOS and device layout remain unverified here.' }, null, 2));
