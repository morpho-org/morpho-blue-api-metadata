import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";

interface MerklCampaignEntry {
  campaignId: string;
}

describe("merkl-campaigns-blacklist.json validation", () => {
  const entries = loadJsonFile("merkl-campaigns-blacklist.json") as MerklCampaignEntry[];

  test("file is a non-empty array", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test("each entry has a non-empty numeric campaignId string", () => {
    const errors: string[] = [];
    const idPattern = /^\d+$/;
    entries.forEach((row, index) => {
      if (typeof row.campaignId !== "string" || !row.campaignId) {
        errors.push(`index ${index}: campaignId must be a non-empty string`);
      } else if (!idPattern.test(row.campaignId)) {
        errors.push(`index ${index}: campaignId must contain only digits: ${row.campaignId}`);
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("no duplicate campaignId", () => {
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    entries.forEach((row, index) => {
      const first = seen.get(row.campaignId);
      if (first !== undefined) {
        dupes.push(`duplicate campaignId ${row.campaignId} at indices ${first} and ${index}`);
      } else {
        seen.set(row.campaignId, index);
      }
    });
    expect(dupes).toEqual([]);
  });
});
