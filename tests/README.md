# Tests Extraction Status

The standalone `PMOS product repo` has not yet completed test extraction.

Current status:

1. the test directory exists
2. the package test contract remains `vitest run`
3. actual test files still need to be copied and cleaned from the mother repo

Until test extraction is complete, treat the current `test` command as a repo-level contract target, not as a release-ready guarantee.
