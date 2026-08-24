# Skilltastic End-to-End Review Protocol

This document defines the required review process for `Skilltastic`.

The process applies to pull requests that change application code, tests,
generated output, dependencies, build scripts, workflows, configuration,
release artifacts, or documentation that changes an operational contract.

The review goal is to find defects introduced, exposed, or made reachable by
the pull request. Do not report pre-existing defects unless the pull request
makes them worse, exposes them, or prevents a safe fix.

This protocol has four parts:

1. **Part I — Review Procedure** defines the required review actions,
   evidence rules, and phase gates.
2. **Part II — Project Risk Catalog** defines conditional, Skilltastic-specific
   checks distilled from the architecture and from historical PR findings
   (Rust/Tauri backend, React/TypeScript frontend, CI/CD, and the single-package
   layout).
3. **Part III — Operational Changes and Automation Backlog** defines the
   repository changes that make the procedure repeatable.
4. **Part IV — External References (non-normative)** pins the external review
   skills this protocol builds on and states how each informs the procedure.

Part I is the sole normative process. Parts II through IV are conditional
checks, operational backlog, and reference material. If guidance conflicts,
Part I and `AGENTS.md` take precedence.

A reviewer must not treat a catalog item as a finding by itself.
A finding requires evidence that the pull request creates a reachable defect.

---

# Part I — Review Procedure

## 1. Terms, Review Contract, and Evidence Rules

### 1.1 Terms

| Term         | Meaning                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------ |
| Contract     | An observable promise to a caller, user, operator, system, or test.                        |
| Boundary     | A point where data, authority, lifecycle ownership, or failure ownership changes.          |
| Evidence     | A code trace, test result, CI result, reproduction, specification, or runtime observation. |
| Verification | A command, test, inspection, or manual scenario that checks a contract.                    |
| Risk         | The required review depth for a changed area. Risk is not finding severity.                |
| Finding      | A confirmed defect introduced or made reachable by the pull request.                       |
| Assumption   | A statement that has not been verified.                                                    |
| Unknown      | A required fact that cannot be obtained from the pull request, repository, or CI.          |

### 1.2 Review Contract

A review must:

1. Compare the reviewed head SHA with the target branch.
2. Read the complete diff before making line-level findings.
3. Inventory changed contracts before selecting verification.
4. Identify every changed behaviour, contract, and operational surface.
5. Trace each changed public boundary to its consumers.
6. Review successful, failed, cancelled, retried, and shutdown paths.
7. Inspect tests for both coverage and test validity, independently from
   implementation correctness.
8. Run or inspect every relevant verification gate, and record verification
   status without claiming unrun checks passed.
9. Report only findings with a clear cause, impact, and minimal safe fix that
   meet the finding validation requirements (Section 10).
10. Separate verified facts from assumptions and unknowns.
11. Stop only when all required phase gates have an explicit result.

A review must not:

- Report a style preference as a correctness finding.
- Claim a command passed when it was not run.
- Require a named implementation pattern when another implementation preserves
  the same contract.
- Infer desktop-runtime behaviour only from a mocked unit test.
- Infer cross-platform behaviour from one platform target.
- Treat a test as valid when it can pass while the changed contract is broken,
  or when it only repeats implementation constants.
- Report a pre-existing issue unless the pull request makes it worse, makes it
  reachable, or blocks its safe repair.
- Mark CI as passing when a required check is pending, unavailable, or
  inconclusive.

### 1.3 Evidence Quality

Use the strongest available evidence.

| Evidence level | Evidence                                             | Allowed conclusion                     |
| -------------- | ---------------------------------------------------- | -------------------------------------- |
| E0             | Intent in PR text or comments                        | Intended behaviour only                |
| E1             | Static inspection of changed code                    | Plausible code path                    |
| E2             | Consumer trace or focused test inspection            | Reachability or contract coverage      |
| E3             | A test or command completed on the reviewed head SHA | Verified behaviour within test scope   |
| E4             | Desktop integration or end-to-end scenario completed | Verified user-visible runtime behaviour|
| E5             | Reproduction on relevant platform and state          | Confirmed real defect                  |

Do not describe an E1 conclusion as an E4 conclusion.

Treat pull request text as intent. Treat code and tests as implementation.
Treat CI output as verification evidence.

---

## 2. Review Inputs and Evidence Ledger

Collect the following before detailed analysis:

- Target branch and reviewed head SHA.
- Pull request title, description, linked issues, and prior discussion.
- Full diff, including renamed, deleted, generated, lock, workflow, and
  configuration files.
- Changed files and changed symbols.
- Existing tests close to each changed behaviour.
- CI jobs, their status, and their exact commands.
- Relevant repository instructions (`AGENTS.md`, `CLAUDE.md`).
- Relevant Tauri configuration, capabilities, permissions, CSP, Rust command
  registrations, package manifests, Cargo manifests, and workflows.

