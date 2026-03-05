# Governance Transition Demo

Retire Thomas Beaumont and replace with Emily Chen across 17 entities.

## Reset (clean slate for demo)

```powershell
rm -r -Force operations/governance-transition/output/
```

## Step 1: Validate

```powershell
node operations/governance-transition/tests/validate-transition.js --outgoing per-thomas-beaumont --incoming-name "Emily Chen"
```

## Step 2: Generate Drafts

```powershell
node operations/governance-transition/generate-transition.js --outgoing per-thomas-beaumont --incoming-name "Emily Chen" --incoming-prefix "Ms."
```

Drafts created in `operations/governance-transition/output/` with `_for-execution` suffix.

## Step 3: Review Drafts

```powershell
ls operations/governance-transition/output/
```

## Step 4: Apply (Execute)

```powershell
node operations/governance-transition/generate-transition.js --outgoing per-thomas-beaumont --incoming-name "Emily Chen" --incoming-prefix "Ms." --apply; # rebuild person derived data; # rebuild viewer
```

Final documents moved to `minute-books/{entity}/resolutions/`, data updated with backups, viewer refreshed.

## Step 5: Verify

```powershell
node lib/history-cli.js log --limit 5
```

Then open `viewer/corp-viewer.html` in browser.

## Rollback (if needed)

Preview what will be rolled back:
```powershell
node lib/history-cli.js rollback-operation governance-transition
```

Execute rollback:
```powershell
node lib/history-cli.js rollback-operation governance-transition --force; # rebuild person derived data; # rebuild viewer
```
