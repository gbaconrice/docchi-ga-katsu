
(function () {
  var box = document.getElementById('bootStatus');
  window.addEventListener('error', function (event) {
    box.hidden = false;
    box.textContent = 'ゲームを開始できませんでした: ' + (event.message || '実行エラー') + '（行 ' + (event.lineno || '?') + '）。この表示をお知らせください。';
  });
  window.__gameBootComplete = function () { box.hidden = true; };
}());
