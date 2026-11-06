'use strict';
// Deterministic packaging only. The frozen game source is never modified.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const SOURCE_SHA = 'fe91cc2808610cb6a33f7aa2696aa84c2b4009bb2f70326e7bf2aa14296710a0';
const BASE = 'https://gbaconrice.github.io/docchi-ga-katsu/releases/reconstructed-20261106/';
const RELEASE = 'releases/reconstructed-20261106';
const GLOBAL = '__DOCCHI_ASSETS_FE91CC28__';
const BUNDLE_LIMIT = 4 * 1024 * 1024;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
if (!process.argv[2]) throw Error('Usage: node tools/external-release/build-external-release.cjs INPUT_INDEX OUTPUT_DIRECTORY');
const sourcePath = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3] || path.join(process.cwd(), 'external-release-build'));
const sourceBytes = fs.readFileSync(sourcePath);
assert.equal(sha(sourceBytes), SOURCE_SHA, 'The input must be the reviewed frozen source.');
const source = sourceBytes.toString('utf8');
assert.equal(Buffer.from(source).compare(sourceBytes), 0, 'Input must be lossless UTF-8.');
assert(!source.includes('@@DOCCHI_EXTERNAL_'), 'Reserved reconstruction marker already exists.');
assert(!source.includes(GLOBAL), 'Reserved asset global already exists.');
if (fs.existsSync(output)) throw Error('Refusing to overwrite an existing output directory: ' + output);
fs.mkdirSync(path.join(output, RELEASE), { recursive: true });
const releaseDir = path.join(output, RELEASE);
function write(relative, content) {
  const destination = path.join(releaseDir, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}
function hashedFile(stem, extension, content) {
  const name = stem + '.' + sha(content).slice(0, 20) + extension;
  write(name, content);
  return name;
}
const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const styles = [...source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)];
assert.equal(scripts.length, 5);
assert.equal(styles.length, 1);
assert(scripts.every(match => !/\bsrc\s*=/i.test(match[1])));
assert(scripts[0][1].includes('id="host-layout-config"'));
assert(scripts[3][1].includes('id="game-runtime"'));
assert(scripts[4][1].includes('id="home-ambience-controller"'));
const names = ['host-layout', 'boot-errors', 'viewport', 'game-runtime', 'home-ambience'];
const dataValues = new Map();
const scriptRecords = [];
const dataPattern = /(["'])(data:(image\/(?:png|webp));base64,([A-Za-z0-9+/]+={0,2}))\1/g;
function addValue(value, mime, encoded, kind) {
  const bytes = Buffer.from(encoded, 'base64');
  assert.equal(bytes.toString('base64'), encoded, 'Asset is not canonical, lossless base64.');
  const id = sha(value);
  if (!dataValues.has(id)) dataValues.set(id, { id, value, kind, mime, bytes: bytes.length, sha256: sha(bytes), stringBytes: Buffer.byteLength(value) });
  return id;
}
for (let index = 0; index < scripts.length; index++) {
  const original = scripts[index][2];
  const substitutions = [];
  let transformed = original.replace(dataPattern, (whole, quote, value, mime, encoded) => {
    const id = addValue(value, mime, encoded, 'data-url');
    const expression = `globalThis.${GLOBAL}["${id}"]`;
    substitutions.push({ id, quote, expression });
    return expression;
  });
  // The five MP3 values are base64 without data: prefixes. Preserve their exact
  // representation: the existing audio decoder and synthesizer fallback are unchanged.
  transformed = transformed.replace(/(["'])([A-Za-z0-9+/]{512,}={0,2})\1/g, (whole, quote, value) => {
    assert(value.startsWith('SUQz'), 'Unexpected raw base64 literal: inspect instead of guessing.');
    const id = addValue(value, 'audio/mpeg', value, 'base64');
    const expression = `globalThis.${GLOBAL}["${id}"]`;
    // Audio appears before image literals in the runtime. Record exact source order below.
    substitutions.push({ id, quote, expression });
    return expression;
  });
  const byExpression = new Map();
  for (const record of substitutions) {
    if (!byExpression.has(record.expression)) byExpression.set(record.expression, []);
    byExpression.get(record.expression).push(record);
  }
  const orderedSubstitutions = [...transformed.matchAll(new RegExp('globalThis\\.' + GLOBAL + '\\["[a-f0-9]{64}"\\]', 'g'))]
    .map(match => byExpression.get(match[0]).shift());
  assert.equal(orderedSubstitutions.length, substitutions.length);
  const file = hashedFile(names[index], '.js', transformed);
  scriptRecords.push({ index, file, attributes: scripts[index][1], originalSha256: sha(original), transformedSha256: sha(transformed), substitutions: orderedSubstitutions });
}
assert.equal(scriptRecords.reduce((sum, item) => sum + item.substitutions.length, 0), 587);
assert.equal([...dataValues.values()].filter(item => item.kind === 'base64').length, 5);

const binaryAssets = new Map();
function replaceBinaryAssets(text) {
  return text.replace(/data:(image\/(?:png|webp));base64,([A-Za-z0-9+/]+={0,2})/g, (whole, mime, encoded) => {
    const bytes = Buffer.from(encoded, 'base64');
    assert.equal(bytes.toString('base64'), encoded);
    const digest = sha(bytes), extension = mime.split('/')[1];
    const file = `assets/${digest}.${extension}`;
    if (!binaryAssets.has(file)) {
      write(file, bytes);
      binaryAssets.set(file, { file, url: BASE + file, mime, bytes: bytes.length, sha256: digest, originalStringSha256: sha(whole) });
    }
    return BASE + file;
  });
}
const css = replaceBinaryAssets(styles[0][2]);
const cssFile = hashedFile('game', '.css', css);
let body = source.match(/<body>([\s\S]*)<\/body>/i)?.[1];
assert(body);
body = replaceBinaryAssets(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
assert(!/<script\b/i.test(body));
const shell = '(function(){\n  const t=document.createElement("template");\n  t.innerHTML=' + JSON.stringify(body) + ';\n  document.body.appendChild(t.content.cloneNode(true));\n  document.getElementById("entryStatus")?.remove();\n})();\n';
const shellFile = hashedFile('game-shell', '.js', shell);
write('body-fragment.html', body);
assert.equal(binaryAssets.size, 4);

const values = [...dataValues.values()];
const batches = [];
let batch = [], batchBytes = 0;
for (const item of values) {
  const line = `globalThis.${GLOBAL}["${item.id}"]=${JSON.stringify(item.value)};\n`;
  const bytes = Buffer.byteLength(line);
  assert(bytes < BUNDLE_LIMIT);
  if (batchBytes + bytes + 500 > BUNDLE_LIMIT && batch.length) {
    batches.push(batch); batch = []; batchBytes = 0;
  }
  batch.push({ item, line }); batchBytes += bytes;
}
if (batch.length) batches.push(batch);
const bundles = [];
for (let index = 0; index < batches.length; index++) {
  let content = "'use strict';\n";
  if (index === 0) content += `Object.defineProperty(globalThis,"${GLOBAL}",{value:Object.create(null),writable:false,configurable:false});\n`;
  content += batches[index].map(entry => entry.line).join('');
  if (index === batches.length - 1) content += `Object.freeze(globalThis.${GLOBAL});\n`;
  assert(Buffer.byteLength(content) < BUNDLE_LIMIT);
  const file = hashedFile(`assets/data-${String(index + 1).padStart(2, '0')}`, '.js', content);
  bundles.push({ file, entries: batches[index].length });
  for (const { item } of batches[index]) item.bundle = file;
}
const loadOrder = [scriptRecords[0].file, shellFile, scriptRecords[1].file, scriptRecords[2].file, ...bundles.map(item => item.file), scriptRecords[3].file, scriptRecords[4].file];
function entry(base, gravity) {
  const ids = new Map([[scriptRecords[0].file, 'host-layout-config'], [scriptRecords[3].file, 'game-runtime'], [scriptRecords[4].file, 'home-ambience-controller']]);
  const tags = loadOrder.map(file => `<script defer${ids.has(file) ? ` id="${ids.get(file)}"` : ''} src="${base}${file}"></script>`).join('\n');
  return `<!doctype html>\n<html lang="ja" data-host-shell="${gravity ? 'gravity' : 'standalone'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>どっちが勝つ？</title>\n<link rel="stylesheet" href="${base}${cssFile}">\n${tags}\n</head><body><p id="entryStatus" role="status">ゲームを読み込んでいます。表示が続く場合は通信を確認してください。</p><noscript>ゲームを遊ぶには JavaScript を有効にしてください。</noscript></body></html>\n`;
}
const standalone = entry('./', false), rootEntry = entry('./' + RELEASE + '/', false), gravityEntry = entry(BASE, true);
assert(Buffer.byteLength(gravityEntry) < 5000, 'The GRAVITY entry must remain tiny.');
for (const text of [standalone, rootEntry, gravityEntry]) assert(!/<iframe\b|\beval\s*\(|document\.write\s*\(/i.test(text));
write('index.html', standalone);
write('gravity-entry.html', gravityEntry);
fs.writeFileSync(path.join(output, 'index.html'), rootEntry);
fs.writeFileSync(path.join(output, 'GRAVITY_EXTERNAL_ENTRY.html'), gravityEntry);

let scriptIndex = 0;
let template = source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attributes) => `<script${attributes}>@@DOCCHI_EXTERNAL_SCRIPT_${scriptIndex++}@@</script>`);
template = template.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (whole, attributes) => `<style${attributes}>@@DOCCHI_EXTERNAL_STYLE_0@@</style>`);
template = replaceBinaryAssets(template);
write('source-template.html', template);
for (const name of ['ARTWORK.md', 'GRAVITY_INTEGRATION.md']) {
  const original = path.join(path.dirname(sourcePath), name);
  if (fs.existsSync(original)) write(name, fs.readFileSync(original));
}
const licenseDir = path.join(path.dirname(sourcePath), 'licenses');
for (const name of fs.readdirSync(licenseDir).sort()) write('licenses/' + name, fs.readFileSync(path.join(licenseDir, name)));
const manifest = {
  format: 'docchi-external-release-v1', sourceSha256: SOURCE_SHA, sourceBytes: sourceBytes.length,
  releasePath: RELEASE, releaseBase: BASE, assetGlobal: GLOBAL, bundleByteLimit: BUNDLE_LIMIT,
  entry: { standalone: 'index.html', gravity: 'gravity-entry.html', root: '../../index.html', rootGravity: '../../GRAVITY_EXTERNAL_ENTRY.html', gravityBytes: Buffer.byteLength(gravityEntry) },
  css: { file: cssFile, originalSha256: sha(styles[0][2]), transformedSha256: sha(css) },
  shell: { file: shellFile, bodyFile: 'body-fragment.html', bodySha256: sha(body) },
  scripts: scriptRecords, bundles, loadOrder,
  dataAssets: values.map(({ value, ...record }) => record), binaryAssets: [...binaryAssets.values()],
  reconstructionTemplate: 'source-template.html',
  packagingOnly: 'The five scripts are unchanged except for image/audio literal substitutions. Runtime strings retain their exact original values. CSS and DOM images use byte-identical binary files. No minification, gameplay edits, new external origins, or dynamic evaluation.',
  limitations: ['This preserves the initial asset transfer size; it is not a first-load bandwidth optimization.', 'Real browser, GRAVITY SDK/multiplayer, CSP, iOS, and audio playback verification remain separate tasks.']
};
function walk(dir, prefix = '') {
  return fs.readdirSync(dir).sort().flatMap(name => {
    const relative = prefix + name, full = path.join(dir, name);
    return fs.statSync(full).isDirectory() ? walk(full, relative + '/') : [relative];
  });
}
manifest.files = walk(releaseDir).map(file => { const bytes = fs.readFileSync(path.join(releaseDir, file)); return { file, bytes: bytes.length, sha256: sha(bytes), base64TransportBytes: 4 * Math.ceil(bytes.length / 3) }; });
assert(manifest.files.every(file => file.base64TransportBytes < 16 * 1024 * 1024));
write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: SOURCE_SHA, sourceBytes: sourceBytes.length, scriptCount: scripts.length, dataAssetCount: dataValues.size, binaryAssetCount: binaryAssets.size, bundleCount: bundles.length, gravityBytes: Buffer.byteLength(gravityEntry), largestFile: [...manifest.files].sort((a, b) => b.bytes - a.bytes)[0] }, null, 2));
