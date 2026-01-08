import React, { useState, useRef, useEffect } from 'react';
import { 
    MdVideocam, MdStop, MdFlipCameraIos, MdClose, 
    MdFiberManualRecord, MdPause, MdPlayArrow,
    MdCheck, MdRefresh
} from 'react-icons/md';

interface VideoRecorderProps {
    isOpen: boolean;
    onClose: () => void;
    onVideoRecorded: (videoBlob: Blob) => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
    isOpen,
    onClose,
    onVideoRecorded
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize camera when modal opens
    useEffect(() => {
        if (isOpen) {
            initializeCamera();
        } else {
            cleanup();
        }

        return cleanup;
    }, [isOpen, facingMode]);

    // Recording timer
    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRecording, isPaused]);

    const initializeCamera = async () => {
        try {
            setError(null);
            
            // Stop existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Request camera with 9:16 aspect ratio constraint
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 720 },
                    height: { ideal: 1280 }, // 9:16 ratio
                    aspectRatio: { ideal: 9/16 }
                },
                audio: true
            });

            setStream(mediaStream);
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Unable to access camera. Please check permissions.');
        }
    };

    const cleanup = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        setRecordedVideo(null);
        setError(null);
        chunksRef.current = [];
    };

    const startRecording = () => {
        if (!stream) return;

        try {
            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
                setRecordedVideo(videoBlob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                setIsPaused(false);
            } else {
                mediaRecorderRef.current.pause();
                setIsPaused(true);
            }
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const retakeVideo = () => {
        setRecordedVideo(null);
        setRecordingTime(0);
        chunksRef.current = [];
    };

    const useRecordedVideo = () => {
        if (recordedVideo) {
            onVideoRecorded(recordedVideo);
            onClose();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
                <button
                    onClick={onClose}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition"
                >
                    <MdClose className="text-2xl" />
                </button>
                
                <div className="text-white text-center">
                    <h2 className="font-semibold">Record Short</h2>
                    <p className="text-xs text-gray-400">Hold phone vertically</p>
                </div>

                <button
                    onClick={switchCamera}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition"
                    disabled={isRecording}
                >
                    <MdFlipCameraIos className="text-2xl" />
                </button>
            </div>

            {/* Camera Preview */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
                {/* 9:16 Aspect Ratio Container */}
                <div 
                    className="relative w-full max-w-[400px] bg-black overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                >
                    {/* Video Preview */}
                    {!recordedVideo ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <video
                            src={URL.createObjectURL(recordedVideo)}
                            controls
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Recording Overlay */}
                    {isRecording && (
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                                <MdFiberManualRecord className="text-white text-sm animate-pulse" />
                                <span className="text-white text-sm font-mono">
                                    {formatTime(recordingTime)}
                                </span>
                            </div>
                            
                            {isPaused && (
                                <div className="bg-yellow-600 px-3 py-1 rounded-full">
                                    <span className="text-white text-sm">PAUSED</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Frame Guide */}
                    {!isRecording && !recordedVideo && (
                        <div className="absolute inset-0 border-2 border-white/30 border-dashed">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white/60">
                                <MdVideocam className="text-4xl mx-auto mb-2" />
                                <p className="text-sm">9:16 Shorts Format</p>
                                <p className="text-xs">Perfect for vertical videos</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                            <div className="text-center text-white p-4">
                                <p className="text-lg mb-2">⚠️ Camera Error</p>
                                <p className="text-sm text-gray-300">{error}</p>
                                <button
                                    onClick={initializeCamera}
                                    className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full text-sm"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 bg-black/80 backdrop-blur-sm">
                {!recordedVideo ? (
                    /* Recording Controls */
                    <div className="flex items-center justify-center gap-8">
                        {/* Pause/Resume (only when recording) */}
                        {isRecording && (
                            <button
                                onClick={pauseRecording}
                                className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-full transition"
                            >
                                {isPaused ? (
                                    <MdPlayArrow className="text-white text-2xl" />
                                ) : (
                                    <MdPause className="text-white text-2xl" />
                                )}
                            </button>
                        )}

                        {/* Record/Stop Button */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-6 rounded-full transition-all duration-200 ${
                                isRecording 
                                    ? 'bg-red-600 hover:bg-red-700 scale-110' 
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                            disabled={!!error}
                        >
                            {isRecording ? (
                                <MdStop className="text-white text-3xl" />
                            ) : (
                                <MdFiberManualRecord className="text-white text-3xl" />
                            )}
                        </button>

                        {/* Placeholder for symmetry */}
                        {isRecording && <div className="w-16 h-16" />}
                    </div>
                ) : (
                    /* Preview Controls */
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={retakeVideo}
                            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-full transition"
                        >
                            <MdRefresh className="text-white text-xl" />
                            <span className="text-white font-medium">Retake</span>
                        </button>

                        <button
                            onClick={useRecordedVideo}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full transition"
                        >
                            <MdCheck className="text-white text-xl" />
                            <span className="text-white font-medium">Use Video</span>
                        </button>
                    </div>
                )}

                {/* Recording Tips */}
                {!isRecording && !recordedVideo && (
                    <div className="mt-4 text-center">
                        <p className="text-gray-400 text-sm mb-2">📱 Tips for great shorts:</p>
                        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                            <span>• Hold phone vertically</span>
                            <span>• Good lighting</span>
                            <span>• Steady hands</span>
                            <span>• Clear audio</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};