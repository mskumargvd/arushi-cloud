# Phase 2.1: OS Detector Module - Implementation Plan

## Goal Description
Refactor the Agent into a class-based structure to automatically detect the OS and load the appropriate command logic (Windows vs. Linux vs. OPNsense).

## Current State Analysis
Currently, `main.py` uses `platform.system()` checks inside every handler function. This is not scalable.
We need a polymorphic structure where `agent.get_system_stats()` or `agent.execute_command()` behaves differently based on the subclass.

## Proposed Changes

### Agent (Python)
#### [MODIFY] [main.py](file:///d:/Business/arushi-cloud/agent/main.py)
- Define `BaseAgent` class with common methods:
    - `connect()`
    - `heartbeat_loop()`
    - `execute_command(cmd)` (Abstract)
    - `get_stats()` (Abstract)
- Define `WindowsAgent(BaseAgent)`:
    - Implements Windows-specific PowerShell commands.
- Define `LinuxAgent(BaseAgent)`:
    - Implements standard Linux commands (`uptime`, `tail`).
- Define `OPNsenseAgent(LinuxAgent)`:
    - Inherits from Linux but overrides specific commands like `pkg update` or firewall log checks.
- Create a factory function `get_agent_for_os()` that returns the correct instance.

## Verification Plan

### Automated Tests
- **Unit Test:** Verify `get_agent_for_os()` returns `WindowsAgent` on Windows and `LinuxAgent` on Linux.
- **Functional Test:** Run the agent on the current Windows machine and ensure it still reports stats and executes commands correctly using the new class structure.

### Manual Verification
- Check logs to see "Initializing WindowsAgent..."
