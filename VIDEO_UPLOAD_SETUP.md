# Video Upload Setup Guide

## Overview
The Pitch Sultan Battle page now includes video upload functionality using ImageKit for video storage and delivery.

## Setup Instructions

### 1. Create an ImageKit Account
1. Go to [ImageKit.io](https://imagekit.io/) and sign up for a free account
2. After signing up, you'll get access to your dashboard

### 2. Get Your ImageKit Credentials
From your ImageKit dashboard, you'll need three values:

1. **Public Key**: Found in Developer Options → API Keys
2. **Private Key**: Found in Developer Options → API Keys
3. **URL Endpoint**: Found in Dashboard (looks like `https://ik.imagekit.io/your_imagekit_id`)

### 3. Configure Environment Variables
Add the following to your `.env` file:

```env
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
```

Replace the placeholder values with your actual ImageKit credentials.

### 4. Restart the Server
After updating the `.env` file, restart your development server:

```bash
npm run dev:full
```

## Features

### Video Upload Modal
- Click the "+" button in the bottom navigation
- Click "Upload Video" button
- Select a video file from your device
- The video will be uploaded directly to ImageKit
- Progress bar shows upload status
- Uploaded videos appear in the home feed

### Video Storage
- Videos are stored in ImageKit under `/pitch-sultan-videos` folder
- Videos are tagged with `pitch-sultan` and `battle` for easy filtering
- Uploaded videos are saved to localStorage for persistence

### Video Display
- Uploaded videos appear at the top of the home feed
- Videos show uploader name, avatar, and upload time
- Video thumbnails are generated automatically by ImageKit

## API Endpoints

### GET /api/imagekit-config
Returns public ImageKit configuration (public key and URL endpoint)

### GET /api/imagekit-auth
Generates authentication parameters for client-side uploads:
- `token`: Random token for this upload
- `expire`: Expiration timestamp (40 minutes from now)
- `signature`: HMAC signature for authentication

## Technical Details

### Direct Upload Flow
1. Client fetches ImageKit config from `/api/imagekit-config`
2. Client initializes ImageKit SDK with public key and URL endpoint
3. When uploading, client fetches auth parameters from `/api/imagekit-auth`
4. Client uploads directly to ImageKit using the SDK
5. Upload progress is tracked and displayed
6. On success, video metadata is saved to localStorage

### Security
- Private key is never exposed to the client
- Authentication signature is generated server-side
- Tokens expire after 40 minutes
- Direct uploads bypass your server, reducing bandwidth costs

## Troubleshooting

### "Failed to connect to server"
- Check that your API server is running on port 3001
- Verify `.env` file has correct ImageKit credentials

### "ImageKit Configuration Required" warning
- Make sure all three environment variables are set in `.env`
- Restart the server after updating `.env`

### Upload fails
- Check browser console for detailed error messages
- Verify ImageKit credentials are correct
- Check that your ImageKit account has sufficient storage quota

## Future Enhancements
- Add video title and description fields
- Implement video categories/tags
- Add video editing capabilities
- Integrate with backend database for persistent storage
- Add video analytics and view tracking
- Implement video moderation
