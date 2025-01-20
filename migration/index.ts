import ChainlinkFeedsBase from "./old-data/chainlink-feeds-base.json";
import ChainlinkFeedsMainnet from "./old-data/chainlink-feeds-mainnet.json";
import {type Address, getAddress} from "viem";
import MorphoLabsTokens from "./old-data/morpho-labs-tokens-whitelist.json";
import UniswapDefaultWhitelist from "./old-data/uniswap-labs-default-list.json";
import RedstoneFeedsMainnet from "./old-data/redstone-feeds-mainnet.json";
import RedstoneFeedsBase from "./old-data/redstone-feeds-base.json";
import MorphoLabsFeedsMainnet from "./old-data/morpho-labs-oracle-feeds-whitelist.json";
import VaultsWhitelist from "./old-data/vaults-whitelist.json"
import {addresses} from "@morpho-org/blue-sdk";
import * as fs from "node:fs";

export enum VendorType{
  CHAINLINK = 'Chainlink',
  REDSTONE = 'Redstone',
}
const usdToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const allTokens = [
    ...MorphoLabsTokens.tokens.map((t) => ({
      ...t,
      isWhitelisted: true
    })),
    ...UniswapDefaultWhitelist.tokens.map((token) => ({
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      name: token.name,
      metadata: token.metadata,
      isWhitelisted: true
    })),
]

