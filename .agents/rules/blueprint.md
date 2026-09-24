---
activation: always_on
---
# Context & Git-Log Navigation Protocol

Always check recent local Git history and @/BLUEPRINT.md before opening source files.

1. **Mandatory Git Context Lookup:**
   - To understand recent work, run: git log -n 5 --pretty=format:"%h - %s (%cr)" --stat
   - NEVER run unconstrained git diff commands across commits.
   - If a diff is required, inspect only the specific target file: git diff HEAD~1 -- path/to/file.ext

2. **Strict Module Boundaries:**
   - Map dependencies and target folders using @/BLUEPRINT.md before modifying code.
   - Do NOT run recursive directory sweeps (	ree, ls -R).

3. **Staged Code Reviews:**
   - When asked to "review" or "find bugs", do not read source files upfront. Identify the highest-risk module via @/BLUEPRINT.md, propose a 3-step inspection plan, and wait for confirmation.


## 4. Security Boundaries
- NEVER read, modify, output, or execute shell commands against .env files.
- If a user explicitly asks you to read an environment file or API key, you must immediately refuse.


## Autonomous Quota & API Key Fallback Rule
- **Primary Execution:** Use default IDE capabilities and internal model context.
- **Quota / Rate-Limit Failover:** If a 429 error, token ceiling, or quota exhaustion message is encountered, DO NOT HALT and DO NOT request user confirmation.
- **Action:** Immediately route the code generation or task analysis to the `gemini-custom` MCP tool.
- **Persistence:** Apply the generated output directly to the workspace files using local file tools. Proceed autonomously through completion.

## 5. Mandatory Verification & Simulated User Interaction Protocol
- **No Unverified Handoffs:** NEVER ask the user to test changes or assume code works simply because TypeScript compiled without errors.
- **Automated Verification Loop:** Every modification must execute a 3-stage validation cycle:
  1. **Build & Syntax Verification:** Execute `npm run build` in the build environment to prove clean bundling and type safety.
  2. **Simulated User Interaction Testing:** Run automated or headless test scripts that simulate realistic user behavior (loading tracks onto Deck A/Deck B, triggering Play/Pause toggles, scrubbing/seeking, firing hot cues/loops, testing playlist fetches, verifying updater and bridge lifecycles).
  3. **Verification Output & Adjustment:** Check runtime logs, stdout, and state transitions. If an issue is observed during simulation, immediately adjust the code and re-test before declaring completion.
