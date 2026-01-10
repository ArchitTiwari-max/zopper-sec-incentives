# Implementation Plan: Video Migration to S3

## Overview

This implementation plan breaks down the migration from ImageKit to client-side video conversion + AWS S3 into discrete coding tasks. Each task builds incrementally toward a complete solution.

## Tasks

- [x] 1. Set up S3 backend infrastructure
  - Install AWS SDK dependencies (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner)
  - Create S3 service module with pre-signed URL generation
  - Implement POST /api/upload-url endpoint with authentication
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 1.1 Write property tests for S3 service
  - **Property 4: S3 Pre-signed URL Generation**
  - **Property 5: Authentication Validation** 
  - **Property 11: API Request/Response Format**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 6.3, 6.4, 6.5, 6.6**

- [x] 2. Implement client-side video converter
  - Install ffmpeg.wasm dependencies (@ffmpeg/ffmpeg, @ffmpeg/util)
  - Create VideoConverter component with format detection
  - Implement MP4 conversion with H.264/AAC output
  - Add progress tracking for conversion process
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 2.1 Write property tests for video converter
  - **Property 1: Video Format Detection and Conversion Logic**
  - **Property 2: Video Conversion Quality Standards**
  - **Property 3: Progress Tracking Accuracy**
  - **Property 6: Error Handling and Recovery**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 3. Create upload manager component
  - Implement S3 upload using pre-signed URLs
  - Add upload progress tracking with XMLHttpRequest
  - Handle pre-signed URL expiration and retry logic
  - Implement error handling and user feedback
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 3.1 Write property tests for upload manager
  - **Property 3: Progress Tracking Accuracy** (upload portion)
  - **Property 6: Error Handling and Recovery** (upload portion)
  - **Property 7: Upload Success Confirmation**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 4. Update video upload modal component
  - Replace ImageKit upload logic with new S3 workflow
  - Integrate VideoConverter and UploadManager
  - Update UI to show conversion + upload progress
  - Handle format detection and conditional conversion
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.2_

- [x] 5. Checkpoint - Test video upload workflow
  - Ensure video conversion and S3 upload work end-to-end
  - Verify progress tracking and error handling
  - Ask the user if questions arise

- [x] 6. Update video player components
  - Replace ImageKit URL handling with S3 URLs
  - Update ShortsPlayer, VideoPreview, and VideoStats components
  - Implement S3-based thumbnail generation
  - Remove ImageKit-specific helper functions
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 7.5_

- [ ]* 6.1 Write property tests for video player updates
  - **Property 8: S3 URL Handling in Video Player**
  - **Validates: Requirements 4.1, 4.2, 4.4, 4.5**

- [x] 7. Update database schema and video metadata handling
  - Modify video save logic to use S3 URLs
  - Update database writes to store S3 URLs in url/thumbnailUrl fields
  - Remove dependency on ImageKit fileId field
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 7.1 Write property tests for database updates
  - **Property 9: Database S3 URL Storage**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 8. Remove ImageKit dependencies and cleanup
  - Remove imagekit-javascript from package.json
  - Remove ImageKit API endpoints (/api/imagekit-config, /api/imagekit-auth)
  - Remove ImageKit environment variables from configuration
  - Search and remove any remaining ImageKit references
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 8.1 Write unit tests for ImageKit removal
  - **Verify ImageKit packages removed from package.json**
  - **Verify ImageKit endpoints return 404**
  - **Verify no ImageKit references in codebase**
  - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [ ] 9. Create data migration script (if needed)
  - Implement migration for existing ImageKit URLs to S3
  - Ensure backward compatibility during transition
  - _Requirements: 5.4, 5.5_

- [ ]* 9.1 Write property tests for data migration
  - **Property 10: Data Migration Compatibility**
  - **Validates: Requirements 5.4, 5.5**

- [ ] 10. Final integration and testing
  - Test complete workflow from video selection to playback
  - Verify all ImageKit references are removed
  - Test error scenarios and recovery mechanisms
  - Ensure performance is acceptable

- [ ] 11. Final checkpoint - Complete migration verification
  - Ensure all tests pass and migration is complete
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on incremental progress - each task should result in working code