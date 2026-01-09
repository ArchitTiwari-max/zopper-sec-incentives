import { useState, useEffect, useRef } from 'react';
import { MdClose, MdUpload, MdCheckCircle, MdError, MdVideoCall } from 'react-icons/md';
// @ts-ignore
import ImageKit from 'imagekit-javascript';
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
  const [imagekit, setImagekit] = useState<any>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch ImageKit config
    fetch(`${API_BASE_URL}/imagekit-config`)
      .then(res => res.json())
      .then(data => {
        const ik = new ImageKit({
          publicKey: data.publicKey,
          urlEndpoint: data.urlEndpoint
        });
        setImagekit(ik);
      })
      .catch(err => {
        console.error('❌ Failed to fetch ImageKit config:', err);
        setError('Failed to connect to server. Please check ImageKit configuration in .env');
      });
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      // Create video element to check dimensions
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const aspectRatio = width / height;
        const duration = video.duration; // Get video duration in seconds

        // Check duration first (40 seconds to 2 minutes - displayed as 2 min but allows up to 2.5 min)
        if (duration < 40) {
          setError('Video is too short. Please upload a video between 40 seconds and 2 minutes.');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          URL.revokeObjectURL(video.src);
          return;
        }

        if (duration > 150) { // 2.5 minutes = 150 seconds (actual limit)
          setError('Video is too long. Please upload a video between 40 seconds and 2 minutes.');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          URL.revokeObjectURL(video.src);
          return;
        }

        // Check aspect ratio (reject landscape videos)
        if (aspectRatio > 1) {
          setError('Landscape videos are not allowed. Please record in portrait mode (9:16 ratio).');
          setSelectedFile(null);
          if (e.target) e.target.value = '';
          URL.revokeObjectURL(video.src);
          return;
        }

        // Video passed all validations
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const durationText = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
        
        setSelectedFile(file);
        setError(null);
        setStatusMessage(`✅ Video accepted: ${durationText} duration, portrait format`);
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        setSelectedFile(file);
        setError(null);
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    } else {
      setError('Please select a valid video file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !imagekit) return;

    if (!videoTitle.trim() || !videoDescription.trim()) {
      setError('Please fill in both title and description');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadSuccess(false);
    setStatusMessage('Uploading...');

    try {
      const authResponse = await fetch(`${API_BASE_URL}/imagekit-auth`);
      const authData = await authResponse.json();

      const uploadOptions = {
        file: selectedFile,
        fileName: selectedFile.name,
        folder: '/pitch-sultan-videos',
        useUniqueFileName: true,
        tags: ['pitch-sultan', 'battle'],
        token: authData.token,
        signature: authData.signature,
        expire: authData.expire
      };

      imagekit.upload(
        uploadOptions,
        async (err: any, result: any) => {
          if (err) {
            setError('Upload failed: ' + (err.message || 'Unknown error'));
            setUploading(false);
            return;
          }

          // Save to database
          try {
            if (!currentUserId) {
              setProgress(100);
              setStatusMessage('Upload successful!');
              setUploadSuccess(true);
              setUploading(false);

              if (onUploadSuccess) {
                onUploadSuccess({
                  fileId: result.fileId,
                  name: result.name,
                  url: result.url,
                  uploadedAt: new Date().toISOString()
                });
              }

              setTimeout(() => handleClose(), 2000);
              return;
            }

            const saveResponse = await fetch(`${API_BASE_URL}/pitch-sultan/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                secUserId: currentUserId,
                fileId: result.fileId,
                url: result.url,
                fileName: result.name,
                title: videoTitle,
                description: videoDescription,
                thumbnailUrl: result.thumbnailUrl || null,
                fileSize: result.size || null,
                tags: result.tags || []
              })
            });

            if (!saveResponse.ok) {
              throw new Error('Failed to save video to database');
            }

            const savedVideo = await saveResponse.json();
            setProgress(100);
            setStatusMessage('Upload successful!');
            setUploadSuccess(true);
            setUploading(false);

            if (onUploadSuccess) {
              onUploadSuccess(savedVideo.data);
            }

            setTimeout(() => handleClose(), 2000);
          } catch (dbError: any) {
            setError('Video uploaded but failed to save: ' + dbError.message);
            setUploading(false);
          }
        },
        (progressEvent: any) => {
          if (progressEvent && progressEvent.total) {
            const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(percentComplete);
            setStatusMessage(`Uploading: ${percentComplete}%`);
          }
        }
      );
    } catch (err: any) {
      setUploading(false);
      setError(err.message);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError(null);
      setStatusMessage('');
      setProgress(0);
      setUploadSuccess(false);
      setVideoTitle('');
      setVideoDescription('');
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
          {!uploading && (
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
                <span>☀️</span>
                <span>Good lighting & clear audio</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📐</span>
                <span>Keep camera steady</span>
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
                  <p className="text-gray-500 text-xs">Portrait mode only (9:16)</p>
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
                disabled={uploading || !imagekit}
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
              disabled={uploading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || !imagekit || uploadSuccess || !!error || !videoTitle.trim() || !videoDescription.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
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