import { useState, useEffect, useRef } from 'react';
import { MdClose, MdUpload, MdCheckCircle, MdError, MdVideoCall } from 'react-icons/md';
import { useVideoConverter, ConversionProgress } from './VideoConverter';
import { useUploadManager, UploadProgress } from './UploadManager';
import { API_BASE_URL } from '@/lib/config';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (videoData: any) => void;
  currentUserId?: string; // Pitch Sultan user ID
}

export const VideoUploadModal = ({ isOpen, onClose, onUploadSuccess, currentUserId }: VideoUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [needsConversion, setNeedsConversion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use our new hooks
  const { detectFormat, convertVideo, needsConversion: checkNeedsConversion, initError } = useVideoConverter();
  const { uploadWithRetry, saveVideoMetadata } = useUploadManager();

  useEffect(() => {
    if (!isOpen) return;

    // Reset state when modal opens
    setError(null);
    setStatusMessage('');
    setProgress(0);
    setIsConverting(false);
    setNeedsConversion(false);

    // Check for initialization errors
    if (initError) {
      setError(initError);
    }
  }, [isOpen, initError]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      // Check file size first (50MB limit)
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSizeInBytes) {
        setError('File size too large. Please upload a video smaller than 50MB.');
        setSelectedFile(null);
        if (e.target) e.target.value = '';
        return;
      }

      // Create video element to check dimensions
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      let blobUrl: string | null = null;

      const cleanup = () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
      };

      video.onloadedmetadata = async () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const aspectRatio = width / height;
        const duration = video.duration; // Get video duration in seconds

        // Check duration first (40 seconds to 2 minutes - displayed as 2 min but allows up to 2.5 min)
        if (duration < 40) {
          setError('Video is too short. Please upload a video between 40 seconds and 2 minutes.');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          cleanup();
          return;
        }

        if (duration > 150) { // 2.5 minutes = 150 seconds (actual limit)
          setError('Video is too long. Please upload a video between 40 seconds and 2 minutes.');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          cleanup();
          return;
        }

        // Check aspect ratio (reject landscape videos)
        if (aspectRatio > 1) {
          setError('Landscape videos are not allowed. Please record in portrait mode (9:16 ratio).');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          cleanup();
          return;
        }

        // Video passed basic validations, now check format
        try {
          const format = await detectFormat(file);
          const needsConv = checkNeedsConversion(format);
          setNeedsConversion(needsConv);

          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          const durationText = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
          
          setSelectedFile(file);
          setError(null);
          
          if (needsConv) {
            setStatusMessage(`✅ Video accepted: ${durationText} duration, portrait format. Will be converted to MP4.`);
          } else {
            setStatusMessage(`✅ Video accepted: ${durationText} duration, portrait format, MP4 format.`);
          }
        } catch (formatError) {
          console.warn('Format detection failed, assuming conversion needed:', formatError);
          setNeedsConversion(true);
          
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          const durationText = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
          
          setSelectedFile(file);
          setError(null);
          setStatusMessage(`✅ Video accepted: ${durationText} duration, portrait format. Will be converted to MP4.`);
        }
        
        // Clean up after a short delay to ensure video element is done
        setTimeout(cleanup, 100);
      };

      video.onerror = () => {
        setSelectedFile(file);
        setError(null);
        setNeedsConversion(true); // Assume needs conversion if we can't read metadata
        setStatusMessage('✅ Video accepted. Will be converted to MP4.');
        cleanup();
      };

      // Create blob URL and assign it
      blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;
    } else {
      setError('Please select a valid video file');
      setSelectedFile(null);
    }
  };

  const generateThumbnail = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Seek to 1 second to get a better frame than the first black frame
        video.currentTime = 1;
      };

      video.onseeked = () => {
        try {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to blob (JPEG format, 85% quality)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to generate thumbnail blob'));
              }
              // Clean up
              URL.revokeObjectURL(video.src);
            },
            'image/jpeg',
            0.85
          );
        } catch (error) {
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      // Load the video
      video.src = URL.createObjectURL(videoBlob);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!videoTitle.trim() || !videoDescription.trim()) {
      setError('Please fill in both title and description');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadSuccess(false);
    setStatusMessage('Starting upload...');

    try {
      let fileToUpload: Blob = selectedFile;
      let fileName = selectedFile.name;

      // Step 1: Convert video if needed
      if (needsConversion) {
        setIsConverting(true);
        setStatusMessage('Converting video to MP4...');
        
        fileToUpload = await convertVideo(selectedFile, (conversionProgress: ConversionProgress) => {
          setProgress(Math.round(conversionProgress.progress * 0.6)); // Conversion takes 60% of progress
          setStatusMessage(conversionProgress.message);
        });

        // Update filename to .mp4
        fileName = fileName.replace(/\.[^/.]+$/, '.mp4');
        setIsConverting(false);
      }

      // Step 2: Generate thumbnail from video
      setStatusMessage('Generating thumbnail...');
      setProgress(needsConversion ? 60 : 5);
      
      let thumbnailUrl: string | undefined;
      try {
        const thumbnailBlob = await generateThumbnail(fileToUpload);
        const thumbnailFileName = fileName.replace(/\.[^/.]+$/, '.jpg');
        
        setStatusMessage('Uploading thumbnail...');
        thumbnailUrl = await uploadWithRetry(
          thumbnailBlob,
          thumbnailFileName,
          'image/jpeg',
          (uploadProgress: UploadProgress) => {
            const baseProgress = needsConversion ? 60 : 5;
            const thumbnailProgressPercent = Math.round((uploadProgress.percentage * 0.1));
            setProgress(baseProgress + thumbnailProgressPercent);
          }
        );
      } catch (thumbnailError) {
        console.warn('Thumbnail generation failed, continuing without thumbnail:', thumbnailError);
        // Continue without thumbnail - not critical
      }

      // Step 3: Upload video to S3
      setStatusMessage('Uploading video to cloud...');
      const finalFileUrl = await uploadWithRetry(
        fileToUpload,
        fileName,
        'video/mp4',
        (uploadProgress: UploadProgress) => {
          const baseProgress = needsConversion ? 70 : 15;
          const uploadProgressPercent = Math.round((uploadProgress.percentage * (needsConversion ? 0.25 : 0.8)));
          setProgress(baseProgress + uploadProgressPercent);
          setStatusMessage(`Uploading video: ${uploadProgress.percentage}%`);
        }
      );

      // Step 4: Save metadata to database
      setStatusMessage('Saving video information...');
      setProgress(95);

      if (!currentUserId) {
        // No user ID - just show success
        setProgress(100);
        setStatusMessage('Upload successful!');
        setUploadSuccess(true);
        setUploading(false);

        if (onUploadSuccess) {
          onUploadSuccess({
            url: finalFileUrl,
            fileName: fileName,
            uploadedAt: new Date().toISOString()
          });
        }

        setTimeout(() => handleClose(), 3000);
        return;
      }

      // Save to database with user ID
      const savedVideo = await saveVideoMetadata({
        url: finalFileUrl,
        fileName: fileName,
        title: videoTitle,
        description: videoDescription,
        fileSize: selectedFile.size,
        thumbnailUrl: thumbnailUrl // Include the generated thumbnail URL
      }, currentUserId);

      setProgress(100);
      setStatusMessage('Upload successful!');
      setUploadSuccess(true);
      setUploading(false);

      if (onUploadSuccess) {
        onUploadSuccess(savedVideo);
      }

      // Show success notification
      setTimeout(() => {
        alert('🎉 Video uploaded successfully!\n\n📋 Your video is now under review and will appear on the feed once approved by our admin team.\n\n👀 You can check the status in your Profile > Manage tab.');
      }, 500);

      // Auto close after success
      setTimeout(() => handleClose(), 3000);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploading(false);
      setIsConverting(false);
      
      // Provide more helpful error messages
      let errorMessage = 'Upload failed. Please try again.';
      
      if (err.message && err.message.includes('Video conversion')) {
        errorMessage = '⚠️ Video conversion is currently unavailable.\n\n💡 Try uploading an MP4 file instead, or check your internet connection and refresh the page.';
      } else if (err.message && err.message.includes('FFmpeg')) {
        errorMessage = '⚠️ Video converter is having issues.\n\n💡 Please try uploading an MP4 file directly, or refresh the page and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setStatusMessage('');
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading && !isConverting) {
      setSelectedFile(null);
      setError(null);
      setStatusMessage('');
      setProgress(0);
      setUploadSuccess(false);
      setVideoTitle('');
      setVideoDescription('');
      setIsConverting(false);
      setNeedsConversion(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1a1a] w-full max-w-md rounded-2xl max-h-[90vh] relative flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MdVideoCall className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Upload Video</h2>
              <p className="text-gray-400 text-xs sm:text-sm">Share your pitch with the community</p>
            </div>
          </div>
          {!uploading && !isConverting && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition p-2 -m-2"
            >
              <MdClose className="text-xl" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Pro Tips */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
              💡 Video Requirements
            </h4>
            <div className="grid grid-cols-1 gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span>Duration: 40 seconds to 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span>Portrait mode only (9:16 ratio)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>File size: Maximum 50MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <span>Auto-converts to MP4 for compatibility</span>
              </div>
              <div className="flex items-center gap-2">
                <span>☀️</span>
                <span>Good lighting & clear audio</span>
              </div>
            </div>
          </div>

          {/* Status/Progress */}
          {(statusMessage || error) && (
            <div className={`p-3 rounded-xl flex items-center gap-3 ${
              uploadSuccess ? 'bg-green-900/30 text-green-400' :
              error ? 'bg-red-900/30 text-red-400' :
              'bg-blue-900/30 text-blue-400'
            }`}>
              {uploadSuccess && <MdCheckCircle className="text-lg flex-shrink-0" />}
              {error && <MdError className="text-lg flex-shrink-0" />}
              {!error && !uploadSuccess && progress > 0 && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <span className="text-sm">{error || statusMessage}</span>
            </div>
          )}

          {/* Progress Bar */}
          {progress > 0 && progress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Video File
              </label>
              
              {!selectedFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all"
                >
                  <MdUpload className="text-3xl text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-300 text-sm mb-1">Tap to select video</p>
                  <p className="text-gray-500 text-xs">Portrait mode • Max 50MB</p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MdVideoCall className="text-white text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-gray-400 text-xs">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB • Portrait format ✓
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <MdClose className="text-lg" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={uploading || isConverting}
                className="hidden"
              />
            </div>

            {/* Title & Description - Only show when file selected */}
            {selectedFile && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter video title"
                    maxLength={100}
                    className="w-full p-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {videoTitle.length}/100 characters
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video Description *
                  </label>
                  <textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Describe your pitch..."
                    rows={3}
                    maxLength={500}
                    className="w-full p-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {videoDescription.length}/500 characters
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-800">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={uploading || isConverting}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || isConverting || uploadSuccess || !!error || !videoTitle.trim() || !videoDescription.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {uploading || isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isConverting ? 'Converting...' : 'Uploading...'}
                </>
              ) : uploadSuccess ? (
                <>
                  <MdCheckCircle className="text-lg" />
                  Uploaded!
                </>
              ) : (
                <>
                  <MdUpload className="text-lg" />
                  Upload Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};