const run = async () => {

  const findTokenFromSymbol = (symbol: string, chainId: number) => {
    if(symbol.toUpperCase() === "ETH" || symbol.toUpperCase() === "WETH") return addresses[chainId as keyof typeof addresses].wNative;
    if(symbol.toUpperCase() === "USD") return usdToken;
    if(symbol.toUpperCase() === "BTC") {
    symbol = "WBTC"
    }
    return allTokens.find((token) => token.symbol.toLowerCase() === symbol.toLowerCase() && token.chainId === chainId)?.address as Address | undefined;
  }


  const chainlinkFeedsBase = ChainlinkFeedsBase.map((feed) => {

    const pair = (() => {
      if (feed.pair[0] !== '' && feed.pair[1] !== '') {
        return feed.pair.map((item) => item.trim()) as [string, string];
      }
      if (feed.docs.baseAsset && feed.docs.quoteAsset) {
        return [feed.docs.baseAsset.trim(), feed.docs.quoteAsset.trim()] as [
          string,
          string,
        ];
      }
      if (feed.name.includes('/')) {
        return feed.name.split('/').map((item) => item.trim()) as [
          string,
          string,
        ];
      }
      return null;
    })();


    const symbolIn = pair?.[0];
    const symbolOut = pair?.[1];

    let tokenIn: Address | undefined = undefined;
    if(symbolIn) {
      tokenIn = findTokenFromSymbol(symbolIn, 8453);
    }
    let tokenOut: Address | undefined = undefined;
    if(symbolOut) {
      tokenOut = findTokenFromSymbol(symbolOut, 8453);
    }


    return {
      chainId: 8453,
      address: getAddress(feed.proxyAddress
          ? feed.proxyAddress
          : feed.contractAddress),
      vendor: VendorType.CHAINLINK,
      description: `${feed.name} (${feed.threshold}%)`,
      pair,
      tokenIn : tokenIn ? {
        address: tokenIn,
        chainId: 8453,
          } : undefined,
      tokenOut: tokenOut ? {
        address: tokenOut,
        chainId: 8453,
          } : undefined,
      decimals: feed.decimals,
    }
  });

  const chainlinkFeedsMainnet = ChainlinkFeedsMainnet.map((feed) => {
    const pair = (() => {
      if (feed.pair[0] !== '' && feed.pair[1] !== '') {
        return feed.pair.map((item) => item.trim()) as [string, string];
      }
      if (feed.docs.baseAsset && feed.docs.quoteAsset) {
        return [feed.docs.baseAsset.trim(), feed.docs.quoteAsset.trim()] as [
          string,
          string,
        ];
      }
      if (feed.name.includes('/')) {
        return feed.name.split('/').map((item) => item.trim()) as [
          string,
          string,
        ];
      }
    })();

    const symbolIn = pair?.[0];
    const symbolOut = pair?.[1];

    let tokenIn: Address | undefined = undefined;
    if(symbolIn) {
      tokenIn = findTokenFromSymbol(symbolIn, 1);
    }
    let tokenOut: Address | undefined = undefined;
    if(symbolOut) {
      tokenOut = findTokenFromSymbol(symbolOut, 1);
    }

    return {
      chainId: 1,
      address: (feed.proxyAddress
          ? feed.proxyAddress
          : feed.contractAddress) as Address,
      vendor: VendorType.CHAINLINK,
      description: `${feed.name} (${feed.threshold}%)`,
      pair,
      tokenIn: tokenIn ? {
        address: tokenIn,
        chainId: 1,
      } : undefined,

      tokenOut: tokenOut ? {
        address: tokenOut,
        chainId: 1,
      } : undefined,
      decimals: 8,
    }

  });

  const redstoneFeedsBase = RedstoneFeedsBase.map((feed) => {

    const tokenIn = findTokenFromSymbol(feed.symbol, 8453);
    const tokenOut = findTokenFromSymbol(feed.denomination, 8453);

    return {
      chainId: 8453,
      address: feed.contractAddress as Address,
      vendor: VendorType.REDSTONE,
      description: `${feed.symbol}/${feed.denomination} (${feed.deviationThreshold})`,
      pair: [feed.symbol, feed.denomination],
      tokenIn: tokenIn ?{
        address: tokenIn,
        chainId: 8453,
      } : undefined,
      tokenOut: tokenOut ? {
        address: tokenOut,
        chainId: 8453,
      } : undefined,
    }

  });
  const redstoneFeedsMainnet = RedstoneFeedsMainnet.map((feed) => {

    const tokenIn = findTokenFromSymbol(feed.symbol, 8453);
    const tokenOut = findTokenFromSymbol(feed.denomination, 8453);

    return {
      chainId: 1,
      address: feed.contractAddress as Address,
      vendor: VendorType.REDSTONE,
      description: `${feed.symbol}/${feed.denomination} (${feed.deviationThreshold})`,
      pair: [feed.symbol, feed.denomination],
      tokenIn: tokenIn ?{
        address: tokenIn,
        chainId: 1,
      } : undefined,
      tokenOut: tokenOut ? {
        address: tokenOut,
        chainId: 1,
      } : undefined,
    }

  });


  const morphoLabsFeeds = MorphoLabsFeedsMainnet.oracleFeeds.map((feed) => {

    const tokenIn = findTokenFromSymbol(feed.pair[0]!, feed.chainId);
    const tokenOut = findTokenFromSymbol(feed.pair[1]!, feed.chainId);
    return {
      chainId: feed.chainId,
      address: getAddress(feed.contractAddress),
      vendor: feed.vendor,
      description: feed.description,
      pair: feed.pair as [string, string],
      tokenIn: tokenIn ? {
        address: tokenIn,
        chainId: feed.chainId,
      } : undefined,
      tokenOut: tokenOut ? {
        address: tokenOut,
        chainId: feed.chainId
      } : undefined,
    }
  })

  const whitelist = Object.entries(VaultsWhitelist).flatMap(([chainIdStr, data]) => Object.entries(data).flatMap(([address, metadata]) => ({
    address: getAddress(address),
    chainId: parseInt(chainIdStr),
    ...metadata
  })))

  const allFeeds = [...redstoneFeedsBase, ...redstoneFeedsMainnet, ...chainlinkFeedsBase, ...chainlinkFeedsMainnet, ...morphoLabsFeeds];



  await fs.promises.writeFile("./all-feeds.json", JSON.stringify(allFeeds, null, 2));
  await fs.promises.writeFile("./all-tokens.json", JSON.stringify(allTokens, null, 2));
  await fs.promises.writeFile("./vaults-whitelist.json", JSON.stringify(whitelist, null, 2))

};

run();

