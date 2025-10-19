/**
 * QOA-WASM TypeScript definitions
 */

/**
 * Decoded QOA audio data
 */
export interface DecodedQOA {
    /** Interleaved PCM samples as 16-bit signed integers */
    samples: Int16Array;
    /** Number of audio channels */
    channels: number;
    /** Sample rate in Hz */
    sampleRate: number;
    /** Number of samples per channel */
    samplesPerChannel: number;
}

/**
 * QOA Decoder API
 */
export interface QOADecoderAPI {
    /**
     * Initialize the decoder by loading the WebAssembly module.
     * Must be called before using decode().
     * @returns Promise that resolves when initialization is complete
     */
    init(): Promise<void>;

    /**
     * Check if the decoder has been initialized.
     * @returns true if initialized, false otherwise
     */
    isInitialized(): boolean;

    /**
     * Decode a QOA audio buffer
     * @param qoaBuffer - The QOA encoded audio data
     * @returns Decoded audio data with format information
     * @throws Error if decoder not initialized or decoding fails
     */
    decode(qoaBuffer: ArrayBuffer): DecodedQOA;

    /**
     * Reset the decoder state. Mainly useful for tests.
     */
    reset(): void;
}

/**
 * Convert decoded QOA PCM data into a Web Audio API AudioBuffer.
 * @param decoded - The decoded QOA data
 * @param audioContext - A Web Audio API AudioContext instance
 * @returns The created AudioBuffer populated with the decoded samples
 * @throws TypeError if parameters are invalid
 */
export function decodeToAudioBuffer(
    decoded: DecodedQOA,
    audioContext: AudioContext
): AudioBuffer;

/**
 * QOA Decoder instance
 */
export const QOADecoder: QOADecoderAPI;

/**
 * Default export containing both QOADecoder and decodeToAudioBuffer
 */
declare const _default: {
    QOADecoder: QOADecoderAPI;
    decodeToAudioBuffer: typeof decodeToAudioBuffer;
};

export default _default;