Create an evidence ledger before writing findings.

| ID   | Contract or concern                              | Evidence source                                  | Evidence level | Result                | Follow-up                |
| ---- | ------------------------------------------------ | ------------------------------------------------ | -------------- | --------------------- | ------------------------ |
| E-01 | Skill file ops stay inside skills roots         | Path validation and integration test            | E3             | Verified / Unverified | Add test or inspect path |
| E-02 | A command remains inaccessible to remote content | Tauri capability and `remote.urls` configuration | E2             | Verified / Unverified | Security phase          |
| E-03 | A React list keeps stable keys across reloads    | Hook cleanup and `stableSkillKey` test           | E2             | Verified / Unverified | Lifecycle phase          |

Use stable identifiers when one concern spans multiple files.

---

## 3. Phase 0: Scope, Baseline, and Change Inventory

### 3.1 Establish the Baseline

Before reviewing behaviour:

1. Identify the base branch and reviewed head SHA.
2. Check whether the branch contains merge conflicts and whether an automated
   rebase is safe.
3. Identify commits that belong to the pull request.
4. Identify generated files, lockfiles, and vendored output.
5. Identify changed dependency versions and workspace overrides.
6. Identify deleted tests, disabled checks, and reduced assertions.
7. Identify changed feature flags, environment variables, and defaults.
8. Identify configuration changes that affect development, CI, release, or
   production behaviour differently.

Do not assume a file is generated from its filename.
Find the generator, script, build step, or repository instruction.

### 3.2 Build the Change Inventory

Create one inventory record for each changed contract. A single file can have
multiple records.

| Area                 | Files                      | Change type  | Changed contract                                             | Entry point   | Consumers            | Risk   | Required verification                     |
| -------------------- | -------------------------- | ------------ | ------------------------------------------------------------ | ------------- | -------------------- | ------ | ----------------------------------------- |
| Skill file op        | `src-tauri/src/commands/skills.rs` | Persistence, security | A write or delete stays inside the managed skills root | Invoke | Rust command, FS | High | Integration test, path trace |
| Enable/disable move  | `src-tauri/src/commands/mod.rs`   | Persistence  | Disable moves a folder to the sibling `.disabled/` only | Invoke | FS | High | Integration test, recovery trace |
| Invoke signature     | `src/api/skills.ts`        | API          | TS invoke payload matches the Rust command                  | Invoke        | React hooks         | Medium | Consumer trace, type check               |
| Skill list state     | `src/hooks/useGlobalSkills.ts`   | UI lifecycle | Reloads do not clobber newer data; cleanup on unmount | Effect | Sidebar, grid | Medium | Unit test, generation guard trace |
| Project discovery    | `src-tauri/src/detect.rs`  | Filesystem   | Discovery off the UI thread; stale paths degrade safely     | Invoke        | Add-project picker  | Medium | Unit test, trace                         |

For each changed file, at minimum record:

| Field                 | Required content                                                                        |
| --------------------- | --------------------------------------------------------------------------------------- |
| File                  | Repository-relative path                                                                |
| Change type           | Behaviour, API, persistence, security, UI, tests, CI, dependency, docs, generated output |
| Changed contract      | What callers, users, or operators can observe                                           |
| Entry points          | Commands, exported functions, routes, hooks, event listeners, workflows, scripts        |
| Consumers             | Callers, IPC clients, filesystem readers, UI components, CI jobs                        |
| Risk level            | Critical, high, medium, or low                                                          |
| Required verification | Tests, type checks, lint, build, manual scenario, security inspection                  |

Use the highest applicable risk level:

| Risk     | Examples                                                                                                                                                                      | Minimum review depth                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Critical | Native command permissions, arbitrary filesystem access, secret handling, remote-content access with IPC, destructive file action                                             | Full security, contract, test, and verification review  |
| High     | Skill directory moves, persistence recovery, async lifecycle, cross-platform behaviour, workflow changes, release artifacts                                                     | Full contract and lifecycle review with direct evidence |
| Medium   | Stateful UI, IPC client changes, validation, error handling, dependency changes, generated bindings                                                                           | Consumer trace, tests, targeted verification            |
| Low      | Isolated rendering, copy, comments, formatting, non-operational docs                                                                                                          | Diff inspection and relevant local checks               |

Do not use risk level as severity. Risk level selects review depth.
Severity describes the impact of a confirmed finding.

### 3.3 Select Required Review Modules

For each inventory record, select relevant modules:

