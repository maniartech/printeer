# EACCES: Permission Denied

## Cause

Printeer cannot write to the target output path.

## Fix

- Ensure the executing user has write permission.
- In containers, verify host volume mount ownership and permissions.
- Try a known writable output directory.
