const INSTAGRAM_RE = /instagram\.com/i;

// Best-effort fetch of an Instagram post/reel's public og:description meta
// tag (no login, no official API - the same public page a link preview
// would load). Same never-throw pattern as fetchYoutubeDescription: null
// means "couldn't auto-fetch, user pastes the caption themselves." The
// caption is often short or missing entirely for video-only content - this
// only returns what the creator actually wrote in text.
export async function fetchInstagramDescription(url) {
  if (!url || typeof url !== "string" || !INSTAGRAM_RE.test(url)) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/<meta property="og:description" content="([^"]*)"/);
    if (!match) return null;

    // Numeric entities first (real captions are full of emoji, e.g. &#x1f4e9;)
    // then the named ones - real multi-line captions carry both.
    const decoded = match[1]
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    // og:description on Instagram is "<likes>, <comments> - <author> on
    // <date>: "<caption>"." - strip that wrapper down to just the caption.
    // Real captions are multi-line, so this must match across newlines
    // ([\s\S] instead of "." - "." alone never matches "\n").
    const captionMatch = decoded.match(/:\s*"([\s\S]*)"\.\s*$/);
    return captionMatch ? captionMatch[1] : decoded;
  } catch {
    return null;
  }
}
