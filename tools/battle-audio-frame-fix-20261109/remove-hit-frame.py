#!/usr/bin/env python3
"""Apply only the requested hit-name frame removal; preserve box geometry."""
from pathlib import Path
import sys

source = Path(sys.argv[1])
text = source.read_text()
before = '.multi-results { margin:5px 0; border:1px solid #a78555; background:#f3e2bd; color:#432e1d; text-align:left; font:600 12px/1.35 system-ui,sans-serif; }'
after = '.multi-results { margin:5px 0; border:1px solid transparent; background:transparent; color:#432e1d; text-align:left; font:600 12px/1.35 system-ui,sans-serif; }'
assert text.count(before) == 1, 'Expected exactly one original hit-name style'
text = text.replace(before, after)
source.write_text(text)
print(source)
