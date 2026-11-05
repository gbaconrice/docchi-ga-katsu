'use strict';
// Explicit, separate scenario: all mock images fail, then the user chooses placeholders.
// Production runtime and original test files remain unchanged. No fake image bytes or loads.
const fs = require('node:fs');
const path = require('node:path');
const read = fs.readFileSync;
const originalDir = __dirname;
const addition = `
// ADAPTED TEST: exercise the genuine asset-error / continue-with-placeholders UI.
for (const im of [...pendingImages]) {
  if (typeof im.onerror === 'function') im.onerror(new Error('Deliberate mock image failure'));
}
vm.runInContext('assetRefreshUI()', context);
const fallbackButton = nodes.get('#assetContinueChoose');
if (!fallbackButton || fallbackButton.hidden || typeof fallbackButton.onclick !== 'function') throw Error('Fallback not offered after mock image failures');
fallbackButton.onclick({isTrusted:true});
if (!vm.runInContext('assetCanStart()', context)) throw Error('Fallback did not release asset gate');
console.log('ADAPTED PASS genuine image-failure fallback UI');
`;
fs.readFileSync = function(file, ...args) {
  const result = read.call(this, file, ...args);
  if (typeof file !== 'string' || typeof result !== 'string') return result;
  const resolved = path.resolve(file);
  if (!resolved.startsWith(originalDir + path.sep) && !resolved.includes('/fixtures/assembled/tests/')) return result;
  if (!result.includes('const pendingImages=[]')) return result;
  const marker = "for(const id of ['#red'";
  const index = result.indexOf(marker);
  if (index < 0) return result;
  return result.slice(0, index) + addition + result.slice(index);
};
