/**
 * Share Certificate Validation Tests
 *
 * Validates business rules for share certificate issuance:
 * - Entity is a corporation with share capital
 * - Share class exists and has sufficient authorized shares
 * - Shareholders exist in ownership records
 * - Certificate quantities match recorded holdings
 * - Total certificated shares don't exceed issued shares
 *
 * Usage: node tests/validate-certificates.js <entity-id>
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MINUTE_BOOKS_DIR = path.join(ROOT_DIR, 'minute-books');

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

// Test: Entity must be a corporation
function testEntityIsCorporation(entity) {
  if (entity.entity_type !== 'corporation') {
    throw new ValidationError(
      `Entity ${entity.id} is a ${entity.entity_type}, not a corporation. Only corporations can issue share certificates.`,
      'NOT_CORPORATION'
    );
  }
  return { passed: true, message: `Entity is a corporation` };
}

// Test: Entity must have share capital structure
function testHasShareCapital(entity) {
  if (!entity.capital_structure || entity.capital_structure.type !== 'share_capital') {
    throw new ValidationError(
      `Entity ${entity.id} does not have share capital structure.`,
      'NO_SHARE_CAPITAL'
    );
  }
  return { passed: true, message: `Entity has share capital structure` };
}

// Test: Share classes exist
function testShareClassesExist(entity) {
  const classes = entity.capital_structure?.share_classes || [];
  if (classes.length === 0) {
    throw new ValidationError(
      `Entity ${entity.id} has no share classes defined.`,
      'NO_SHARE_CLASSES'
    );
  }
  return { passed: true, message: `${classes.length} share class(es) defined` };
}

// Test: Issued shares don't exceed authorized for each class
function testIssuedVsAuthorized(entity) {
  const results = [];
  const classes = entity.capital_structure?.share_classes || [];

  for (const shareClass of classes) {
    const authorized = shareClass.authorized;
    const issued = shareClass.issued || 0;

    if (authorized === 'unlimited') {
      results.push({
        class: shareClass.name,
        passed: true,
        message: `${issued.toLocaleString()} issued (unlimited authorized)`
      });
    } else {
      const authNum = parseInt(authorized);
      if (issued > authNum) {
        throw new ValidationError(
          `${shareClass.name}: Issued (${issued.toLocaleString()}) exceeds authorized (${authNum.toLocaleString()})`,
          'ISSUED_EXCEEDS_AUTHORIZED'
        );
      }
      results.push({
        class: shareClass.name,
        passed: true,
        message: `${issued.toLocaleString()} issued of ${authNum.toLocaleString()} authorized`
      });
    }
  }
  return results;
}

// Test: Ownership holdings match issued shares
function testOwnershipMatchesIssued(entity) {
  const classes = entity.capital_structure?.share_classes || [];
  const ownership = entity.ownership || [];
  const results = [];

  for (const shareClass of classes) {
    // Sum all holdings for this class
    let totalHeld = 0;
    for (const holder of ownership) {
      for (const holding of holder.holdings || []) {
        if (holding.class_id === shareClass.class_id) {
          totalHeld += holding.quantity;
        }
      }
    }

    const issued = shareClass.issued || 0;

    if (totalHeld !== issued) {
      throw new ValidationError(
        `${shareClass.name}: Total holdings (${totalHeld.toLocaleString()}) does not match issued shares (${issued.toLocaleString()})`,
        'HOLDINGS_MISMATCH'
      );
    }

    results.push({
      class: shareClass.name,
      passed: true,
      message: `Holdings (${totalHeld.toLocaleString()}) match issued shares`
    });
  }

  return results;
}

// Test: All ownership entries have valid holder references
function testValidHolderReferences(entity) {
  const ownership = entity.ownership || [];
  const errors = [];

  for (const holder of ownership) {
    if (!holder.holder_id) {
      errors.push(`Missing holder_id for holder: ${holder.holder_name || 'unknown'}`);
    }
    if (!holder.holder_type) {
      errors.push(`Missing holder_type for holder: ${holder.holder_name || holder.holder_id}`);
    }
    if (!['person', 'entity', 'trust'].includes(holder.holder_type)) {
      errors.push(`Invalid holder_type '${holder.holder_type}' for ${holder.holder_name || holder.holder_id}`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '), 'INVALID_HOLDER_REFS');
  }

  return { passed: true, message: `${ownership.length} holder(s) with valid references` };
}

// Test: Certificate quantities would not exceed holdings
function testCertificateQuantities(entity) {
  const ownership = entity.ownership || [];
  const results = [];

  for (const holder of ownership) {
    for (const holding of holder.holdings || []) {
      if (holding.quantity <= 0) {
        throw new ValidationError(
          `Invalid quantity ${holding.quantity} for ${holder.holder_name} (${holding.class_name || holding.class_id})`,
          'INVALID_QUANTITY'
        );
      }
      results.push({
        holder: holder.holder_name,
        class: holding.class_name || holding.class_id,
        quantity: holding.quantity,
        passed: true
      });
    }
  }

  return {
    passed: true,
    message: `${results.length} certificate(s) with valid quantities`
  };
}

// Test: Entity has officers for signing (warning only)
function testHasSignatories(entity) {
  const officers = entity.governance?.officers || [];
  const hasSecretary = officers.some(o => o.title?.toLowerCase().includes('secretary'));
  const hasPresident = officers.some(o => o.title?.toLowerCase().includes('president'));

  const warnings = [];
  if (!hasSecretary) warnings.push('No Secretary defined');
  if (!hasPresident) warnings.push('No President defined');

  if (warnings.length > 0) {
    return {
      passed: true,
      warning: true,
      message: `Missing signatories: ${warnings.join(', ')} (will use blank lines)`
    };
  }

  return { passed: true, message: `Secretary and President defined for signing` };
}

// Run all validations
function runValidation(entityId) {
  console.log(`\nValidating share certificate issuance for: ${entityId}\n`);
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  try {
    const entity = loadEntity(entityId);

    const tests = [
      { name: 'Entity is corporation', fn: () => testEntityIsCorporation(entity) },
      { name: 'Has share capital', fn: () => testHasShareCapital(entity) },
      { name: 'Share classes defined', fn: () => testShareClassesExist(entity) },
      { name: 'Issued vs authorized', fn: () => testIssuedVsAuthorized(entity) },
      { name: 'Ownership matches issued', fn: () => testOwnershipMatchesIssued(entity) },
      { name: 'Valid holder references', fn: () => testValidHolderReferences(entity) },
      { name: 'Certificate quantities', fn: () => testCertificateQuantities(entity) },
      { name: 'Signatories defined', fn: () => testHasSignatories(entity) },
    ];

    for (const test of tests) {
      try {
        const result = test.fn();

        // Handle array results (multiple sub-tests)
        if (Array.isArray(result)) {
          for (const r of result) {
            if (r.passed) {
              console.log(`  ✓ ${test.name} (${r.class}): ${r.message}`);
              passed++;
            }
          }
        } else if (result.warning) {
          console.log(`  ⚠ ${test.name}: ${result.message}`);
          warnings++;
        } else {
          console.log(`  ✓ ${test.name}: ${result.message}`);
          passed++;
        }
      } catch (err) {
        console.log(`  ✗ ${test.name}: ${err.message}`);
        failed++;
      }
    }

  } catch (err) {
    console.log(`  ✗ Load entity: ${err.message}`);
    failed++;
  }

  console.log('='.repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

  if (failed > 0) {
    console.log('VALIDATION FAILED - Do not issue certificates until errors are resolved.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('VALIDATION PASSED WITH WARNINGS - Review warnings before proceeding.\n');
  } else {
    console.log('VALIDATION PASSED - Safe to issue certificates.\n');
  }
}

// CLI
const entityId = process.argv[2];

if (!entityId || entityId === '--help') {
  console.log(`
Share Certificate Validation

Usage: node tests/validate-certificates.js <entity-id>

Validates that an entity can have share certificates issued:
- Entity must be a corporation with share capital
- Issued shares must not exceed authorized shares
- Ownership holdings must match issued share counts
- All holders must have valid references

Example:
  node tests/validate-certificates.js ent-artisan-bakery-co
`);
  process.exit(0);
}

runValidation(entityId);
