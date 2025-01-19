# Adding Spot Prices to the API

Please follow this procedure to add a spot price (ETH) for an asset. The team will review its content and approve/deny it. All of the entries need to map towards a ETH value.

## Parameters

A spot price consist of either one of multiple chained values that are multiplied together. For each new asset, the following parameters are necessary:

### Asset address

42 character string that represent the token/asset address.

### Asset chain id

The numerical chain id of this asset, see [Chainlist](https://chainlist.org) for reference.

### Type

The following types are currently supported:

#### uniswap_v3_twap

Uniswap v3 pool

### Contract Address

42 character string that represent the contract address where the spot price can be queried.

### Contract chain id

The numerical chain id of the contract where the spot price can be queried, see [Chainlist](https://chainlist.org) for reference.

### Data

Extra data used for querying the spot price, here is the format for the supported types:

#### uniswap_v3_twap

First block number of the uniswap pool or from where data should be ingested (usually the market deployment block number).
in_token is whether the first asset of the chained values is token0 or token1 in the Uniswap pool.

`{"in_token": 0, first_block_number: 18700000}`

### Order

The 0 starting index order of the spot price entry for an asset.

## Adding mappings

To add mappings, simply add the entries to the [spot-prices.json](../src/schemas/asset-spot-price-mappings/spot-prices.json) file.

## Example

Here are the entries that would be required to add a spot price for `FRAX` on ETH mainnnet:

```json
{
    "id": "134f0bed-842a-4aa9-8564-9d60de3b10ba",
    "assetAddress": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    "contractAddress": "0xc63b0708e2f7e69cb8a1df0e1389a98c35a76d52",
    "order": 0,
    "type": "uniswap_v3_twap",
    "data": "{\"in_token\": 0, \"first_block_number\": 18700000}",
    "assetChainId": 1,
    "contractChainId": 1
},
{
    "id": "39d69188-d39c-4e8f-bfbf-2f1d8e9eeda0",
    "assetAddress": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    "contractAddress": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    "order": 1,
    "type": "uniswap_v3_twap",
    "data": "{\"in_token\": 0, \"first_block_number\": 18700000}",
    "assetChainId": 1,
    "contractChainId": 1
},
```