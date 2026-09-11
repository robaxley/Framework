const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/i;
const TIKTOK_RE = /tiktok\.com/i;

export async function fetchOEmbed(url) {
  const empty = { title: null, authorName: null };
  if (!url || typeof url !== "string") return empty;

  let endpoint = null;
  if (YOUTUBE_RE.test(url)) endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  else if (TIKTOK_RE.test(url)) endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  else return empty; // Instagram / unsupported host - no public oEmbed, don't attempt

  try {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DIYVaultBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return empty;
    const data = await res.json();
    return { title: data.title ?? null, authorName: data.author_name ?? null };
  } catch {
    return empty; // best-effort only, never throw
  }
}