| Change type                  | Required modules                                                 |
| ---------------------------- | ---------------------------------------------------------------- |
| React component or hook      | Contract, lifecycle, accessibility, tests                        |
| Tauri command or invoke binding | Contract, IPC trace, security, tests                         |
| Skill directory move or delete | Security, path and symlink analysis, error cleanup, tests    |
| Project discovery or persistence | Filesystem, concurrency, recovery, tests                   |
| Dependency or lockfile       | Supply chain, consumer impact, CI/build verification             |
| GitHub Actions workflow      | Trigger, path filter, permission, secret, platform matrix review |
| Documentation                | Contract accuracy, command accuracy, operational impact          |

If a module is not selected, record `Not applicable` with a reason.
A docs-only change must not receive the same audit depth as a Tauri command
or file operation, but the record and reason must exist.

---

## 4. Phase 1: Diff, Symbol, and Boundary Trace

Review the complete diff before reviewing individual lines.

For every changed exported symbol, command, configuration key, schema,
workflow input, or environment variable:

1. Find its declaration or source of truth.
2. Find direct consumers and call sites.
3. Find indirect consumers through wrappers, hooks, or the invoke client.
4. Find existing tests that claim to cover it.
5. Find adjacent contracts, types, or generated outputs.
6. Find error, cancellation, cleanup, and rollback paths.
7. Find persisted state and compatibility dependencies.
8. Find platform-specific branches when the change reaches Tauri, native
   filesystem paths, or build tooling.
9. Record the trace in the evidence ledger.

### 4.1 Required Boundary Traces

Trace the complete boundary when it changes.

| Changed boundary                  | Required trace                                                               |
| --------------------------------- | ---------------------------------------------------------------------------- |
| React component to hook           | Props, state ownership, effect lifecycle, loading and error states          |
| React to Tauri invoke             | Payload construction, serialization, rejection handling                     |
| TypeScript invoke to Rust command | Invoke call site, command registration, payload types, error shape          |
| Rust command to filesystem        | Validation, canonicalization, authorization, operation target, cleanup      |
| Rust command to SQLite or file    | Transaction or atomic write, recovery, retry                                |
| Workflow to build input           | Trigger, path filters, cache key, permissions, platform job                 |
| Tauri configuration to webview    | `remote.urls`, capabilities, permissions, CSP                              |
| Package manifest to lockfile      | Dependency declaration, resolution, consumer, CI build path                 |

### 4.2 Generated Artifacts

Skilltastic does not generate TypeScript bindings from Rust (it calls
`invoke` directly from `src/api/*.ts`). There is no `gen:bindings` step. The
source of truth for an invoke contract is the `#[tauri::command]` signature
plus its `tauri.conf.json`/capabilities registration. Verify by hand that the
TypeScript call site and payload match the Rust command, and that the command
is registered in the invoke handler.

### 4.3 Dependency Changes

For each changed dependency:

- Identify direct and transitive consumers.
- Identify whether the change affects desktop runtime, build tooling, CI, or
  release packaging.
- Confirm the lockfile (`package-lock.json`, `Cargo.lock`) matches the manifest
  change.
- Check whether a native dependency needs platform-specific build tools.
- Check whether the update changes a security, network, filesystem, IPC, or
  serialization boundary.
- Record any verification that runs the affected consumer.

Do not report "dependency updated without tests" unless the dependency change
has a reachable contract impact and no relevant verification exists.

---

## 5. Phase 2: Contract Review

Define each changed behaviour before judging its implementation.

Use this format:

```text
Given: [initial state, platform, persisted state, and valid input]
When:  [user action, command, event, retry, startup, or shutdown]
Then:  [observable result]
And:   [failure, cancellation, cleanup, rollback, and retry result]
```

For stateful behaviour, also define:

```text
Invariant: [a condition that must remain true]
Owner:     [the component, process, transaction, or module responsible]
End state: [the required state after success, failure, and cancellation]
```

### 5.1 Input and Output Review

Check these conditions where applicable:

- The receiving boundary validates untrusted input.
- Rust and JavaScript numeric values remain safe across serialization
  (`u64` to JS `Number` precision).
- Empty values, missing fields, `null`, `undefined`, malformed JSON, and
  invalid enum variants have defined behaviour.
- Error values do not expose secrets, filesystem paths, or internal state to
  an untrusted caller.
- Each caller receives the result shape it expects.
- Defaults do not silently change behaviour for existing users.
- Serialization preserves field naming, optionality, and compatibility.
- The change did not alter a public API, serialized value, or user-visible
  state without a matching consumer update.
- A user-visible state has explicit pending, success, empty, and error
  behaviour where each state is possible.

### 5.2 Failure, Recovery, and Retry Review

For each operation that can fail:

1. Identify the failure owner.
2. Identify the state before failure and the state after failure. Does
   failure preserve a valid state?
3. Identify cleanup and rollback. Does a partial operation roll back,
   compensate, or recover safely?
