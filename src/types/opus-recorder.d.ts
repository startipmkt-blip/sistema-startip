// Tipagem mínima para opus-recorder — grava direto em OGG Opus.
declare module 'opus-recorder' {
  interface RecorderOptions {
    encoderPath?: string;
    encoderSampleRate?: number;
    numberOfChannels?: number;
    streamPages?: boolean;
    encoderBitRate?: number;
    encoderApplication?: number;
    encoderComplexity?: number;
    resampleQuality?: number;
    monitorGain?: number;
    recordingGain?: number;
    bufferLength?: number;
    maxFramesPerPage?: number;
    mediaTrackConstraints?: boolean | MediaTrackConstraints;
    originalSampleRateOverride?: number;
    reuseWorker?: boolean;
    wavBitDepth?: number;
    mediaStream?: MediaStream;
  }

  export default class Recorder {
    constructor(options?: RecorderOptions);
    ondataavailable: (arrayBuffer: ArrayBuffer) => void;
    start(stream?: MediaStream): Promise<void>;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    close(): void;
  }
}
