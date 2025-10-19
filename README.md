# QOA Decoder in WebAssembly

A WebAssembly decoder for the [QOA (Quite OK Audio)](https://qoaformat.org/) format, implemented in WebAssembly Text (WAT) format for use in web browsers and Node.js.

**[🎵 Try the Live Demo](https://martinericsson.github.io/qoa-wasm/)**

## Overview

This is a decoder-only implementation. The encoder is not included in this project. 

Note: This library assumes that the input is well formed, no validation of the data is performed when decoding. There are no checks for
- Magic number verification
- Minimum file size requirements
- Zero or invalid values for channels, sample rate, or sample counts
- Frame header consistency checks

The goal for this projects is size of the decoder, currently sitting at
* Original:  1.17 KB (1195 bytes)
* Gzipped:   887 bytes (887 bytes)

## Installation

```bash
npm install qoa-wasm
```

or

```bash
pnpm add qoa-wasm
```

or

```bash
yarn add qoa-wasm
```

## Building from Source

### Prerequisites

- Node.js
- pnpm

### Build instructions

```bash
pnpm install
pnpm build
```

## Usage

### In Node.js

```javascript
const { QOADecoder } = require('qoa-wasm');
const fs = require('fs');
const path = require('path');

// Initialize the decoder once
await QOADecoder.init();

// Load and decode a QOA file
const qoaBuffer = fs.readFileSync(path.join(__dirname, 'audio.qoa'));
const decoded = QOADecoder.decode(qoaBuffer);

console.log('Channels:', decoded.channels);
console.log('Sample Rate:', decoded.sampleRate);
console.log('Samples per channel:', decoded.samplesPerChannel);
console.log('PCM samples:', decoded.samples); // Int16Array
```

### In the Browser

Note that the Wasm runtime must support `multi value`.

```javascript
import { QOADecoder, decodeToAudioBuffer } from 'qoa-wasm';

// Initialize the decoder once
await QOADecoder.init();

// Load and decode a QOA file
const response = await fetch('audio.qoa');
const qoaBuffer = await response.arrayBuffer();
const decoded = QOADecoder.decode(qoaBuffer);

console.log('Channels:', decoded.channels);
console.log('Sample Rate:', decoded.sampleRate);
console.log('Samples per channel:', decoded.samplesPerChannel);
console.log('PCM samples:', decoded.samples); // Int16Array
```

### Using with Web Audio API

```javascript
import { QOADecoder, decodeToAudioBuffer } from 'qoa-wasm';

await QOADecoder.init();

const audioContext = new AudioContext();
const response = await fetch('audio.qoa');
const qoaBuffer = await response.arrayBuffer();
const decoded = QOADecoder.decode(qoaBuffer);

// Decode to AudioBuffer using the utility helper
const audioBuffer = decodeToAudioBuffer(decoded, audioContext);

// Play the audio
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start();
```

### Using Script Tags (UMD)

```html
<script src="node_modules/qoa-wasm/src/qoa-decoder.js"></script>
<script src="node_modules/qoa-wasm/src/utils/decode-to-audio-buffer.js"></script>
<script>
  // Initialize the decoder
  QOADecoder.init().then(() => {
    // Load and decode
    fetch('audio.qoa')
      .then(response => response.arrayBuffer())
      .then(qoaBuffer => {
        const decoded = QOADecoder.decode(qoaBuffer);
        console.log('Decoded:', decoded);
        
        // Convert to AudioBuffer
        const audioContext = new AudioContext();
        const audioBuffer = QOAUtils.decodeToAudioBuffer(decoded, audioContext);
        
        // Play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      });
  });
</script>
```

## Demo

**[🎵 Try the Live Demo](https://martinericsson.github.io/qoa-wasm/)**

Or run it locally:

```bash
pnpm serve
```

Then open http://localhost:8080 in your browser.

## Contributing

See [PUBLISHING.md](./PUBLISHING.md) for information about the release process and how to create changesets.

## License

ISC License - see [LICENSE](./LICENSE) file for details.
