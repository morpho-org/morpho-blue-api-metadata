import { readFileSync, writeFileSync } from "fs";
import path from "path";

interface TokenMetadata {
  logoURI: string;
  tags?: string[];
  alternativeOracles?: string[];
  alternativeHardcodedOracles?: string[];
}

interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  metadata: TokenMetadata;
  isWhitelisted: boolean;
}

function filterTokens() {
  // Read the tokens.json file
  const rawData = readFileSync(
    path.join(__dirname, "../data/tokens.json"),
    "utf8"
  );
  const tokens = JSON.parse(rawData) as Token[];

  // Filter tokens for chainId 1, 8453, 10, 130, 137, 143, 988, 999, 747474 & 42161 AND must have logoURI
  const filteredTokens = tokens.filter(
    (token) =>
      (token.chainId === 1 || token.chainId === 8453 || token.chainId === 10 || token.chainId === 130 || token.chainId === 137 || token.chainId === 143 || token.chainId === 988 || token.chainId === 999 || token.chainId === 747474 || token.chainId === 42161) && token.metadata?.logoURI
  );

  // Write the filtered tokens to a new file
  writeFileSync(
    path.join(__dirname, "../data/filtered_tokens.json"),
    JSON.stringify(filteredTokens, null, 2)
  );

  console.log(
    `Filtered ${tokens.length} tokens down to ${filteredTokens.length} tokens`
  );
  console.log("Saved to filtered_tokens.json");
}

filterTokens();
