/**
 * Governance Transition Validation Tests
 *
 * Validates business rules for transitioning governance roles:
 * - Outgoing person exists and has active roles
 * - Incoming person exists
 * - Incoming person doesn't already hold the target roles
 * - Target entities are active corporations
 *
 * Usage: node tests/validate-transition.js --outgoing <person-id> --incoming <person-id>
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Load person data
function loadPerson(personId) {
  const filePath = path.join(DATA_DIR, 'persons', `${personId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Load entity data
function loadEntity(entityId) {
  const filePath = path.join(DATA_DIR, 'entities', `${entityId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Get active roles for a person across all entities
function getActiveRoles(personId, entitiesFilter = 'active') {
  const person = loadPerson(personId);
  if (!person || !person._derived) {
    return { directorships: [], officerships: [] };
  }

  let directorships = person._derived.directorships || [];
  let officerships = person._derived.officerships || [];

  // Filter to active status roles
  directorships = directorships.filter(d => d.status === 'active');
  officerships = officerships.filter(o => o.status === 'active');

  // Filter by entity status if requested
  if (entitiesFilter === 'active') {
    directorships = directorships.filter(d => {
      const entity = loadEntity(d.entity_id);
      return entity && entity.status === 'active';
    });
    officerships = officerships.filter(o => {
      const entity = loadEntity(o.entity_id);
      return entity && entity.status === 'active';
    });
  }

  return { directorships, officerships };
}

// Generate person ID from name
function generatePersonId(name) {
  return 'per-' + name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Parse CLI arguments
function parseArgs(args) {
  const result = {
    outgoing: null,
    incoming: null,
    incomingName: null,
    entities: 'active'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outgoing' && args[i + 1]) {
      result.outgoing = args[i + 1];
      i++;
    } else if (args[i] === '--incoming' && args[i + 1]) {
      result.incoming = args[i + 1];
      i++;
    } else if (args[i] === '--incoming-name' && args[i + 1]) {
      result.incomingName = args[i + 1];
      i++;
    } else if (args[i] === '--entities' && args[i + 1]) {
      result.entities = args[i + 1];
      i++;
    }
  }

  return result;
}

// Run validation
function runValidation(outgoingId, incomingId, incomingName, entitiesFilter) {
  // Resolve incoming person
  let resolvedIncomingId = incomingId;
  let resolvedIncomingName = incomingName;

  if (!incomingId && incomingName) {
    resolvedIncomingId = generatePersonId(incomingName);
  }

  console.log(`\nValidating governance transition:`);
  console.log(`  Outgoing: ${outgoingId}`);
  console.log(`  Incoming: ${resolvedIncomingId}${incomingName ? ` (${incomingName})` : ''}`);
  console.log(`  Entities: ${entitiesFilter}`);
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // Test 1: Outgoing person exists
  const outgoing = loadPerson(outgoingId);
  if (!outgoing) {
    console.log(`  ✗ Outgoing person exists: Person not found: ${outgoingId}`);
    failed++;
    console.log('='.repeat(70));
    console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    console.log('\nVALIDATION FAILED\n');
    process.exit(1);
  }
  console.log(`  ✓ Outgoing person exists: ${outgoing.name}`);
  passed++;

  // Test 2: Incoming person exists OR will be created
  const incoming = loadPerson(resolvedIncomingId);
  if (!incoming) {
    if (incomingName) {
      console.log(`  ✓ Incoming person will be created: ${incomingName} (${resolvedIncomingId})`);
      passed++;
      resolvedIncomingName = incomingName;
    } else {
      console.log(`  ✗ Incoming person exists: Person not found: ${resolvedIncomingId}`);
      console.log(`    Hint: Use --incoming-name "Full Name" to create a new person`);
      failed++;
      console.log('='.repeat(70));
      console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings`);
      console.log('\nVALIDATION FAILED\n');
      process.exit(1);
    }
  } else {
    console.log(`  ✓ Incoming person exists: ${incoming.name}`);
    passed++;
    resolvedIncomingName = incoming.name;
  }

  // Test 3: Outgoing has active roles
  const outgoingRoles = getActiveRoles(outgoingId, entitiesFilter);
  const totalOutgoingRoles = outgoingRoles.directorships.length + outgoingRoles.officerships.length;

  if (totalOutgoingRoles === 0) {
    console.log(`  ✗ Outgoing has active roles: No active roles found for ${outgoing.name}`);
    failed++;
    console.log('='.repeat(70));
    console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    console.log('\nVALIDATION FAILED\n');
    process.exit(1);
  } else {
    console.log(`  ✓ Outgoing has active roles: ${outgoingRoles.directorships.length} directorships, ${outgoingRoles.officerships.length} officerships`);
    passed++;
  }

  // Test 4: Get list of entities to transition
  const entityIds = new Set();
  outgoingRoles.directorships.forEach(d => entityIds.add(d.entity_id));
  outgoingRoles.officerships.forEach(o => entityIds.add(o.entity_id));

  console.log(`  ✓ Entities to process: ${entityIds.size}`);
  passed++;

  // Test 5: Check incoming doesn't already hold roles in target entities
  const incomingRoles = incoming ? getActiveRoles(resolvedIncomingId, 'all') : { directorships: [], officerships: [] };
  const conflicts = [];

  for (const entityId of entityIds) {
    const hasDirectorship = incomingRoles.directorships.some(d => d.entity_id === entityId);
    const hasOfficership = incomingRoles.officerships.some(o => o.entity_id === entityId);

    if (hasDirectorship || hasOfficership) {
      const entity = loadEntity(entityId);
      const roles = [];
      if (hasDirectorship) roles.push('director');
      if (hasOfficership) roles.push('officer');
      conflicts.push(`${entity?.legal_name?.en || entityId}: ${roles.join(', ')}`);
    }
  }

  if (conflicts.length > 0) {
    console.log(`  ⚠ Incoming role conflicts: ${conflicts.length} entities where ${resolvedIncomingName} already has roles`);
    conflicts.forEach(c => console.log(`      - ${c}`));
    warnings++;
  } else {
    console.log(`  ✓ No incoming role conflicts: ${resolvedIncomingName} has no existing roles in target entities`);
    passed++;
  }

  // Test 6: Verify all target entities are corporations
  let nonCorpCount = 0;
  for (const entityId of entityIds) {
    const entity = loadEntity(entityId);
    if (entity && entity.entity_type !== 'corporation') {
      console.log(`  ⚠ Non-corporation: ${entity.legal_name?.en || entityId} is a ${entity.entity_type}`);
      nonCorpCount++;
    }
  }

  if (nonCorpCount > 0) {
    console.log(`  ⚠ Non-corporation entities: ${nonCorpCount} (will be skipped)`);
    warnings++;
  } else {
    console.log(`  ✓ All entities are corporations`);
    passed++;
  }

  // Summary
  console.log('='.repeat(70));
  console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings`);

  if (failed > 0) {
    console.log('\nVALIDATION FAILED - Cannot proceed with transition.\n');
    process.exit(1);
  }

  // Show transition summary
  console.log('\n' + '─'.repeat(70));
  console.log('TRANSITION SUMMARY');
  console.log('─'.repeat(70));
  console.log(`\nOutgoing: ${outgoing.name} (${outgoingId})`);
  console.log(`Incoming: ${resolvedIncomingName} (${resolvedIncomingId})${!incoming ? ' [NEW]' : ''}`);
  console.log(`\nEntities to process (${entityIds.size}):`);

  for (const entityId of [...entityIds].sort()) {
    const entity = loadEntity(entityId);
    const hasDir = outgoingRoles.directorships.some(d => d.entity_id === entityId);
    const hasOff = outgoingRoles.officerships.some(o => o.entity_id === entityId);
    const roles = [];
    if (hasDir) roles.push('Director');
    if (hasOff) {
      const off = outgoingRoles.officerships.find(o => o.entity_id === entityId);
      roles.push(off?.title || 'Officer');
    }
    console.log(`  - ${entity?.legal_name?.en || entityId}`);
    console.log(`    Roles: ${roles.join(', ')}`);
  }

  console.log(`\nDocuments to generate: ${entityIds.size * 2} (1 resignation + 1 appointment per entity)`);

  if (warnings > 0) {
    console.log('\nVALIDATION PASSED WITH WARNINGS - Review warnings before proceeding.\n');
  } else {
    console.log('\nVALIDATION PASSED - Safe to proceed with transition.\n');
  }
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Governance Transition Validation

Usage: node tests/validate-transition.js --outgoing <person-id> --incoming-name <name> [options]

Options:
  --outgoing <id>      Person ID of outgoing individual (required)
  --incoming <id>      Person ID of incoming individual (if exists)
  --incoming-name <n>  Full name of incoming person (will be created if needed)
  --entities <filter>  Entity filter: "active" (default), "all", or comma-separated IDs
  --help               Show this help

Examples:
  # With existing person
  node tests/validate-transition.js --outgoing per-thomas-beaumont --incoming per-jennifer-huang

  # With new person (will be created)
  node tests/validate-transition.js --outgoing per-thomas-beaumont --incoming-name "Emily Chen"
`);
  process.exit(0);
}

const params = parseArgs(args);

if (!params.outgoing) {
  console.error('Error: --outgoing parameter is required');
  process.exit(1);
}
if (!params.incoming && !params.incomingName) {
  console.error('Error: --incoming <id> or --incoming-name <name> is required');
  process.exit(1);
}

runValidation(params.outgoing, params.incoming, params.incomingName, params.entities);