4. Identify what retry does, and whether retry is idempotent (no duplicate
   work, corrupted state, or leaked resources).
5. Identify whether failure is logged, surfaced at the correct layer, or
   intentionally suppressed.
6. Identify whether failure blocks startup or permits degraded operation.

For enable/disable, a failed move must leave the skill in exactly one place
(enabled or disabled), never in both or in neither.

### 5.3 Concurrency and Lifecycle Review

For async or long-lived work, identify: start owner, cancellation owner,
completion owner, cleanup owner, resource owner, stale-result rejection
mechanism, shutdown behaviour, and retry/replacement behaviour.

Check for:

- Stale async completion overwriting newer state (use a generation counter in
  the skill-list and project hooks).
- Callbacks that run after unmount, shutdown, cancellation, or replacement.
- Event listeners that remain after teardown.
- Timers, listeners, and file handles that remain after failure or cancellation.
- Shared mutable state without a session, request, or generation identity.
- Duplicate work from repeated user actions or automatic retries.

### 5.4 Compatibility Review

For persisted or platform-sensitive changes, check:

- Fresh install behaviour.
- Upgrade behaviour from a previous supported release. Can an existing user's
  tracked projects and pinned tools still load?
- Interrupted prior operation behaviour.
- Corrupted or manually modified persisted state behaviour (missing
  `projects.json`, moved skill folder).
- Missing optional asset or unavailable hardware behaviour degrades safely.
- Windows, macOS, and Linux behaviour is equivalent where the contract is shared
  (path separators, home-directory locations, `.disabled` sibling moves).
- Existing configuration and preference compatibility.

---

## 6. Phase 3: Security and Authority Review

Run this phase for all Critical and High risk records.
Run relevant subsections for every other record.

### 6.1 Threat Model Record

For each security-sensitive record, write:

| Field             | Required content                                                                |
| ----------------- | ------------------------------------------------------------------------------- |
| Asset             | Skill folder on disk, local project list, native command                       |
| Attacker control  | IPC payload, file path, workflow event                                          |
| Trust boundary    | Webview to Tauri, command to OS filesystem                                      |
| Required property | No traversal, no unauthorized invoke, integrity preserved, bounded resource use |
| Enforcement point | Path validator, capability, CSP                                                 |
| Test or evidence  | Rejected-input test, config trace, integration test, CI inspection             |

### 6.2 Webview and Tauri Authority

Check:

- `remote.urls` is empty or restricted to localhost loopbacks. External pages
  do not gain IPC or native command access.
- Capabilities and permissions grant the minimum required authority.
- CSP permits required application assets but does not permit remote scripts or
  unsafe execution.
- New commands are registered only when intended.
- Every externally controllable command field is validated before filesystem
  or database operations.

### 6.3 Filesystem Authority

For scoped file operations on skill directories:

1. Validate the intended path format; reject path traversal and unsafe
   absolute paths where a scoped path is required.
2. Resolve the allowed base directory (the skills roots from `skills_roots`).
3. Canonicalize existing path components before authorization checks.
4. Check symlink behaviour, including the final path component.
5. Construct and perform operations on the validated `PathBuf`, not the raw
   input.
6. Clean up partial output on failure.
7. Test deletion, replacement, traversal, absolute-path, and symlink-escape
   behaviour where applicable.

A lexical prefix check alone does not prove containment.

### 6.4 Network, Downloads, and Subprocesses

Skilltastic is a local desktop app with no telemetry and no network downloads
in the current build. The landing page and docs are static. If a change adds a
network call (for example a future skill browser or auto-update), re-run the
full network and subprocess review from the mausVoice-style catalog: restrict
schemes and hosts, cap streamed size, verify integrity, remove partial
artifacts on failure, and use explicit executable allow-lists for subprocesses.

### 6.5 CI, Release, and Secret Boundaries

Check:

- Workflow job permissions use least privilege, set at the job level.
- Fork-triggered workflows cannot access privileged secrets.
- Release-only secrets enter only through protected CI configuration.
- Signing keys and tokens are not committed.
- Builds are unsigned by design. Do not add signing secrets without an explicit
  decision recorded in the PR.
- Cache keys include inputs that affect generated or compiled output.
- Path filters include all relevant build inputs.
- Release jobs run only under intended events and branches (`v*` tags).

---

## 7. Phase 4: Test Review and Test Validity

Review test quality separately from implementation correctness.

### 7.1 Evidence Classification

For every changed behaviour, classify evidence:

| Classification  | Meaning                                                     |
| --------------- | ----------------------------------------------------------- |
| Direct test     | Exercises the changed contract through its public boundary. |
| Indirect test   | Covers the contract only as part of a larger flow.          |
| Regression test | Fails before the change and passes after the change.        |
| Negative test   | Confirms rejected input or failure handling.                |
| Recovery test   | Confirms safe post-failure state and retry behaviour.       |
| Missing test    | No evidence protects a meaningful changed contract.         |
| Invalid test    | Can pass while the required behaviour is broken.             |

