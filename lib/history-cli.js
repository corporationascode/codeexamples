#!/usr/bin/env node
/**
 * History CLI - View changelog and manage backups
 *
 * Usage:
 *   node lib/history-cli.js log                     # View recent changelog entries
 *   node lib/history-cli.js log --id <entity-id>   # Filter by entity/person ID
 *   node lib/history-cli.js log --operation <op>   # Filter by operation type
 *   node lib/history-cli.js backups                 # List all backups
 *   node lib/history-cli.js backups --id <id>      # List backups for specific ID
 *   node lib/history-cli.js show <backup-file>     # Show backup content
 *   node lib/history-cli.js rollback <backup-file> # Rollback to a backup
 *   node lib/history-cli.js diff <backup-file>     # Show diff between backup and current
 */

const dataOps = require('./data-ops');
const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Format timestamp for display
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

// Show changelog entries
function showLog(args) {
  const filter = {};

  const idIdx = args.indexOf('--id');
  if (idIdx >= 0 && args[idIdx + 1]) {
    filter.id = args[idIdx + 1];
  }

  const opIdx = args.indexOf('--operation');
  if (opIdx >= 0 && args[opIdx + 1]) {
    filter.operation = args[opIdx + 1];
  }

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1]) : 20;

  const entries = dataOps.readChangelog(filter);

  if (entries.length === 0) {
    console.log('\nNo changelog entries found.\n');
    return;
  }

  // Show most recent first, limited
  const toShow = entries.slice(-limit).reverse();

  console.log(`\n${c('bright', 'Changelog')} (showing ${toShow.length} of ${entries.length} entries)\n`);
  console.log('─'.repeat(80));

  for (const entry of toShow) {
    console.log(`${c('cyan', formatTimestamp(entry.timestamp))}`);
    console.log(`  ${c('bright', entry.operation)} on ${entry.data_type} ${c('yellow', entry.id)}`);
    if (entry.description) {
      console.log(`  ${entry.description}`);
    }
    console.log(`  ${c('dim', `Backup: ${entry.backup_file}`)}`);
    console.log('─'.repeat(80));
  }
  console.log('');
}

// List backups
function showBackups(args) {
  const filter = {};

  const idIdx = args.indexOf('--id');
  if (idIdx >= 0 && args[idIdx + 1]) {
    filter.id = args[idIdx + 1];
  }

  const typeIdx = args.indexOf('--type');
  if (typeIdx >= 0 && args[typeIdx + 1]) {
    filter.dataType = args[typeIdx + 1];
  }

  const backups = dataOps.listBackups(filter);

  if (backups.length === 0) {
    console.log('\nNo backups found.\n');
    return;
  }

  console.log(`\n${c('bright', 'Available Backups')} (${backups.length} total)\n`);
  console.log('─'.repeat(90));
  console.log(`${c('dim', 'Timestamp'.padEnd(25))}  ${'Type'.padEnd(10)}  ${'ID'.padEnd(40)}  Filename`);
  console.log('─'.repeat(90));

  for (const backup of backups) {
    const ts = backup.timestamp.substring(0, 19);
    console.log(`${ts.padEnd(25)}  ${backup.dataType.padEnd(10)}  ${backup.id.padEnd(40)}  ${c('dim', backup.filename)}`);
  }

  console.log('─'.repeat(90));
  console.log('');
}

