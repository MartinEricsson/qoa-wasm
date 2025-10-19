# QOA Decoder in WebAssembly

A WebAssembly decoder for the [QOA (Quite OK Audio)](https://qoaformat.org/) format, implemented in WebAssembly Text (WAT) format for use in web browsers.

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

## Building

### Prerequisites

- Node.js
- pnpm

### Build instructions

```bash
pnpm install
pnpm build
```

## Usage

Note that the Wasm runtime must support `multi value`.

```javascript
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
await QOADecoder.init();

const audioContext = new AudioContext();
const response = await fetch('audio.qoa');
const qoaBuffer = await response.arrayBuffer();
const decoded = QOADecoder.decode(qoaBuffer);

// Decode to AudioBuffer using the utility helper
const { decodeToAudioBuffer } = window.QOAUtils; // available via src/utils/decode-to-audio-buffer.js
const audioBuffer = decodeToAudioBuffer(decoded, audioContext);

// Play the audio
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start();
```

## Demo

Run the web server and open the `demo.html`

```bash
pnpm serve
```
