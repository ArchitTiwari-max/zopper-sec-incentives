# Design Document: Sultan Admin Video Management

## Overview

This design implements a comprehensive video management system for Sultan Admins that allows them to view, edit, and delete all videos in the system. The implementation leverages existing video management patterns while adding admin-specific functionality.

## Architecture

### Component Structure

```
ProfilePage
├── ManageTab
│   ├── VideoListView (new component)
│   │   ├── VideoGrid/Table
│   │   ├── VideoCard (enhanced)
│   │   └── Pagination
│   ├── EditVideoModal (new component)
│   └── DeleteConfirmationDialog (new component)
```

### Data Flow

1. **Load Videos**: When Manage tab opens, fetch videos based on user role
   - Sultan Admin: Fetch all videos with owner info
   - Regular User: Fetch only user's videos (existing behavior)

2. **Edit Video**: Admin selects edit → Modal opens → Updates metadata → API call → Refresh list

3. **Delete Video**: Admin selects delete → Confirmation dialog → API call → Refresh list

## Components and Interfaces

### VideoListView Component

**Purpose**: Display all videos for Sultan Admin or user's videos for regular users

**Props**:
```typescript
interface VideoListViewProps {
  isSultanAdmin: boolean;
  currentUserId: string;
  onEditVideo: (video: Video) => void;
  onDeleteVideo: (videoId: string) => void;
}
```

**State**:
- `videos`: Array of videos
- `loading`: Loading state
- `currentPage`: Pagination state
- `selectedVideos`: For bulk actions (optional)

### EditVideoModal Component

**Purpose**: Allow editing of video metadata

**Props**:
```typescript
interface EditVideoModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVideo: Partial<Video>) => Promise<void>;
}
```

**Editable Fields**:
- Title
- Description
- Tags

### DeleteConfirmationDialog Component

**Purpose**: Confirm video deletion before removing from database

**Props**:
```typescript
interface DeleteConfirmationDialogProps {
  video: Video;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## Data Models

### Video Model (Enhanced)

```typescript
interface Video {
  id: string;
  title?: string;
  description?: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  rating?: number;
  ratingCount?: number;
  commentsCount?: number;
  uploadedAt: string;
  isActive?: boolean;
  serialNumber?: number;
  secUser: {
    id: string;
    name?: string;
    phone: string;
    store?: {
      storeName: string;
      city: string;
    };
    region?: string;
  };
  tags?: string[];
}
```

### API Endpoints

**GET /api/pitch-sultan/videos** (Enhanced)
- Query params: `?limit=50&skip=0&adminView=true` (for Sultan Admin)
- Returns: All videos with owner information

**PUT /api/pitch-sultan/videos/:id** (New)
- Body: `{ title?, description?, tags? }`
- Returns: Updated video object
- Auth: Requires Sultan Admin role

**DELETE /api/pitch-sultan/videos/:id** (Enhanced)
- Returns: Success message
- Auth: Requires Sultan Admin role or video owner
- Deletes: Video, comments, likes, ratings

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Sultan Admin Sees All Videos

*For any* Sultan Admin user, when they load the Manage tab, the system SHALL return all videos from all users in the database, not just their own videos.

**Validates: Requirements 1.1, 1.2**

### Property 2: Regular Users See Only Their Videos

*For any* regular (non-admin) user, when they load the Manage tab, the system SHALL return only videos uploaded by that specific user.

**Validates: Requirements 1.2**

### Property 3: Edit Updates Metadata

*For any* video and any Sultan Admin, when they edit the video's title, description, or tags and save, the system SHALL persist those changes to the database and subsequent queries SHALL return the updated values.

**Validates: Requirements 2.2, 2.3**

### Property 4: Delete Removes Video Completely

*For any* video and any Sultan Admin, when they delete the video, the system SHALL remove the video record and all associated data (comments, likes, ratings) from the database, and subsequent queries SHALL not return that video.

**Validates: Requirements 3.2, 3.3**

### Property 5: Only Admins Can Edit All Videos

*For any* regular user and any video not owned by them, when they attempt to edit that video, the system SHALL reject the request with a 403 Forbidden error.

**Validates: Requirements 2.5**

### Property 6: Only Admins Can Delete All Videos

*For any* regular user and any video not owned by them, when they attempt to delete that video, the system SHALL reject the request with a 403 Forbidden error.

**Validates: Requirements 3.5**

### Property 7: Video Ownership Display

*For any* video displayed in the Sultan Admin's video list, the system SHALL include the video owner's name, phone number, and store information (if available).

**Validates: Requirements 4.1, 4.2**

## Error Handling

1. **Unauthorized Access**: Return 403 Forbidden if non-admin tries to edit/delete others' videos
2. **Video Not Found**: Return 404 if video doesn't exist
3. **Database Errors**: Return 500 with error message
4. **Validation Errors**: Return 400 with field-specific error messages
5. **Network Errors**: Show user-friendly error message and retry option

## Testing Strategy

### Unit Tests

- Test video list filtering (admin vs regular user)
- Test edit form validation
- Test delete confirmation logic
- Test permission checks

### Property-Based Tests

- **Property 1**: Generate random Sultan Admin users and verify they see all videos
- **Property 2**: Generate random regular users and verify they see only their videos
- **Property 3**: Generate random videos, edit them, verify changes persist
- **Property 4**: Generate random videos, delete them, verify they're removed
- **Property 5**: Generate random regular users and videos, verify edit rejection
- **Property 6**: Generate random regular users and videos, verify delete rejection
- **Property 7**: Generate random videos with owner info, verify display

### Integration Tests

- Test full edit flow: Load → Edit → Save → Verify
- Test full delete flow: Load → Delete → Confirm → Verify
- Test permission enforcement across different user roles
- Test pagination and filtering

## Implementation Notes

1. **Reuse Existing Components**: Leverage existing video card and modal components where possible
2. **API Enhancement**: Modify existing `/api/pitch-sultan/videos` endpoint to support admin view
3. **Permission Checks**: Add role-based checks in both frontend and backend
4. **Performance**: Implement pagination for large video lists
5. **Confirmation Dialogs**: Always confirm destructive actions (delete)
