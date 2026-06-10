/**
 * Living gradient backdrop with zero per-frame cost. Each blob is a blurred
 * radial-gradient layer that the GPU rasterizes ONCE; the keyframe animations
 * move only `transform`, so every frame after first paint is pure compositing.
 * (Replaces the canvas AnimatedHeroBg, which redrew + re-blurred each frame.)
 * Server-safe: no JS shipped. Reduced-motion handled in CSS.
 */
export function HeroBlobs({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`hero-blobs ${className}`}>
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />
      <div className="hero-blob hero-blob-3" />
    </div>
  );
}
