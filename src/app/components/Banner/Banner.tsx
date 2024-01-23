import { Box, makeStyles } from "@material-ui/core";
import { AppTheme } from "app/theme/types";
import { useNetwork } from "app/utils";
import cls from "classnames";
import { ZWAP_TOKEN_CONTRACT } from "core/zilswap/constants";
import React from "react";
import CurrencyLogo from "../CurrencyLogo";


export interface BannerProps {
  content: string | React.ReactNode
  rootClass?: string
  onClick?: () => void
}

const Banner: React.FC<BannerProps> = (props: BannerProps) => {
  const { content, rootClass, onClick } = props
  const classes = useStyles()
  const network = useNetwork();

  const zwapAddress = ZWAP_TOKEN_CONTRACT[network];

  return (
    <Box className={cls(classes.root, onClick && classes.hover, rootClass)} onClick={onClick}>
      <CurrencyLogo
        className={classes.currencyLogo}
        currency="ZWAP"
        address={zwapAddress}
      />
      &nbsp;
      {content}
    </Box>
  )
}

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    display: 'flex',
    width: 'max-content',
    backgroundColor: 'rgba(0, 255, 176, 0.1)',
    border: '1px solid #00FFB0',
    padding: '12px 24px',
    alignItems: 'center',
    borderRadius: '12px',
    marginBottom: theme.spacing(2),
    // text styles
    fontFamily: 'Avenir Next',
    fontSize: 14,
    color: '#00FFB0',
    fontWeight: 600,
  },
  currencyLogo: {
    height: 30,
    width: 30,
  },
  hover: {
    "&:hover": {
      cursor: 'pointer'
    }
  }
}))

export default Banner
