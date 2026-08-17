import { YOUTUBE_API_KEY } from './youtubeConfig';

function extractPlaylistId(url) {
  try {
    const u = new URL(url.trim());
    const id = u.searchParams.get('list');
    if (id) return id;
  } catch (e) {}
  // fall back to treating the input as a bare playlist ID
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

// Fetches every video in a playlist (title + video ID, in playlist
// order) via the YouTube Data API. Handles pagination for playlists
// longer than 50 videos.
export async function fetchPlaylistVideos(playlistUrlOrId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error(
      'No YouTube API key set up yet. Open youtubeConfig.js and add your key.'
    );
  }
  const playlistId = extractPlaylistId(playlistUrlOrId);
  if (!playlistId) {
    throw new Error("Couldn't find a playlist ID in that link.");
  }

  const videos = [];
  let pageToken = '';
  do {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50` +
      `&playlistId=${encodeURIComponent(playlistId)}&key=${YOUTUBE_API_KEY}` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || 'YouTube API request failed.');
    }
    for (const item of json.items || []) {
      const vid = item.snippet?.resourceId?.videoId;
      if (vid) {
        videos.push({ videoId: vid, title: item.snippet.title || 'Untitled' });
      }
    }
    pageToken = json.nextPageToken || '';
  } while (pageToken);

  if (!videos.length) {
    throw new Error("That playlist looks empty, private, or doesn't exist.");
  }
  return videos;
}

