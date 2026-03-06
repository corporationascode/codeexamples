/**
 * Director Appointment Validation Tests
 *
 * Validates business rules for director appointments:
 * - Entity exists and is a corporation
 * - Person exists in the system
 * - Person is not already an active director
 * - Entity has existing directors (for quorum)
 * - Entity is active (not dissolved)
 *
 * Usage: node tests/validate-appointment.js <entity-id> <person-id>
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

class ValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// Load entity data
function loadEntity(entityId) {
  const filePath = path.join(DATA_DIR, 'entities', `${entityId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new ValidationError(`Entity not found: ${entityId}`, 'ENTITY_NOT_FOUND');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Load person data
function loadPerson(personId) {
  const filePath = path.join(DATA_DIR, 'persons', `${personId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new ValidationError(`Person not found: ${personId}`, 'PERSON_NOT_FOUND');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Test: Entity exists
function testEntityExists(entityId) {
  const entity = loadEntity(entityId);
  const name = entity.legal_name?.en || entity.legal_name?.fr || entityId;
  return { passed: true, message: name, entity };
}

// Test: Entity is a corporation
function testEntityIsCorporation(entity) {
  if (entity.entity_type !== 'corporation') {
    throw new ValidationError(
      `Entity is a ${entity.entity_type}, not a corporation. Only corporations have directors.`,
      'NOT_CORPORATION'
    );
  }
  return { passed: true, message: entity.entity_type };
}

// Test: Entity is active
function testEntityIsActive(entity) {
  if (entity.status === 'dissolved' || entity.status === 'inactive') {
    throw new ValidationError(
      `Entity status is "${entity.status}". Cannot appoint directors to inactive/dissolved entities.`,
      'ENTITY_NOT_ACTIVE'
    );
  }
  return { passed: true, message: entity.status };
}

// Test: Person exists
function testPersonExists(personId) {
  const person = loadPerson(personId);
  return { passed: true, message: person.name, person };
}

// Test: Entity has existing directors
function testHasExistingDirectors(entity) {
  const directors = entity.governance?.directors || [];
  const activeDirectors = directors.filter(d => d.status === 'active');

  if (activeDirectors.length === 0) {
    throw new ValidationError(
      `Entity has no active directors. At least one director is required for quorum to approve appointments.`,
      'NO_EXISTING_DIRECTORS'
    );
  }

  return {
    passed: true,
    message: `${activeDirectors.length} current director(s)`,
    directors: activeDirectors
  };
}

// Test: Person is not already an active director
function testNotAlreadyDirector(entity, personId) {
  const directors = entity.governance?.directors || [];
  const existingDirector = directors.find(d => d.person_id === personId && d.status === 'active');

  if (existingDirector) {
    throw new ValidationError(
      `${existingDirector.person_name || personId} is already an active director of this entity.`,
      'ALREADY_DIRECTOR'
    );
  }

  return { passed: true, message: 'Person is not currently a director' };
}

// Run all validations
function runValidation(entityId, personId) {
  console.log(`\nValidating director appointment:`);
  console.log(`  Entity: ${entityId}`);
  console.log(`  Person: ${personId}`);
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  let entity = null;
  let person = null;
  let existingDirectors = [];

  const tests = [
    {
      name: 'Entity exists',
      fn: () => {
        const result = testEntityExists(entityId);
        entity = result.entity;
        return result;
      }
    },
    {
      name: 'Entity is corporation',
      fn: () => testEntityIsCorporation(entity)
    },
    {
      name: 'Entity is active',
      fn: () => testEntityIsActive(entity)
    },
    {
      name: 'Person exists',
      fn: () => {
        const result = testPersonExists(personId);
        person = result.person;
        return result;
      }
    },
    {
      name: 'Has existing directors',
      fn: () => {
        const result = testHasExistingDirectors(entity);
        existingDirectors = result.directors;
        return result;
      }
    },
    {
      name: 'Not already director',
      fn: () => testNotAlreadyDirector(entity, personId)
    }
  ];

  for (const test of tests) {
    try {
      const result = test.fn();
      console.log(`  ✓ ${test.name}: ${result.message}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${test.name}: ${err.message}`);
      failed++;
      // Stop on first failure for dependent tests.
      // NOT_CORPORATION and ENTITY_NOT_ACTIVE also gate all remaining tests:
      // without a valid active corporation, director checks are meaningless.
      if (['ENTITY_NOT_FOUND', 'PERSON_NOT_FOUND', 'NOT_CORPORATION', 'ENTITY_NOT_ACTIVE'].includes(err.code)) {
        break;
      }
    }
  }

  console.log('='.repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('VALIDATION FAILED - Cannot proceed with appointment.\n');
    process.exit(1);
  } else {
    console.log('VALIDATION PASSED - Appointment is permissible.\n');

    // Show summary info
    console.log('Appointment Details:');
    console.log(`  Appointee: ${person.name}`);
    console.log(`  Corporation: ${entity.legal_name?.en || entity.legal_name?.fr}`);
    console.log(`  Current Directors (${existingDirectors.length}):`);
    for (const dir of existingDirectors) {
      console.log(`    - ${dir.person_name}`);
    }
    console.log('');
  }

  return { entity, person, existingDirectors };
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2 || args.includes('--help')) {
  console.log(`
Director Appointment Validation

Usage: node tests/validate-appointment.js <entity-id> <person-id>

Validates that a person can be appointed as director:
- Entity must exist and be a corporation
- Person must exist in the system
- Person must not already be an active director
- Entity must have existing directors (for quorum)
- Entity must be active (not dissolved)

Example:
  node tests/validate-appointment.js ent-artisan-bakery-co per-rachel-anderson
`);
  process.exit(0);
}

const entityId = args[0];
const personId = args[1];

runValidation(entityId, personId);
