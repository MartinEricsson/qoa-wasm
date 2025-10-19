; (function (globalScope) {
    if (globalScope?.QOAUtils?.decodeToAudioBuffer) {
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { decodeToAudioBuffer: globalScope.QOAUtils.decodeToAudioBuffer };
        }
        return;
    }

    /**
     * Convert decoded QOA PCM data into a Web Audio API AudioBuffer.
     * @param {Object} decoded - The decoded QOA data from the main library.
     * @param {Int16Array} decoded.samples - Interleaved PCM samples.
     * @param {number} decoded.channels - Number of channels in the audio stream.
     * @param {number} decoded.sampleRate - Sample rate in Hz.
     * @param {number} decoded.samplesPerChannel - Number of samples per channel.
     * @param {AudioContext} audioContext - A Web Audio API AudioContext instance.
     * @returns {AudioBuffer} The created AudioBuffer populated with the decoded samples.
     */
    function decodeToAudioBuffer(decoded, audioContext) {
        if (!decoded || typeof decoded !== 'object') {
            throw new TypeError('Expected decoded QOA data object');
        }

        const { samples, channels, sampleRate, samplesPerChannel } = decoded;

        if (!(samples instanceof Int16Array)) {
            throw new TypeError('decoded.samples must be an Int16Array');
        }
        if (typeof channels !== 'number' || channels <= 0) {
            throw new RangeError('decoded.channels must be a positive number');
        }
        if (typeof sampleRate !== 'number' || sampleRate <= 0) {
            throw new RangeError('decoded.sampleRate must be a positive number');
        }
        if (typeof samplesPerChannel !== 'number' || samplesPerChannel <= 0) {
            throw new RangeError('decoded.samplesPerChannel must be a positive number');
        }
        if (!audioContext) {
            throw new TypeError('audioContext is required');
        }

        const audioBuffer = audioContext.createBuffer(channels, samplesPerChannel, sampleRate);

        for (let channel = 0; channel < channels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < samplesPerChannel; i++) {
                const sample = samples[i * channels + channel] / 32768.0;
                channelData[i] = Math.max(-1.0, Math.min(1.0, sample));
            }
        }

        return audioBuffer;
    }

    const utilsApi = { decodeToAudioBuffer };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = utilsApi;
    }

    if (globalScope) {
        const existing = globalScope.QOAUtils || {};
        globalScope.QOAUtils = Object.assign({}, existing, utilsApi);
    }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : global);
