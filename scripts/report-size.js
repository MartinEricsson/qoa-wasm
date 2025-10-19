#!/usr/bin/env node

/**
 * Reports the size of the WASM file and its gzipped size
 * Can be run standalone or imported by the build script
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const WASM_FILE = path.join(__dirname, '../src/qoa-decoder.wasm');

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Report size of WASM file and its gzipped size
 */
function reportSize() {
  try {
    // Check if file exists
    if (!fs.existsSync(WASM_FILE)) {
      console.error(`❌ Error: WASM file not found at ${WASM_FILE}`);
      console.error('   Run: pnpm build');
      process.exit(1);
    }

    // Read the WASM file
    const wasmBuffer = fs.readFileSync(WASM_FILE);
    const originalSize = wasmBuffer.length;

    // Gzip compress the buffer
    const gzippedBuffer = zlib.gzipSync(wasmBuffer, {
      level: 9 // Maximum compression
    });
    const gzippedSize = gzippedBuffer.length;

    // Calculate compression ratio
    const compressionRatio = ((1 - gzippedSize / originalSize) * 100).toFixed(1);

    // Print size report
    console.log('');
    console.log('📦 WASM Size Report:');
    console.log(`   Original:  ${formatBytes(originalSize)} (${originalSize} bytes)`);
    console.log(`   Gzipped:   ${formatBytes(gzippedSize)} (${gzippedSize} bytes)`);
    console.log(`   Reduction: ${compressionRatio}%`);

    return {
      originalSize,
      gzippedSize,
      compressionRatio: parseFloat(compressionRatio)
    };

  } catch (error) {
    console.error('❌ Error reporting size:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  reportSize();
}

module.exports = reportSize;
