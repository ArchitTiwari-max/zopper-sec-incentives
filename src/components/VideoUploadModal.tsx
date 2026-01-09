import { useState, useEffect, useRef } from 'react';
import { MdClose, MdUpload, MdCheckCircle, MdError } from 'react-icons/md';
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
  const [videoTitle, setVideoTitle] = useState(''); // Add title state
  const [videoDescription, setVideoDescription] = useState(''); // Add description state
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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
    console.log('🎬 File selected:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      sizeMB: file ? (file.size / 1024 / 1024).toFixed(2) : 'N/A'
    });

    if (file && file.type.startsWith('video/')) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);

      // Create video element to check dimensions
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const aspectRatio = width / height;
        const idealRatio = 9 / 16; // 0.5625
        const tolerance = 0.1; // Allow some tolerance

        console.log('📐 Video dimensions:', { width, height, aspectRatio, idealRatio });

        // Reject landscape videos (aspect ratio > 1)
        if (aspectRatio > 1) {
          console.log('❌ Landscape video rejected');
          setError('❌ Landscape videos are not allowed. Please record in vertical/portrait mode (9:16 ratio) for shorts.');
          setStatusMessage('');
          setSelectedFile(null);
          setUploadSuccess(false);

          // Clear title and description when file is rejected
          setVideoTitle('');
          setVideoDescription('');
          if (titleRef.current) titleRef.current.value = '';
          if (descriptionRef.current) descriptionRef.current.value = '';

          // Clear the file input
          if (e.target) {
            e.target.value = '';
          }

          // Clean up
          URL.revokeObjectURL(video.src);
          return;
        }

        // Check if aspect ratio is close to 9:16 (ideal)
        if (Math.abs(aspectRatio - idealRatio) <= tolerance) {
          setStatusMessage(`✅ Perfect! ${file.name} (${sizeMB}MB) - Great for shorts!`);
          setError(null);
          console.log('✅ Perfect 9:16 ratio video accepted');
        } else {
          // Portrait but not ideal ratio - still accept but with note
          setStatusMessage(`📱 ${file.name} (${sizeMB}MB) - Portrait video (good for shorts)`);
          setError(null);
          console.log('✅ Portrait video accepted (not perfect ratio)');
        }

        setSelectedFile(file);
        setUploadSuccess(false);

        // Clear title and description when new file is selected
        setVideoTitle('');
        setVideoDescription('');

        // Clean up
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        console.log('❌ Could not analyze video dimensions - accepting file');
        setStatusMessage(`Selected: ${file.name} (${sizeMB}MB) - Could not verify format`);
        setSelectedFile(file);
        setError(null);
        setUploadSuccess(false);

        // Clear title and description when new file is selected
        setVideoTitle('');
        setVideoDescription('');
        if (titleRef.current) titleRef.current.value = '';
        if (descriptionRef.current) descriptionRef.current.value = '';

        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    } else {
      console.log('❌ Invalid file type or no file selected');
      setError('Please select a valid video file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !imagekit) return;

    // Simple validation - just check if fields have content
    if (!videoTitle.trim() || !videoDescription.trim()) {
      setError('Please fill in both title and description');
      return;
    }

    console.log('🚀 Starting upload process:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      currentUserId,
      imagekitReady: !!imagekit
    });

    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadSuccess(false);
    setStatusMessage('Getting authentication...');

    try {
      console.log('🔐 Fetching ImageKit auth from:', `${API_BASE_URL}/imagekit-auth`);
      const authResponse = await fetch(`${API_BASE_URL}/imagekit-auth`);
      const authData = await authResponse.json();
      console.log('✅ Auth data received:', {
        hasToken: !!authData.token,
        hasSignature: !!authData.signature,
        expire: authData.expire
      });

      setStatusMessage('Uploading to ImageKit...');

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

      console.log('📤 Upload options:', {
        fileName: uploadOptions.fileName,
        folder: uploadOptions.folder,
        useUniqueFileName: uploadOptions.useUniqueFileName,
        tags: uploadOptions.tags
      });

      imagekit.upload(
        uploadOptions,
        async (err: any, result: any) => {
          if (err) {
            console.error('❌ Upload error:', err);
            setError('Upload failed: ' + (err.message || JSON.stringify(err)));
            setStatusMessage('Upload failed');
            setUploading(false);
            return;
          }

          console.log('✅ ImageKit upload successful:', {
            fileId: result.fileId,
            name: result.name,
            url: result.url,
            size: result.size
          });

          // Save to database
          try {
            setStatusMessage('Saving to database...');

            // Check if we have a user ID
            if (!currentUserId) {
              console.warn('⚠️ No user account found. Please complete setup at /pitchsultan/setup to save videos to your profile.');
              setProgress(100);
              setStatusMessage('Upload successful! (Not linked to user)');
              setUploadSuccess(true);
              setUploading(false);

              // Call success callback with ImageKit data only
              if (onUploadSuccess) {
                console.log('📞 Calling onUploadSuccess callback (no user)');
                onUploadSuccess({
                  fileId: result.fileId,
                  name: result.name,
                  url: result.url,
                  uploadedAt: new Date().toISOString()
                });
              }

              setTimeout(() => {
                handleClose();
              }, 2000);
              return;
            }

            console.log('💾 Saving to database for user:', currentUserId);
            const saveResponse = await fetch(`${API_BASE_URL}/pitch-sultan/videos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                secUserId: currentUserId,
                fileId: result.fileId,
                url: result.url,
                fileName: result.name,
                title: videoTitle || result.name, // Use title if provided, fallback to filename
                description: videoDescription || null, // Add description
                thumbnailUrl: result.thumbnailUrl || null,
                fileSize: result.size || null,
                tags: result.tags || []
              })
            });

            if (!saveResponse.ok) {
              throw new Error('Failed to save video to database');
            }

            const savedVideo = await saveResponse.json();
            console.log('✅ Video saved to database:', savedVideo.data);

            setProgress(100);
            setStatusMessage('Upload successful!');
            setUploadSuccess(true);
            setUploading(false);

            // Call success callback with database video data
            if (onUploadSuccess) {
              console.log('📞 Calling onUploadSuccess callback (with user)');
              onUploadSuccess(savedVideo.data);
            }

            // Auto close after 2 seconds
            setTimeout(() => {
              handleClose();
            }, 2000);
          } catch (dbError: any) {
            console.error('❌ Database save error:', dbError);
            setError('Video uploaded but failed to save to database: ' + dbError.message);
            setUploading(false);
          }
        },
        (progressEvent: any) => {
          if (progressEvent && progressEvent.total) {
            const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(percentComplete);
            setStatusMessage(`Uploading: ${percentComplete}%`);
            console.log(`📊 Upload progress: ${percentComplete}%`);
          }
        }
      );
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      setUploading(false);
      setError(err.message);
      setStatusMessage('Error: ' + err.message);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError(null);
      setStatusMessage('');
      setProgress(0);
      setUploadSuccess(false);
      setVideoTitle(''); // Reset title
      setVideoDescription(''); // Reset description
      // Clear the input refs
      if (titleRef.current) titleRef.current.value = '';
      if (descriptionRef.current) descriptionRef.current.value = '';
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#282828] rounded-xl w-full max-w-lg max-h-[90vh] relative flex flex-col">
        {/* Close button - Fixed at top */}
        {!uploading && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10"
          >
            <MdClose className="text-2xl" />
          </button>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 pr-12">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Upload Video</h2>
            <p className="text-gray-400 text-sm">Share your pitch with the Pitch Sultan community</p>
          </div>

          {/* Visual Guidelines for 9:16 Ratio */}
          <div className="mb-6 p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30">
            <div className="flex items-center gap-4">
              {/* Phone Orientation Visual */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {/* Phone Frame */}
                  <div className="w-12 h-20 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center relative">
                    {/* Screen */}
                    <div className="w-8 h-16 bg-blue-500 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-4 bg-white rounded-sm opacity-80"></div>
                    </div>
                    {/* Home button */}
                    <div className="absolute bottom-1 w-3 h-1 bg-gray-600 rounded-full"></div>
                  </div>
                  {/* Checkmark */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              </div>

              {/* Guidelines Text */}
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  📱 Required Format
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span>Hold phone vertically (9:16 ratio)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span>Portrait mode only</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>Landscape videos rejected</span>
                  </div>
                </div>
              </div>

              {/* 9:16 Aspect Ratio Visual */}
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-28 bg-gradient-to-b from-blue-500 to-purple-600 rounded-lg border-2 border-white/20 flex items-center justify-center mb-2">
                  <div className="text-white text-xs font-bold transform -rotate-90">9:16</div>
                </div>
                <p className="text-xs text-gray-400">Required</p>
              </div>
            </div>
          </div>

          {/* Recording Tips */}
          <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
            <h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
              💡 Pro Tips for Great Videos
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span>🔆</span>
                <span>Good lighting</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🎤</span>
                <span>Clear audio</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📐</span>
                <span>Steady hands</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span>Keep it short</span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${uploadSuccess ? 'bg-green-900/30 text-green-400' :
              error ? 'bg-red-900/30 text-red-400' :
                'bg-blue-900/30 text-blue-400'
              }`}>
              {uploadSuccess && <MdCheckCircle className="text-xl" />}
              {error && <MdError className="text-xl" />}
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}

          {/* Progress Bar */}
          {progress > 0 && progress < 100 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Uploading to ImageKit...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* File Input */}
          <div className="mb-6">
            <label className="block mb-3 text-sm font-medium text-gray-300">
              Select Video File
            </label>

            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading || !imagekit}
              className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Video Title and Description - Only show when file is selected */}
          {selectedFile && (
            <>
              {/* Video Title */}
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-300">
                  Video Title *
                </label>
                <div
                  contentEditable
                  suppressContentEditableWarning={true}
                  onInput={(e) => {
                    const text = (e.target as HTMLElement).innerText;
                    setVideoTitle(text);
                  }}
                  data-placeholder="Enter video title"
                  style={{
                    width: '100%',
                    padding: '12px',
                    color: 'white',
                    backgroundColor: '#374151',
                    border: '1px solid #4B5563',
                    borderRadius: '4px',
                    minHeight: '20px',
                    outline: 'none',
                    fontFamily: 'inherit', // Changed from monospace to match other inputs
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {videoTitle.length}/100 characters
                </div>
              </div>

              {/* Video Description */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-300">
                  Video Description *
                </label>
                <textarea
                  ref={descriptionRef}
                  defaultValue=""
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    setVideoDescription(target.value);
                  }}
                  placeholder="Enter video description"
                  rows={3}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '12px',
                    color: 'white',
                    backgroundColor: '#374151',
                    border: '1px solid #4B5563',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    resize: 'none',
                    whiteSpace: 'normal',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    textTransform: 'none',
                    fontWeight: 'normal',
                    lineHeight: 'normal'
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {videoDescription.length}/500 characters
                </div>
              </div>
            </>
          )}

          {/* File Info */}
          {selectedFile && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-start gap-3">
                {/* File icon based on aspect ratio */}
                <div className="flex-shrink-0 mt-1">
                  {error && error.includes('landscape') ? (
                    // Landscape icon (not ideal)
                    <div className="w-8 h-5 bg-yellow-600 rounded border flex items-center justify-center">
                      <span className="text-white text-xs">16:9</span>
                    </div>
                  ) : (
                    // Portrait icon (good)
                    <div className="w-5 h-8 bg-green-600 rounded border flex items-center justify-center">
                      <span className="text-white text-xs transform -rotate-90">9:16</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-white text-sm mb-1">
                    <span className="font-semibold">File:</span> {selectedFile.name}
                  </p>
                  <p className="text-gray-400 text-sm mb-2">
                    <span className="font-semibold">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {/* Aspect ratio feedback */}
                  {error && error.includes('landscape') ? (
                    <div className="flex items-center gap-2 text-yellow-400 text-xs">
                      <span>⚠️</span>
                      <span>Landscape format - consider recording vertically next time</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                      <span>✅</span>
                      <span>Great format for shorts!</span>
                    </div>
                  )}

                  <p className="text-gray-500 text-xs mt-2">
                    Direct upload to ImageKit (no server processing)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm flex items-start gap-2">
              <MdError className="text-xl flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || !imagekit || uploadSuccess || !!error || !videoTitle.trim() || !videoDescription.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : uploadSuccess ? (
                <>
                  <MdCheckCircle className="text-xl" />
                  Uploaded!
                </>
              ) : (
                <>
                  <MdUpload className="text-xl" />
                  Upload
                </>
              )}
            </button>
          </div>

          {/* ImageKit not configured warning */}
          {!imagekit && !error && (
            <div className="mt-4 p-3 bg-yellow-900/30 text-yellow-400 rounded-lg text-xs">
              <p className="font-semibold mb-1">⚠️ ImageKit Configuration Required</p>
              <p>Please set the following in your .env file:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>IMAGEKIT_PUBLIC_KEY</li>
                <li>IMAGEKIT_PRIVATE_KEY</li>
                <li>IMAGEKIT_URL_ENDPOINT</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};