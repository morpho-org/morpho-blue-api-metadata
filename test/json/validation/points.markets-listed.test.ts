import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";

type Point = {
  title?: string;
  label?: string;
  value?: string;
  link?: string;
  noHoverCard?: boolean;
};

type AddressPointsMapping = Record<string, Point[]>;
type ChainIdAddressPointsMapping = Record<string, AddressPointsMapping>;

type PointsMapping = {
  vaultsWithPoints: ChainIdAddressPointsMapping;
  vaultsWithPointsOnMarket: ChainIdAddressPointsMapping;
  vaultsWithPointsOnMarketCollateralToken: ChainIdAddressPointsMapping;
  marketsWithPoints: ChainIdAddressPointsMapping;
  marketsWithPointsOnCollateralToken: ChainIdAddressPointsMapping;
};

const root = path.join(__dirname, "..", "..", "..");

const points: PointsMapping = JSON.parse(
  fs.readFileSync(path.join(root, "data", "points.json"), "utf-8"),
);

/**
 * Only markets are checked against the public Morpho API. Vaults are already
 * listed in the repository (vaults-listing.json and vaults-v2-listing.json),
 * so we can assert their presence locally without a network call.
 */
const shouldSkipApiTests = process.env.SKIP_MARKETS_API_TESTS === "true";

// Morpho GraphQL endpoint
const MORPHO_API_URL = "https://api.morpho.org/graphql";

/**
 * Bulk helper: fetch all markets on a chain with a single query.
 * Used as an optimization when it works.
 */
async function fetchMarketsByChainId(
  chainId: number,
): Promise<Record<string, { uniqueKey: string; whitelisted: boolean }>> {
  const query = `
    query Markets($chainId: Int!) {
      markets(chainId: $chainId) {
        uniqueKey
        whitelisted
      }
    }
  `;

  const res = await fetch(MORPHO_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { chainId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Morpho API HTTP error ${res.status} for chain ${chainId}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    const msg = json.errors.map((e: any) => e.message).join("; ");
    throw new Error(`Morpho API GraphQL error for chain ${chainId}: ${msg}`);
  }

  const markets: { uniqueKey: string; whitelisted: boolean }[] =
    json.data?.markets ?? [];

  return Object.fromEntries(
    markets.map((market) => [market.uniqueKey, market] as const),
  );
}

/**
 * Per-market helper: original implementation using marketByUniqueKey.
 * Used as a fallback when the bulk query is not available / errors.
 */
async function fetchMarketByUniqueKey(
  uniqueKey: string,
  chainId: number,
): Promise<{ uniqueKey: string; whitelisted: boolean } | null> {
  const query = `
    query MarketByUniqueKey($uniqueKey: String!, $chainId: Int!) {
      marketByUniqueKey(uniqueKey: $uniqueKey, chainId: $chainId) {
        uniqueKey
        whitelisted
      }
    }
  `;

  const res = await fetch(MORPHO_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { uniqueKey, chainId },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Morpho API HTTP error ${res.status} for market ${uniqueKey} on chain ${chainId}`,
    );
  }

  const json = await res.json();

  if (json.errors?.length) {
    const msg = json.errors.map((e: any) => e.message).join("; ");
    throw new Error(
      `Morpho API GraphQL error for market ${uniqueKey} on chain ${chainId}: ${msg}`,
    );
  }

  return json.data?.marketByUniqueKey ?? null;
}

// Collect all market unique keys from both relevant maps
function collectAllMarketIds(points: PointsMapping): Record<string, Set<string>> {
  const byChain: Record<string, Set<string>> = {};

  const add = (chainIdStr: string, marketId: string) => {
    if (!byChain[chainIdStr]) byChain[chainIdStr] = new Set<string>();
    byChain[chainIdStr].add(marketId);
  };

  // 1) marketsWithPoints: keys are market unique keys
  for (const [chainIdStr, marketsMap] of Object.entries(points.marketsWithPoints)) {
    for (const marketId of Object.keys(marketsMap)) {
      add(chainIdStr, marketId);
    }
  }

  // 2) vaultsWithPointsOnMarket: keys are also market unique keys
  for (const [chainIdStr, marketsMap] of Object.entries(points.vaultsWithPointsOnMarket)) {
    for (const marketId of Object.keys(marketsMap)) {
      add(chainIdStr, marketId);
    }
  }

  return byChain;
}

const allMarketIdsByChain = collectAllMarketIds(points);

// Allow more time for network calls
jest.setTimeout(60_000);

describe("points.json – market unique keys correspond to real Morpho markets", () => {
  if (shouldSkipApiTests) {
    it.skip("SKIPPED via SKIP_MARKETS_API_TESTS", () => {});
    return;
  }

  /**
   * marketsByChain: chains where bulk query succeeded.
   * For those chains we can do constant-time lookups inside tests.
   */
  const marketsByChain: Record<
    number,
    Record<string, { uniqueKey: string; whitelisted: boolean }>
  > = {};

  /**
   * chainsUsingBulk: set of chains for which bulk markets(chainId) succeeded.
   * For other chains we fall back to per-market queries.
   */
  const chainsUsingBulk = new Set<number>();

  beforeAll(async () => {
    const chainIds = Object.keys(allMarketIdsByChain).map(Number);

    await Promise.all(
      chainIds.map(async (chainId) => {
        try {
          const markets = await fetchMarketsByChainId(chainId);
          marketsByChain[chainId] = markets;
          chainsUsingBulk.add(chainId);
        } catch (err) {
          // If bulk fails for this chain, we fall back to per-market queries in the tests.
          // eslint-disable-next-line no-console
          console.warn(
            `points.markets-listed: bulk markets query failed for chain ${chainId}, falling back to marketByUniqueKey:`,
            err,
          );
        }
      }),
    );
  });

  for (const [chainIdStr, marketIds] of Object.entries(allMarketIdsByChain)) {
    const chainId = Number(chainIdStr);

    for (const marketUniqueKey of marketIds) {
      it(
        `market ${marketUniqueKey} on chain ${chainId} exists (Morpho API)`,
        async () => {
          // If bulk succeeded for this chain, use it.
          if (chainsUsingBulk.has(chainId)) {
            const marketsForChain = marketsByChain[chainId] ?? {};
            const market = marketsForChain[marketUniqueKey];

            expect(market).toBeDefined();
            expect(market?.uniqueKey).toBe(marketUniqueKey);
            expect(market?.whitelisted).toBe(true);
            return;
          }

          // Otherwise fall back to original behavior: one API call per market.
          const market = await fetchMarketByUniqueKey(marketUniqueKey, chainId);

          expect(market).not.toBeNull();
          expect(market?.uniqueKey).toBe(marketUniqueKey);
          expect(market?.whitelisted).toBe(true);
        },
      );
    }
  }
});