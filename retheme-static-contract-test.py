from pathlib import Path
import re,json
from collections import Counter
from html.parser import HTMLParser

root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
base_ids=set(json.loads((root/'retheme-base-ids.json').read_text()))
class IdParser(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]
    def handle_starttag(self,tag,attrs):
        self.ids.extend(v for k,v in attrs if k=='id')

def ids(src):
    p=IdParser(); p.feed(src); return p.ids
found=ids(html); counts=Counter(found)
assert not [k for k,v in counts.items() if v>1], 'duplicate id'
missing=base_ids-set(found)
assert not missing, f'base ID compatibility lost: {sorted(missing)}'
css=(root/'source/ui.css').read_text()
# Static syntax sanity after stripping comments/strings.
clean=re.sub(r'/\*[\s\S]*?\*/','',css)
assert clean.count('{')==clean.count('}'), 'unbalanced CSS braces'
assert re.search(r'button\s*\{[^}]*min-height:\s*var\(--tap\)',clean), '44px general button target missing'
assert re.search(r'\.army-card\s*\{[^}]*min-height:\s*44px',clean), '44px army selection target missing'
assert 'id="comparisonScroll"' in html and 'id="predictionFooter"' in html
assert re.search(r'\.comparison-scroll\s*\{[^}]*overflow-y:\s*auto',clean), 'prediction content must scroll instead of shrinking'
assert re.search(r'#gameScreen\[data-phase="choose"\] \.prediction-footer\s*\{\s*display:\s*block',clean)
assert 'outline-offset: 0' not in clean
assert 'scale(' not in re.search(r'\.army-card\[aria-pressed="true"\][\s\S]*?\.formation-actions',clean).group(0), 'selection CSS must not scale layout/card border'
assert 'var(--gravity-top-inset, 0px)' in clean
assert '--gravity-profile-top-inset: 74px' not in clean and '--gravity-profile-top-inset: 98px' not in clean
assert 'max(env(safe-area-inset-top, 0px), var(--gravity-top-inset, 0px))' in clean, 'host obstruction and safe area must max, not add'
assert '#app { width: min(100%, 1180px); }' in clean, 'desktop workspace expansion missing'
assert 'inset: 0 84px 0 0' in clean, 'desktop field reserves utility rail'
assert 'data-personal-result="true"' in clean and 'position: absolute' in re.search(r'#gameScreen\[data-personal-result="true"\] #resultPanel\s*\{[^}]+\}',clean).group(0)
print(f'PASS static re-theme contract: {len(found)} unique IDs, {len(base_ids)} base IDs retained, 44px targets, scroll/footer, inset/config, desktop field rail, result overlay')
