import { readFileSync } from "fs";
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
  isListed: boolean;
}

function checkTokenURIs() {
  // Read the tokens.json file
  const rawData = readFileSync(
    path.join(__dirname, "../data/tokens.json"),
    "utf8"
  );
  const tokens = JSON.parse(rawData) as Token[];

  const CDN_PREFIX = "https://cdn.morpho.org/assets/logos/";
  const encodingIssues: Array<{
    address: string;
    chainId: number;
    current: string;
    correct: string;
  }> = [];
  const missingLogos: Array<{
    address: string;
    chainId: number;
    name: string;
  }> = [];

  tokens.forEach((token) => {
    if (!token.metadata?.logoURI) {
      missingLogos.push({
        address: token.address,
        chainId: token.chainId,
        name: token.name,
      });
      return;
    }

    // Skip if not using Morpho CDN
    if (!token.metadata.logoURI.startsWith(CDN_PREFIX)) {
      return;
    }

    const symbol = token.metadata.logoURI.replace(CDN_PREFIX, "");
    const decodedSymbol = decodeURIComponent(symbol);
    const properlyEncodedUri = `${CDN_PREFIX}${encodeURIComponent(
      decodedSymbol
    )}`;

    if (token.metadata.logoURI !== properlyEncodedUri) {
      encodingIssues.push({
        address: token.address,
        chainId: token.chainId,
        current: token.metadata.logoURI,
        correct: properlyEncodedUri,
      });
    }
  });

  if (encodingIssues.length === 0) {
    console.log("All logoURIs are properly encoded!");
  } else {
    console.log("\nEncoding issues summary:");
    console.log("Total issues found:", encodingIssues.length);
    console.table(encodingIssues);
  }

  if (missingLogos.length > 0) {
    console.log("\nMissing logoURIs summary:");
    console.log("Total tokens without logo:", missingLogos.length);
    console.table(missingLogos);
  } else {
    console.log("All tokens have logoURIs!");
  }
}

checkTokenURIs();
