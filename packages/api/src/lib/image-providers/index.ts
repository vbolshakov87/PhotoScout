import type { ImageProvider } from './types';
import { UnsplashProvider } from './unsplash';

export type { ImageProvider, ImageResult } from './types';

// Available providers (add more here)
const providers: ImageProvider[] = [
  new UnsplashProvider(),
  // Future: new CustomProvider(),
];

/**
 * Selects the first available image provider from the registry.
 *
 * @returns The first provider whose `isConfigured()` returns `true`, or `null` if none are available.
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
 * Finds the configured image provider with the given name.
 *
 * @param name - The provider name to look up.
 * @returns The matching configured provider, or `null` if none is found.
 */
export function getProviderByName(name: string): ImageProvider | null {
  return providers.find((p) => p.name === name && p.isConfigured()) || null;
}
