import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

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

const root = path.join(__dirname, "..");

const points: PointsMapping = JSON.parse(
  fs.readFileSync(path.join(root, "data", "points.json"), "utf-8"),
);

// Allow skipping in CI if desired
const shouldSkipApiTests = process.env.SKIP_MARKETS_API_TESTS === "true";

// Morpho GraphQL endpoint
const MORPHO_API_URL = "https://api.morpho.org/graphql";

// Helper to query marketByUniqueKey
async function fetchMarketByUniqueKey(
  uniqueKey: string,
  chainId: number,
): Promise<{ uniqueKey: string } | null> {
  const query = `
    query MarketByUniqueKey($uniqueKey: String!, $chainId: Int!) {
      marketByUniqueKey(uniqueKey: $uniqueKey, chainId: $chainId) {
        uniqueKey
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

describe("points.json – market unique keys correspond to real Morpho markets", () => {
  if (shouldSkipApiTests) {
    it.skip("SKIPPED via SKIP_MARKETS_API_TESTS", () => {});
    return;
  }

  // Allow more time for network calls
  vi.setTimeout(60_000);

  for (const [chainIdStr, marketIds] of Object.entries(allMarketIdsByChain)) {
    const chainId = Number(chainIdStr);

    for (const marketUniqueKey of marketIds) {
      it(
        `market ${marketUniqueKey} on chain ${chainId} exists (Morpho API)`,
        async () => {
          const market = await fetchMarketByUniqueKey(marketUniqueKey, chainId);

          expect(
            market,
            `No market returned for uniqueKey=${marketUniqueKey} on chainId=${chainId}`,
          ).not.toBeNull();

          expect(market?.uniqueKey).toBe(marketUniqueKey);
        },
      );
    }
  }
});
