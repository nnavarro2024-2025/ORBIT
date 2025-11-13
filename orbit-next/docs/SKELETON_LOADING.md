# Skeleton Loading Components

Modern skeleton loading screens similar to Google, Facebook, and YouTube that provide smooth placeholder animations during data fetching.

## Features

- **Shimmer animation**: Smooth gradient effect that travels across placeholders
- **Reusable presets**: Pre-built skeletons for common layouts
- **React Query integration**: Automatically shows skeletons based on `isLoading` and `isFetching` states
- **Responsive**: Adapts to mobile and desktop layouts

## Quick Start

### Basic Skeleton

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Simple placeholder
<Skeleton className="h-4 w-48" />

// Circle (for avatars/icons)
<Skeleton className="h-12 w-12 rounded-full" />

// Rectangle with rounded corners
<Skeleton className="h-20 w-full rounded-lg" />
```

### Preset Components

Import ready-made skeleton presets for common patterns:

```tsx
import { 
  SkeletonFacilityCard, 
  SkeletonListItem, 
  SkeletonStatsCard,
  SkeletonTableRows 
} from "@/components/ui/skeleton-presets";

// Stats card placeholder
<SkeletonStatsCard />

// Facility/room card placeholder
<SkeletonFacilityCard />

// List item (e.g., booking history row)
<SkeletonListItem />

// Table rows (default 5, customizable)
<SkeletonTableRows rows={10} />
```

## Integration with React Query

```tsx
const { data, isLoading, isFetching } = useQuery({
  queryKey: ["/api/bookings"],
  queryFn: fetchBookings
});

return (
  <div>
    {(isLoading || isFetching) ? (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    ) : data.length === 0 ? (
      <EmptyState />
    ) : (
      data.map(item => <ItemCard key={item.id} item={item} />)
    )}
  </div>
);
```

## How It Works

### CSS Shimmer Animation

The shimmer effect is defined in `src/app/globals.css`:

```css
.skeleton {
  position: relative;
  overflow: hidden;
  background-color: hsl(var(--muted));
}

.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: skeleton-shimmer 1.25s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
```

### Base Component

`src/components/ui/skeleton.tsx` provides the foundational skeleton element:

```tsx
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
```

## Creating Custom Presets

Build your own reusable skeleton layouts:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonUserCard() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}
```

## Where Skeletons Are Used

Current implementations in ORBIT:

- **Booking Dashboard** (`src/app/(app)/booking/page.tsx`)
  - Stats cards (Active/Scheduled bookings)
  - Facility cards (Available Rooms view)
  - Booking history list (My Bookings, Activity Logs)
  - Notification logs

- **Suspense Fallback** (`src/components/loading/BookingDashboardSkeleton.tsx`)
  - Full-page skeleton shown during initial page load

## Best Practices

1. **Match real content shape**: Skeleton placeholders should closely resemble the actual content layout
2. **Show multiple items**: Display 3-6 skeleton items to indicate a list is loading
3. **Combine with Suspense**: Use lazy loading and Suspense for route-level loading states
4. **Test loading states**: Simulate slow network to verify skeleton appearance
5. **Keep animations subtle**: The shimmer should enhance, not distract from the experience

## Performance Notes

- Skeleton animations use CSS transforms for optimal performance
- Components use `React.lazy` for code-splitting where appropriate
- Shimmer animation runs on the GPU via transform properties

## Customization

Adjust animation speed or shimmer intensity in `globals.css`:

```css
/* Faster animation */
animation: skeleton-shimmer 0.8s ease-in-out infinite;

/* Stronger shimmer effect */
background-image: linear-gradient(90deg,
  rgba(255, 255, 255, 0) 0%,
  rgba(255, 255, 255, 0.9) 50%,  /* Increased from 0.6 */
  rgba(255, 255, 255, 0) 100%
);
```

---

**Next Steps**: Apply skeleton loading patterns to Admin Dashboard, Profile views, and other data-heavy sections for consistent UX.
