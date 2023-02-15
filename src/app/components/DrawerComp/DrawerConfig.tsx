import { SimpleMap } from "app/utils"

interface DrawerInfo {
  drawerText: string;
  navLink: string;
  highlightPaths: string[];
  connectedOnly?: boolean;
  disabled?: boolean;
}

const DrawerConfig: SimpleMap<DrawerInfo[]> = {
  pool: [{
    drawerText: "Overview",
    navLink: "/pools/overview",
    highlightPaths: ["/pools/overview"],
  }, {
    drawerText: "Your Liquidity",
    navLink: "/pools/liquidity",
    highlightPaths: ["/pools/liquidity"],
    connectedOnly: true,
  }, {
    drawerText: "Transactions",
    navLink: "/pools/transactions",
    highlightPaths: ["/pools/transactions"],
  },],
  bridge: [{
    drawerText: "New Transfer",
    navLink: "/bridge",
    highlightPaths: ["/bridge"],
    disabled: true,
  }, {
    drawerText: "Transfer History",
    navLink: "/history",
    highlightPaths: ["/history"],
  }, {
    drawerText: "ERC-20 ZIL Token Swap",
    navLink: "/bridge/erc20-zil-swap",
    highlightPaths: ["/bridge/erc20-zil-swap"],
  }],
  swap: [{
    drawerText: "Swap",
    navLink: "/swap",
    highlightPaths: ["/swap"],
  }, {
    drawerText: "Pool",
    navLink: "/pool",
    highlightPaths: ["/pool"],
  }]
}

export default DrawerConfig
