# Phase 1.2: Secure Command Execution - Implementation Plan

## Goal Description
Ensure the Agent only executes authorized commands and prevents command injection attacks.

## Current State Analysis
The current `agent/agent.py` uses an `if/elif` block to map `command_key` to specific `subprocess` calls.
- **Pros:** Highly secure as arguments are hardcoded.
- **Cons:** Hard to maintain as list grows.
- **Vulnerability Check:** Windows commands use `powershell -Command "string"`. Since "string" is currently hardcoded, it is safe. If we ever accept user arguments, we must sanitize them.

## Proposed Changes

### Agent (Python)
#### [MODIFY] [agent.py](file:///d:/Business/arushi-cloud/agent/agent.py)
- Refactor the `if/elif` block into a `COMMAND_HANDLERS` dictionary for better maintainability.
- Explicitly define a `run_safe_command` helper that enforces `shell=False`.
- Add a "Strict Mode" check: If a command is not in the whitelist, log a security warning.

## Verification Plan

### Automated Tests
- **Positive Test:** Run `ping_google` and verify output.
- **Negative Test:** Send a made-up command `rm -rf /` and verify it returns "Unknown command" or "Access Denied".
- **Injection Test:** (Hypothetical) If we allowed parameters, we would try `8.8.8.8; whoami`. Since we don't, we verify the architecture doesn't allow it.

### Manual Verification
- Review code to ensure no `os.system` or `shell=True` exists.
