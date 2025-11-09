# Facility Images

## Instructions for Adding Your Facility Image

1. Save the facility image you shared as: `facility-overview.jpg`
2. Place it in this directory: `client/public/images/` (not in src/assets)
3. The image will automatically be displayed for:
   - Collaborative Learning Room 1
   - Collaborative Learning Room 2
   - Board Room

## Why public/images?

In Vite applications, images in the `public` folder are served directly by the server, making them accessible via `/images/filename.jpg` URLs. This is the correct way to handle static assets that don't need to be processed by the bundler.

## Adding More Images

To add specific images for different rooms, edit the `getFacilityImageByName` function in `BookingDashboard.tsx`:

```javascript
const getFacilityImageByName = (name?: string) => {
  if (!name) return null;
  const lower = name.toLowerCase();

  if (lower.includes("collaborative learning room 1")) {
    return "/images/collaborative-room-1.jpg";
  }
  if (lower.includes("collaborative learning room 2")) {
    return "/images/collaborative-room-2.jpg";
  }
  if (lower.includes("board room")) {
    return "/images/board-room.jpg";
  }

  return null;
};
```

## Image Requirements

- Format: JPG, PNG, or WebP
- Recommended size: 800x450px (16:9 aspect ratio)
- File size: Under 500KB for best performance
