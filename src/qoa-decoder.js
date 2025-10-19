/**
 * QOA (Quite OK Audio) Decoder for the Browser
 * 
 * A WebAssembly-based decoder for the QOA audio format.
 * See: https://qoaformat.org/
 */

; (function (globalScope) {
  let wasmExports = null;
  let wasmMemory = null;

  /**
   * Check if the decoder has been initialized.
   * @returns {boolean}
   */
  function isInitialized() {
    return wasmExports !== null && wasmMemory !== null;
  }

  /**
   * Initialize the decoder by loading the WebAssembly module
   * @returns {Promise<void>}
   */
  async function init() {
    if (isInitialized()) {
      return;
    }

    const response = await fetch('src/qoa-decoder.wasm');
    const wasmBuffer = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(wasmBuffer);

    // Create memory to be imported by the WASM module
    // Small initial memory; will grow on demand during decode
    wasmMemory = new WebAssembly.Memory({ initial: 4 });
    const importObject = {
      e: { m: wasmMemory }
    };

    const instance = await WebAssembly.instantiate(wasmModule, importObject);

    wasmExports = instance.exports;
  }

  function ensureInitialized() {
    if (!isInitialized()) {
      throw new Error('Decoder not initialized. Call init() first.');
    }
  }

  /**
   * Decode a QOA audio buffer
   * @param {ArrayBuffer} qoaBuffer - The QOA encoded audio data
   * @returns {Object} Decoded audio data with format information
   *   - {Int16Array} samples - Interleaved PCM samples
   *   - {number} channels - Number of audio channels
   *   - {number} sampleRate - Sample rate in Hz
   *   - {number} samplesPerChannel - Number of samples per channel
   */
  function decode(qoaBuffer) {
    ensureInitialized();

    const inputSize = qoaBuffer.byteLength;
    const inputPtr = 4096;
    const estimatedOutputSize = inputSize * 6;
    const outputPtr = inputPtr + inputSize + 1024;
    const totalNeeded = outputPtr + estimatedOutputSize;
    const totalPagesNeeded = Math.ceil(totalNeeded / 65536);

    if (wasmMemory.buffer.byteLength < totalPagesNeeded * 65536) {
      const currentPages = wasmMemory.buffer.byteLength / 65536;
      wasmMemory.grow(totalPagesNeeded - currentPages);
    }

    const memoryView = new Uint8Array(wasmMemory.buffer);
    const inputArray = new Uint8Array(qoaBuffer);
    memoryView.set(inputArray, inputPtr);

    const decodeResult = wasmExports.d(inputPtr, inputSize, outputPtr);
    const [samplesPerChannel, channels, sampleRate] = Array.isArray(decodeResult)
      ? decodeResult
      : [decodeResult, 0, 0];

    if (samplesPerChannel === 0 || channels === 0 || sampleRate === 0) {
      throw new Error('Failed to decode QOA data');
    }

    const totalSamples = samplesPerChannel * channels;
    const outputView = new Int16Array(wasmMemory.buffer, outputPtr, totalSamples);
    const samples = new Int16Array(totalSamples);
    samples.set(outputView);

    return {
      samples,
      channels,
      sampleRate,
      samplesPerChannel
    };
  }

  /**
   * Reset the decoder state. Mainly useful for tests.
   */
  function reset() {
    wasmExports = null;
    wasmMemory = null;
  }

  const decoderApi = {
    init,
    decode,
    isInitialized,
    reset
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = decoderApi;
  }

  if (globalScope) {
    globalScope.QOADecoder = decoderApi;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : global);
