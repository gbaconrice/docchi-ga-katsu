#!/usr/bin/env python3
"""Apply fun-feedback-20261109 to the reassembled standalone source.
Usage: apply-fun-feedback.py INPUT_INDEX OUTPUT_INDEX
Presentation only: touch reaction + click sounds, stake coins and 予想 seal, solo countdown,
champion streak badge, tug-of-war HP gauge; plus three display fixes (solo name placeholder,
terrain line breaks, attack interval on cards)."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent
source = Path(sys.argv[1]).read_text(encoding='utf8')
if 'const FunFeedback=' in source:
    raise SystemExit('fun-feedback already applied')


def replace(old, new):
    global source
    assert source.count(old) == 1, f'Expected one anchor: {old[:90]}'
    source = source.replace(old, new, 1)


# 1) Original procedural UI sounds in the existing audio engine (same mute, voice limits and unlock rules).
replace("        pauseClose: { duration: 0.15, tones: [[293.66, 0.12, 0.018, 'triangle', 0, 392]] },\n",
        "        pauseClose: { duration: 0.15, tones: [[293.66, 0.12, 0.018, 'triangle', 0, 392]] },\n"
        "        // fun-feedback-20261109: light wooden tap, heavier tap, stake coin, 予想 seal, countdown drum, opening horn.\n"
        "        tap: { duration: 0.05, tones: [[1250, 0.032, 0.030, 'triangle', 0, 820]], noise: [0.016, 0.07, 3600] },\n"
        "        tapHeavy: { duration: 0.09, tones: [[360, 0.07, 0.045, 'triangle', 0, 240], [1040, 0.03, 0.016, 'sine', 0, 700]], noise: [0.026, 0.09, 1500] },\n"
        "        coin: { duration: 0.16, tones: [[2093, 0.12, 0.026, 'sine', 0, 2060], [3136, 0.09, 0.014, 'sine', 0.006, 3080], [1318.5, 0.04, 0.012, 'triangle', 0, 1200]], noise: [0.012, 0.05, 6500] },\n"
        "        stamp: { duration: 0.22, tones: [[110, 0.18, 0.070, 'sine', 0, 58], [220, 0.07, 0.025, 'triangle', 0, 140]], noise: [0.05, 0.14, 850] },\n"
        "        count: { duration: 0.14, tones: [[196, 0.11, 0.050, 'triangle', 0, 150], [392, 0.05, 0.012, 'sine', 0, 300]], noise: [0.035, 0.09, 1100] },\n"
        "        horn: { duration: 0.62, sustainUntil: 0.45, tones: [[233.08, 0.6, 0.040, 'triangle', 0, 246.94], [349.23, 0.55, 0.024, 'triangle', 0.03, 369.99], [466.16, 0.45, 0.010, 'sine', 0.06, 493.88]], noise: [0.05, 0.05, 900] },\n")
replace("    function playInterface(kind, event) {",
        "    const UI_CUES = new Set(['tap', 'tapHeavy', 'coin', 'stamp', 'count', 'horn']);\n"
        "    function playUi(kind, event) {\n"
        "      if (!UI_CUES.has(kind)) return false;\n"
        "      if (trusted(event)) unlockFromGesture(event);\n"
        "      return playCue(kind, 0.85);\n"
        "    }\n\n"
        "    function playInterface(kind, event) {")
replace("      playInterface,\n      beginBattle,", "      playInterface,\n      playUi,\n      beginBattle,")

# 2) Display fixes.
replace("const fallback=soloProfileStatus==='offline'?'プレイヤー':soloProfileStatus==='loading'?'読込中…':'名前未取得';",
        "const fallback=''; // Never show loading/unknown placeholders in solo; the portrait stays.")
replace("const timing = facts.attackable && /^基本間隔/.test(facts.timing) ? facts.timing : '';",
        "const timing = ''; // Attack intervals are internal detail; the card shows features, not seconds.")
replace("fieldStatus.textContent=inlineFieldLabel(battleEnvironment);",
        "renderFieldStatus(fieldStatus,inlineFieldLabel(battleEnvironment));")

# 3) Styles at the end of the single stylesheet.
styles = list(re.finditer(r'<style\b[^>]*>[\s\S]*?</style>', source))
assert len(styles) == 1
end = styles[0].end() - len('</style>')
source = source[:end] + '\n' + (root / 'fun-feedback.css').read_text(encoding='utf8') + source[end:]

# 4) Module at the end of the game runtime script, after every existing handler is installed.
scripts = list(re.finditer(r'<script\b[^>]*>[\s\S]*?</script>', source))
assert len(scripts) == 5
end = scripts[3].end() - len('</script>')
source = source[:end] + '\n' + (root / 'fun-feedback.js').read_text(encoding='utf8') + '\n' + source[end:]

out = Path(sys.argv[2])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(source, encoding='utf8')
print(out)
