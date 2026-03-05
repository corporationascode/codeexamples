# Operations

This directory contains operation types that can be executed against entities in the corporate group. Each operation type has its own subdirectory with:

```
operations/
└── {operation-type}/
    ├── README.md              # Operation description, parameters, usage
    ├── TEMPLATE.md            # Document format specification
    ├── generate-*.js          # Generation script(s)
    └── tests/
        └── validate-*.js      # Validation tests
```

**Note:** Generated documents are stored in `minute-books/{entity-id}/` (per-entity), not here.

## Available Operations

| Operation | Description | Status |
|-----------|-------------|--------|
| [share-certificates](./share-certificates/) | Issue share certificates for shareholders | Active |
| [director-appointments](./director-appointments/) | Board resolutions for appointing directors | Active |
| [governance-transition](./governance-transition/) | Transition governance roles between persons (resignation + appointment) | Active |

## How Operations Work

Operations in Corporation as Code follow this pattern:

1. **Validate**: Run tests to verify preconditions (e.g., shares don't exceed authorized)
2. **Generate**: Create draft documents in `operations/{name}/output/` with `_for-execution` suffix
3. **Review**: Lawyer reviews drafts before execution
4. **Apply**: Execute operation - updates data (with backups) and moves finals to `minute-books/`
5. **Rollback**: If needed, revert all changes with a single command

## Operation Structure

Each operation must include:

```
operations/{operation-name}/
├── README.md              # Usage documentation
├── DEMO.md                # Copy-paste commands for demo/execution
├── TEMPLATE-*.md          # Document format specifications
├── generate-*.js          # Generation script(s)
├── tests/
│   └── validate-*.js      # Business rule validation
└── output/                # Generated drafts (gitignored)
```

## Rollback Requirement

**Every operation that modifies data must have a documented rollback command.**

This allows lawyers to:
- Review what the rollback will affect before approving
- Easily revert if issues are discovered post-execution

Standard rollback command pattern:
```bash
# Preview
node lib/history-cli.js rollback-operation {operation-name}

# Execute
node lib/history-cli.js rollback-operation {operation-name} --force
# rebuild person derived data
# rebuild viewer
```

The `rollback-operation` command:
1. Finds all changelog entries for the operation
2. Restores each entity to its pre-operation state
3. Deletes generated documents from `minute-books/`
4. Removes incoming persons if they have no remaining roles

## Running an Operation

Each operation should have a `DEMO.md` with copy-paste commands. Standard workflow:

```bash
# 1. Validate preconditions
node operations/{name}/tests/validate-*.js [params]

# 2. Generate drafts (no data changes)
node operations/{name}/generate-*.js [params]

# 3. Review drafts in operations/{name}/output/

# 4. Apply (updates data, moves docs to minute-books)
node operations/{name}/generate-*.js [params] --apply

# 5. Refresh viewer
# rebuild viewer

# 6. Rollback if needed
node lib/history-cli.js rollback-operation {name} --force
# rebuild person derived data
# rebuild viewer
```

## Future Operations

Potential additions:
- `director-resolutions` - Board resolutions for corporate actions
- `shareholder-resolutions` - Written resolutions of shareholders
- `share-transfers` - Transfer of shares between parties
- `officer-appointments` - Appointment/resignation of officers
- `annual-filings` - Annual return preparation
- `dividend-declarations` - Dividend declaration documents
