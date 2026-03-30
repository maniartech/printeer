# Navigation Timeout

## Cause

The target page took too long to satisfy the selected wait condition.

## Fix

- Increase timeout:

```bash
printeer convert https://example.com out.pdf --wait-timeout 60000
```

- Use a looser wait condition:

```bash
printeer convert https://example.com out.pdf --wait-until load
```

- Verify URL reachability from the runtime environment (DNS, firewall, proxy).
