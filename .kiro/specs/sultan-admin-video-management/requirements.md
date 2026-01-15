# Requirements Document: Sultan Admin Video Management

## Introduction

This feature enables Sultan Admins to view, edit, and delete all videos in the system from their profile's Manage tab. Currently, users can only see and manage their own videos. This enhancement gives admins full control over all video content in the system.

## Glossary

- **Sultan Admin**: Administrator user with elevated privileges to manage all system content
- **Video Owner**: The SEC user who originally uploaded the video
- **Manage Tab**: Profile section where users manage their content
- **Video Metadata**: Title, description, tags, and other video properties
- **Video Status**: Active or inactive state of a video

## Requirements

### Requirement 1: Display All Videos for Sultan Admin

**User Story:** As a Sultan Admin, I want to see all videos in the system in my Manage tab, so that I can oversee and manage all content.

#### Acceptance Criteria

1. WHEN a Sultan Admin opens the Manage tab THEN the system SHALL display all videos from all users in the database
2. WHEN a regular user opens the Manage tab THEN the system SHALL display only their own videos (existing behavior)
3. WHEN videos are displayed THEN the system SHALL show video metadata including title, description, thumbnail, views, likes, and owner information
4. WHEN the video list loads THEN the system SHALL display videos in a paginated or scrollable format for performance

### Requirement 2: Edit Video Metadata

**User Story:** As a Sultan Admin, I want to edit any video's metadata, so that I can correct or update video information.

#### Acceptance Criteria

1. WHEN a Sultan Admin clicks edit on any video THEN the system SHALL open an edit modal/form
2. WHEN editing a video THEN the system SHALL allow modification of title, description, and tags
3. WHEN a Sultan Admin saves changes THEN the system SHALL update the video metadata in the database
4. WHEN changes are saved THEN the system SHALL show a success message and refresh the video list
5. WHEN a regular user edits their video THEN the system SHALL only allow them to edit their own videos

### Requirement 3: Delete Videos

**User Story:** As a Sultan Admin, I want to delete any video from the system, so that I can remove inappropriate or unwanted content.

#### Acceptance Criteria

1. WHEN a Sultan Admin clicks delete on any video THEN the system SHALL show a confirmation dialog
2. WHEN the admin confirms deletion THEN the system SHALL remove the video from the database
3. WHEN a video is deleted THEN the system SHALL remove associated data (comments, likes, ratings)
4. WHEN deletion is complete THEN the system SHALL show a success message and refresh the video list
5. WHEN a regular user deletes their video THEN the system SHALL only allow them to delete their own videos

### Requirement 4: Video Ownership Display

**User Story:** As a Sultan Admin, I want to see who uploaded each video, so that I can identify content by specific users.

#### Acceptance Criteria

1. WHEN viewing the video list THEN the system SHALL display the video owner's name and phone number
2. WHEN viewing the video list THEN the system SHALL display the owner's store information if available
3. WHEN viewing video details THEN the system SHALL clearly indicate the original uploader

### Requirement 5: Bulk Actions (Optional)

**User Story:** As a Sultan Admin, I want to perform actions on multiple videos at once, so that I can manage content more efficiently.

#### Acceptance Criteria

1. WHEN viewing the video list THEN the system SHALL provide checkboxes to select multiple videos
2. WHEN multiple videos are selected THEN the system SHALL show bulk action options (delete, activate, deactivate)
3. WHEN bulk delete is confirmed THEN the system SHALL remove all selected videos from the database
