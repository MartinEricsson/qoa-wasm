#!/usr/bin/env node

/**
 * Generate Reference Data for Regression Testing
 * 
 * This script decodes all QOA test files and saves the decoded PCM data
 * along with metadata to reference files. These reference files are then
 * used by the regression test suite to ensure decoder consistency.
 */

const fs = require('fs');
const path = require('path');
const { TEST_CASES } = require('./test-cases');

// All QOA test files to process
const TEST_FILES = TEST_CASES;

const REFERENCE_DIR = path.join(__dirname, 'reference-data');

async function generateReferenceData() {
    console.log('🔧 QOA Decoder - Reference Data Generator\n');
    console.log('='.repeat(60));

    // Create reference data directory if it doesn't exist
    if (!fs.existsSync(REFERENCE_DIR)) {
        fs.mkdirSync(REFERENCE_DIR);
        console.log(`📁 Created directory: ${REFERENCE_DIR}\n`);
    }

    // Load WASM module
    console.log('📦 Loading WebAssembly module...');
    const wasmPath = path.join(__dirname, '../src/qoa-decoder.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    
    // Create memory to be imported by the WASM module
    const memory = new WebAssembly.Memory({ initial: 256 });
    const importObject = {
      env: {
        memory: memory
      }
    };
    
    const instance = await WebAssembly.instantiate(wasmModule, importObject);
    console.log('✅ WASM module loaded\n');

    let successCount = 0;
    let failCount = 0;

    // Process each test file
    for (const filename of TEST_FILES) {
        console.log('-'.repeat(60));
        console.log(`\n🎵 Processing: ${filename}`);

        try {
            const qoaPath = path.join(__dirname, filename);

            if (!fs.existsSync(qoaPath)) {
                console.error(`❌ File not found: ${filename}\n`);
                failCount++;
                continue;
            }

            const qoaBuffer = fs.readFileSync(qoaPath);
            console.log(`   Input size: ${qoaBuffer.length} bytes`);

            // Decode the file
            const result = decodeQOA(instance, memory, qoaBuffer);

            if (!result) {
                console.error(`❌ Failed to decode ${filename}\n`);
                failCount++;
                continue;
            }

            const { samples, channels, sampleRate, samplesPerChannel } = result;

            console.log(`   Channels: ${channels}`);
            console.log(`   Sample Rate: ${sampleRate} Hz`);
            console.log(`   Samples per channel: ${samplesPerChannel}`);
            console.log(`   Total samples: ${samples.length}`);
            console.log(`   Duration: ${(samplesPerChannel / sampleRate).toFixed(3)} seconds`);

            // Calculate statistics
            let min = 32767, max = -32768, sum = 0;
            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                min = Math.min(min, sample);
                max = Math.max(max, sample);
                sum += Math.abs(sample);
            }
            const avg = sum / samples.length;

            console.log(`   Sample range: [${min}, ${max}]`);
            console.log(`   Average magnitude: ${avg.toFixed(2)}`);

            // Save reference data
            const baseName = path.basename(filename, '.qoa');
            const metadataPath = path.join(REFERENCE_DIR, `${baseName}.json`);
            const samplesPath = path.join(REFERENCE_DIR, `${baseName}.pcm`);

            // Save metadata
            const metadata = {
                sourceFile: filename,
                channels,
                sampleRate,
                samplesPerChannel,
                totalSamples: samples.length,
                statistics: {
                    min,
                    max,
                    averageMagnitude: avg
                },
                generatedAt: new Date().toISOString(),
                decoderVersion: '1.0.0'
            };

            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`   ✅ Saved metadata: ${baseName}.json`);

            // Save PCM data (Int16Array as binary)
            const buffer = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
            fs.writeFileSync(samplesPath, buffer);
            console.log(`   ✅ Saved PCM data: ${baseName}.pcm (${buffer.length} bytes)`);

            successCount++;
            console.log(`   ✅ Successfully processed ${filename}\n`);

        } catch (error) {
            console.error(`   ❌ Error processing ${filename}: ${error.message}`);
            console.error(`   ${error.stack}\n`);
            failCount++;
        }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully generated: ${successCount}/${TEST_FILES.length}`);
    console.log(`   ❌ Failed: ${failCount}/${TEST_FILES.length}`);

    if (failCount === 0) {
        console.log('\n🎉 All reference data generated successfully!');
        console.log(`📁 Reference files saved to: ${REFERENCE_DIR}\n`);
        return true;
    } else {
        console.log('\n⚠️  Some files failed to process.\n');
        return false;
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
    const decodeResult = instance.exports.decode(inputPtr, qoaBuffer.length, outputPtr);
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

// Run the generator
generateReferenceData()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
