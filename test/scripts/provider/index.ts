import "dotenv/config";
import { createPublicClient, http, PublicClient } from "viem";
import { base, mainnet } from "viem/chains";

export const chainMapping = {
  1: mainnet,
  8453: base,
  10: op,
  130: unichain,
  137: polygon,
  999: hyperevm,
  747474: katana,
  42161: arbitrum,
};

export async function getClient(
  chainId: number,
  options: { enableDebug?: boolean } = {}
): Promise<PublicClient> {
  const rpcUrl =
    chainId === 1
      ? process.env.RPC_URL_MAINNET
      : chainId === 8453
      ? process.env.RPC_URL_BASE
      : chainId === 10
      ? process.env.RPC_URL_OP
      : chainId === 130
      ? process.env.RPC_URL_UNICHAIN
      : chainId === 137
      ? process.env.RPC_URL_POLYGON
      : chainId === 999
      ? process.env.RPC_URL_HYPEREVM
      : chainId === 747474
      ? process.env.RPC_URL_KATANA
      : chainId === 42161
      ? process.env.RPC_URL_ARBITRUM
      : undefined;

  if (!rpcUrl)
    throw new Error(`No RPC URL configured for chain ID: ${chainId}`);

  const transport = http(rpcUrl, {
    retryCount: 2,
    ...(options.enableDebug
      ? {}
      : {
          batch: {
            batchSize: 100,
            wait: 200,
          },
        }),
  });

  const client = createPublicClient({
    chain: chainId === 1 ? mainnet : chainId === 8453 ? base : chainId === 10 ? op : chainId === 130 ? unichain : chainId === 137 ? polygon : chainId === 999 ? hyperevm : chainId === 747474 ? katana : chainId === 42161 ? arbitrum : undefined,

    transport,
    ...(options.enableDebug
      ? {}
      : {
          batch: {
            multicall: {
              batchSize: 2048,
              wait: 100,
            },
          },
        }),
  }) as PublicClient;

  return client;
}
