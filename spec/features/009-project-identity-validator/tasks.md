# Tasks: Organic RDD Project Identity And Read-Only Validator

- [ ] Add resolveProjectRoot function to lib/organic-rdd.js.
- [ ] Update inspectCandidate to use resolved project path for containment.
- [ ] Update start to record workspace_path, project_path, and project_id.
- [ ] Add validate(reviewID, projectPath) read-only function.
- [ ] Add review_validate tool to plugin.
- [ ] Add review_validate command.
- [ ] Add review_validate permission to all profile configs.
- [ ] Add tests for root resolution, containment, and validate.
- [ ] Add tests proving review_validate does not mutate state.
- [ ] Run full test suite, syntax checks, diff check, and config validation.
- [ ] Synchronize to active config and record verification.
