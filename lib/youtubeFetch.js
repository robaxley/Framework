const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/i;

// Best-effort scrape of a YouTube watch page's public description text
// (no official Data API key/quota needed). Never throws - callers treat
// null as "couldn't auto-fetch, user pastes the caption themselves."
export async function fetchYoutubeDescription(url) {
  if (!url || typeof url !== "string" || !YOUTUBE_RE.test(url)) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FrameworkBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (!match) return null;

    return JSON.parse(`"${match[1]}"`);
  } catch {
    return null;
  }
}