### 7.2 Test Validity Questions

For each relevant test, ask:

1. Would the test fail if the changed behaviour reverted?
2. Does the test use the public contract rather than an implementation detail?
3. Does the test mock the function or module that contains the behaviour under
   test?
4. Does the assertion come from an independent source of truth, or does it
   assert a duplicated hardcoded value instead of runtime or schema-derived
   state?
5. Does the test verify both success and relevant failure behaviour?
6. Does the test wait on deterministic readiness rather than elapsed time
   (sleeps)?
7. Does the test restore global state and isolate filesystem, environment, and
   static mutation?
8. Can the test pass only because a mock has the same bug as production code?
9. Does the test protect an existing-user state, not only a fresh state?
10. Does the test distinguish a visible UI result from an internal helper call?
11. Does the test distinguish the old behaviour from the required new behaviour?

### 7.3 Required Test Types

| Changed area                              | Minimum evidence                                                    |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Pure deterministic function               | Unit test with boundary and error cases                             |
| React hook or state transition            | Unit or component test with mount, update, and cleanup behaviour     |
| New public command or changed invoke payload | Rust command contract test and TS consumer trace                |
| Filesystem operation                      | Temporary-directory integration test with rejected-path coverage    |
| Skill enable/disable move                 | Integration test: success, failure, partial, symlink, traversal     |
| Bug fix with a reproducible failure mode  | Regression test                                                     |
| Security boundary                         | Rejected-input tests                                                |
| Cross-platform logic                      | Tests where platform behaviour differs                               |
| Workflow or release config                | Static workflow inspection and relevant CI evidence                 |

Prefer the smallest test level that proves the contract.
Use unit tests for pure logic (`src/utils/*`).
Use integration tests for filesystem and command boundaries (`src-tauri`).
Use component tests for critical user flows (`src/components/*`, `src/hooks/*`).

### 7.4 Test Anti-Patterns

Treat these as test-quality concerns when they affect changed behaviour:

- Hardcoded expected schema duplicated from production constants.
- Mocks that replace the function containing the behaviour under test.
- Assertions only on implementation calls, not observable results.
- Fixed sleeps when a state, event, or readiness condition exists.
- Tests that do not await async cleanup.
- Tests that mutate global state without restoration.
- Tests that validate a checksum using a vector generated by the same changed
  implementation.
- Tests that assert an error was logged but do not assert safe state recovery.
- Tests with no failure assertion for a new error or recovery path.

---

## 8. Phase 5: Desktop End-to-End Scenarios

Unit and integration tests do not replace desktop-runtime validation for
critical user flows.

Select scenarios from the change inventory.

### 8.1 Startup and Recovery

For startup, skill loading, or project-list changes, verify:

1. Fresh profile starts successfully.
2. Existing valid profile starts successfully.
3. A skill folder that fails to read degrades safely (row hidden or marked).
4. A tracked project whose folder was moved or deleted degrades safely.
5. Non-integrity startup failure does not destroy user data.
6. Logs contain useful error context without containing secrets.

### 8.2 Skill Enable, Disable, Edit, Delete

For skill operations, verify:

1. Disable moves the folder to the sibling `.disabled/` and it disappears from
   the active list but survives.
2. Enable moves it back and it returns with the same content.
3. Edit writes `SKILL.md` and the rendered view updates.
4. Delete removes the folder and it cannot be toggled again.
5. A path-traversal or out-of-root payload is rejected.
6. A symlink final component is rejected.
7. Cancellation or failure leaves exactly one copy on disk.

### 8.3 Cross-Platform Native UI

For sidebar, reorder, pin, or view-toggle changes, verify:

- Primary supported platform behaviour.
- Keyboard operability where the mouse path is the only tested path.
- Failure behaviour when an OS feature or permission is unavailable.

Record the tested platform and version. Do not generalize one platform result
to all platforms.

---

## 9. Phase 6: Verification Matrix

Select verification from the change inventory. Use exact repository commands
from CI, package scripts, Cargo manifests, or documented project instructions.

### TypeScript and React changes

```sh
npm ci                     # install from lockfile (CI)
npx tsc --noEmit          # typecheck — exact local equivalent of CI typecheck
npm test                  # vitest run — frontend unit tests
npm run build             # tsc && vite build — frontend production build
```

For critical UI flows, component tests live beside the source
(`src/components`, `src/hooks`, `src/__tests__`).

### Rust and Tauri changes

Use the exact crate directory that CI uses:

