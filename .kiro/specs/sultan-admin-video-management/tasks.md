# Implementation Plan: Sultan Admin Video Management

## Overview

This implementation plan breaks down the Sultan Admin video management feature into discrete, manageable tasks. The feature will be built incrementally, starting with the backend API enhancements, then the UI components, and finally testing.

## Tasks

- [x] 1. Enhance Backend API for Admin Video Viewing
  - Modify `/api/pitch-sultan/videos` endpoint to support admin view parameter
  - Add role-based filtering: return all videos for Sultan Admin, only user's videos for regular users
  - Include video owner information (name, phone, store) in response
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [ ] 2. Create Edit Video API Endpoint
  - Implement PUT `/api/pitch-sultan/videos/:id` endpoint
  - Add validation for title, description, and tags fields
  - Add permission check: only Sultan Admin or video owner can edit
  - Update video metadata in database
  - _Requirements: 2.2, 2.3, 2.5_

- [ ]* 2.1 Write property test for edit endpoint
  - **Property 3: Edit Updates Metadata**
  - **Validates: Requirements 2.2, 2.3**

- [ ] 3. Create Delete Video API Endpoint
  - Implement DELETE `/api/pitch-sultan/videos/:id` endpoint
  - Add permission check: only Sultan Admin or video owner can delete
  - Delete video record from database
  - Delete associated comments, likes, and ratings
  - _Requirements: 3.2, 3.3, 3.5_

- [ ]* 3.1 Write property test for delete endpoint
  - **Property 4: Delete Removes Video Completely**
  - **Validates: Requirements 3.2, 3.3**

- [ ] 4. Create VideoListView Component
  - Build component to display all videos for Sultan Admin or user's videos for regular users
  - Implement pagination for performance
  - Display video metadata: thumbnail, title, views, likes, owner info
  - Add edit and delete buttons for each video
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [ ]* 4.1 Write property test for video list filtering
  - **Property 1: Sultan Admin Sees All Videos**
  - **Property 2: Regular Users See Only Their Videos**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 5. Create EditVideoModal Component
  - Build modal form for editing video metadata
  - Include fields: title, description, tags
  - Add form validation
  - Implement save functionality with API call
  - Show success/error messages
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 5.1 Write unit tests for edit form validation
  - Test required field validation
  - Test field length limits
  - Test tag input handling

- [ ] 6. Create DeleteConfirmationDialog Component
  - Build confirmation dialog for video deletion
  - Display video title and owner information
  - Show warning message about permanent deletion
  - Implement confirm and cancel buttons
  - _Requirements: 3.1_

- [ ] 7. Integrate Components into Profile Manage Tab
  - Update existing Manage tab to use new VideoListView component
  - Wire up edit button to open EditVideoModal
  - Wire up delete button to open DeleteConfirmationDialog
  - Handle modal open/close states
  - _Requirements: 1.1, 2.1, 3.1_

- [ ]* 7.1 Write integration tests for full edit flow
  - Test: Load video list → Click edit → Fill form → Save → Verify update
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 7.2 Write integration tests for full delete flow
  - Test: Load video list → Click delete → Confirm → Verify removal
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 8. Add Permission Checks and Error Handling
  - Implement 403 Forbidden for unauthorized edit/delete attempts
  - Add 404 Not Found for missing videos
  - Add error messages for failed operations
  - Test permission enforcement across different user roles
  - _Requirements: 2.5, 3.5_

- [ ]* 8.1 Write property tests for permission enforcement
  - **Property 5: Only Admins Can Edit All Videos**
  - **Property 6: Only Admins Can Delete All Videos**
  - **Validates: Requirements 2.5, 3.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all unit tests pass
  - Ensure all property tests pass
  - Ensure all integration tests pass
  - Ask the user if questions arise

- [ ]* 10. Add Bulk Actions (Optional)
  - Implement checkboxes for multi-select
  - Add bulk delete functionality
  - Add bulk activate/deactivate functionality
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 10.1 Write property tests for bulk actions
  - Test bulk delete removes all selected videos
  - Test bulk operations maintain data integrity

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass
  - Verify feature works end-to-end
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