// Show backup content
function showBackup(args) {
  const filename = args[0];
  if (!filename) {
    console.error('Error: Please specify a backup filename');
    process.exit(1);
  }

  try {
    const data = dataOps.getBackup(filename);
    console.log(`\n${c('bright', 'Backup:')} ${filename}\n`);
    console.log(JSON.stringify(data, null, 2));
    console.log('');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Show diff between backup and current
function showDiff(args) {
  const filename = args[0];
  if (!filename) {
    console.error('Error: Please specify a backup filename');
    process.exit(1);
  }

  try {
    // Parse filename to get type and ID (timestamp may include milliseconds and Z)
    const match = filename.match(/^[\d\-T]+Z?_(entities|persons)_(.+)\.json$/);
    if (!match) {
      throw new Error('Invalid backup filename format');
    }

    const dataType = match[1];
    const id = match[2];

    const backupData = dataOps.getBackup(filename);
    const currentData = dataType === 'entities'
      ? dataOps.loadEntity(id)
      : dataOps.loadPerson(id);

    console.log(`\n${c('bright', 'Diff:')} ${filename} vs current\n`);

    // Simple diff - show keys that differ
    const allKeys = new Set([...Object.keys(backupData), ...Object.keys(currentData)]);

    for (const key of allKeys) {
      const backupVal = JSON.stringify(backupData[key]);
      const currentVal = JSON.stringify(currentData[key]);

      if (backupVal !== currentVal) {
        console.log(`${c('yellow', key)}:`);
        if (backupData[key] === undefined) {
          console.log(`  ${c('green', '+ Added')}`);
        } else if (currentData[key] === undefined) {
          console.log(`  ${c('red', '- Removed')}`);
        } else {
          console.log(`  ${c('red', '- Backup:')} ${backupVal.substring(0, 100)}${backupVal.length > 100 ? '...' : ''}`);
          console.log(`  ${c('green', '+ Current:')} ${currentVal.substring(0, 100)}${currentVal.length > 100 ? '...' : ''}`);
        }
      }
    }

    console.log('');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Rollback to a backup
function doRollback(args) {
  const filename = args[0];
  if (!filename) {
    console.error('Error: Please specify a backup filename');
    process.exit(1);
  }

  const force = args.includes('--force');

  if (!force) {
    console.log(`\n${c('yellow', 'Warning:')} This will restore data from backup: ${filename}`);
    console.log('Current data will be backed up before restoration.');
    console.log(`\nRun with ${c('bright', '--force')} to proceed.\n`);
    return;
  }

  try {
    const result = dataOps.rollback(filename, {
      description: `Manual rollback via CLI to ${filename}`
    });

    console.log(`\n${c('green', 'Rollback successful!')}`);
    console.log(`  Restored from: ${result.restoredFrom}`);
    console.log(`  Previous state backed up to: ${result.previousState}`);
    console.log('');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Rollback all changes for an operation
function doRollbackOperation(args) {
  const opIdx = args.indexOf('--operation');
  const operation = opIdx >= 0 ? args[opIdx + 1] : args[0];

  if (!operation) {
    console.error('Error: Please specify an operation name');
    console.error('Usage: node lib/history-cli.js rollback-operation --operation <name> [--force]');
    process.exit(1);
  }

  const force = args.includes('--force');

  // Find all changelog entries for this operation
  const entries = dataOps.readChangelog({ operation });

  if (entries.length === 0) {
    console.log(`\nNo changelog entries found for operation: ${operation}\n`);
    return;
  }

  // Get unique backup files and dates per entity
  const backupsByEntity = {};
  const datesByEntity = {};
  for (const entry of entries) {
    if (entry.backup_file) {
      // Keep the FIRST backup for each entity - that is the pre-operation state.
      // Later entries for the same entity reflect mid-operation snapshots.
      if (!backupsByEntity[entry.id]) backupsByEntity[entry.id] = entry.backup_file;
      // Extract date from changes or timestamp
      if (entry.changes && entry.changes.effective_date && !datesByEntity[entry.id]) {
        datesByEntity[entry.id] = entry.changes.effective_date;
      }
    }
  }

  const backupFiles = Object.values(backupsByEntity);

  console.log(`\n${c('bright', 'Rollback Operation:')} ${operation}`);
  console.log(`Found ${backupFiles.length} entities to rollback:\n`);

  for (const id of Object.keys(backupsByEntity)) {
    console.log(`  - ${id}`);
  }

  if (!force) {
    console.log(`\n${c('yellow', 'Warning:')} This will restore all entities to their pre-operation state.`);
    console.log(`This will also delete generated documents from minute-books.`);
    console.log(`Run with ${c('bright', '--force')} to proceed.\n`);
    return;
  }

  console.log('\nRolling back data...\n');

  let success = 0;
  let failed = 0;

  for (const backupFile of backupFiles) {
    try {
      const result = dataOps.rollback(backupFile, {
        description: `Rollback operation: ${operation}`
      });
      console.log(`  ${c('green', '✓')} ${result.restoredFrom}`);
      success++;
    } catch (err) {
      console.log(`  ${c('red', '✗')} ${backupFile}: ${err.message}`);
      failed++;
    }
  }

  // Clean up generated documents from minute-books
  console.log('\nCleaning up documents...\n');
  const ROOT_DIR = path.resolve(__dirname, '..');
  const MINUTE_BOOKS_DIR = path.join(ROOT_DIR, 'minute-books');
  const DATA_DIR = path.join(ROOT_DIR, 'data');
  let docsDeleted = 0;

  for (const entityId of Object.keys(backupsByEntity)) {
    const resolutionsDir = path.join(MINUTE_BOOKS_DIR, entityId, 'resolutions');
    if (fs.existsSync(resolutionsDir)) {
      const effectiveDate = datesByEntity[entityId];
      const files = fs.readdirSync(resolutionsDir);

      for (const file of files) {
        // Delete files matching the operation's effective date.
        // NOTE: if effective_date was not recorded in the changelog entry,
        // effectiveDate will be undefined and ALL resignation/appointment
        // docs for this entity will be deleted. Ensure operations always
        // write effective_date into their changelog changes to avoid this.
        const shouldDelete = !effectiveDate || file.includes(effectiveDate);
        if (shouldDelete && (file.includes('_resignation_') || file.includes('_appointment_'))) {
          fs.unlinkSync(path.join(resolutionsDir, file));
          console.log(`  ${c('green', '✓')} Deleted: ${entityId}/resolutions/${file}`);
          docsDeleted++;
        }
      }
    }
  }

  // Check if incoming person(s) should be deleted (created for this operation, now has no roles)
  const incomingPersons = new Set();
  for (const entry of entries) {
    if (entry.changes && entry.changes.incoming && entry.changes.incoming.person_id) {
      incomingPersons.add(entry.changes.incoming.person_id);
    }
  }

  let personsDeleted = 0;
  for (const personId of incomingPersons) {
    const personFile = path.join(DATA_DIR, 'persons', `${personId}.json`);
    if (fs.existsSync(personFile)) {
      // Check if person has any remaining roles in entity files
      let hasRoles = false;
      const entitiesDir = path.join(DATA_DIR, 'entities');
      for (const file of fs.readdirSync(entitiesDir)) {
        if (!file.endsWith('.json')) continue;
        const entity = JSON.parse(fs.readFileSync(path.join(entitiesDir, file), 'utf8'));
        const gov = entity.governance || {};
        const activeDirector = (gov.directors || []).some(d => d.person_id === personId && d.status === 'active');
        const activeOfficer = (gov.officers || []).some(o => o.person_id === personId && o.status === 'active');
        if (activeDirector || activeOfficer) {
          hasRoles = true;
          break;
        }
      }

      if (!hasRoles) {
        // Delete person file
        fs.unlinkSync(personFile);
        console.log(`  ${c('green', '✓')} Deleted person: ${personId}`);

        // Remove from group.json
        const groupFile = path.join(DATA_DIR, 'group.json');
        const group = JSON.parse(fs.readFileSync(groupFile, 'utf8'));
        group.persons = group.persons.filter(p => p.id !== personId);
        fs.writeFileSync(groupFile, JSON.stringify(group, null, 2));

        personsDeleted++;
      }
    }
  }

  console.log(`\n${c('bright', 'Summary:')}`);
  console.log(`  Entities rolled back: ${success}`);
  console.log(`  Documents deleted: ${docsDeleted}`);
  if (personsDeleted > 0) console.log(`  Persons deleted: ${personsDeleted}`);
  if (failed > 0) console.log(`  Failed: ${failed}`);
  console.log(`\n${c('yellow', 'Remember:')} Run ${c('bright', '# rebuild person derived data')} to update derived data.\n`);
}

// Main CLI
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help') {
    console.log(`
${c('bright', 'History CLI')} - View changelog and manage backups

${c('cyan', 'Usage:')}
  node lib/history-cli.js <command> [options]

${c('cyan', 'Commands:')}
  log                        View recent changelog entries
    --id <id>                Filter by entity/person ID
    --operation <op>         Filter by operation type
    --limit <n>              Number of entries to show (default: 20)

  backups                    List all backups
    --id <id>                Filter by entity/person ID
    --type <type>            Filter by type (entities/persons)

  show <backup-file>         Show backup content

  diff <backup-file>         Show diff between backup and current state

  rollback <backup-file>     Rollback to a specific backup
    --force                  Actually perform the rollback

  rollback-operation <name>  Rollback all changes for an operation
    --force                  Actually perform the rollback

${c('cyan', 'Examples:')}
  node lib/history-cli.js log
  node lib/history-cli.js log --id ent-artisan-bakery-co
  node lib/history-cli.js backups --id ent-artisan-bakery-co
  node lib/history-cli.js diff 2026-01-12T10-30-00_entities_ent-artisan-bakery-co.json
  node lib/history-cli.js rollback 2026-01-12T10-30-00_entities_ent-artisan-bakery-co.json --force
`);
    process.exit(0);
  }

  const subArgs = args.slice(1);

  switch (command) {
    case 'log':
      showLog(subArgs);
      break;
    case 'backups':
      showBackups(subArgs);
      break;
    case 'show':
      showBackup(subArgs);
      break;
    case 'diff':
      showDiff(subArgs);
      break;
    case 'rollback':
      doRollback(subArgs);
      break;
    case 'rollback-operation':
      doRollbackOperation(subArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run with --help for usage information.');
      process.exit(1);
  }
}

main();
