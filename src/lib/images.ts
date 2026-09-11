import type { ImageMetadata } from 'astro';

/**
 * Builds the srcset widths for an image, dropping any larger than the source so
 * nothing is upscaled. `width` is passed alongside `widths` because otherwise
 * Astro falls back to the full-size original for the plain `src`.
 */
export function responsive(image: ImageMetadata, requested: number[]) {
  const usable = requested.filter((w) => w <= image.width);
  const widths = usable.length > 0 ? usable : [image.width];
  return { widths, width: Math.max(...widths) };
}
