import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";

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

type PointLocation = {
  mapName: string;
  chainId: string;
  address: string;
  pointIndex: number;
};

type PointEntry = PointLocation & { point: Point };

function collectPoints(
  mapName: string,
  map: ChainIdAddressPointsMapping,
): PointEntry[] {
  const entries: PointEntry[] = [];

  for (const [chainId, addressMap] of Object.entries(map)) {
    for (const [address, pointList] of Object.entries(addressMap)) {
      pointList.forEach((point, idx) => {
        entries.push({
          mapName,
          chainId,
          address,
          pointIndex: idx,
          point,
        });
      });
    }
  }

  return entries;
}

describe("points.json – point entries are not empty", () => {
  it("ensures every point has a title and label, and non-empty links when provided", () => {
    const entries = [
      collectPoints("vaultsWithPoints", points.vaultsWithPoints),
      collectPoints(
        "vaultsWithPointsOnMarket",
        points.vaultsWithPointsOnMarket,
      ),
      collectPoints(
        "vaultsWithPointsOnMarketCollateralToken",
        points.vaultsWithPointsOnMarketCollateralToken,
      ),
      collectPoints("marketsWithPoints", points.marketsWithPoints),
      collectPoints(
        "marketsWithPointsOnCollateralToken",
        points.marketsWithPointsOnCollateralToken,
      ),
    ].flat();

    const failures: string[] = [];

    const formatLocation = (location: PointLocation) =>
      `${location.mapName} → chain ${location.chainId} → ${location.address} [${location.pointIndex}]`;

    const isEmptyString = (value: unknown) =>
      typeof value === "string" && value.trim() === "";

    for (const entry of entries) {
      const { point } = entry;

      if (isEmptyString(point.title)) {
        failures.push(`${formatLocation(entry)} has an empty title`);
      }

      if (isEmptyString(point.label)) {
        failures.push(`${formatLocation(entry)} has an empty label`);
      }

      if (isEmptyString(point.link)) {
        failures.push(`${formatLocation(entry)} has an empty link`);
      }
    }

    expect(failures).toHaveLength(0);
  });
});