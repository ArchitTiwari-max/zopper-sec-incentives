import { useState, useEffect } from 'react';
import { MdClose, MdUpload, MdCheckCircle, MdError } from 'react-icons/md';
// @ts-ignore
import ImageKit from 'imagekit-javascript';

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

  useEffect(() => {
    if (!isOpen) return;

    // Initialize ImageKit
    const API_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : `${window.location.protocol}//${window.location.hostname}:3001`;

    // Fetch ImageKit config
    fetch(`${API_URL}/api/imagekit-config`)
      .then(res => res.json())
      .then(data => {
        console.log('📦 ImageKit config received:', data);
        const ik = new ImageKit({
          publicKey: data.publicKey,
          urlEndpoint: data.urlEndpoint
        });
        setImagekit(ik);
        console.log('✅ ImageKit initialized');
      })
      .catch(err => {
        console.error('❌ Failed to fetch ImageKit config:', err);
        setError('Failed to connect to server. Please check ImageKit configuration in .env');
      });
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      setStatusMessage(`Selected: ${file.name} (${sizeMB}MB)`);
      setSelectedFile(file);
      setError(null);
      setUploadSuccess(false);
    } else {
      setError('Please select a valid video file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !imagekit) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadSuccess(false);
    setStatusMessage('Getting authentication...');

    try {
      console.log('📤 Starting direct upload to ImageKit...');

      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `${window.location.protocol}//${window.location.hostname}:3001`;

      console.log('🔑 Fetching auth token from:', `${API_URL}/api/imagekit-auth`);
      const authResponse = await fetch(`${API_URL}/api/imagekit-auth`);
      const authData = await authResponse.json();
      console.log('✅ Auth token received:', authData);

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

      console.log('📦 Upload options:', uploadOptions);

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

          console.log('✅ Upload successful:', result);

          // Save to database
          try {
            setStatusMessage('Saving to database...');
            
            const API_URL = window.location.hostname === 'localhost' 
              ? 'http://localhost:3001' 
              : `${window.location.protocol}//${window.location.hostname}:3001`;

            // Check if we have a user ID
            if (!currentUserId) {
              console.warn('⚠️ No user ID available - video uploaded to ImageKit but not saved to database');
              setProgress(100);
              setStatusMessage('Upload successful! (Not linked to user)');
              setUploadSuccess(true);
              setUploading(false);

              // Call success callback with ImageKit data only
              if (onUploadSuccess) {
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

            const saveResponse = await fetch(`${API_URL}/api/pitch-sultan/videos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: currentUserId,
                fileId: result.fileId,
                url: result.url,
                fileName: result.name,
                thumbnailUrl: result.thumbnailUrl || null,
                fileSize: result.size || null,
                tags: result.tags || []
              })
            });

            if (!saveResponse.ok) {
              throw new Error('Failed to save video to database');
            }

            const savedVideo = await saveResponse.json();
            console.log('✅ Video saved to database:', savedVideo);

            setProgress(100);
            setStatusMessage('Upload successful!');
            setUploadSuccess(true);
            setUploading(false);

            // Call success callback with database video data
            if (onUploadSuccess) {
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
            console.log(`⏳ Upload progress: ${percentComplete}%`);
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
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#282828] rounded-xl max-w-lg w-full p-6 relative">
        {/* Close button */}
        {!uploading && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <MdClose className="text-2xl" />
          </button>
        )}

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Upload Video</h2>
          <p className="text-gray-400 text-sm">Share your pitch with the Pitch Sultan community</p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            uploadSuccess ? 'bg-green-900/30 text-green-400' : 
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
          <label className="block mb-2 text-sm font-medium text-gray-300">
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

        {/* File Info */}
        {selectedFile && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-white text-sm mb-1">
              <span className="font-semibold">File:</span> {selectedFile.name}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              <span className="font-semibold">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-gray-500 text-xs">
              Direct upload to ImageKit (no server processing)
            </p>
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
            disabled={!selectedFile || uploading || !imagekit || uploadSuccess}
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
  );
};
