const PEXELS_BASE = '/api/proxy/pexels';

export interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
    size: number;
  }[];
  video_pictures: {
    id: number;
    picture: string;
  }[];
  duration: string;
  user: {
    name: string;
    url: string;
  };
}

export interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
}

export interface PexelsVideoResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
  next_page: number;
}

export interface PexelsPhotoResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
  next_page: number;
}

export interface StockMediaItem {
  id: string;
  type: 'video' | 'image';
  thumbnail: string;
  source: string;
  width: number;
  height: number;
  duration?: string;
  author: string;
}

// Background categories for quick access
export const STOCK_CATEGORIES = [
  { id: 'gameplay', label: 'Gameplay', query: 'gaming gameplay' },
  { id: 'nature', label: 'Nature', query: 'nature landscape' },
  { id: 'city', label: 'City', query: 'city skyline urban' },
  { id: 'abstract', label: 'Abstract', query: 'abstract colorful' },
  { id: 'space', label: 'Space', query: 'space galaxy stars' },
  { id: 'ocean', label: 'Ocean', query: 'ocean waves underwater' },
  { id: 'fire', label: 'Fire', query: 'fire flames' },
  { id: 'rain', label: 'Rain', query: 'rain weather' },
  { id: 'tech', label: 'Technology', query: 'technology futuristic' },
  { id: 'food', label: 'Food', query: 'food cooking' },
  { id: 'fitness', label: 'Fitness', query: 'fitness workout' },
  { id: 'animals', label: 'Animals', query: 'animals cute' },
] as const;

function isConfigured(): boolean {
  // Client-side: we check if the proxy will have a key
  // The proxy returns 503 if no key is set, so we always try
  return true;
}

export function isStockMediaAvailable(): boolean {
  return true; // Always try the API; caller should handle empty results
}

export function getStockMediaWarning(): string {
  return 'No results. Set a Pexels API key in the server .env to enable stock media search.';
}

function videoToStockItem(video: PexelsVideo): StockMediaItem {
  const bestFile = video.video_files
    .filter(f => f.width <= 1080)
    .sort((a, b) => b.width - a.width)[0] || video.video_files[0];

  return {
    id: `pexels-${video.id}`,
    type: 'video',
    thumbnail: video.image,
    source: bestFile?.link || video.url,
    width: bestFile?.width || 0,
    height: bestFile?.height || 0,
    duration: video.duration,
    author: video.user?.name || 'Unknown',
  };
}

function photoToStockItem(photo: PexelsPhoto): StockMediaItem {
  return {
    id: `pexels-${photo.id}`,
    type: 'image',
    thumbnail: photo.src.medium,
    source: photo.src.original,
    width: photo.width,
    height: photo.height,
    author: photo.photographer || 'Unknown',
  };
}

export async function searchVideos(
  query: string,
  page = 1,
  perPage = 12,
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<StockMediaItem[]> {
  try {
    const params = new URLSearchParams({ query, page: String(page), per_page: String(perPage), orientation });
    const res = await fetch(`${PEXELS_BASE}/search?${params}`);
    if (!res.ok) return [];
    const text = await res.text();
    let data: PexelsVideoResponse;
    try { data = JSON.parse(text); } catch { return []; }
    return (data.videos || []).map(videoToStockItem);
  } catch {
    return [];
  }
}

export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 12,
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<StockMediaItem[]> {
  try {
    const params = new URLSearchParams({ query, page: String(page), per_page: String(perPage), orientation });
    const res = await fetch(`${PEXELS_BASE}/photos?${params}`);
    if (!res.ok) return [];
    const text = await res.text();
    let data: PexelsPhotoResponse;
    try { data = JSON.parse(text); } catch { return []; }
    return (data.photos || []).map(photoToStockItem);
  } catch {
    return [];
  }
}

export async function searchStock(
  query: string,
  type: 'video' | 'image' | 'both' = 'both',
  page = 1,
  perPage = 12
): Promise<StockMediaItem[]> {
  const items: StockMediaItem[] = [];
  if (type === 'video' || type === 'both') {
    items.push(...await searchVideos(query, page, perPage));
  }
  if (type === 'image' || type === 'both') {
    items.push(...await searchPhotos(query, page, perPage));
  }
  return items;
}

// No fallback — return empty so the UI shows a clear message
function getFallbackVideos(_query: string): StockMediaItem[] { return []; }
function getFallbackPhotos(_query: string): StockMediaItem[] { return []; }
