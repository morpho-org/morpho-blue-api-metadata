import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

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

type TokenEntry = {
  chainId: number;
  address: string;
  // other fields exist but are not needed here
};

const root = path.join(__dirname, "..");

// --- Load JSON files ---

const points: PointsMapping = JSON.parse(
  fs.readFileSync(path.join(root, "data", "points.json"), "utf-8"),
);

const tokens: TokenEntry[] = JSON.parse(
  fs.readFileSync(path.join(root, "data", "tokens.json"), "utf-8"),
);

// --- Build a lookup set of all whitelisted tokens ---

const tokenKeys = new Set<string>();

for (const token of tokens) {
  tokenKeys.add(`${token.chainId}:${token.address}`);
}

// Helper to check a ChainIdAddressPointsMapping whose keys are token addresses
const checkTokenMap = (
  mapName: string,
  map: ChainIdAddressPointsMapping,
) => {
  describe(`points.json – ${mapName} only references whitelisted tokens`, () => {
    for (const [chainIdStr, tokenMap] of Object.entries(map)) {
      const chainId = Number(chainIdStr);

      for (const tokenAddress of Object.keys(tokenMap)) {
        it(`token ${tokenAddress} on chain ${chainId} is present in tokens.json (${mapName})`, () => {
          const key = `${chainId}:${tokenAddress}`;
          expect(
            tokenKeys.has(key),
            `Token ${tokenAddress} on chainId=${chainId} from ${mapName} is not in tokens.json`,
          ).toBe(true);
        });
      }
    }
  });
};

// Run checks for both collateral-token–based maps
checkTokenMap(
  "marketsWithPointsOnCollateralToken",
  points.marketsWithPointsOnCollateralToken,
);

checkTokenMap(
  "vaultsWithPointsOnMarketCollateralToken",
  points.vaultsWithPointsOnMarketCollateralToken,
);
