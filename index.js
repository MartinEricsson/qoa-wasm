/**
 * QOA-WASM - WebAssembly decoder for QOA (Quite OK Audio) format
 * Main entry point for npm package
 */

const QOADecoder = require('./src/qoa-decoder.js');
const { decodeToAudioBuffer } = require('./src/utils/decode-to-audio-buffer.js');

module.exports = {
    QOADecoder,
    decodeToAudioBuffer
};

// Also export as default for ES modules
module.exports.default = module.exports;
