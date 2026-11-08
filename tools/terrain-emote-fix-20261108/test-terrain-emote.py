"""Portable exact-scope tests. --sealed permits only the specified content seal."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("terrain_patch", HERE / "patch-terrain-emote.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("candidate", nargs="?", type=Path, default=Path(os.environ.get("GAME_HTML", HERE.parent / "isolated/index.html")))
parser.add_argument("base", nargs="?", type=Path, default=HERE.parents[1] / "gravity-room-feedback/source/index.html")
parser.add_argument("--sealed", action="store_true", help="Require the exact zero-then-SHA256 content seal; allow no other script edits")
args = parser.parse_args()
original, actual = args.base.read_text(), args.candidate.read_text()
assert hashlib.sha256(args.base.read_bytes()).hexdigest() == "ef0724f9b482aa5d59c22afe2418e7f2d8e98d6bee85395a322ecdfa28263bfa"
expected = module.patch(original)
revision_pattern = re.compile(r'(?<=const CONTENT_REVISION=")[0-9a-f]{64}(?=";)')
def normalized(text):
    result, count = revision_pattern.subn("0" * 64, text)
    assert count == 1, "exact CONTENT_REVISION declaration must appear once"
    return result
if args.sealed:
    zeroed = normalized(expected)
    seal = hashlib.sha256(("docchi-boss-abilities-v1\0" + zeroed).encode()).hexdigest()
    expected, count = revision_pattern.subn(seal, zeroed)
    assert count == 1
    assert revision_pattern.findall(actual) == [seal], "CONTENT_REVISION is not the exact candidate content seal"
    compare_original, compare_actual = normalized(original), normalized(actual)
else:
    compare_original, compare_actual = original, actual
assert expected == actual, "candidate differs from exact CSS patch" + (" and declared seal" if args.sealed else "")
assert module.patch(actual) == actual, "patch must be idempotent"
assert actual.count(module.MARKER) == 1
assert actual.count(module.LAYOUT_MARKER) == 1
assert compare_actual.count(module.LAYOUT) == 1
compare_actual = compare_actual.replace(module.LAYOUT, "", 1)
assert compare_actual.replace(module.CSS + "\n", "", 1) == compare_original
scripts = lambda s: re.findall(r"<script\b[^>]*>([\s\S]*?)</script>", s, re.I)
assert scripts(compare_actual) == scripts(compare_original), "runtime/protocol/gameplay changed beyond the one exact layout helper and permitted content seal"
assert re.findall(r'(?:src|href)="([^"]+)"', actual) == re.findall(r'(?:src|href)="([^"]+)"', original), "asset/DOM references changed"
assert "--gravity-" not in module.CSS and "safe-area" not in module.CSS
assert "grid-template-columns" not in module.CSS and "font-size" not in module.CSS
assert "height:auto; max-height:none" in module.CSS
assert "white-space:normal; overflow-wrap:anywhere; overflow:visible" in module.CSS
assert "background:none; border:0" in module.CSS
assert "top:-2px; right:-6px; width:18px; height:18px;" in actual
try:
    module.patch("<style></style>")
except ValueError:
    pass
else:
    raise AssertionError("wrong base anchors were accepted")
print("PASS immutable base, exact CSS plus literal layout-helper scope" + (" plus exact content seal" if args.sealed else "") + ", idempotence, unchanged assets/scripts/safe-area/18px geometry")
print("Candidate SHA256", hashlib.sha256(args.candidate.read_bytes()).hexdigest())
if args.sealed:
    print("Content seal", seal)
