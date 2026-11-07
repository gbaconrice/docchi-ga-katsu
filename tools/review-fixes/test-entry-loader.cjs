'use strict';
const assert = require('assert'), vm = require('vm');
const { makeEntry, makeConfig, entryLoaderSource } = require('./entry-loader.cjs');
const options = { base: 'https://gbaconrice.github.io/docchi-ga-katsu/releases/test/', cssFile: 'game.hash.css', gravity: true,
 scripts: ['host-layout', 'game-shell', 'boot-errors', 'viewport', 'game-runtime', 'home-ambience'].map((name, i) => ({ file: name + '.hash.js', id: i === 4 ? 'game-runtime' : undefined })) };
function fixture(extra = {}) {
 const config = makeConfig({ ...options, ...extra });
 const events = {}, docEvents = {}, nodes = new Map(), requests = [], executions = Array(6).fill(0), pendingTimers = new Map();
 let timerId = 0, reloads = 0, readyEvents = 0;
 function element(tag, id) { const node = { tagName: tag.toUpperCase(), id: id || '', hidden: false, disabled: false, removed: false, attrs: {}, textContent: '',
   setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] || null; }, remove() { this.removed = true; } }; if (id) nodes.set(id, node); return node; }
 for (const id of ['entryStatus', 'entryMessage', 'entryRetry']) element(id === 'entryRetry' ? 'button' : 'div', id);
 const document = { documentElement: element('html'), currentScript: null, readyState: 'loading', baseURI: 'https://host.example/game',
   createElement: tag => element(tag), getElementById: id => nodes.get(id),
   addEventListener(name, fn) { (docEvents[name] ||= []).push(fn); },
   dispatchEvent(event) { if (event.type === 'docchi:entry-ready') readyEvents++; for (const fn of docEvents[event.type] || []) fn(event); } };
 document.head = { appendChild(node) { requests.push(node); return node; } };
 const window = { addEventListener(name, fn) { (events[name] ||= []).push(fn); } };
 const context = vm.createContext({ window, document, URL, CustomEvent: class { constructor(type) { this.type = type; } },
   location: { reload() { reloads++; } }, setTimeout(fn, ms) { const id = ++timerId; pendingTimers.set(id, { fn, ms }); return id; }, clearTimeout(id) { pendingTimers.delete(id); }, executions });
 // Ensure the entry itself does not depend on the APIs fixed in the old-WebKit patch.
 vm.runInContext('Object.hasOwn=undefined;Array.prototype.at=undefined', context);
 vm.runInContext(entryLoaderSource(config), context, { filename: 'entry-loader.js' });
 function fireError(event) { for (const fn of events.error || []) fn(event); }
 function domReady() { document.readyState = 'interactive'; document.dispatchEvent({ type: 'DOMContentLoaded' }); }
 function scriptRequests() { return requests.filter(x => x.tagName === 'SCRIPT'); }
 function cssRequests() { return requests.filter(x => x.tagName === 'LINK' && x.rel === 'stylesheet'); }
 function succeedCss(node = cssRequests().at(-1)) { node.onload(); }
 function failCss(node = cssRequests().at(-1)) { node.onerror(); }
 function runScript(node = scriptRequests().at(-1), behavior = 'success') {
   const index = options.scripts.findIndex(s => node.src.endsWith(s.file));
   assert(index >= 0, 'success must use a real script URL');
   let code = 'const fixtureDeclaration' + index + ' = 1; executions[' + index + ']++;';
   if (index === 2) code += 'window.__gameBootComplete=function(){window.bootCalls=(window.bootCalls||0)+1};';
   if (index === 4 && behavior !== 'no-boot') code += 'window.__gameBootComplete();';
   if (behavior === 'syntax') code += 'const = ;';
   if (behavior === 'runtime') code = 'executions[' + index + ']++;throw new Error("fixture runtime failure");';
   try { vm.runInContext(code, context, { filename: node.src }); }
   catch (error) { fireError({ filename: node.src, lineno: 1, message: error.message }); }
   node.onload();
 }
 function finish() { for (let i = 0; i < 10 && !nodes.get('entryStatus').removed; i++) { assert.equal(nodes.get('entryStatus').attrs['data-state'], 'loading'); runScript(); } }
 function click() { nodes.get('entryRetry').onclick(); }
 function expire() { const callbacks = [...pendingTimers.values()]; pendingTimers.clear(); for (const t of callbacks) t.fn(); }
 return { config, nodes, requests, executions, window, scriptRequests, cssRequests, domReady, succeedCss, failCss, runScript, finish, click, expire, fireError,
   policy(event) { document.dispatchEvent({ type: 'securitypolicyviolation', ...event }); },
   get reloads() { return reloads; }, get readyEvents() { return readyEvents; } };
}
function state(f) { return f.nodes.get('entryStatus').attrs['data-state']; }
function text(f) { return f.nodes.get('entryMessage').textContent; }
let count = 0;
function check(label, fn) { fn(); count++; console.log('PASS', label); }
check('Bootstrap precedes CSS, small GRAVITY entry, no execution shortcuts or production QA setting', () => {
 const html = makeEntry(options); assert(Buffer.byteLength(html) < 10240); assert(html.indexOf('<script') < html.indexOf('<style'));
 assert(!/<iframe\b|document\.write|\beval\s*\(/.test(html)); assert(!html.includes('"qaFaultStep":'));
});
check('Parallel preload, DOM/CSS gates, serial async=false anonymous scripts, exactly-once ready', () => {
 const f = fixture(); assert.equal(f.requests.filter(n => n.rel === 'preload').length, 6); assert.equal(f.scriptRequests().length, 0);
 f.succeedCss(); assert.equal(f.scriptRequests().length, 0); f.domReady(); assert.equal(f.scriptRequests().length, 1);
 f.finish(); assert.deepEqual(f.executions, [1, 1, 1, 1, 1, 1]); assert.equal(f.window.bootCalls, 1); assert.equal(f.readyEvents, 1);
 for (const s of f.scriptRequests()) { assert.equal(s.async, false); assert.equal(s.crossOrigin, 'anonymous'); }
});
for (let step = 0; step < 6; step++) check('Network failure/retry and double-click safety at script ' + (step + 1), () => {
 const f = fixture(); f.domReady(); f.succeedCss();
 for (let i = 0; i < step; i++) f.runScript();
 const failed = f.scriptRequests().at(-1); failed.onerror(); assert.equal(state(f), 'retry'); assert.equal(f.executions[step], 0);
 const before = f.scriptRequests().length; f.click(); f.click(); assert.equal(f.scriptRequests().length, before + 1);
 failed.onload(); assert.equal(f.scriptRequests().length, before + 1, 'stale response must not advance');
 f.finish(); assert.deepEqual(f.executions, [1, 1, 1, 1, 1, 1]); assert.equal(f.readyEvents, 1); assert.equal(f.window.bootCalls, 1);
});
check('CSS failure before DOM is visible and CSS alone retries', () => {
 const f = fixture(); const old = f.cssRequests()[0]; f.failCss(); f.domReady(); assert.equal(state(f), 'retry'); assert.equal(f.scriptRequests().length, 0);
 f.click(); f.click(); assert.equal(f.cssRequests().length, 2); old.onload(); assert.equal(f.scriptRequests().length, 0);
 f.succeedCss(); f.finish(); assert.deepEqual(f.executions, [1, 1, 1, 1, 1, 1]);
});
check('CSS timeout safely retries and ignores the expired response', () => {
 const f = fixture(); f.domReady(); const old = f.cssRequests()[0]; f.expire(); assert.equal(state(f), 'retry'); assert(text(f).includes('30秒'));
 f.click(); old.onload(); assert.equal(f.scriptRequests().length, 0); f.succeedCss(); f.finish();
});
for (const behavior of ['syntax', 'runtime']) for (let step = 0; step < 6; step++) check(behavior + ' failure at script ' + (step + 1) + ' reloads without following execution', () => {
 const f = fixture(); f.domReady(); f.succeedCss(); for (let i = 0; i < step; i++) f.runScript();
 f.runScript(undefined, behavior); assert.equal(state(f), 'reload'); const n = f.scriptRequests().length;
 f.click(); f.click(); assert.equal(f.reloads, 1); assert.equal(f.scriptRequests().length, n); assert(f.executions.slice(step + 1).every(n => n === 0));
});
check('Missing game boot completion requires reload', () => {
 const f = fixture(); f.domReady(); f.succeedCss(); for (let i = 0; i < 4; i++) f.runScript();
 f.runScript(undefined, 'no-boot'); assert.equal(state(f), 'reload'); assert.equal(f.executions[5], 0); f.click(); assert.equal(f.reloads, 1);
});
for (let step = 0; step < 6; step++) check('Script ' + (step + 1) + ' timeout prevents retry and late response advancement', () => {
 const f = fixture(); f.domReady(); f.succeedCss(); for (let i = 0; i < step; i++) f.runScript();
 const late = f.scriptRequests().at(-1); f.expire(); assert.equal(state(f), 'reload');
 f.runScript(late); assert.equal(f.scriptRequests().length, step + 1); assert.equal(state(f), 'reload'); f.click(); assert.equal(f.reloads, 1); assert.equal(f.executions[step], 1);
});
check('Known host and opaque errors do not falsely fail the game', () => {
 const f = fixture(); f.domReady(); f.succeedCss(); f.fireError({ filename: 'https://host.example/sdk.js', message: 'Host failure' }); f.fireError({ message: 'Script error.', lineno: 0 });
 assert.equal(state(f), 'loading'); f.finish(); assert.equal(f.readyEvents, 1);
});
check('Enforced CSP explains blocked own resource; report-only CSP is ignored', () => {
 const f = fixture(); f.domReady(); f.succeedCss(); const src = f.scriptRequests()[0].src;
 f.policy({ blockedURI: src, disposition: 'report' }); assert.equal(state(f), 'loading');
 f.policy({ blockedURI: src, disposition: 'enforce' }); assert.equal(state(f), 'reload'); assert(text(f).includes('CSP')); assert.equal(f.executions[0], 0);
});
check('QA-only initial 404 retries the canonical URL without earlier re-execution', () => {
 const f = fixture({ qaFaultStep: 4 }); f.domReady(); f.succeedCss(); for (let i = 0; i < 4; i++) f.runScript();
 const bad = f.scriptRequests().at(-1); assert(bad.src.endsWith('.qa-missing-first-request')); bad.onerror(); f.click();
 assert(f.scriptRequests().at(-1).src.endsWith(options.scripts[4].file)); f.finish(); assert.deepEqual(f.executions, [1, 1, 1, 1, 1, 1]);
});
console.log('ENTRY_LOADER_PASS', count, 'cases; DOM fault fixtures, not physical-device/network evidence.');