```sh
cd src-tauri
cargo fmt --all -- --check     # formatting gate (CI: cargo fmt --all -- --check)
cargo clippy --all-targets -- -D warnings   # lint gate (CI)
cargo test --lib               # Rust unit tests (CI)
cargo check                    # quick compile check
```

The `TAURI_CONFIG` env var that mausVoice sets for clippy is not needed here;
Skilltastic has no sidecar binaries, so the default config is valid.

### Repository-wide and CI changes

```sh
npm ci
npx tsc --noEmit
npm test
cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test --lib
```

Secret scanning: `secret-scan.yml` runs gitleaks on the PR and push commit
ranges and on the working tree, using `gitleaks.toml`, and self-tests that a
fake key is detected. Do not commit secrets.

For workflow changes, inspect:

- Trigger events and path filters.
- Job permissions.
- Secret exposure.
- Cache keys.
- Required operating systems.
- Build inputs omitted from path filters.
- Symmetry of test coverage across supported platforms.

### Verification status

Use one of these states for each required check:

- **Passed**: the command completed successfully for the reviewed head SHA.
- **Failed**: the command completed unsuccessfully for the reviewed head SHA.
- **Not run**: the command was required but was not executed.
- **Not applicable**: the change cannot affect this check.
- **Inconclusive**: execution or output did not establish the result.

Record verification in this table:

| Check               | Applies when                               | Status                                         | Evidence                   |
| ------------------- | ------------------------------------------ | ---------------------------------------------- | -------------------------- |
| Formatting          | Source, docs, or configuration changes     | Passed / Failed / Not run / N/A / Inconclusive | Exact command and head SHA |
| Type check          | TypeScript contract changes                | …                                              | Exact command and head SHA |
| Clippy              | Rust changes                               | …                                              | Exact command and head SHA |
| Unit tests          | Changed deterministic logic                | …                                              | Exact command and scope    |
| Integration tests   | IPC, files, persistence, module boundaries | …                                              | Exact command and scope    |
| Workflow inspection | Workflow or release changes                 | …                                              | Reviewed workflow paths    |
| Security review     | Critical or High risk boundary             | …                                              | Threat-model record        |

Do not label CI as passing when required checks are pending, unavailable, or
inconclusive. A review with required `Not run` or `Inconclusive` verification
is **Needs Verification**, not **Ready**.

---

## 10. Phase 7: Finding Validation and Severity

A candidate finding requires all five conditions:

1. **Diff cause:** The pull request introduces the defect, changes its
   reachability, or blocks its safe repair.
2. **Reachable scenario:** A concrete input, state, event sequence, or platform
   condition reaches the defect.
3. **Concrete impact:** The resulting correctness, security, data, lifecycle,
   performance, or user impact is concrete.
4. **Minimal remediation:** A safe, minimal change can preserve the intended
   contract.
5. **Verification path:** A test, scenario, or command can prove the fix.

Discard the candidate if one condition is absent.

Use these severities:

| Severity | Meaning                                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Exploitable authority or security boundary failure, data loss, widespread startup failure, or release-blocking defect                                                 |
| High     | Common correctness failure or crash, persistent corruption, core-flow failure, unsafe recovery, serious resource leak, or security defect with realistic reachability |
| Medium   | Reachable defect with bounded impact, incomplete recovery or error handling, or important missing behaviour                                                            |
| Low      | Concrete uncommon defect or defensive gap with limited impact                                                                                                         |
| Nitpick  | No meaningful runtime or operational impact                                                                                                                           |

Use one finding per root cause. Do not split one defect into many comments.
Do not combine unrelated defects into one finding.
Do not report a finding only because an implementation differs from a
preferred pattern.

---

## 11. Review Report Format

Use this exact order.

```md
## Verdict

**Status:** Ready | Not Ready | Needs Verification
**Confidence:** High | Medium | Low
**Mergeable:** Yes | No | Unknown
**CI verification:** Passing | Failing | Pending | Inconclusive

## Change inventory

| Area | Changed contract | Risk | Required verification | Result |
| ---- | ---------------- | ---- | --------------------- | ------ |

## Findings

### [Critical|High|Medium|Low] Title

**Location:** `path/to/file.ext`, Line N
**Diff cause:** [What this pull request changed.]
**Evidence:** [Code trace, test result, CI output, or reproduction.]
**Reachable scenario:** [Input, persisted state, event sequence, or platform.]
**Impact:** [Concrete consequence.]
**Required change:** [Minimal safe remediation.]
**Verification:** [Specific test, scenario, or command.]

## Missing test coverage

- [Changed contract]: [smallest test that proves it].

## Verification performed

| Check | Status | Evidence |
| ----- | ------ | -------- |

## Correct behaviour confirmed

- [Contract]: [Evidence and scope.]

## Assumptions and unknowns

- [What could not be verified and why.]
```

