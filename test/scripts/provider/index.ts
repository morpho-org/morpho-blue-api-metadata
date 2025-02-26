import "dotenv/config";
import { createPublicClient, http, PublicClient } from "viem";
import { base, mainnet } from "viem/chains";

export const chainMapping = {
  1: mainnet,
  8453: base,
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
    chain: chainId === 1 ? mainnet : chainId === 8453 ? base : undefined,

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
