
(function () {
  var complete = false;
  var history = [];
  function box() { return document.getElementById('bootStatus') || document.getElementById('entryStatus'); }
  function ownScript(filename) {
    if (!filename) return null;
    var bare = String(filename).split('#')[0].split('?')[0];
    var list = document.scripts || [];
    for (var i=0; i<list.length; i++) {
      var src = list[i].src || '';
      if (src && src.split('#')[0].split('?')[0] === bare &&
          (list[i].id === 'game-runtime' || list[i].id === 'home-ambience-controller' ||
           /\/docchi-ga-katsu\/releases\//.test(src))) return true;
    }
    if (typeof location !== 'undefined' && bare === String(location.href).split('#')[0].split('?')[0]) return true;
    return false;
  }
  function report(event) {
    // avatar-resource-fallback-20261108: this optional image has its own fallback.
    // Do not swallow ErrorEvent/runtime details, unknown resources, SCRIPT or LINK.
    var target = event.target;
    if (target && target.tagName === 'IMG' && target.getAttribute &&
        target.getAttribute('data-avatar-fallback') === 'true' && typeof target.onerror === 'function' &&
        !event.filename && !event.message && !event.error) return;
    var resource = event.target && /^(SCRIPT|LINK)$/.test(event.target.tagName || '') ? event.target : null;
    var filename = resource ? (resource.src || resource.href || '') : (event.filename || '');
    var own = resource ? /\/docchi-ga-katsu\/releases\//.test(filename) : ownScript(filename);
    // Known host/injected scripts must not be labeled as a game startup failure.
    if (own === false) return;
    var message = resource ? '必要なファイルを読み込めませんでした' : (event.message || '実行エラー');
    var opaque = !filename && /^Script error\.?$/.test(message);
    var file = filename ? String(filename).split('#')[0].split('?')[0].split('/').pop() : '詳細非公開';
    var detail = message + '（' + file + '、行 ' + (event.lineno || '?') + '）';
    if (opaque) detail = '外部スクリプトのエラー詳細を取得できませんでした';
    var prefix = complete ? 'ゲーム画面でエラーが発生しました: ' : 'ゲームを開始できませんでした: ';
    history.push({ phase: complete ? 'runtime' : 'startup', message: message, file: file, line: event.lineno || 0 });
    if (history.length > 10) history.shift();
    var node = box();
    if (node) { node.hidden = false; node.textContent = prefix + detail + '。この表示をお知らせください。'; }
  }
  window.addEventListener('error', report, true);
  window.__gameBootDiagnostics = history;
  window.__gameBootComplete = function () { complete = true; var node = box(); if (node) node.hidden = true; };
}());