If no findings remain, state: `No validated findings.`
Do not add empty severity or finding sections.
Do not list an assumption as a finding.

---

## 12. Completion Rules

A review is **Ready** only when:

- No unresolved Critical, High, or Medium findings remain.
- Every Critical and High risk changed contract has direct evidence or a
  documented, justified indirect evidence path.
- Required verification is Passed or explicitly Not applicable.
- Required boundary traces are complete.
- The report distinguishes verified facts from assumptions and unknowns.

A review is **Needs Verification** when code analysis is complete but required
execution evidence is pending, unavailable, or inconclusive.

A review is **Not Ready** when a validated finding blocks safe merge.

Confidence measures evidence quality, not reviewer certainty. A reviewer must
not claim high confidence without completing every relevant verification step.

| Confidence | Meaning                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| High       | Required traces and verification are complete.                                    |
| Medium     | Code analysis is complete, but limited verification or platform coverage remains. |
| Low        | Important inputs, traces, or verification are unavailable.                        |

---

## 12.1 Fast Path: Low-Risk, Documentation-Only Changes

When every inventory record is Low risk and no changed file affects an
operational contract (no code, tests, workflows, manifests, lockfiles,
configuration, or documented commands), the review may use this minimum form.
If any record exceeds Low risk, run the full procedure.

Required steps:

1. Read the complete diff.
2. Confirm the change inventory contains only Low risk records, and record
   why (for example: prose-only edits under `docs/kb/`).
3. Check that changed prose does not alter a documented command, path,
   contract, or security statement. A docs change that edits an operational
   instruction is not docs-only. Reclassify it and run the full procedure.
4. Run the relevant check (`npx tsc --noEmit` on changed files, or record why
   it is not applicable).

Minimum report:

```md
## Verdict

**Status:** Ready | Not Ready
**Confidence:** High | Medium | Low
**Mergeable:** Yes | No | Unknown
**CI verification:** Passing | Failing | Pending | Inconclusive

## Change inventory

One line per file: path, "docs-only", Low, and the reason.

## Findings

`No validated findings.` or the standard finding format.

## Verification performed

| Check      | Status                          | Evidence                   |
| ---------- | ------------------------------- | -------------------------- |
| Type check | Passed / Failed / Not run / N/A | Exact command and head SHA |
```

The fast path never applies to changes touching `AGENTS.md`, `REVIEW.md`,
this file, Tauri configuration, capabilities, workflows, or anything listed
Critical or High in Section 3.2.

---

# Part II — Project Risk Catalog

Use this catalog only after Phase 0 selects a relevant module. These checks
distill the architectural contracts, security boundaries, and recurring
findings for the Skilltastic Rust (Tauri) backend and React/TypeScript
frontend. A catalog match is a review prompt, not a finding. Apply the
Phase 7 validation gate to anything it surfaces.

## 13. Rust (Tauri) Backend

### 13.1 Skill directory moves and deletes

**Traps:** a lexical `starts_with(skills_root)` check loses to `..` and
symlinks; validating the input string but operating on the raw input resolves
against the wrong directory; an un-canonicalized root makes every comparison
fail silently; `set_skill_enabled` disabling a skill in the shared
`~/.agents/skills` folder also disables it for every other tool that reads that
folder, so the warning contract matters.

**Pattern:** canonicalize both the file's parent and the target root before
comparing; reject symlinks at the final component via `symlink_metadata` (allow
not-yet-existing destinations); always operate on the canonical `PathBuf` the
validator returns, never the raw string; for enable/disable, move the folder to
the sibling `.disabled/` directory under the same parent only.

### 13.2 Delete and partial-write safety

**Traps:** `delete_skill` following a symlink out of the managed root; a partial
write leaving a half-written `SKILL.md`; concurrent delete racing a read.

**Pattern:** canonicalize before delete and forbid symlink final components;
write to a temp file then rename into place for edits; never delete outside
`skills_roots`.

### 13.3 Invoke boundaries (no generated bindings)

**Traps:** a Rust command reading an arbitrary path because validation was
skipped; the TypeScript `invoke` payload drifting from the `#[tauri::command]`
signature (Skilltastic has no generated bindings, so this is hand-maintained);
exposing a command to remote content via capabilities.

**Pattern:** validate every untrusted field at the Rust boundary; keep
`src/api/skills.ts`, `src/api/projects.ts`, and `src/api/runtime.ts` in sync
with the command signatures by hand; register every command in the invoke
handler; keep capabilities minimal and `remote.urls` empty.

### 13.4 Project discovery and persistence

**Traps:** `detect.rs` walking large home-directory trees on the UI thread;
`projects.rs` writing a tracked-projects file that gets corrupted or duplicated
on concurrent writes; a stored absolute path that becomes invalid after the
user moves a folder.

