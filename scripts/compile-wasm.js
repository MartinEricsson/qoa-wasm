#!/usr/bin/env node

/**
 * Compiles WAT (WebAssembly Text) to WASM using the wabt npm package
 * Replaces the external wat2wasm CLI tool with a Node-based build step
 */

const fs = require('fs');
const path = require('path');
const wabt = require('wabt');
const reportSize = require('./report-size');

// Configuration
const WAT_INPUT = path.join(__dirname, '../src/qoa-decoder.wat');
const WASM_OUTPUT = path.join(__dirname, '../src/qoa-decoder.wasm');

async function compileWasm() {
  console.log('🔧 Compiling WebAssembly...');
  console.log(`   Input:  ${path.relative(process.cwd(), WAT_INPUT)}`);
  console.log(`   Output: ${path.relative(process.cwd(), WASM_OUTPUT)}`);

  try {
    // Read the WAT source
    const watSource = fs.readFileSync(WAT_INPUT, 'utf8');
    console.log(`   Read ${watSource.length} bytes of WAT source`);

    // Initialize wabt
    const wabtModule = await wabt();

    // Parse and compile
    const features = {
      exceptions: false,
      mutable_globals: true,
      sat_float_to_int: false,
      sign_extension: true,
      simd: false,
      threads: false,
      multi_value: true,
      tail_call: false,
      bulk_memory: false,
      reference_types: false,
      annotations: false,
      gc: false
    };

    const module = wabtModule.parseWat(WAT_INPUT, watSource, features);
    module.resolveNames();
    module.validate(features);

    // Generate WASM binary
    const binaryOutput = module.toBinary({
      log: false,
      write_debug_names: false
    });

    // Write the output file
    fs.writeFileSync(WASM_OUTPUT, Buffer.from(binaryOutput.buffer));

    console.log(`✅ Successfully compiled to ${binaryOutput.buffer.byteLength} bytes`);
    console.log(`   Output: ${WASM_OUTPUT}`);

    // Report sizes
    reportSize();

    // Cleanup
    module.destroy();

  } catch (error) {
    console.error('❌ Compilation failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  compileWasm().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = compileWasm;
