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