**Pattern:** keep discovery behind `invoke` (already async); dedupe by canonical
path; treat a missing or stale project path as gracefully degraded (greyed out),
not a crash; write the persisted projects file atomically.

### 13.5 Concurrency and async

**Traps:** two overlapping skill reloads where the older response overwrites
newer data; state set after unmount; filesystem watchers or listeners that are
never removed.

**Pattern:** use a generation counter or `AbortController` in the skill-list and
project hooks; return cleanup from effects that bumps the generation and clears
timers; cancel in-flight discovery when the picker closes.

## 14. TypeScript and React Frontend

### 14.1 Hooks and StrictMode

Never assign `ref.current` or set state during render. StrictMode double-renders
and corrupts it. Build a ref-guarded controller once
(`if (!ref.current) ref.current = new Controller(options)`) but note it freezes
later `options` (for example timeout). Do setup in `useEffect`, and pass dynamic
config as call arguments. Skilltastic animates with `motion` and `morphicons`,
so guard animation controllers the same way.

### 14.2 Async state and races

Two overlapping reloads can let the older response overwrite newer data; state
set after unmount leaks. Use a monotonic generation counter in an async
controller (in `useGlobalSkills`, `useProjectSkills`, `useManualOrder`): increment
on each `run`, and bail out of every completion, error, timeout, and cleanup path
whose generation no longer matches. Return a teardown from `useEffect` that
increments the generation and clears timers.

### 14.3 Invoke client

Never hand-edit the Rust side to match a changed TypeScript call without updating
the call site, and vice versa. `src/api/*` is the single invoke surface; keep its
types in sync with the commands.

### 14.4 UI state correctness

Traps: drag-reorder writing an unstable key so React remounts rows and loses
animation state; pin or view-toggle state lost on reload because it is not
persisted; `morphicons`/`motion` buttons animating from a stale layout.

Pattern: use `stableSkillKey` for list keys; persist manual order and pins;
animate from the measured layout; give every control an accessible name.

### 14.5 Accessibility

Pin, plus, and command controls need accessible names; the sidebar reorder must
be keyboard operable or at least not trap focus; the rolling on/off readout under
a skill switch must be announced to assistive tech.

## 15. CI and Release

- Package manager is `npm`, not `pnpm`. Lockfile is `package-lock.json`. There is
  no Turborepo or workspace setup; the repo is a single package.
- CI (`ci.yml`) runs on `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run build`,
  and the Rust gates (`cargo fmt --check`, `cargo clippy -D warnings`,
  `cargo test --lib`) on `ubuntu-22.04` with the Tauri Linux system deps.
- `release.yml` triggers on `v*` tags, builds macOS (universal), Windows, and
  Linux via `tauri-action`, and creates a draft release. Builds are unsigned by
  design. Do not add signing secrets silently.
- `secret-scan.yml` runs gitleaks on PR and push ranges and the working tree, and
  self-tests the detector. Keep `gitleaks.toml` in sync with new build trees.
- Version is duplicated across `package.json`, `package-lock.json`,
  `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and
  `docs/index.html`. Update all by hand (see `AGENTS.md`).

---

# Part III — Operational Changes and Automation Backlog

These are the repository changes that make the procedure repeatable. They are
not findings against a single PR.

- `secret-scan.yml` and `gitleaks.toml` now exist (mirrors mausVoice PR #63): they
  scan PR and push ranges and the working tree, and self-test the detector.
  Keep the `gitleaks.toml` allowlist in sync with any new build trees.
- Add a Windows and macOS CI matrix only if a platform-specific defect is found
  that `ubuntu-22.04` cannot catch. The three-platform build is already covered
  by `release.yml`.
- Add an integration test job that mounts the Tauri app against a temp
  `SKILL.md` tree and exercises enable/disable/delete with traversal and
  symlink payloads.
- Keep `FULL-REVIEW.md` Part II in sync with new adapters in
  `src-tauri/src/skills/` and new commands in `src-tauri/src/commands/`.

---

# Part IV — External References (non-normative)

This protocol builds on four review skills. They are optional accelerators,
not a substitute for Part I.

- **CodeRabbit CLI review skill** — automated line-level review; useful for a
  first pass before the human reviewer reads the diff.
- **Two-axis Standards/Spec review skill** — checks the change against the
  stated spec and the repo's conventions (our `AGENTS.md` and `docs/kb/`).
- **Iterative review-loop skill** — drives the repeat-up-to-three-times gate
  from Part I Section 9 until the output is issue-free.
- **Multi-axis code-review-and-quality skill** — broad correctness, security,
  and quality sweep across the changed surface.

If guidance from a skill conflicts with Part I or `AGENTS.md`, Part I and
`AGENTS.md` take precedence.
