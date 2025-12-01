import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, jest } from "@jest/globals";

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

// Fetch all markets for a chain in one request to avoid spamming the API
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

describe("points.json – market unique keys correspond to real Morpho markets", () => {
  if (shouldSkipApiTests) {
    it.skip("SKIPPED via SKIP_MARKETS_API_TESTS", () => {});
    return;
  }

  // Allow more time for network calls
  jest.setTimeout(60_000);

  const marketsByChain: Record<number, Record<string, { uniqueKey: string; whitelisted: boolean }>> = {};

  beforeAll(async () => {
    const chainIds = Object.keys(allMarketIdsByChain).map(Number);

    const results = await Promise.all(
      chainIds.map(async (chainId) => ({
        chainId,
        markets: await fetchMarketsByChainId(chainId),
      })),
    );

    for (const { chainId, markets } of results) {
      marketsByChain[chainId] = markets;
    }
  });

  for (const [chainIdStr, marketIds] of Object.entries(allMarketIdsByChain)) {
    const chainId = Number(chainIdStr);
    const markets = marketsByChain[chainId] ?? {};

    for (const marketUniqueKey of marketIds) {
      it(
        `market ${marketUniqueKey} on chain ${chainId} exists (Morpho API)`,
        async () => {
          const market = markets[marketUniqueKey];

          expect(market).toBeDefined();

          expect(market?.uniqueKey).toBe(marketUniqueKey);
          expect(market?.whitelisted).toBe(true);
        },
      );
    }
  }
});