import { createApi } from 'unsplash-js';
import type { ImageProvider, ImageResult } from './types';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UTM = 'utm_source=photoscout&utm_medium=referral';

export class UnsplashProvider implements ImageProvider {
  name = 'unsplash';
  private api: ReturnType<typeof createApi> | null = null;

  isConfigured(): boolean {
    return !!UNSPLASH_ACCESS_KEY;
  }

  private getApi() {
    if (!this.api) {
      if (!UNSPLASH_ACCESS_KEY) {
        throw new Error('UNSPLASH_ACCESS_KEY not configured');
      }
      this.api = createApi({ accessKey: UNSPLASH_ACCESS_KEY });
    }
    return this.api;
  }

  async fetchImage(
    destinationName: string,
    type: 'city' | 'nature',
    _region?: string
  ): Promise<ImageResult> {
    const api = this.getApi();

    const query =
      type === 'city'
        ? `${destinationName} city skyline photography`
        : `${destinationName} landscape nature photography`;

    const result = await api.search.getPhotos({
      query,
      orientation: 'portrait',
      perPage: 1,
      orderBy: 'relevant',
    });

    const photo = result.response?.results?.[0];
    if (!photo) {
      throw new Error(`No image found on Unsplash for: ${destinationName}`);
    }

    // Download image
    const imageRes = await fetch(photo.urls.regular);
    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status}`);
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Track download (REQUIRED by Unsplash API terms)
    await api.photos.trackDownload({
      downloadLocation: photo.links.download_location,
    });

    return {
      imageBuffer,
      contentType: 'image/jpeg',
      photographer: {
        name: photo.user.name || 'Unknown',
        username: photo.user.username,
        profileUrl: `https://unsplash.com/@${photo.user.username}?${UTM}`,
      },
      source: {
        provider: this.name,
        photoId: photo.id,
        photoUrl: `${photo.links.html}?${UTM}`,
      },
    };
  }
}
