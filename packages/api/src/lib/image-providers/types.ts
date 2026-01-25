/**
 * Image provider interface - allows pluggable image sources
 */

export interface ImageResult {
  imageBuffer: Buffer;
  contentType: string;
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  source: {
    provider: string;
    photoId: string;
    photoUrl: string;
  };
}

export interface ImageProvider {
  name: string;

  /**
   * Search and download an image for a destination
   */
  fetchImage(
    destinationName: string,
    type: 'city' | 'nature',
    region?: string
  ): Promise<ImageResult>;

  /**
   * Check if provider is configured (has required API keys)
   */
  isConfigured(): boolean;
}
