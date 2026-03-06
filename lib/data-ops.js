/**
 * Data Operations Library
 *
 * Provides safe data operations with automatic backup and changelog.
 * All modifications to entity/person data should go through this module.
 *
 * Features:
 * - Automatic backup before any modification
 * - Append-only changelog (JSONL format)
 * - Rollback capability
 * - Audit trail with timestamps and operation metadata
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const HISTORY_DIR = path.join(DATA_DIR, '_history');
const SNAPSHOTS_DIR = path.join(HISTORY_DIR, 'snapshots');
const CHANGELOG_FILE = path.join(HISTORY_DIR, 'changelog.jsonl');

// Ensure history directories exist
function ensureHistoryDirs() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

// Generate ISO timestamp for filenames (filesystem-safe)
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Generate ISO timestamp for changelog entries
function getISOTimestamp() {
  return new Date().toISOString();
}

// Explicit map from plural data-type directory names to singular form for changelog
const DATA_TYPE_SINGULAR = {
  entities: 'entity',
  persons: 'person'
};

/**
 * Load an entity by ID
 */
function loadEntity(entityId) {
  const filePath = path.join(DATA_DIR, 'entities', `${entityId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Entity not found: ${entityId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Load a person by ID
 */
function loadPerson(personId) {
  const filePath = path.join(DATA_DIR, 'persons', `${personId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Person not found: ${personId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Create a backup of a file before modification
 * Returns the backup file path
 */
function createBackup(dataType, id) {
  ensureHistoryDirs();

  const sourceFile = path.join(DATA_DIR, dataType, `${id}.json`);
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Cannot backup - file not found: ${sourceFile}`);
  }

  const timestamp = getTimestamp();
  const backupFilename = `${timestamp}_${dataType}_${id}.json`;
  const backupPath = path.join(SNAPSHOTS_DIR, backupFilename);

  // Copy the file
  fs.copyFileSync(sourceFile, backupPath);

  return backupFilename;
}

/**
 * Append an entry to the changelog
 */
function appendChangelog(entry) {
  ensureHistoryDirs();

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(CHANGELOG_FILE, line);
}

/**
 * Save an entity with automatic backup and changelog
 *
 * @param {string} entityId - Entity ID
 * @param {object} newData - New entity data to save
 * @param {object} options - Operation metadata
 * @param {string} options.operation - Operation name (e.g., 'director-appointment')
 * @param {string} options.description - Human-readable description of change
 * @param {object} options.changes - Structured description of what changed
 * @param {string} [options.user] - User/system that made the change
 */
function saveEntity(entityId, newData, options = {}) {
  const filePath = path.join(DATA_DIR, 'entities', `${entityId}.json`);

  // Create backup first
  const backupFile = createBackup('entities', entityId);

  // Save new data
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

  // Append to changelog
  const changelogEntry = {
    timestamp: getISOTimestamp(),
    operation: options.operation || 'unknown',
    data_type: 'entity',
    id: entityId,
    description: options.description || '',
    changes: options.changes || {},
    user: options.user || 'system',
    backup_file: backupFile
  };

  appendChangelog(changelogEntry);

  return { backupFile, changelogEntry };
}

/**
 * Save a person with automatic backup and changelog
 *
 * @param {string} personId - Person ID
 * @param {object} newData - New person data to save
 * @param {object} options - Operation metadata (same as saveEntity)
 */
function savePerson(personId, newData, options = {}) {
  const filePath = path.join(DATA_DIR, 'persons', `${personId}.json`);

  // Create backup first
  const backupFile = createBackup('persons', personId);

  // Save new data
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));

  // Append to changelog
  const changelogEntry = {
    timestamp: getISOTimestamp(),
    operation: options.operation || 'unknown',
    data_type: 'person',
    id: personId,
    description: options.description || '',
    changes: options.changes || {},
    user: options.user || 'system',
    backup_file: backupFile
  };

  appendChangelog(changelogEntry);

  return { backupFile, changelogEntry };
}

/**
 * Read the changelog (returns array of entries)
 *
 * @param {object} [filter] - Optional filter criteria
 * @param {string} [filter.operation] - Filter by operation type
 * @param {string} [filter.id] - Filter by entity/person ID
 * @param {string} [filter.since] - Filter entries after this ISO date
 */
function readChangelog(filter = {}) {
  if (!fs.existsSync(CHANGELOG_FILE)) {
    return [];
  }

  const content = fs.readFileSync(CHANGELOG_FILE, 'utf8');
  const lines = content.trim().split('\n').filter(line => line);

  let entries = lines.map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      throw new Error(`Changelog corrupted at line ${i + 1}: ${e.message}`);
    }
  });

  // Apply filters
  if (filter.operation) {
    entries = entries.filter(e => e.operation === filter.operation);
  }
  if (filter.id) {
    entries = entries.filter(e => e.id === filter.id);
  }
  if (filter.since) {
    const sinceDate = new Date(filter.since);
    entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
  }

  return entries;
}

/**
 * Get a specific backup file content
 */
function getBackup(backupFilename) {
  const backupPath = path.join(SNAPSHOTS_DIR, backupFilename);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupFilename}`);
  }
  return JSON.parse(fs.readFileSync(backupPath, 'utf8'));
}

/**
 * Rollback an entity/person to a specific backup
 *
 * @param {string} backupFilename - The backup file to restore from
 * @param {object} options - Rollback metadata
 */
function rollback(backupFilename, options = {}) {
  // Parse backup filename to get data type and ID
  // Format: {timestamp}_{dataType}_{id}.json (timestamp may include milliseconds and Z)
  const match = backupFilename.match(/^[\d\-T]+Z?_(entities|persons)_(.+)\.json$/);
  if (!match) {
    throw new Error(`Invalid backup filename format: ${backupFilename}`);
  }

  const dataType = match[1];
  const id = match[2];

  // Load the backup data
  const backupData = getBackup(backupFilename);

  // Create a backup of current state before rollback
  const currentBackup = createBackup(dataType, id);

  // Restore the backup
  const filePath = path.join(DATA_DIR, dataType, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

  // Log the rollback
  const changelogEntry = {
    timestamp: getISOTimestamp(),
    operation: 'rollback',
    data_type: DATA_TYPE_SINGULAR[dataType] || dataType,
    id: id,
    description: options.description || `Rolled back to ${backupFilename}`,
    changes: {
      type: 'rollback',
      restored_from: backupFilename,
      previous_state: currentBackup
    },
    user: options.user || 'system',
    backup_file: currentBackup
  };

  appendChangelog(changelogEntry);

  return { restoredFrom: backupFilename, previousState: currentBackup };
}

/**
 * List all available backups
 *
 * @param {object} [filter] - Optional filter
 * @param {string} [filter.dataType] - 'entities' or 'persons'
 * @param {string} [filter.id] - Specific entity/person ID
 */
function listBackups(filter = {}) {
  ensureHistoryDirs();

  const files = fs.readdirSync(SNAPSHOTS_DIR);

  let backups = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      // Match format: {timestamp}_{dataType}_{id}.json
      // Timestamp may include milliseconds and Z suffix
      const match = f.match(/^([\d\-T]+Z?)_(entities|persons)_(.+)\.json$/);
      if (!match) return null;

      // Reconstruct a readable ISO-like timestamp from the filesystem-safe form.
      // getTimestamp() replaces all ':' and '.' with '-', producing e.g.
      // 2026-03-06T14-22-05-123Z; reverse only the time portion to get
      // 2026-03-06T14:22:05.123Z
      const ts = match[1]
        .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d+)Z$/, 'T$1:$2:$3.$4Z');

      return {
        filename: f,
        timestamp: ts,
        dataType: match[2],
        id: match[3]
      };
    })
    .filter(b => b !== null);

  // Apply filters
  if (filter.dataType) {
    backups = backups.filter(b => b.dataType === filter.dataType);
  }
  if (filter.id) {
    backups = backups.filter(b => b.id === filter.id);
  }

  // Sort by timestamp descending (most recent first)
  backups.sort((a, b) => b.filename.localeCompare(a.filename));

  return backups;
}

module.exports = {
  // Data loading
  loadEntity,
  loadPerson,

  // Safe data saving (with backup + changelog)
  saveEntity,
  savePerson,

  // Changelog operations
  readChangelog,
  appendChangelog,

  // Backup operations
  createBackup,
  getBackup,
  listBackups,
  rollback,

  // Paths (for reference)
  paths: {
    ROOT_DIR,
    DATA_DIR,
    HISTORY_DIR,
    SNAPSHOTS_DIR,
    CHANGELOG_FILE
  }
};
