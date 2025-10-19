#!/usr/bin/env node

/**
 * Test Status Check
 * 
 * Quick overview of the test suite status
 */

const fs = require('fs');
const path = require('path');
const { TEST_CASES } = require('./test-cases');

const REFERENCE_DIR = path.join(__dirname, 'reference-data');
const TEST_FILES = TEST_CASES;

console.log('📊 QOA Decoder - Test Suite Status\n');
console.log('='.repeat(60));

// Check if reference data exists
console.log('\n📁 Reference Data:');
if (!fs.existsSync(REFERENCE_DIR)) {
    console.log('   ❌ Directory not found');
    console.log('   Run: pnpm test:generate-refs\n');
    process.exit(1);
}

let totalSize = 0;
let missingCount = 0;

for (const filename of TEST_FILES) {
    const baseName = path.basename(filename, '.qoa');
    const jsonPath = path.join(REFERENCE_DIR, `${baseName}.json`);
    const pcmPath = path.join(REFERENCE_DIR, `${baseName}.pcm`);

    const hasJson = fs.existsSync(jsonPath);
    const hasPcm = fs.existsSync(pcmPath);

    if (hasJson && hasPcm) {
        const jsonSize = fs.statSync(jsonPath).size;
        const pcmSize = fs.statSync(pcmPath).size;
        totalSize += jsonSize + pcmSize;

        const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`   ✅ ${baseName}`);
        console.log(`      Samples: ${metadata.totalSamples}, Size: ${(pcmSize / 1024).toFixed(1)} KB`);
    } else {
        console.log(`   ❌ ${baseName} - Missing ${!hasJson ? '.json' : ''} ${!hasPcm ? '.pcm' : ''}`);
        missingCount++;
    }
}

console.log(`\n   Total reference data: ${(totalSize / 1024).toFixed(1)} KB`);

// Check test files
console.log('\n📂 Test Files:');
for (const filename of TEST_FILES) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        console.log(`   ✅ ${filename} (${(size / 1024).toFixed(1)} KB)`);
    } else {
        console.log(`   ❌ ${filename} - Not found`);
    }
}

// Check test scripts
console.log('\n📝 Test Scripts:');
const scripts = [
    'test-node.js',
    'test-regression.js',
    'generate-reference-data.js',
    'validate-test-suite.js'
];

for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
        const isExecutable = (fs.statSync(scriptPath).mode & 0o111) !== 0;
        console.log(`   ${isExecutable ? '✅' : '⚠️ '} ${script}${isExecutable ? '' : ' (not executable)'}`);
    } else {
        console.log(`   ❌ ${script} - Not found`);
    }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary:');
console.log(`   Test files: ${TEST_FILES.length}`);
console.log(`   Reference files: ${(TEST_FILES.length - missingCount) * 2}/${TEST_FILES.length * 2}`);
console.log(`   Status: ${missingCount === 0 ? '✅ Ready' : '⚠️  Incomplete'}`);

if (missingCount > 0) {
    console.log('\n⚠️  Run: pnpm test:generate-refs');
} else {
    console.log('\n✅ Test suite ready!');
    console.log('   Run: pnpm test');
}

console.log('');
