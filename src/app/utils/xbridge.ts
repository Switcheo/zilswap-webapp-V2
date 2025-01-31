import USDTAbi from "app/utils/usdt.abi.json";
import { ethers } from "ethers";
import { Network } from "zilswap-sdk/lib/constants";
import { Blockchain, BRIDGEABLE_EVM_CHAINS, BridgeableChains, BridgeableEvmChains, ETH_ADDRESS } from "./constants";

export enum TokenManagerType {
  MintAndBurn,
  LockAndRelease,
  ZilBridge,
}

export type TokenConfig = {
  symbol: string;
  address: string;
  decimals: number;
  tokenManagerAddress: string;
  tokenManagerType: TokenManagerType;
  tokenLogoAddress?: string;
  bridgesTo: Blockchain[];
  abi?: any;
  needsAllowanceClearing?: boolean;
};

export type ChainConfig = {
  name: string;
  chain: Blockchain;
  chainGatewayAddress: string;
  tokens: TokenConfig[];
  chainId: number;
  nativeTokenSymbol: string;
};


export const chainConfigs: Record<Network, Partial<Record<Blockchain, ChainConfig>>> = {
  [Network.MainNet]: {
    [Blockchain.Zilliqa]: {
      chain: Blockchain.Zilliqa,
      chainId: 32769,
      name: "Zilliqa",
      chainGatewayAddress: "0xbA44BC29371E19117DA666B729A1c6e1b35DDb40",
      tokens: [
        {
          symbol: "SEED",
          decimals: 18,
          address: "0xe64cA52EF34FdD7e20C0c7fb2E392cc9b4F6D049",
          tokenLogoAddress: "0xfa254e12c82ff62967185cb144db3768d176fba5",
          tokenManagerAddress: "0x6D61eFb60C17979816E4cE12CD5D29054E755948",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "HRSE",
          decimals: 18,
          address: "0x63B991C17010C21250a0eA58C6697F696a48cdf3",
          tokenLogoAddress: "0xf69ea17f8389130c785f2af7ce20f4729692cb3a",
          tokenManagerAddress: "0x6D61eFb60C17979816E4cE12CD5D29054E755948",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "FPS",
          decimals: 12,
          address: "0x241c677D9969419800402521ae87C411897A029f",
          tokenLogoAddress: "0x929c314bf271259fc03b58f51627f1ae2baf1039",
          tokenManagerAddress: "0x6D61eFb60C17979816E4cE12CD5D29054E755948",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "POL",
          decimals: 18,
          address: "0x4345472A0c6164F35808CDb7e7eCCd3d326CC50b",
          tokenLogoAddress: "0xa1a172999ad3c5d457536c48736e30f53bc260c9",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Polygon],
        },
        {
          symbol: "ZIL",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenLogoAddress: ETH_ADDRESS,
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum, Blockchain.Polygon, Blockchain.Arbitrum, Blockchain.BinanceSmartChain],
        },
        {
          symbol: "XCAD",
          decimals: 18,
          address: "0xCcF3Ea256d42Aeef0EE0e39Bfc94bAa9Fa14b0Ba",
          tokenLogoAddress: "0x153feaddc48871108e286de3304b9597c817b456",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "ETH",
          decimals: 18,
          address: "0x17D5af5658A24bd964984b36d28e879a8626adC3",
          tokenLogoAddress: "0x2ca315f4329654614d1e8321f9c252921192c5f2",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum, Blockchain.Arbitrum],
        },
        {
          symbol: "OPUL",
          decimals: 18,
          address: "0x8DEAdC20f7218994c86b59eE1D5c7979fFcAa893",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "BRKL",
          decimals: 18,
          address: "0xD819257C964A78A493DF93D5643E9490b54C5af2",
          tokenLogoAddress: "0x32339fa037f7ae1dfff25e13c6451a80289d61f4",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "WBTC",
          decimals: 8,
          address: "0x2938fF251Aecc1dfa768D7d0276eB6d073690317",
          tokenLogoAddress: "0x75fa7d8ba6bed4a68774c758a5e43cfb6633d9d6",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "USDT",
          decimals: 6,
          address: "0x2274005778063684fbB1BfA96a2b725dC37D75f9",
          tokenLogoAddress: "0x818ca2e217e060ad17b7bd0124a483a1f66930a9",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "TRAXX",
          decimals: 18,
          address: "0x9121A67cA79B6778eAb477c5F76dF6de7C79cC4b",
          tokenLogoAddress: "0x86e5b6484f49ef82b1030a446d59b4ffb916f210",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "LUNR",
          decimals: 4,
          address: "0xE9D47623bb2B3C497668B34fcf61E101a7ea4058",
          tokenLogoAddress: "0x31bfa2054b7199f936733f9054dbce259a3c335a",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "dXCAD",
          decimals: 18,
          address: "0xa0A5795e7eccc43Ba92d2A0b7804696F8B9e1a05",
          tokenLogoAddress: "0x327082dd216ff625748b13e156b9d1a5d3dd41f2",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "PORT",
          decimals: 4,
          address: "0x1202078D298Ff0358A95b6fbf48Ec166dB414660",
          tokenLogoAddress: "0x3a683fdc022b26d755c70e9ed7cfcc446658018b",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "FEES",
          decimals: 4,
          address: "0xc99ECB82a27B45592eA02ACe9e3C42050f3c00C0",
          tokenLogoAddress: "0x91228a48aea4e4071b9c6444eb08b021399cff7c",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Ethereum],
        },
        {
          symbol: "BNB",
          decimals: 18,
          address: "0xea87bC6CcaE73bae35693639e22eF30667760F61",
          tokenLogoAddress: "0xdf1b2eaf0211a93f7cce77eb5a28b561bff04bdd",
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
      ],
      nativeTokenSymbol: "ZIL",
    },
    [Blockchain.Polygon]: {
      chain: Blockchain.Polygon,
      chainId: 137,
      name: "Polygon",
      chainGatewayAddress: "0x796d796F28b3dB5287e560dDf75BC9B00F0CD609",
      nativeTokenSymbol: "POL",
      tokens: [
        {
          symbol: "ZIL",
          decimals: 12,
          address: "0xCc88D28f7d4B0D5AFACCC77F6102d88EE630fA17",
          tokenLogoAddress: ETH_ADDRESS,
          tokenManagerAddress: "0x3faC7cb5b45A3B59d76b6926bc704Cf3cc522437",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "POL",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenLogoAddress: "0x2ca315f4329654614d1e8321f9c252921192c5f2",
          tokenManagerAddress: "0x7519550ae8b6f9d32E9c1A939Fb5C186f660BE5b",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
      ],
    },
    [Blockchain.Arbitrum]: {
      chain: Blockchain.Arbitrum,
      name: "Arbitrum",
      chainGatewayAddress: "0xA5AD439b10c3d7FBa00492745cA599250aC21619",
      chainId: 42161,
      nativeTokenSymbol: "ETH",
      tokens: [
        {
          symbol: "ZIL",
          decimals: 12,
          address: "0x1816a0f20bc996f643b1af078e8d84a0aabd772a",
          tokenLogoAddress: ETH_ADDRESS,
          tokenManagerAddress: "0x4fa6148C9DAbC7A737422fb1b3AB9088c878d26C",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "ETH",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenLogoAddress: "0x2ca315f4329654614d1e8321f9c252921192c5f2",
          tokenManagerAddress: "0x4345472A0c6164F35808CDb7e7eCCd3d326CC50b",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
      ],
    },
    [Blockchain.Ethereum]: {
      chain: Blockchain.Ethereum,
      chainId: 1,
      name: "Ethereum",
      chainGatewayAddress: "0x49EA20823c953dd00619E2090DFa3965C89269C3",
      nativeTokenSymbol: "ETH",
      tokens: [
        {
          symbol: "ZIL",
          decimals: 12,
          address: "0x6EeB539D662bB971a4a01211c67CB7f65B09b802",
          tokenLogoAddress: ETH_ADDRESS,
          tokenManagerAddress: "0x99bCB148BEC418Fc66ebF7ACA3668ec1C6289695",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "LUNR",
          decimals: 4,
          address: "0xA87135285Ae208e22068AcDBFf64B11Ec73EAa5A",
          tokenLogoAddress: "0x31bfa2054b7199f936733f9054dbce259a3c335a",
          tokenManagerAddress: "0x99bCB148BEC418Fc66ebF7ACA3668ec1C6289695",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "dXCAD",
          decimals: 18,
          address: "0xBd636FFfbF349A4479db315c585E823164cF58F0",
          tokenLogoAddress: "0x327082dd216ff625748b13e156b9d1a5d3dd41f2",
          tokenManagerAddress: "0x99bCB148BEC418Fc66ebF7ACA3668ec1C6289695",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "PORT",
          decimals: 4,
          address: "0x0c7c5b92893A522952EB4c939aA24B65FF910C48",
          tokenLogoAddress: "0x3a683fdc022b26d755c70e9ed7cfcc446658018b",
          tokenManagerAddress: "0x99bCB148BEC418Fc66ebF7ACA3668ec1C6289695",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "FEES",
          decimals: 4,
          address: "0xf7030C3f43b85874ae12B57F44cd682196568b47",
          tokenLogoAddress: "0x91228a48aea4e4071b9c6444eb08b021399cff7c",
          tokenManagerAddress: "0x99bCB148BEC418Fc66ebF7ACA3668ec1C6289695",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "XCAD",
          decimals: 18,
          address: "0x7659CE147D0e714454073a5dd7003544234b6Aa0",
          tokenLogoAddress: "0x153feaddc48871108e286de3304b9597c817b456",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "OPUL",
          decimals: 18,
          address: "0x80D55c03180349Fff4a229102F62328220A96444",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "ETH",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenLogoAddress: "0x2ca315f4329654614d1e8321f9c252921192c5f2",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "BRKL",
          decimals: 18,
          address: "0x4674a4F24C5f63D53F22490Fb3A08eAAAD739ff8",
          tokenLogoAddress: "0x32339fa037f7ae1dfff25e13c6451a80289d61f4",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "WBTC",
          decimals: 8,
          address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          tokenLogoAddress: "0x75fa7d8ba6bed4a68774c758a5e43cfb6633d9d6",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "USDT",
          decimals: 6,
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          tokenLogoAddress: "0x818ca2e217e060ad17b7bd0124a483a1f66930a9",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          abi: USDTAbi,
          bridgesTo: [Blockchain.Zilliqa],
          needsAllowanceClearing: true,
        },
        {
          symbol: "TRAXX",
          decimals: 18,
          address: "0xD43Be54C1aedf7Ee4099104f2DaE4eA88B18A249",
          tokenLogoAddress: "0x86e5b6484f49ef82b1030a446d59b4ffb916f210",
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
      ],
    },
    [Blockchain.BinanceSmartChain]: {
      chain: Blockchain.BinanceSmartChain,
      chainId: 56,
      name: "BSC",
      chainGatewayAddress: "0x3967f1a272Ed007e6B6471b942d655C802b42009",
      tokens: [
        {
          symbol: "SEED",
          decimals: 18,
          address: "0x9158dF7da69b048a296636D5DE7a3d9A7FB25E88",
          tokenLogoAddress: "0xfa254e12c82ff62967185cb144db3768d176fba5",
          tokenManagerAddress: "0xF391A1Ee7b3ccad9a9451D2B7460Ac646F899f23",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "HRSE",
          decimals: 18,
          address: "0x3BE0E5EDC58bd55AAa381Fa642688ADC289c05a3",
          tokenLogoAddress: "0xf69ea17f8389130c785f2af7ce20f4729692cb3a",
          tokenManagerAddress: "0xF391A1Ee7b3ccad9a9451D2B7460Ac646F899f23",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "FPS",
          decimals: 12,
          address: "0x351dA1E7500aBA1d168b9435DCE73415718d212F",
          tokenLogoAddress: "0x929c314bf271259fc03b58f51627f1ae2baf1039",
          tokenManagerAddress: "0xF391A1Ee7b3ccad9a9451D2B7460Ac646F899f23",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "BNB",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenLogoAddress: "0xdf1b2eaf0211a93f7cce77eb5a28b561bff04bdd",
          tokenManagerAddress: "0x1202078D298Ff0358A95b6fbf48Ec166dB414660",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "ZIL",
          decimals: 12,
          address: "0xb1E6F8820826491FCc5519f84fF4E2bdBb6e3Cad",
          tokenLogoAddress: ETH_ADDRESS,
          tokenManagerAddress: "0x2EE8e8D7C113Bb7c180f4755f06ed50bE53BEDe5",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.Zilliqa],
        },
      ],
      nativeTokenSymbol: "BNB",
    },
  },
  [Network.TestNet]: {
    [Blockchain.Zilliqa]: {
      chain: Blockchain.Zilliqa,
      chainId: 33101,
      name: "Zilliqa Testnet",
      chainGatewayAddress: "0x7370e69565BB2313C4dA12F9062C282513919230",
      tokens: [
        {
          symbol: "SEED",
          decimals: 18,
          address: "0x28e8d39Fc68eaA27c88797Eb7D324b4B97D5b844",
          tokenManagerAddress: "0x1509988c41f02014aA59d455c6a0D67b5b50f129",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "TST",
          decimals: 18,
          address: "0x8618d39a8276D931603c6Bc7306af6A53aD2F1F3",
          tokenManagerAddress: "0x1509988c41f02014aA59d455c6a0D67b5b50f129",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "TSLM",
          decimals: 18,
          address: "0xE90Dd366D627aCc5feBEC126211191901A69f8a0",
          tokenManagerAddress: "0x1509988c41f02014aA59d455c6a0D67b5b50f129",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "TST2",
          decimals: 18,
          address: "0x9Be4DCfB335A263c65a8A763d55710718bbdb416",
          tokenManagerAddress: "0x41823941D00f47Ea1a98D75586915BF828F4a038",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "ZBTST",
          decimals: 18,
          address: "0xd3750B930ED52C26584C18B4f5eeAb986D7f3b36",
          tokenManagerAddress: "0x41823941D00f47Ea1a98D75586915BF828F4a038",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "BNB",
          decimals: 18,
          address: "0x40647A0C0024755Ef48Bc7C26a979ED833Eb6a15",
          tokenLogoAddress: "0xdf1b2eaf0211a93f7cce77eb5a28b561bff04bdd",
          tokenManagerAddress: "0x41823941D00f47Ea1a98D75586915BF828F4a038",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "ZIL",
          decimals: 12,
          address: ETH_ADDRESS,
          tokenManagerAddress: "0x41823941D00f47Ea1a98D75586915BF828F4a038",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
        {
          symbol: "SCLD",
          decimals: 18,
          address: "0xd6B5231DC7A5c37461A21A8eB42610e09113aD1a",
          tokenManagerAddress: "0x41823941D00f47Ea1a98D75586915BF828F4a038",
          tokenManagerType: TokenManagerType.ZilBridge,
          bridgesTo: [Blockchain.BinanceSmartChain],
        },
      ],
      nativeTokenSymbol: "ZIL",
    },
    [Blockchain.BinanceSmartChain]: {
      chain: Blockchain.BinanceSmartChain,
      chainId: 97,
      name: "BSC Testnet",
      chainGatewayAddress: "0xa9A14C90e53EdCD89dFd201A3bF94D867f8098fE",
      tokens: [
        {
          symbol: "SEED",
          decimals: 18,
          address: "0x486722DbA2F76aeFb9977641D11f3aC3e5bA281f",
          tokenManagerAddress: "0xA6D73210AF20a59832F264fbD991D2abf28401d0",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "TST",
          decimals: 18,
          address: "0x5190e8b4Bbe8C3a732BAdB600b57fD42ACbB9F4B",
          tokenManagerAddress: "0xA6D73210AF20a59832F264fbD991D2abf28401d0",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "TSLM",
          decimals: 18,
          address: "0x7Cc585de659E8938Aa7d5709BeaF34bD108bdC03",
          tokenManagerAddress: "0xA6D73210AF20a59832F264fbD991D2abf28401d0",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "TST2",
          decimals: 18,
          address: "0xa1a47FA4D26137329BB08aC2E5F9a6C32D180fE3",
          tokenManagerAddress: "0x36b8A9cd6Bf9bfA5984093005cf81CAfB1Bf06F7",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "ZBTST",
          decimals: 18,
          address: "0x201eDd0521cF4B577399F789e22E05405D500163",
          tokenManagerAddress: "0x36b8A9cd6Bf9bfA5984093005cf81CAfB1Bf06F7",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "BNB",
          decimals: 18,
          address: ETH_ADDRESS,
          tokenManagerAddress: "0x36b8A9cd6Bf9bfA5984093005cf81CAfB1Bf06F7",
          tokenManagerType: TokenManagerType.LockAndRelease,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "ZIL",
          decimals: 12,
          address: "0xfA3cF3BBa7f0fA1E8FECeE532512434A7d275d41",
          tokenManagerAddress: "0x36b8A9cd6Bf9bfA5984093005cf81CAfB1Bf06F7",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
        {
          symbol: "SCLD",
          decimals: 18,
          address: "0xBA97f1F72b217BdC5684Ec175bE5615C0E50aBda",
          tokenManagerAddress: "0x36b8A9cd6Bf9bfA5984093005cf81CAfB1Bf06F7",
          tokenManagerType: TokenManagerType.MintAndBurn,
          bridgesTo: [Blockchain.Zilliqa],
        },
      ],
      nativeTokenSymbol: "BNB",
    },
  }
};

export const getExplorerLink = (hash: string, network: Network, blockchain?: Blockchain) => {
  if (network === Network.MainNet) {
    switch (blockchain) {
      case Blockchain.Ethereum:
        return `https://etherscan.io/tx/${hash}`
      case Blockchain.Arbitrum:
        return `https://arbiscan.io/tx/${hash}`
      case Blockchain.BinanceSmartChain:
        return `https://bscscan.com/tx/${hash}`
      case Blockchain.Polygon:
        return `https://polygonscan.com/tx/${hash}`
      case Blockchain.Zilliqa: /* FALLTHROUGH */
      default:
        return `https://viewblock.io/zilliqa/tx/${hash}`
    }
  } else {
    switch (blockchain) {
      case Blockchain.Ethereum:
        return `https://goerli.etherscan.io/tx/${hash}`
      case Blockchain.Zilliqa: /* FALLTHROUGH */
      default:
        return `https://viewblock.io/zilliqa/tx/${hash}?network=testnet`
    }
  }
}

export const getExplorerSite = (network: Network, blockchain?: BridgeableChains): string => {
  if (network === Network.MainNet) {
    switch (blockchain) {
      case Blockchain.Ethereum:
        return 'Etherscan'
      case Blockchain.Arbitrum:
        return 'Arbiscan'
      case Blockchain.BinanceSmartChain:
        return 'Bscscan'
      case Blockchain.Polygon:
        return 'Polygonscan'
      case Blockchain.Zilliqa: /* FALLTHROUGH */
      default:
        return 'Viewblock'
    }
  } else {
    switch (blockchain) {
      case Blockchain.Ethereum:
        return 'Goerliscan'
      case Blockchain.Zilliqa: /* FALLTHROUGH */
      default:
        return 'Viewblock'
    }
  }
}
export const evmIncludes = (chain: BridgeableChains) => BRIDGEABLE_EVM_CHAINS.includes(chain as typeof BRIDGEABLE_EVM_CHAINS[number]);

/**
 * Returns a readonly map of EVM Blockchains to their respective chain IDs
 * @param {Network} network The selected Zilliqa network based on wallet (mainnet/ testnet)
 */
export const getEvmChainIDs = (network: Network): ReadonlyMap<Blockchain, number> => {
  const mainnetChainIds: ReadonlyMap<Blockchain, number> = new Map<Blockchain, number>([
    [Blockchain.Ethereum, 1],
    [Blockchain.BinanceSmartChain, 56],
    [Blockchain.Arbitrum, 42161],
    [Blockchain.Polygon, 137],
    [Blockchain.Zilliqa, 32769],
  ])

  const testnetChainIds: ReadonlyMap<Blockchain, number> = new Map<Blockchain, number>([
    [Blockchain.Ethereum, 5],
    [Blockchain.BinanceSmartChain, 97],
    [Blockchain.Arbitrum, 421611],
    [Blockchain.Polygon, 80001],
  ])

  switch (network) {
    case Network.MainNet:
      return mainnetChainIds
    case Network.TestNet:
      return testnetChainIds
    default:
      return mainnetChainIds
  }
}

export const fgBridgeTransfer = `function transfer(address token,uint256 remoteChainId,address remoteRecipient,uint256 amount) payable`;
export const fgGetFees = `function getFees() view returns (uint256)`;

const providerCache: Partial<Record<Blockchain, ethers.providers.JsonRpcProvider>> = {};
export const getETHClient = (chain: BridgeableEvmChains, network: Network) => {
  if (providerCache[chain]) return providerCache[chain];
  let providerUrl: string;

  switch (chain) {
    case Blockchain.Arbitrum:
      providerUrl = process.env.REACT_APP_RPC_ARB as string;
      break;
    case Blockchain.BinanceSmartChain:
      providerUrl = process.env.REACT_APP_RPC_BSC as string;
      break;
    case Blockchain.Base:
      providerUrl = process.env.REACT_APP_RPC_BASE as string;
      break;
    case Blockchain.Polygon:
      providerUrl = process.env.REACT_APP_RPC_POLYGON as string;
      break;
    case Blockchain.Zilliqa:
      providerUrl = process.env.REACT_APP_RPC_ZIL as string;
      break;
    case Blockchain.Ethereum:
    default:
      providerUrl = process.env.REACT_APP_RPC_ETH as string;
  }
  const provider = new ethers.providers.JsonRpcBatchProvider(providerUrl);
  providerCache[chain] = provider;
  return provider;
}
