import React, { HtmlHTMLAttributes } from 'react'
import { ReactComponent as ArbitrumLogo } from "../../bridgeAssets/arbitrum-one.svg"
import { ReactComponent as EthereumLogo } from "../../bridgeAssets/ethereum-logo.svg"
import { ReactComponent as ZilliqaLogo } from "../../bridgeAssets/zilliqa-logo.svg"
import { ReactComponent as BSCLogo } from "../../bridgeAssets/bsc-logo.svg"
import { ReactComponent as PolygonLogo } from "../../bridgeAssets/polygon-logo.svg"
import { Blockchain, BridgeableChains } from 'app/utils'

interface Props {
    chain: BridgeableChains
    style?: HtmlHTMLAttributes<HTMLOrSVGElement>["className"]
}

const ChainLogo: React.FC<Props> = (props: Props) => {
    const { chain, style } = props

    switch (chain) {
        case Blockchain.Ethereum: return <EthereumLogo className={style} />
        case Blockchain.Arbitrum: return <ArbitrumLogo className={style} />
        case Blockchain.Zilliqa: return <ZilliqaLogo className={style} />
        case Blockchain.BinanceSmartChain: return <BSCLogo className={style} />
        case Blockchain.Polygon: return <PolygonLogo className={style} />
        default: return <ZilliqaLogo />
    }
}

export default ChainLogo
