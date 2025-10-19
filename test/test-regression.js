#!/usr/bin/env node

/**
 * QOA Decoder Regression Test Suite
 * 
 * This test suite decodes all QOA test files and compares the output
 * against pre-generated reference data to ensure decoder consistency
 * across code changes.
 * 
 * Run `node generate-reference-data.js` first to create reference files.
 */

const fs = require('fs');
const path = require('path');

// All QOA test files to test
const { TEST_CASES } = require('./test-cases');
const TEST_FILES = TEST_CASES;

const REFERENCE_DIR = path.join(__dirname, 'reference-data');

class TestResult {
    constructor(filename) {
        this.filename = filename;
        this.passed = false;
        this.errors = [];
        this.warnings = [];
        this.metadata = null;
        this.stats = null;
    }

    addError(message) {
        this.errors.push(message);
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    setMetadata(metadata) {
        this.metadata = metadata;
    }

    setStats(stats) {
        this.stats = stats;
    }

    markPassed() {
        this.passed = true;
    }
}

async function runRegressionTests() {
    console.log('🧪 QOA Decoder - Regression Test Suite\n');
    console.log('='.repeat(60));

    // Check if reference data exists
    if (!fs.existsSync(REFERENCE_DIR)) {
        console.error(`❌ Reference data directory not found: ${REFERENCE_DIR}`);
        console.error('   Please run: node generate-reference-data.js\n');
        return false;
    }

    // Load WASM module
    console.log('📦 Loading WebAssembly module...');
    const wasmPath = path.join(__dirname, '../src/qoa-decoder.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    
    // Create memory to be imported by the WASM module
        const memory = new WebAssembly.Memory({ initial: 8 });
        const importObject = { e: { m: memory } };
    
    const instance = await WebAssembly.instantiate(wasmModule, importObject);
    console.log('✅ WASM module loaded\n');


    const results = [];

    // Test each file
    for (const filename of TEST_FILES) {
        const result = new TestResult(filename);
        console.log('-'.repeat(60));
        console.log(`\n🎵 Testing: ${filename}`);

        try {
            // Load QOA file
            const qoaPath = path.join(__dirname, filename);
            if (!fs.existsSync(qoaPath)) {
                result.addError(`File not found: ${filename}`);
                results.push(result);
                console.error(`❌ File not found\n`);
                continue;
            }

            const qoaBuffer = fs.readFileSync(qoaPath);

            // Load reference data
            const baseName = path.basename(filename, '.qoa');
            const metadataPath = path.join(REFERENCE_DIR, `${baseName}.json`);
            const samplesPath = path.join(REFERENCE_DIR, `${baseName}.pcm`);

            if (!fs.existsSync(metadataPath)) {
                result.addError(`Reference metadata not found: ${baseName}.json`);
                results.push(result);
                console.error(`❌ Reference metadata not found\n`);
                continue;
            }

            if (!fs.existsSync(samplesPath)) {
                result.addError(`Reference PCM data not found: ${baseName}.pcm`);
                results.push(result);
                console.error(`❌ Reference PCM data not found\n`);
                continue;
            }

            const refMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const refSamplesBuffer = fs.readFileSync(samplesPath);
            const refSamples = new Int16Array(
                refSamplesBuffer.buffer,
                refSamplesBuffer.byteOffset,
                refSamplesBuffer.byteLength / 2
            );

            // Decode the file
            const decoded = decodeQOA(instance, memory, qoaBuffer);

            if (!decoded) {
                result.addError('Failed to decode file');
                results.push(result);
                console.error(`❌ Decoding failed\n`);
                continue;
            }

            const { samples, channels, sampleRate, samplesPerChannel } = decoded;

            result.setMetadata({
                channels,
                sampleRate,
                samplesPerChannel,
                totalSamples: samples.length
            });

            // Test 1: Metadata comparison
            console.log(`\n   📋 Metadata Validation:`);
            let metadataValid = true;

            if (channels !== refMetadata.channels) {
                result.addError(`Channels mismatch: got ${channels}, expected ${refMetadata.channels}`);
                console.error(`      ❌ Channels: ${channels} (expected ${refMetadata.channels})`);
                metadataValid = false;
            } else {
                console.log(`      ✅ Channels: ${channels}`);
            }

            if (sampleRate !== refMetadata.sampleRate) {
                result.addError(`Sample rate mismatch: got ${sampleRate}, expected ${refMetadata.sampleRate}`);
                console.error(`      ❌ Sample Rate: ${sampleRate} (expected ${refMetadata.sampleRate})`);
                metadataValid = false;
            } else {
                console.log(`      ✅ Sample Rate: ${sampleRate} Hz`);
            }

            if (samplesPerChannel !== refMetadata.samplesPerChannel) {
                result.addError(`Samples per channel mismatch: got ${samplesPerChannel}, expected ${refMetadata.samplesPerChannel}`);
                console.error(`      ❌ Samples per channel: ${samplesPerChannel} (expected ${refMetadata.samplesPerChannel})`);
                metadataValid = false;
            } else {
                console.log(`      ✅ Samples per channel: ${samplesPerChannel}`);
            }

            // Test 2: Sample count comparison
            console.log(`\n   🔢 Sample Count Validation:`);
            if (samples.length !== refSamples.length) {
                result.addError(`Sample count mismatch: got ${samples.length}, expected ${refSamples.length}`);
                console.error(`      ❌ Total samples: ${samples.length} (expected ${refSamples.length})`);
                results.push(result);
                continue;
            } else {
                console.log(`      ✅ Total samples: ${samples.length}`);
            }

            // Test 3: Byte-for-byte comparison
            console.log(`\n   🔍 Sample Data Validation:`);
            let mismatchCount = 0;
            let firstMismatch = -1;
            const maxMismatchesToShow = 5;
            const mismatchDetails = [];

            for (let i = 0; i < samples.length; i++) {
                if (samples[i] !== refSamples[i]) {
                    mismatchCount++;
                    if (firstMismatch === -1) {
                        firstMismatch = i;
                    }
                    if (mismatchCount <= maxMismatchesToShow) {
                        mismatchDetails.push({
                            index: i,
                            got: samples[i],
                            expected: refSamples[i],
                            diff: samples[i] - refSamples[i]
                        });
                    }
                }
            }

            if (mismatchCount > 0) {
                result.addError(`${mismatchCount} sample mismatches found (${(mismatchCount / samples.length * 100).toFixed(2)}%)`);
                console.error(`      ❌ Found ${mismatchCount} mismatches (${(mismatchCount / samples.length * 100).toFixed(4)}%)`);
                console.error(`      First mismatch at sample ${firstMismatch}:`);

                for (const detail of mismatchDetails) {
                    console.error(`         Sample ${detail.index}: got ${detail.got}, expected ${detail.expected} (diff: ${detail.diff})`);
                }

                if (mismatchCount > maxMismatchesToShow) {
                    console.error(`         ... and ${mismatchCount - maxMismatchesToShow} more mismatches`);
                }
            } else {
                console.log(`      ✅ All ${samples.length} samples match exactly`);
            }

            // Test 4: Statistical comparison (for informational purposes)
            console.log(`\n   📊 Statistical Comparison:`);
            let min = 32767, max = -32768, sum = 0;
            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                min = Math.min(min, sample);
                max = Math.max(max, sample);
                sum += Math.abs(sample);
            }
            const avg = sum / samples.length;

            result.setStats({ min, max, averageMagnitude: avg });

            const refStats = refMetadata.statistics;
            console.log(`      Sample range: [${min}, ${max}] (ref: [${refStats.min}, ${refStats.max}])`);
            console.log(`      Average magnitude: ${avg.toFixed(2)} (ref: ${refStats.averageMagnitude.toFixed(2)})`);

            if (min === refStats.min && max === refStats.max) {
                console.log(`      ✅ Statistics match`);
            } else {
                result.addWarning(`Statistics differ from reference`);
                console.warn(`      ⚠️  Statistics differ from reference`);
            }

            // Final verdict
            if (result.errors.length === 0) {
                result.markPassed();
                console.log(`\n   ✅ PASSED: ${filename}\n`);
            } else {
                console.error(`\n   ❌ FAILED: ${filename} (${result.errors.length} errors)\n`);
            }

        } catch (error) {
            result.addError(`Exception: ${error.message}`);
            console.error(`   ❌ Exception: ${error.message}`);
            console.error(`   ${error.stack}\n`);
        }

        results.push(result);
    }

    // Summary
    console.log('='.repeat(60));
    printSummary(results);

    const allPassed = results.every(r => r.passed);
    return allPassed;
}

function printSummary(results) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`\n📊 Test Summary:\n`);
    console.log(`   Total tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n   Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`      • ${r.filename}`);
            r.errors.forEach(err => {
                console.log(`        - ${err}`);
            });
        });
    }

    console.log('');

    if (passed === total) {
        console.log('🎉 All regression tests passed!');
        console.log('   The decoder is producing consistent output.\n');
    } else {
        console.log('⚠️  Some regression tests failed!');
        console.log('   The decoder output differs from reference data.');
        console.log('   If this is intentional, regenerate reference data with:');
        console.log('   node generate-reference-data.js\n');
    }
}

/**
 * Decode a QOA buffer using the WASM instance
 */
function decodeQOA(instance, memory, qoaBuffer) {
    const inputPtr = 4096;
    const outputPtr = inputPtr + qoaBuffer.length + 1024;

    // Ensure enough memory
    const pagesNeeded = Math.ceil((outputPtr + qoaBuffer.length * 10) / 65536);
    const currentPages = memory.buffer.byteLength / 65536;
    if (pagesNeeded > currentPages) {
        memory.grow(pagesNeeded - currentPages);
    }

    // Copy input data
    const memoryView = new Uint8Array(memory.buffer);
    memoryView.set(qoaBuffer, inputPtr);

    // Decode
    const decodeResult = instance.exports.d(inputPtr, qoaBuffer.length, outputPtr);
    const [samplesPerChannel, channels, sampleRate] = Array.isArray(decodeResult)
        ? decodeResult
        : [decodeResult, 0, 0];

    if (samplesPerChannel === 0 || channels === 0 || sampleRate === 0) {
        return null;
    }
    const totalSamples = samplesPerChannel * channels;

    // Copy samples
    const samplesView = new Int16Array(memory.buffer, outputPtr, totalSamples);
    const samples = new Int16Array(totalSamples);
    samples.set(samplesView);

    return {
        samples,
        channels,
        sampleRate,
        samplesPerChannel
    };
}

// Run the tests
if (require.main === module) {
    runRegressionTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { runRegressionTests };
