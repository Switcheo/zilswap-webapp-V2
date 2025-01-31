import { NavigationOptions } from "./types";

const navigationConfig: NavigationOptions[] = [{
  pages: [{
    title: "Swap + Pool",
    href: "/swap",
    icon: "SwapHoriz",
    show: true,
  }, {
    title: "ZilBridge",
    href: "/bridge",
    icon: "Bridge",
  }],
}];

export default navigationConfig;
