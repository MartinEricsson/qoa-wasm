# QOA Decoder in WebAssembly

A WebAssembly decoder for the [QOA (Quite OK Audio)](https://qoaformat.org/) format, implemented in WebAssembly Text (WAT) format for use in web browsers.

## Overview

This is a decoder-only implementation. The encoder is not included in this project. This library assumes that the input is well formed, no validation of the data is performed when decoding.

## Building

### Prerequisites

- Node.js
- pnpm

### Build instructions

```bash
pnpm build
```


## Usage

Note that the Wasm runtime must support `multi value`.
