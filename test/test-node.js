#!/usr/bin/env node

/**
 * Node.js test for QOA decoder
 * Tests the basic functionality without browser APIs
 */

const fs = require('fs');
const path = require('path');

async function test() {
  console.log('🧪 Testing QOA Decoder in Node.js\n');

  try {
    // Load the WASM file
    console.log('📦 Loading WebAssembly module...');
    const wasmPath = path.join(__dirname, '../src/qoa-decoder.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);

    // Create memory to be imported by the WASM module
    const memory = new WebAssembly.Memory({ initial: 8 });
    const importObject = { e: { m: memory } };

    const instance = await WebAssembly.instantiate(wasmModule, importObject);
    console.log('✅ WASM module loaded successfully\n');


    // Load test QOA file
    console.log('📂 Loading test QOA file...');
    const qoaPath = path.join(__dirname, 'qoa-data/test_5120samples.qoa');
    const qoaBuffer = fs.readFileSync(qoaPath);
    console.log(`✅ Loaded ${qoaBuffer.length} bytes\n`);

    // Copy QOA data to WASM memory
    console.log('💾 Copying data to WASM memory...');
    const inputPtr = 4096;
    const outputPtr = inputPtr + qoaBuffer.length + 1024;

    // Ensure enough memory
    const pagesNeeded = Math.ceil((outputPtr + qoaBuffer.length * 10) / 65536);
    const currentPages = memory.buffer.byteLength / 65536;
    if (pagesNeeded > currentPages) {
      memory.grow(pagesNeeded - currentPages);
    }

    const memoryView = new Uint8Array(memory.buffer);
    memoryView.set(qoaBuffer, inputPtr);
    console.log('✅ Data copied to WASM memory\n');

    // Decode
    console.log('🎵 Decoding QOA audio...');
    const decodeResult = instance.exports.d(inputPtr, qoaBuffer.length, outputPtr);
    const [samplesPerChannel, channels, sampleRate] = Array.isArray(decodeResult)
      ? decodeResult
      : [decodeResult, 0, 0];

    if (samplesPerChannel === 0 || channels === 0 || sampleRate === 0) {
      console.error('❌ Decoding failed!\n');
      process.exit(1);
    }

    const totalSamples = samplesPerChannel * channels;

    console.log('✅ Decoding successful!\n');
    console.log('📊 Audio Information:');
    console.log(`   Channels: ${channels}`);
    console.log(`   Sample Rate: ${sampleRate} Hz`);
    console.log(`   Samples per channel: ${samplesPerChannel}`);
    console.log(`   Total samples: ${totalSamples}`);
    console.log(`   Duration: ${(samplesPerChannel / sampleRate).toFixed(2)} seconds\n`);

    // Verify sample data
    console.log('🔍 Verifying decoded samples...');
    const samplesView = new Int16Array(memory.buffer, outputPtr, totalSamples);

    let min = 32767;
    let max = -32768;
    let allValid = true;

    for (let i = 0; i < totalSamples; i++) {
      const sample = samplesView[i];
      if (sample < -32768 || sample > 32767) {
        allValid = false;
        console.error(`❌ Sample ${i} out of range: ${sample}`);
        break;
      }
      min = Math.min(min, sample);
      max = Math.max(max, sample);
    }

    if (allValid) {
      console.log('✅ All samples in valid range');
      console.log(`   Min: ${min}`);
      console.log(`   Max: ${max}\n`);
    } else {
      console.error('❌ Some samples out of valid range\n');
      process.exit(1);
    }

    // Expected values for test_5120samples.qoa
    console.log('🎯 Validating expected values...');
    const expectedChannels = 1; // mono
    const expectedSampleRate = 22050;
    const expectedSamples = 5120;

    if (channels === expectedChannels) {
      console.log(`✅ Channels correct: ${channels}`);
    } else {
      console.error(`❌ Channels incorrect: ${channels} (expected ${expectedChannels})`);
      process.exit(1);
    }

    if (sampleRate === expectedSampleRate) {
      console.log(`✅ Sample rate correct: ${sampleRate} Hz`);
    } else {
      console.error(`❌ Sample rate incorrect: ${sampleRate} Hz (expected ${expectedSampleRate} Hz)`);
      process.exit(1);
    }

    if (samplesPerChannel > 0) {
      console.log(`✅ Samples decoded: ${samplesPerChannel}`);
    } else {
      console.error(`❌ No samples decoded`);
      process.exit(1);
    }

    if (samplesPerChannel === expectedSamples) {
      console.log(`✅ Sample count correct: ${samplesPerChannel}`);
    } else {
      console.error(`❌ Sample count incorrect: ${samplesPerChannel} (expected ${expectedSamples})`);
      process.exit(1);
    }

    console.log('\n🎉 All tests passed! The QOA decoder is working correctly.\n');

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
