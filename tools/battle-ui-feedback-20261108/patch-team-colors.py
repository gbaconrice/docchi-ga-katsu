"""Unify UI army identity colors, without recoloring semantic stats or source art."""
from pathlib import Path
import re
MARKER = '/* battle-ui-feedback: shared team identity palette */'
CSS = r'''
/* battle-ui-feedback: shared team identity palette */
/* Army A / side 0 / legacy .army-red is LEFT BLUE. */
:root { --team-blue:#176ab4; --team-red:#b93632; --left-mark:var(--team-blue); --right-mark:var(--team-red); }
/* Keep small victory text above 4.5:1 without muting either team hue. */
#app #gameScreen #resultPanel #resultWinner[data-winner="A"],
#app #gameScreen #resultPanel #resultWinner[data-winner="B"] {
  width:fit-content; max-width:100%; margin-inline:auto;
  padding-inline:4px; background:#fff3d7; border-radius:2px;
}
/* Exact selected hues need a light backing on the dark log surface. */
#battleLog [data-side],#battleLogHistory [data-side],
#battleLog [data-log-winner],#battleLogHistory [data-log-winner] {
  background:#fff3d7; padding:0 2px; border-radius:2px;
  box-decoration-break:clone; -webkit-box-decoration-break:clone;
  text-shadow:none; font-weight:700;
}
'''
DETAIL_MARKER = '/* battle-ui-feedback: inspector team name */'
DETAIL_CSS = r'''
/* battle-ui-feedback: inspector team name */
#app #gameScreen #crowdFocusName[data-team-side="0"] { color:var(--team-blue); }
#app #gameScreen #crowdFocusName[data-team-side="1"] { color:var(--team-red); }
#app #gameScreen #crowdFocusName[data-team-side] {
  justify-self:start; max-width:100%; padding-inline:2px;
  background:#fff3d7; border-radius:2px; text-shadow:none;
}
'''
def patch_inspector(source: str) -> str:
    if DETAIL_MARKER in source:
        return source
    anchor = ' if(ui.name.textContent!==label)ui.name.textContent=label;'
    if source.count(anchor) != 1:
        raise ValueError('Expected one inspector name anchor')
    source = source.replace(anchor, anchor + "\n  const teamSide=d&&(d.side===0||d.side===1)?String(d.side):null;\n  if(teamSide===null)ui.name.removeAttribute('data-team-side');else if(ui.name.getAttribute('data-team-side')!==teamSide)ui.name.setAttribute('data-team-side',teamSide);")
    pos=source.index('</style>')
    return source[:pos]+DETAIL_CSS+source[pos:]

def patch(source: str) -> str:
    source = patch_inspector(source)
    if MARKER in source:
        return source
    head, tail = source.split('</head>', 1)
    lines = head.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if '--left-mark:' in line:
            line = line.replace('#627e91', 'var(--team-blue)')
        if '--right-mark:' in line:
            line = line.replace('#a85c48', 'var(--team-red)')
        if any(key in line for key in ['.army-red[aria-pressed="true"]', '[data-side="0"]', '[data-log-winner="0"]', '#resultWinner[data-winner="A"]']):
            line = re.sub(r'#(?:176ab4|9ed2ff|a9d3ff|214f83)\b', 'var(--team-blue)', line)
        if any(key in line for key in ['.army-blue[aria-pressed="true"]', '[data-side="1"]', '[data-log-winner="1"]', '#resultWinner[data-winner="B"]']):
            line = re.sub(r'#(?:b93632|ffb6ac|ffb9ac|893127)\b', 'var(--team-red)', line)
        if '.army-red::before { background:#405b58; }' in line:
            line = line.replace('#405b58', 'var(--team-blue)').replace('#85473b', 'var(--team-red)')
        lines[i] = line
    head = ''.join(lines)
    pos = head.rfind('</style>')
    if pos < 0:
        raise ValueError('Missing final style element')
    head = head[:pos] + CSS + head[pos:]
    source = head + '</head>' + tail
    replacements = {
        "const TEAM_HP_BAR_FILL=['#86bde0','#e49a78'];": """// Shared with selected cards, result labels and battle-log identity spans.
const TEAM_COLORS=(()=>{const style=typeof getComputedStyle==='function'?getComputedStyle(document.documentElement):null;return Object.freeze([style?.getPropertyValue('--team-blue').trim()||'#176ab4',style?.getPropertyValue('--team-red').trim()||'#b93632']);})();
const TEAM_HP_BAR_FILL=TEAM_COLORS;""",
        "context.fillStyle=side?'#7ab0cd':'#d99078'": "context.fillStyle=TEAM_COLORS[side===0?0:1]",
        "p.fillStyle=side?'#7ab0cd':'#d99078'": "p.fillStyle=TEAM_COLORS[side===0?0:1]",
        "ctx.strokeStyle=c.side===0?'#ffd892':'#a6dfff';ctx.fillStyle=c.side===0?'#ffe9af':'#c4efff'": "ctx.strokeStyle=TEAM_COLORS[c.side===0?0:1];ctx.fillStyle=TEAM_COLORS[c.side===0?0:1]",
        "ctx.strokeStyle=s.side?'#83b7da':'#e6b36b'": "ctx.strokeStyle=TEAM_COLORS[s.side===0?0:1]",
    }
    for old, new in replacements.items():
        if source.count(old) != 1:
            raise ValueError(f'Expected one anchor: {old[:100]}')
        source = source.replace(old, new)
    source = source.replace("ctx.fillStyle=color;ctx.strokeStyle='#f4dfb5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,13,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#17252a'", "ctx.fillStyle=color;ctx.strokeStyle='#f4dfb5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,13,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff3d7'")
    source = source.replace("p.fillStyle=TEAM_COLORS[side===0?0:1];const width=Math.min(18,Math.max(1,slotWidth-6));p.fillRect(x-width/2,y-16,width,16);p.fillStyle='#26352b'", "p.fillStyle=TEAM_COLORS[side===0?0:1];const width=Math.min(18,Math.max(1,slotWidth-6));p.fillRect(x-width/2,y-16,width,16);p.fillStyle='#fff3d7'")
    return source

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        raise SystemExit('Usage: patch-team-colors.py INPUT.html OUTPUT.html')
    Path(sys.argv[2]).write_text(patch(Path(sys.argv[1]).read_text()))
