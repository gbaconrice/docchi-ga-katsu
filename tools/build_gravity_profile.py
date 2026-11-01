#!/usr/bin/env python3
"""Build a single-file, explicitly Gravity-targeted candidate from a frozen base HTML.

Does not edit its source or publish it. The separate generic index remains profile-free.
"""
from pathlib import Path
import argparse

p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'index.html')
p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'gravity-profile.html')
a=p.parse_args()
s=a.source.read_text()
marker='<script id="host-layout-config">'
if s.count(marker)!=1: raise SystemExit('Expected exactly one host-layout-config marker in built candidate')
# Existing measured DOCCHI_HOST_LAYOUT values win. Otherwise this dedicated
# Gravity-only output chooses the historical user-provided 74/98 profile at
# the same explicit 812px viewport breakpoint. It makes no SDK/iframe probe.
config='''<script id="gravity-profile-config">\n(function(){\n  var supplied=window.DOCCHI_HOST_LAYOUT||{};\n  var cfg=Object.assign({shell:'gravity'},supplied);\n  var hasMeasuredTop=cfg.topInsetPx!==undefined&&Number.isFinite(Number(cfg.topInsetPx))&&Number(cfg.topInsetPx)>=0&&Number(cfg.topInsetPx)<=220;\n  if(cfg.viewportAlreadyInset!==true&&!hasMeasuredTop&&!cfg.profile){\n    cfg.profile=(window.innerHeight>=812?'legacy-98':'legacy-74');\n  }\n  window.DOCCHI_HOST_LAYOUT=cfg;\n}());\n</script>\n'''
s=s.replace(marker,config+marker,1)
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(s)
print(f'Wrote {a.output} ({a.output.stat().st_size} bytes); source unchanged: {a.source}')
