#!/usr/bin/env python3
"""Phone-emulated load and frame-time measurement (headless Chromium + DevTools throttling).

THIS IS EMULATION ON A DESKTOP/SERVER CPU, NOT A REAL PHONE. CPU throttling slows the host CPU by a factor;
it does not reproduce a phone GPU, thermal limits, WebView differences or GRAVITY's own overhead.

Usage: python3 tools/measure/perf.py [index.html] > perf.json
Serves the file over local HTTP so network throttling applies, then for each profile:
  - load: time to DOMContentLoaded, load event, and until the home button is clickable
  - battle: picks the round-1 opening with the most units among seeds 1..400, plays it, and records
    requestAnimationFrame intervals (frame times) for the whole battle at 1x speed.
"""
import asyncio, http.server, json, os, socketserver, statistics as st, sys, threading, time, functools
from playwright.async_api import async_playwright

HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
NETWORK = {  # Chrome DevTools-style presets (download/upload in bytes/s, latency ms)
    'none': None,
    'fast4g': dict(latency=85, downloadThroughput=9_000_000 / 8, uploadThroughput=1_500_000 / 8),
    'slow4g': dict(latency=150, downloadThroughput=1_600_000 / 8, uploadThroughput=750_000 / 8),
}
PROFILES = [('desktop-reference', 1, 'none'), ('phone-cpu4x-fast4g', 4, 'fast4g'), ('phone-cpu6x-slow4g', 6, 'slow4g')]

def serve(directory):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a: None
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

async def one(p, url, name, cpu, net):
    b = await p.chromium.launch(args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    if NETWORK[net]: await cdp.send('Network.emulateNetworkConditions', {'offline': False, **NETWORK[net]})
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    t0 = time.time()
    await pg.goto(url, wait_until='commit', timeout=600000)
    await pg.wait_for_load_state('load', timeout=600000)
    t_load = time.time() - t0
    await pg.wait_for_selector('#soloStart', state='visible', timeout=600000)
    t_ready = time.time() - t0
    nav = await pg.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,transfer:n.transferSize||n.encodedBodySize}})()")
    heap = await pg.evaluate("performance.memory?performance.memory.usedJSHeapSize:null")
    # Battle: choose the biggest round-1 opening among seeds 1..400 (deterministic), then watch it.
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    await pg.click('#soloStart'); await pg.wait_for_timeout(500)
    best = await pg.evaluate("""(()=>{let best=null;for(let s=1;s<=400;s++){round=1;freshWallet();openPrediction(s);const n=initialKinds[0].length+initialKinds[1].length;if(!best||n>best.n)best={seed:s,n,left:initialKinds[0].length,right:initialKinds[1].length}}round=1;freshWallet();openPrediction(best.seed);drawArmyPreviews&&drawArmyPreviews();return best})()""")
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    await pg.wait_for_timeout(300)
    await pg.evaluate("window.__ft=[];window.__last=0;(function loop(t){if(window.__last)window.__ft.push(t-window.__last);window.__last=t;window.__raf=requestAnimationFrame(loop)})(performance.now())")
    await pg.click('#red'); await pg.click('#confirm')
    t1 = time.time()
    await pg.wait_for_function("state!=='fight'", timeout=900000, polling=500)
    wall = time.time() - t1
    ft = await pg.evaluate("(cancelAnimationFrame(window.__raf),window.__ft)")
    ticks = await pg.evaluate("typeof elapsed==='number'?elapsed:null")
    await b.close()
    ft = [x for x in ft if x > 0]
    q = lambda p: sorted(ft)[min(len(ft) - 1, int(p * len(ft)))] if ft else None
    return dict(profile=name, cpuThrottle=cpu, network=net, network_params=NETWORK[net],
                load_s=round(t_load, 2), home_ready_s=round(t_ready, 2), dcl_ms=round(nav['dcl']), load_ms=round(nav['load']),
                transfer_bytes=nav['transfer'], js_heap_mb=round(heap / 1e6, 1) if heap else None,
                battle=dict(opening=best, wall_s=round(wall, 1), game_elapsed_s=ticks, frames=len(ft),
                            frame_ms_median=round(st.median(ft), 1) if ft else None, frame_ms_p95=round(q(.95), 1) if ft else None,
                            frame_ms_max=round(max(ft), 1) if ft else None, fps_median=round(1000 / st.median(ft), 1) if ft else None,
                            frames_over_33ms=sum(x > 33.4 for x in ft), frames_over_50ms=sum(x > 50 for x in ft)),
                errors=errors[:5])

async def main():
    srv = serve(os.path.dirname(HTML)); url = f'http://127.0.0.1:{srv.server_address[1]}/{os.path.basename(HTML)}'
    import hashlib
    res = dict(note='EMULATION ONLY (headless Chromium, DevTools CPU/network throttling) - not a real phone, not GRAVITY WebView',
               html=os.path.basename(HTML), htmlSHA256=hashlib.sha256(open(HTML, 'rb').read()).hexdigest(),
               host_cpus=os.cpu_count(), viewport='390x844 @3x mobile', runs=[])
    async with async_playwright() as p:
        res['chromium'] = p.chromium.name
        for name, cpu, net in PROFILES:
            r = await one(p, url, name, cpu, net); res['runs'].append(r)
            print(json.dumps(r, ensure_ascii=False), file=sys.stderr)
    srv.shutdown(); print(json.dumps(res, ensure_ascii=False, indent=1))

asyncio.run(main())
