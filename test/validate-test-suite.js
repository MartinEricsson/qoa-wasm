#!/usr/bin/env node

/**
 * Validate Test Suite
 * 
 * This script validates that the regression test suite properly detects
 * differences in decoder output. It temporarily corrupts reference data,
 * runs the tests (which should fail), then restores the data.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REFERENCE_DIR = path.join(__dirname, 'reference-data');

async function validateTestSuite() {
    console.log('🔧 Validating Regression Test Suite\n');
    console.log('This script will:');
    console.log('1. Temporarily corrupt reference data');
    console.log('2. Run tests (should FAIL)');
    console.log('3. Restore original data');
    console.log('4. Run tests (should PASS)\n');
    console.log('='.repeat(60));

    // Pick a reference file to corrupt
    const testFile = 'test_simple.pcm';
    const refPath = path.join(REFERENCE_DIR, testFile);
    const backupPath = refPath + '.backup';

    try {
        // Step 1: Backup original
        console.log('\n📋 Step 1: Backup original reference data');
        fs.copyFileSync(refPath, backupPath);
        console.log(`   ✅ Backed up: ${testFile}`);

        // Step 2: Corrupt the data
        console.log('\n🔨 Step 2: Corrupt reference data');
        const original = fs.readFileSync(refPath);
        const samples = new Int16Array(
            original.buffer,
            original.byteOffset,
            original.byteLength / 2
        );

        // Modify one sample
        if (samples.length > 5) {
            const oldValue = samples[5];
            samples[5] = samples[5] + 100; // Change middle sample
            console.log(`   Modified sample 5: ${oldValue} → ${samples[5]}`);
        }

        fs.writeFileSync(refPath, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
        console.log(`   ✅ Corrupted: ${testFile}`);

        // Step 3: Run tests (should fail)
        console.log('\n🧪 Step 3: Run tests with corrupted data (should FAIL)');
        console.log('-'.repeat(60));

        let testFailed = false;
        try {
            execSync('node test-regression.js', {
                cwd: __dirname,
                stdio: 'inherit'
            });
        } catch (error) {
            testFailed = true;
        }

        console.log('-'.repeat(60));

        if (!testFailed) {
            console.error('\n❌ VALIDATION FAILED: Tests should have failed with corrupted data!');
            return false;
        }

        console.log('\n   ✅ Tests correctly detected corruption');

        // Step 4: Restore original
        console.log('\n🔄 Step 4: Restore original reference data');
        fs.copyFileSync(backupPath, refPath);
        console.log(`   ✅ Restored: ${testFile}`);

        // Step 5: Run tests again (should pass)
        console.log('\n🧪 Step 5: Run tests with original data (should PASS)');
        console.log('-'.repeat(60));

        let testPassed = false;
        try {
            execSync('node test-regression.js', {
                cwd: __dirname,
                stdio: 'inherit'
            });
            testPassed = true;
        } catch (error) {
            testPassed = false;
        }

        console.log('-'.repeat(60));

        if (!testPassed) {
            console.error('\n❌ VALIDATION FAILED: Tests should have passed with original data!');
            return false;
        }

        console.log('\n   ✅ Tests correctly passed with original data');

        // Cleanup
        fs.unlinkSync(backupPath);

        console.log('\n' + '='.repeat(60));
        console.log('✅ VALIDATION SUCCESSFUL!\n');
        console.log('The regression test suite:');
        console.log('   ✅ Detects corrupted/changed decoder output');
        console.log('   ✅ Passes with correct decoder output');
        console.log('   ✅ Provides detailed error reporting\n');
        console.log('Your test suite is working correctly! 🎉\n');

        return true;

    } catch (error) {
        console.error('\n❌ Validation error:', error.message);

        // Try to restore backup
        if (fs.existsSync(backupPath)) {
            console.log('Attempting to restore backup...');
            try {
                fs.copyFileSync(backupPath, refPath);
                fs.unlinkSync(backupPath);
                console.log('✅ Backup restored');
            } catch (restoreError) {
                console.error('❌ Failed to restore backup:', restoreError.message);
            }
        }

        return false;
    }
}

// Run validation
if (require.main === module) {
    validateTestSuite()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { validateTestSuite };
