# Blank PDF or Missing Text

## Cause

Fonts are not available or web fonts did not finish loading before print.

## Fix

- Run diagnostics and verify font checks:

```bash
printeer doctor
```

- Wait until network is idle so remote fonts can load:

```bash
printeer convert https://example.com out.pdf --wait-until networkidle0
```
