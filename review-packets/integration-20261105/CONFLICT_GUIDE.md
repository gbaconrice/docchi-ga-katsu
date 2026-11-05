# Reconcile with current normal main

## Protected starting state

The last verified main is `5377bae0aaf2135c43834a2c18780467bb579034`. Re-read the remote before work. If main moved, compare changes again rather than silently rebasing this guidance. Preserve existing untracked files. Work on a new isolated local worktree based on the newly verified main, never on the live or existing dirty working tree.

Compared with cloud base `e319e808e5ffd4c186f7ca43afd533b18177b429`, main changed normal `index.html`, `CURRENT_PREVIEW_MANIFEST.json` and added `licenses/SFXMINT.md`; lightweight v3 remained unchanged. Normal root contains the newly published tavern background, text/character improvements and five sound effects. Keep all of these. Preserve sound-license text and the current preview metadata until a separately authorized publication.

The cloud experiment uses the older lightweight v3 runtime, CSS and markup. Full semantic parity between this source and the normal monolithic game was not proved. Its generated short entry is not a replacement for normal root.

## Integration method

1. Record current normal source, embedded assets/audio, license and untracked-file identities before integration. Extract working runtime/CSS/markup from normal root using the already reviewed local single-source build approach. Treat normal source as authoritative.
2. Inspect the three aggregate deltas as feature documentation. They apply exactly to pinned v3 files only; changing filenames does not make them safe for normal root. Do not use fuzzy patching or bulk replacement. Each selected normal-source hunk must match exactly once, or be reconciled explicitly.
3. Integrate in feature-sized steps: camera/touch; selective strengths; opening composition/full healing; five maps/cache; image retry and trusted audio resume; pillar/navigation; crowd focus; reward choreography. Rerun relevant tests after each step.
4. Camera and strengths both append CSS at the same original EOF. Preserve both complete suffixes along with current normal CSS. Crowd adds its own CSS and inspector markup; preserve tavern selectors, mobile layout and existing accessibility attributes.
5. Camera, pillar and crowd overlap round setup/reset and rollback state. Preserve the union of camera mode/bounds, corner replay state and crowd reset. Do not resolve conflicts by choosing one whole side.
6. The aggregate runtime delta already contains v12 navigation/yield prerequisites and the corner-reservation change. Never separately apply `v12-prerequisite.patch` on top. The pillar feature remains experimental: 14 of 60 synthetic legal-eight corner cases are unresolved. This is not an observed live occurrence rate.
7. Reward/audio integration must retain the five real normal-version sounds and their original sources/license. Reward count-up/coin landing/display-balance changes are presentation-only; authoritative ledger/network values must remain exact, including BigInt amounts. Synthesized-audio mocks do not validate the added normal audio assets.
8. Asset names are content-addressed. Copy only the five manifest-listed assets to reviewed destinations after reconciling normal source. Preserve all existing art/audio; no asset-tree replacement. Check URL generation and actual served paths.
9. Ignore the old experiment's `CONTENT_REVISION` as a target value. Regenerate content identity from the finished normal-source integration and verify both peers reject mismatched revisions. Do not import the old external loader.
10. Rerun the existing normal-game 90-test baseline plus relevant packet tests, full replay/multiplayer/accounting checks and browser/device acceptance. Compare protected tavern/audio/license bytes again. Separate inherited mock limits from new failures.

## Publication gate

The artifact-only branch transfer has explicit approval. This does not approve changes to main or deployment of the integrated game. An artifact-only branch exposes its contents in the public repository. Eventual packet publication must add only the packet directory on a fresh tree based on current main; do not move main or change game entries/releases. Deploying the reconciled game is a separate decision after review and validation.
