# Visual re-theme interaction changes

This is a separate design branch copied from the frozen v15 package. The generated `index.html` keeps the same game/SDK IDs and behavior; the source UI shell and CSS are the visual/layout ownership boundary. Publication and subsequent actual-screen QA are coordinated separately; code tests do not imply device QA.

## Evidence and scope

The two user iPhone screenshots were materialized and viewed. The result screenshot shows a very large gold “もう一度” CTA, always-visible `純益` and `正解` summary, no visible finish/extension control, and substantial blank space before Safari's bottom bar. The prediction screenshot shows a dark dashboard, wallet above round, BET buttons and two sprite/stat army cards. This candidate addresses information hierarchy and placement, not game rules/economy: balance moves into the round HUD, prediction content scrolls while the bottom start button remains fixed, and result/extension copy stays compact.

## Layout contract

- Top: one compact round + game-currency row; the game title is only on home.
- Middle: scrollable prediction comparison / remaining-height battle field.
- Bottom: persistent `対戦開始` action during prediction; unchanged round/choice/stake handlers.
- Battle utilities share one 44px rail. Art-owner slots are placeholders until approved icon/stamp assets arrive; this is not a visual-art approval.
- At narrow heights the compare content scrolls rather than shrinking text/tap targets.
- Safe-area and host obstruction are resolved in one place. See `GRAVITY-HOST-CONFIG.md` for opt-in, historical 74/98 profiles, measured geometry precedence, and unverified native status.

## QA status

Static DOM/CSS and existing code-path tests can validate IDs/behavior; no in-browser render or native Gravity/iOS device QA has been run for this re-theme. A passing static test is not visual approval.
