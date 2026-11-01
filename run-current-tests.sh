#!/bin/sh
set -eu
python3 build_standalone.py
node growth/initial-units.test.mjs
node --test growth/fallback.test.mjs growth/typed.test.mjs jobs/fixedtick-job.test.mjs replay/schema.test.mjs replay/four-species.test.mjs replay/large-army64.test.mjs multiplayer/protocol.test.mjs wallet/extension-wallet.test.mjs ranking/score-bridge.test.mjs
for test in checkpoint-ui-test.cjs unit-name-ui-test.cjs typed-generator-inline-test.cjs generation-atomic-ui-test.cjs v10-ui-test.cjs async-host-lifecycle-test.cjs async-replay-ui-test.cjs large-inline-replay-test.cjs multi-ui-test.cjs draw-depth-test.cjs growth-padding-test.cjs asset-frame-test.cjs expansion-events-ui-test.cjs personal-result-ui-test.cjs hero-fx-ui-test.cjs audio-ui-test.cjs reaction-ui-test.cjs; do node "$test"; done
# Full 25-round end-to-end physics path is deliberately optional because it is slow.
if [ "${FULL_RUN:-0}" = 1 ]; then node extension-ui-test.cjs; fi

node centered-formation.test.mjs
node bankruptcy.test.mjs
node bankrupt-ui-test.cjs
