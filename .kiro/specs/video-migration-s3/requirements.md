# Requirements Document

## Introduction

This specification defines the migration from ImageKit-based video upload and delivery to a client-side video conversion system with AWS S3 storage. The system will handle video format conversion in the browser using ffmpeg.wasm, upload optimized MP4 files to S3 using pre-signed URLs, and serve videos directly from S3.

## Glossary

- **Video_Converter**: Client-side component that converts videos to MP4 format using ffmpeg.wasm
- **Upload_Manager**: Component that handles file uploads to S3 using pre-signed URLs
- **S3_Service**: Backend service that generates pre-signed URLs for S3 uploads
- **Video_Player**: Component that plays videos from S3 URLs
- **Progress_Tracker**: Component that tracks conversion and upload progress
- **ImageKit**: Current third-party service being replaced
- **ffmpeg.wasm**: WebAssembly version of FFmpeg for browser-based video conversion

## Requirements

### Requirement 1: Client-Side Video Conversion

**User Story:** As a user, I want to upload videos in any format and have them automatically converted to MP4, so that they play consistently across all devices.

#### Acceptance Criteria

1. WHEN a user selects a video file, THE Video_Converter SHALL detect the file format and codec information
2. WHEN the selected video is already MP4 with H.264 video and AAC audio, THE Upload_Manager SHALL upload it directly without conversion
3. WHEN the selected video is not MP4 or uses different codecs, THE Video_Converter SHALL convert it to MP4 format with H.264 video codec and AAC audio codec
4. WHEN converting video, THE Video_Converter SHALL optimize the output for mobile playback with appropriate bitrate and resolution settings
5. WHEN conversion is in progress, THE Progress_Tracker SHALL display real-time conversion progress to the user
6. IF conversion fails, THEN THE Video_Converter SHALL provide a clear error message and allow the user to try again

### Requirement 2: Pre-Signed URL Upload System

**User Story:** As a developer, I want to use pre-signed S3 URLs for video uploads, so that the backend never handles video file bytes and upload is secure and scalable.

#### Acceptance Criteria

1. WHEN a user initiates video upload, THE S3_Service SHALL generate a pre-signed PUT URL for S3 upload
2. WHEN generating pre-signed URLs, THE S3_Service SHALL validate user authentication before proceeding
3. WHEN creating the S3 path, THE S3_Service SHALL use the format `videos/{userId}/{timestamp}.mp4`
4. WHEN generating pre-signed URLs, THE S3_Service SHALL set Content-Type to `video/mp4` and expiry to 60 seconds
5. WHEN upload is successful, THE S3_Service SHALL return both the upload URL and the final public file URL
6. THE Backend SHALL never receive or process video file bytes during upload

### Requirement 3: Upload Progress and Error Handling

**User Story:** As a user, I want to see upload progress and receive clear error messages, so that I understand the status of my video upload.

#### Acceptance Criteria

1. WHEN uploading to S3, THE Progress_Tracker SHALL display real-time upload progress percentage
2. WHEN upload completes successfully, THE Upload_Manager SHALL show a success confirmation
3. IF upload fails due to network issues, THEN THE Upload_Manager SHALL provide retry functionality
4. IF pre-signed URL expires during upload, THEN THE Upload_Manager SHALL request a new URL and retry
5. WHEN any error occurs, THE Upload_Manager SHALL display user-friendly error messages with suggested actions
6. WHEN upload is cancelled, THE Upload_Manager SHALL clean up any partial uploads and reset the interface

### Requirement 4: S3 Video Playback Integration

**User Story:** As a user, I want to view uploaded videos seamlessly, so that the migration from ImageKit is transparent to me.

#### Acceptance Criteria

1. WHEN displaying videos, THE Video_Player SHALL use S3 URLs instead of ImageKit URLs
2. WHEN loading video thumbnails, THE Video_Player SHALL generate or use S3-based thumbnail URLs
3. WHEN videos are played, THE Video_Player SHALL maintain the same user experience as before migration
4. THE Video_Player SHALL handle S3 URL format consistently across all video display components
5. WHEN videos fail to load from S3, THE Video_Player SHALL show appropriate error states

### Requirement 5: Database Schema Migration

**User Story:** As a system administrator, I want the database to store S3 URLs instead of ImageKit references, so that the system is fully migrated to the new storage solution.

#### Acceptance Criteria

1. WHEN saving video metadata, THE System SHALL store S3 URLs in the `url` field instead of ImageKit URLs
2. WHEN saving video metadata, THE System SHALL store S3-based thumbnail URLs in the `thumbnailUrl` field
3. THE System SHALL remove dependency on the `fileId` field that was specific to ImageKit
4. WHEN migrating existing data, THE System SHALL provide a migration path for existing ImageKit URLs
5. THE Database SHALL maintain backward compatibility during the transition period

### Requirement 6: API Endpoint Implementation

**User Story:** As a frontend developer, I want a reliable API to get pre-signed upload URLs, so that I can implement secure video uploads.

#### Acceptance Criteria

1. THE S3_Service SHALL provide a POST endpoint at `/api/upload-url`
2. WHEN receiving upload URL requests, THE S3_Service SHALL validate the user's authentication token
3. WHEN processing requests, THE S3_Service SHALL accept `filename` and `mimeType` parameters
4. WHEN generating responses, THE S3_Service SHALL return JSON with `uploadUrl` and `finalFileUrl` properties
5. IF authentication fails, THEN THE S3_Service SHALL return a 401 Unauthorized response
6. IF S3 configuration is invalid, THEN THE S3_Service SHALL return a 500 Internal Server Error with descriptive message

### Requirement 7: ImageKit Removal and Cleanup

**User Story:** As a developer, I want to completely remove ImageKit dependencies, so that the system has no unused code or configuration.

#### Acceptance Criteria

1. THE System SHALL remove all ImageKit-related npm packages from package.json
2. THE System SHALL remove all ImageKit configuration endpoints from the API
3. THE System SHALL remove all ImageKit-related environment variables and configuration
4. THE System SHALL update all components that previously used ImageKit URLs or services
5. THE System SHALL remove ImageKit-specific helper functions and utilities
6. THE System SHALL update documentation to reflect the new S3-based architecture