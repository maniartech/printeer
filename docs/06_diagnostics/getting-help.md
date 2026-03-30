# Getting Help

If doctor passes but you still have rendering issues:

1. Run with verbose diagnostics:

```bash
printeer doctor --verbose
```

2. Enable Chrome process logging:

```bash
PRINTEER_DUMPIO=1 printeer convert https://example.com out.pdf
```

3. Share a JSON diagnostic report in bug reports:

```bash
printeer doctor --json > report.json
```
