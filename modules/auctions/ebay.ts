/**
 * eBay Browse API client — active (not sold/completed) listing search only.
 *
 * Uses the client-credentials ("application") OAuth grant, which is scoped to
 * public read-only browsing and does not require a user login. This deliberately
 * never touches eBay's Marketplace Insights (sold-data) API — that requires
 * partner approval and its ToS forbids market-research use; see
 * docs/tickets/ARCA-068-auction-source-research.md.
 */

const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";

// Keyword search (not a hardcoded category id) scoped to graded WOTC-era Pokemon
// singles. Grade + card matching happens downstream from the title in match.ts —
// this query only needs to get graded Pokemon auction listings into the candidate
// pool, not to be a precise filter on its own.
const SEARCH_QUERIES = ["Pokemon PSA", "Pokemon BGS"];
const RESULTS_PER_QUERY = 50;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

interface EbayOAuthResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID/EBAY_CLIENT_SECRET environment variables");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: OAUTH_SCOPE,
    }),
  });

  if (!response.ok) {
    throw new Error(`eBay OAuth token request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EbayOAuthResponse;

  // Refresh a minute early so we never fetch with an about-to-expire token.
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

interface EbayPrice {
  value: string;
  currency: string;
}

interface EbaySeller {
  username?: string;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: EbayPrice;
  currentBidPrice?: EbayPrice;
  itemWebUrl: string;
  itemEndDate?: string;
  seller?: EbaySeller;
  buyingOptions?: string[];
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
}

export interface RawAuctionListing {
  externalListingId: string;
  title: string;
  currentBidCents: number | null;
  currency: string;
  endTime: Date | null;
  seller: string | null;
  listingUrl: string;
}

function toCents(price: EbayPrice | undefined): number | null {
  if (!price) return null;
  const parsed = Number.parseFloat(price.value);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

async function searchOnce(query: string): Promise<EbayItemSummary[]> {
  const token = await getAccessToken();

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("filter", "buyingOptions:{AUCTION}");
  url.searchParams.set("sort", "endingSoonest");
  url.searchParams.set("limit", String(RESULTS_PER_QUERY));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!response.ok) {
    throw new Error(`eBay Browse API search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EbaySearchResponse;
  return data.itemSummaries ?? [];
}

/**
 * Fetch active, auction-style listings across the graded-Pokemon search queries.
 * Deduplicates by itemId since multiple queries can surface the same listing.
 */
export async function searchActiveGradedListings(): Promise<RawAuctionListing[]> {
  const seen = new Set<string>();
  const results: RawAuctionListing[] = [];

  for (const query of SEARCH_QUERIES) {
    const items = await searchOnce(query);

    for (const item of items) {
      if (seen.has(item.itemId)) continue;
      seen.add(item.itemId);

      results.push({
        externalListingId: item.itemId,
        title: item.title,
        currentBidCents: toCents(item.currentBidPrice ?? item.price),
        currency: (item.currentBidPrice ?? item.price)?.currency ?? "USD",
        endTime: item.itemEndDate ? new Date(item.itemEndDate) : null,
        seller: item.seller?.username ?? null,
        listingUrl: item.itemWebUrl,
      });
    }
  }

  return results;
}
