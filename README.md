# Morpho blue api metadata

This repository contains the metadata for the Morpho blue api that need to be managed manually. 
It includes:

- vault whitelisting
- price feed whitelisting
- price mappings (oracle price & spot price)
- markets blacklisting
- tokens whitelisting.

> ** Note **
> The format of the data folder should not be modified, in order to let the api read the data.


# Whitelisting & warnings

## Morpho Vault whitelisting

Controls the whitelisted MetaMorphoMorpho vaults and their metadata.


### Files

[vaults-whitelist.json](./data/vaults-whitelist.json)

## Market blacklisting

Controls blacklisted markets by countries. Markets are automatically whitelisted when a whitelisted Vault is allocating to it.

You can use the country code "*" to blacklist markets from all countries.

### File

[morpho-labs-vaults-blacklist.json](./data/markets-blacklist.json)

## Recognized oracle feeds

Controls the unrecognized oracle feeds warnings and the feed label/categorization in the UI.

### Files

[price-feeds.json](./data/price-feeds.json)


## Recognized tokens

Control the unrecognized tokens warnings.

### Files

[tokens.json](./data/tokens.json)

### Structure

The json file contains a list of tokens. Structure for an individual token is the following:
- `name`: Name of the token (ERC-20)
- `address`: Address of the token (ERC-20)
- `symbol`: Symbol of the token (ERC-20)
- `decimals`: Decimals of the token (ERC-20)
- `chainId`: Chain id of the chain on which the token is deployed
- (Optional) `metadata`: Information associated to the token used internally
    - (Optional) `alternativeOracles`: List of oracle symbols which Morpho Labs considers as perfectly matching the token. Used for evaluating oracle warnings.
    - (Optional) `alternativeHardcodedOracles`: List of oracle symbols which Morpho Labs considers as a hardcoded oracle when associated with the token. Used for evaluating oracle warnings.

#### Example #1: Token with alternative oracle
WETH token is generally considered safe to use with ETH denominated oracles.
Therefore, "ETH" symbols is added as an alternative oracle to "WETH" token, and no oracle warnings will be triggered.

```
{
  "name": "Wrapped Ether",
  "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "symbol": "WETH",
  "decimals": 18,
  "chainId": 1,
  "metadata": {
    "alternativeOracles": ["ETH"]
  }
},
```

#### Example #2: Token with hardcoded oracle (stablecoin)
USDe token may be paired in a market with DAI without any oracle to avoid liquidations. In this case,


```
{
  "name": "USDe",
  "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "symbol": "USDe",
  "decimals": 18,
  "chainId": 1,
  "metadata": {
    "alternativeHardcodedOracles": ["DAI"]
  }
},
```

#### Example #3: Token with hardcoded oracle (null feeds)
There are special cases where there oracles might be intendedly left null for legitimate reasons (i.e avoid liquidations). For example, USDe token may be paired in a market with DAI with a completely null oracle. In this case, "DAI" is added as an alternative oracle to "USDe".


```
{
  "name": "USDe",
  "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "symbol": "USDe",
  "decimals": 18,
  "chainId": 1,
  "metadata": {
    "alternativeHardcodedOracles": ["DAI"]
  }
},
```

#### Example #4: Token with hardcoded token (LST)
stETH token may sometimes be considered 1:1 with ETH.
Therefore, "ETH" symbol is added as an alternative "hardcoded" oracle to "stETH" token, and "hardcoded_oracle" warning (minor) will be triggered when a stETH feed is paired with a ETH feed.

```
{
  "chainId": 1,
  "address": "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  "name": "stETH",
  "symbol": "stETH",
  "decimals": 18,
  "metadata": {
    "alternativeHardcodedOracles": ["ETH"]
  }
},
```


# Pricing

find all the documentation for the pricing [here](./docs/pricing)