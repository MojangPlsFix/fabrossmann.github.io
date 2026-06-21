import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Radix's Avatar.Image only renders once it has confirmed (via a browser Image() load
// check) that the src loaded, and AvatarImage/AvatarFallback both read Avatar's React
// context for that status. When Avatar/AvatarImage/AvatarFallback are written as separate
// top-level tags directly inside an .astro template (no client:* directive), Astro's React
// renderer pre-renders each child to a static HTML string *before* Avatar ever mounts --
// see @astrojs/react/dist/server.js's renderToStaticMarkup, which wraps un-hydrated children
// in a StaticHtml/<astro-static-slot> placeholder rather than a live nested React tree. That
// breaks the context lookup (`AvatarImage must be used within Avatar`) and would in any case
// never show the photo, since the loading-status hook never gets to run server-side.
// Wrapping the trio in one real component (hydrated with client:load) fixes both problems.
export function AvatarBlock({ src, alt, fallback, className }: {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
