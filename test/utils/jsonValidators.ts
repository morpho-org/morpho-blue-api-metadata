import { readFileSync } from "fs";
import { join } from "path";

export const VALID_CHAIN_IDS = [1, 8453, 10, 130, 137, 999, 747474, 42161, 143] as const;
export const VALID_CHAIN_IDS_STRING = VALID_CHAIN_IDS.map(String);

export const loadJsonFile = (fileName: string) => {
  const filePath = join(__dirname, "../../data", fileName);
  const fileContent = readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

export const validateRequiredFields = <T>(
  data: T,
  requiredFields: (keyof T)[]
): boolean => {
  return requiredFields.every((field) =>
    Object.prototype.hasOwnProperty.call(data, field)
  );
};

export interface FetchParams {
  input: string | URL | Request;
  init?: RequestInit | undefined;
}

export async function fetchWithRetry(fetchParams: FetchParams, maxRetries: number = 3): Promise<Response> {
  let tries = 0;

  while (tries < maxRetries) {
    tries++;
    try {
      const response = await fetch(fetchParams.input, fetchParams.init);
      // On failure, throw error (which will be caught and retried)
      if(!response?.ok) {
        console.log(`External API request failed attempt ${tries}/${maxRetries}`);
        throw new Error(`External API request failed attempt ${tries}/${maxRetries}`);
      } else {
        // On success, just return the response
        return response;
      }
    } catch (error) {
      // If last retry failed, bubble up the error
      if (tries >= maxRetries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, tries) * 1000; // 1s, 2s, 4s, etc.
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
  