# Phase 2.2: OPNsense Specifics - Implementation Plan

## Goal Description
Implement OPNsense-specific functionality using the OPNsense API and system commands.

## Proposed Changes

### Agent (Python)
#### [MODIFY] [agent.py](file:///d:/Business/arushi-cloud/agent/agent.py)
- Update `OPNsenseAgent` class.
- Add configuration for `OPNSENSE_KEY` and `OPNSENSE_SECRET`.
- Implement `execute_command` handlers for:
    - `get_firewall_logs`: Fetch from `/api/diagnostics/log/core/firewall`.
    - `backup_config`: Fetch from `/api/core/backup/download`.
    - `pkg_update`: Keep using `pkg update` via subprocess.

## Verification Plan

### Manual Verification
- Since we don't have a live OPNsense box, we will simulate the API response or ensure the code structure is correct.
- On Windows (current env), these commands will fall back to the `BaseAgent` or `LinuxAgent` behavior if not overridden, or we can mock them for testing.
