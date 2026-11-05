# 作業中の統合差分

このブランチのゲーム本体はベースのままです。以下の差分は公開版 029846150bef21e703025f795895b58300b3bb89 に対する未公開の作業版です。

- `integrated-index.patch`: UI、操作、マルチ表示、戦闘ログなどの修正
- `integrated-tests-tools.patch`: 関連テストと検証用ツール

別のクリーンな作業ツリーで `git apply work-in-progress/integrated-index.patch` と `git apply work-in-progress/integrated-tests-tools.patch` を実行して適用できます。適用前にベースの一致を確認してください。

106本の自動テストは候補で通過しています。ブラウザ、iOS、GRAVITY実機は未確認です。A案の背景、大型バランス、蘇生等の後続作業は含まれません。main は変更していません。
