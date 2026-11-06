'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const assert = require('assert');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function reassemble(releaseDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, 'manifest.json'), 'utf8'));
  const read = file => fs.readFileSync(path.join(releaseDir, file));
  for (const file of manifest.files) {
    const bytes = read(file.file);
    assert.equal(bytes.length, file.bytes, 'Length: ' + file.file);
    assert.equal(sha(bytes), file.sha256, 'SHA-256: ' + file.file);
  }
  const context = vm.createContext({});
  for (const bundle of manifest.bundles) vm.runInContext(read(bundle.file).toString('utf8'), context, { filename: bundle.file, timeout: 15000 });
  const values = context[manifest.assetGlobal];
  assert(values && Object.isFrozen(values), 'The data map must be frozen after ordered loading.');
  assert.equal(Object.keys(values).length, manifest.dataAssets.length);
  for (const item of manifest.dataAssets) {
    const value = values[item.id];
    assert.equal(sha(value), item.id, 'Original asset string hash: ' + item.id);
    const encoded = item.kind === 'data-url' ? value.slice(value.indexOf(',') + 1) : value;
    const bytes = Buffer.from(encoded, 'base64');
    assert.equal(bytes.toString('base64'), encoded);
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha(bytes), item.sha256);
  }
  const reverseBinary = text => {
    for (const item of manifest.binaryAssets) {
      const bytes = read(item.file);
      assert.equal(sha(bytes), item.sha256);
      const original = 'data:' + item.mime + ';base64,' + bytes.toString('base64');
      assert.equal(sha(original), item.originalStringSha256);
      text = text.split(item.url).join(original);
    }
    return text;
  };
  let assembled = reverseBinary(read(manifest.reconstructionTemplate).toString('utf8'));
  for (const script of manifest.scripts) {
    let index = 0;
    const transformed = read(script.file).toString('utf8');
    assert.equal(sha(transformed), script.transformedSha256);
    const original = transformed.replace(new RegExp('globalThis\\.' + manifest.assetGlobal + '\\["[a-f0-9]{64}"\\]', 'g'), expression => {
      const substitution = script.substitutions[index++];
      assert(substitution && substitution.expression === expression, 'Literal substitution order mismatch.');
      return substitution.quote + values[substitution.id] + substitution.quote;
    });
    assert.equal(index, script.substitutions.length);
    assert.equal(sha(original), script.originalSha256, 'Original script: ' + script.file);
    assembled = assembled.replace('@@DOCCHI_EXTERNAL_SCRIPT_' + script.index + '@@', () => original);
  }
  const originalCss = reverseBinary(read(manifest.css.file).toString('utf8'));
  assert.equal(sha(originalCss), manifest.css.originalSha256);
  assembled = assembled.replace('@@DOCCHI_EXTERNAL_STYLE_0@@', () => originalCss);
  assert(!assembled.includes('@@DOCCHI_EXTERNAL_'));
  assert.equal(Buffer.byteLength(assembled), manifest.sourceBytes);
  assert.equal(sha(assembled), manifest.sourceSha256, 'Reconstructed frozen source SHA-256');
  return { source: assembled, manifest, values };
}
module.exports = { reassemble };
if (require.main === module) {
  const releaseDir = path.resolve(process.argv[2] || path.join(__dirname, '../../releases/reconstructed-20261106'));
  const destination = process.argv[3];
  const result = reassemble(releaseDir);
  if (destination) {
    fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
    fs.writeFileSync(destination, result.source);
  }
  console.log(JSON.stringify({ result: 'PASS', sourceSha256: sha(result.source), bytes: Buffer.byteLength(result.source), destination: destination || null, dataAssets: result.manifest.dataAssets.length, binaryAssets: result.manifest.binaryAssets.length }, null, 2));
}
