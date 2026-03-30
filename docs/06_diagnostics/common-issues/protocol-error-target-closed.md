# Protocol Error: Target Closed

## Cause

The browser process crashed immediately after launch.

## Fix

- Check memory pressure and OOM events.
- In Docker, increase shared memory:

```bash
docker run --shm-size=1gb ...
```

- Run:

```bash
printeer doctor --verbose
```

Review crash details from the diagnostic output.
