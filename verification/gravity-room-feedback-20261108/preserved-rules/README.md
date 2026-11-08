# Final preserved-gameplay proof

See REPORT.md for detailed findings, precise superseded assertions and four
identical pre-existing physics-test failures. summary.json is machine-readable.
No raw internal logs or large historical baseline HTML fixtures are included.

## Portable recheck

Requires Node.js 24 and the exact final/published HTML sources identified in
summary.json. The published baseline is deliberately not duplicated here.
No network, package installation or external service is used.

```sh
node /path/to/public-proof/verify.cjs /path/to/final-index.html /path/to/published-b080-index.html /path/to/output
```

This runs all ten independent structural checks and seven complete canonical
replay comparisons. Original focused and production-physics outcomes are
preserved as evidence; their historical fixtures are not bundled or replaced.
REPORT.md also records original workspace commands for the full historical run.
