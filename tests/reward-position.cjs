const fs=require('fs'),assert=require('assert');
// Git checkouts may use CRLF on Windows; CSS meaning is unchanged.
const s=fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
assert(!s.includes('function resultFlyCoins('));assert(!s.includes('id="earnedCoin1"'));
assert(s.includes('#gameScreen[data-personal-result="true"] #resultPanel {\n  position: absolute;\n  z-index: auto;'));
assert(s.includes('z-index:11; display:inline-block; color:#432e1d; background:transparent;'));
assert(s.includes('.earned-flight-layer {')&&s.includes('overflow: hidden;')&&s.includes('pointer-events: none;'));
assert(s.includes('const arrivalAt=scene.stage<2?Infinity:scene.coinsFlying?scene.stage2At+EARNED_COUNT_MS'));
assert(s.includes('const EARNED_COUNT_MS=420,BALANCE_RAMP_MS=350;'));
console.log('PASS legacy balance flight removed; result text stays above clipped coin layer');
