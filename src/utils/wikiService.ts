export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: string;
  pageUrl?: string;
}

const wikiCache = new Map<string, WikiSummary | null>();

export async function fetchWikiSummary(term: string): Promise<WikiSummary | null> {
  const cacheKey = term.trim().toLowerCase();
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey) || null;
  }

  // Clean term (remove parentheses or extra metadata)
  const cleanTerm = term
    .replace(/\(.*?\)/g, '')
    .trim();

  // 1. Try direct REST API summary
  try {
    const directRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`
    );

    if (directRes.ok) {
      const data = await directRes.json();
      if (data && data.type !== 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found' && data.extract) {
        const result: WikiSummary = {
          title: data.title || term,
          extract: data.extract,
          description: data.description,
          thumbnail: data.originalimage?.source || data.thumbnail?.source,
          pageUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTerm)}`,
        };
        wikiCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (e) {
    console.warn('Direct Wikipedia REST API lookup failed:', e);
  }

  // 2. Search fallback via Wikipedia Opensearch / Search API
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanTerm + ' holiday'
      )}&format=json&origin=*`
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const firstHit = searchData?.query?.search?.[0];
      if (firstHit && firstHit.title) {
        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`
        );
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData && summaryData.extract) {
            const result: WikiSummary = {
              title: summaryData.title || firstHit.title,
              extract: summaryData.extract,
              description: summaryData.description,
              thumbnail: summaryData.originalimage?.source || summaryData.thumbnail?.source,
              pageUrl: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(firstHit.title)}`,
            };
            wikiCache.set(cacheKey, result);
            return result;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Wikipedia search fallback failed:', e);
  }

  wikiCache.set(cacheKey, null);
  return null;
}
