import type { ImageProvider } from './types';
import { UnsplashProvider } from './unsplash';

export type { ImageProvider, ImageResult } from './types';

// Available providers (add more here)
const providers: ImageProvider[] = [
  new UnsplashProvider(),
  // Future: new CustomProvider(),
];

/**
 * Get the first configured image provider
 * Returns null if no providers are configured
 */
export function getImageProvider(): ImageProvider | null {
  for (const provider of providers) {
    if (provider.isConfigured()) {
      return provider;
    }
  }
  return null;
}

/**
 * Get a specific provider by name
 */
export function getProviderByName(name: string): ImageProvider | null {
  return providers.find((p) => p.name === name && p.isConfigured()) || null;
}
