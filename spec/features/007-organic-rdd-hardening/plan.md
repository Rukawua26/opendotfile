# Plan: Organic RDD Hardening

1. Add regression tests that reproduce internal symlink retargeting and under-classified operational paths.
2. Reject candidate symlinks before resolving or hashing them.
3. Expand path and extension classification while preserving the test-file exception.
4. Add configuration assertions for the Organic RDD plugin and permissions in every profile.
5. Run focused and full verification, synchronize active OpenCode files, and review the frozen candidate.

## Design Decisions

- Reject symlinks instead of encoding link metadata in schema version 1. This keeps candidate identity unambiguous and avoids a receipt migration.
- Treat unknown files as Tier 2 as before; only recognizable executable source receives Tier 3.
- Match `.opencode` singular and plural directory names supported by OpenCode.
