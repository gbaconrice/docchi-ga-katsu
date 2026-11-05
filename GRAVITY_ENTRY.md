# GRAVITY 用の入口

通常版の `index.html` を唯一のゲーム本体として、`node tools/build-gravity-single.cjs` で `gravity-generated` に入口と外部 JavaScript・CSS を生成します。公開用ファイルは `releases/gravity-single-integration-20261105/` にあります。入口の HTML を GRAVITY AI スタジオに渡し、JavaScript や CSS を再生成せず、入口に記載された HTTPS URL から読み込みます。iframe は使用しません。

入口は約 1.3 KB ですが、初回は画像を含む約 44 MB の本体を読み込みます。この方法は AI に処理させる文章量を抑えるもので、初回通信量の削減を保証しません。生成先を公開する際は全ファイルと `manifest.json` を揃え、元の `index.html` のハッシュと照合してください。ファイル内の公開先 URL は固定されているため、別の配置先に変更する場合はビルド設定を修正して再生成する必要があります。

GRAVITY 実機での外部リソース読み込み、SDK、マルチ接続、音声、iOS 実機の表示は未検証です。ホスト環境の通信・CSP 制約は別途確認が必要です。
