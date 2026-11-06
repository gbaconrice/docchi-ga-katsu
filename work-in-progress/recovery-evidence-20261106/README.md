# Recovered ability integration evidence

Snapshot v2 is the latest recovery evidence package. It contains 23 source/test/specification files, including all retained v1 files plus additional revival/summoner edits, death-burst/exposure/log integration snippets, VM harness and measurement runner, and 64 targeted measurement cases.

- v1 ZIP: 29,729 bytes; SHA-256 a4ca4df19e2a6f45780ef21f7b70ff01978a90d277f39c0f142278d12767a057
- v2 ZIP: 48,006 bytes; SHA-256 8a3d79ee6115ac313c9b2f89430106d616455c51b1a060863133a097a0888f9c

Each ZIP has a MANIFEST.json with file hashes. Source recovered verbatim and reconstructed code are distinguished by the individual READMEs. Current checks are syntax checks and ZIP integrity checks, not fresh game regressions.

The original final HTML SHA-256 was 210708a26ca86f70af4909c1fffe9dff82c740909e74d2b568454338a8e3c3fd. Its bytes and original full archive have NOT been recovered. This package must not be claimed as that original build or published as a game. Historical 130-test results apply only to the missing original. Rebuild from the separately preserved 119-test UI base, apply verified changes, rerun tests and browser checks, and issue a new build hash unless exact bytes match.

This commit only adds recovery evidence. Main, all prior branch files, old previews/releases and existing recovery packets remain unchanged.
