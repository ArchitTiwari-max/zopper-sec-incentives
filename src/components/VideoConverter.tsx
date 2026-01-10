import { useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface VideoFormat {
  container: string;
  videoCodec: string;
  audioCodec: string;
  isCompatible: boolean;
}

export interface ConversionProgress {
  phase: 'loading' | 'analyzing' | 'converting' | 'complete';
  progress: number;
  message: string;
}

export class VideoConverter {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize FFmpeg.wasm with multiple fallback strategies
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    
    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      this.ffmpeg = new FFmpeg();
      
      // Set up logging for debugging
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      // Strategy 1: Try jsdelivr CDN (most reliable)
      try {
        console.log('🔄 Trying jsdelivr CDN...');
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
        
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        console.log('✅ FFmpeg loaded from jsdelivr CDN');
      } catch (jsdelivrError) {
        console.warn('❌ jsdelivr CDN failed:', jsdelivrError);
        
        // Strategy 2: Try unpkg CDN
        try {
          console.log('🔄 Trying unpkg CDN...');
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          console.log('✅ FFmpeg loaded from unpkg CDN');
        } catch (unpkgError) {
          console.warn('❌ unpkg CDN failed:', unpkgError);
          
          // Strategy 3: Try local files
          try {
            console.log('🔄 Trying local files...');
            await this.ffmpeg.load({
              coreURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',
              wasmURL: '/node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
            });
            
            console.log('✅ FFmpeg loaded from local files');
          } catch (localError) {
            console.error('❌ All loading strategies failed');
            throw new Error('Unable to load FFmpeg from any source. Please check your internet connection and try refreshing the page.');
          }
        }
      }

      this.isLoaded = true;
      console.log('✅ FFmpeg.wasm initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FFmpeg:', error);
      this.isLoaded = false;
      this.ffmpeg = null;
      this.initializationPromise = null;
      throw new Error(`Failed to initialize video converter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect video format without requiring ffmpeg initialization
   */
  async detectFormat(file: File): Promise<VideoFormat> {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = file.type.toLowerCase();

      console.log(`🔍 Detecting format for: ${file.name} (${mimeType})`);

      // Expanded compatibility - accept more formats as "compatible"
      const isMP4 = extension === 'mp4' || mimeType.includes('mp4');
      const isWebM = extension === 'webm' || mimeType.includes('webm');
      const isMOV = extension === 'mov' || mimeType.includes('quicktime');
      const isAVI = extension === 'avi' || mimeType.includes('avi');
      
      // For now, consider MP4, WebM, and MOV as compatible to avoid conversion
      // This allows users to upload videos even if ffmpeg fails
      const isCompatible = isMP4 || isWebM || isMOV;

      const format: VideoFormat = {
        container: extension || 'unknown',
        videoCodec: isCompatible ? (isMP4 ? 'h264' : isWebM ? 'vp8' : 'h264') : 'unknown',
        audioCodec: isCompatible ? (isMP4 ? 'aac' : isWebM ? 'opus' : 'aac') : 'unknown',
        isCompatible
      };

      console.log(`📋 Format detected:`, format);
      return format;

    } catch (error) {
      console.error('Format detection failed:', error);
      // Fallback: assume compatible to avoid conversion issues
      return {
        container: 'unknown',
        videoCodec: 'h264',
        audioCodec: 'aac',
        isCompatible: true // ✅ Assume compatible when in doubt
      };
    }
  }

  /**
   * Check if video needs conversion
   */
  needsConversion(format: VideoFormat): boolean {
    return !format.isCompatible;
  }

  /**
   * Convert video to MP4 with H.264 and AAC
   */
  async convertToMp4(
    file: File,
    onProgress: (progress: ConversionProgress) => void
  ): Promise<Blob> {
    // Initialize ffmpeg only when conversion is actually needed
    if (!this.ffmpeg || !this.isLoaded) {
      onProgress({
        phase: 'loading',
        progress: 0,
        message: 'Initializing video converter...'
      });
      
      try {
        await this.initialize();
      } catch (initError) {
        // If ffmpeg fails to initialize, provide helpful error message
        console.error('FFmpeg initialization failed:', initError);
        throw new Error(
          'Video conversion is currently unavailable. ' +
          'Please try uploading an MP4 file instead, or check your internet connection and refresh the page.'
        );
      }
    }

    try {
      onProgress({
        phase: 'loading',
        progress: 10,
        message: 'Preparing video for conversion...'
      });

      // Write input file to FFmpeg filesystem
      await this.ffmpeg!.writeFile('input', await fetchFile(file));

      onProgress({
        phase: 'analyzing',
        progress: 20,
        message: 'Analyzing video format...'
      });

      // Set up progress monitoring
      this.ffmpeg!.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        onProgress({
          phase: 'converting',
          progress: Math.min(progressPercent, 95),
          message: `Converting to MP4... ${progressPercent}%`
        });
      });

      onProgress({
        phase: 'converting',
        progress: 30,
        message: 'Starting conversion...'
      });

      // Convert to MP4 with mobile-optimized settings
      await this.ffmpeg!.exec([
        '-i', 'input',
        '-c:v', 'libx264',           // H.264 video codec
        '-c:a', 'aac',               // AAC audio codec
        '-preset', 'fast',           // Faster encoding
        '-crf', '23',                // Good quality/size balance
        '-maxrate', '2M',            // Max bitrate for mobile
        '-bufsize', '4M',            // Buffer size
        '-vf', 'scale=720:-2',       // Scale to 720p width, maintain aspect ratio
        '-movflags', '+faststart',   // Enable fast start for web playback
        '-f', 'mp4',                 // Output format
        'output.mp4'
      ]);

      onProgress({
        phase: 'complete',
        progress: 100,
        message: 'Conversion complete!'
      });

      // Read the output file
      const data = await this.ffmpeg!.readFile('output.mp4');
      
      // Clean up files
      await this.ffmpeg!.deleteFile('input');
      await this.ffmpeg!.deleteFile('output.mp4');

      // Convert to Blob
      const blob = new Blob([data as any], { type: 'video/mp4' });
      return blob;

    } catch (error) {
      console.error('Video conversion failed:', error);
      throw new Error(
        'Video conversion failed. Please try uploading an MP4 file instead, ' +
        'or check your internet connection and refresh the page.'
      );
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
      this.initializationPromise = null;
    }
  }
}

// Hook for using VideoConverter in React components
export const useVideoConverter = () => {
  const [converter] = useState(() => new VideoConverter());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      await converter.initialize();
      setIsInitialized(true);
      setInitError(null);
    } catch (error) {
      setInitError(error instanceof Error ? error.message : 'Failed to initialize converter');
    }
  }, [converter, isInitialized]);

  const detectFormat = useCallback(async (file: File) => {
    // Format detection doesn't require initialization
    return converter.detectFormat(file);
  }, [converter]);

  const convertVideo = useCallback(async (
    file: File,
    onProgress: (progress: ConversionProgress) => void
  ) => {
    return converter.convertToMp4(file, onProgress);
  }, [converter]);

  return {
    detectFormat,
    convertVideo,
    needsConversion: converter.needsConversion.bind(converter),
    cleanup: converter.cleanup.bind(converter),
    isInitialized,
    initError
  };
};