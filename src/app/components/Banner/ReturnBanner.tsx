import { Box } from "@material-ui/core";
import Banner, { BannerProps } from "./Banner";
import React from "react";
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { ZILSWAP_V1_URL } from "app/utils";

interface Props extends Omit<BannerProps, "content"> { }

const ReturnBanner: React.FC<Props> = (props: Props) => {
  const { ...rest } = props

  return (
    <Banner
      {...rest}
      content={
        <Box display="flex" alignItems="center">
          Return back to ZilSwap V1
          <ArrowForwardIcon />
        </Box>
      }
      onClick={() => {
        window.location.href = ZILSWAP_V1_URL
      }} />
  )
}

export default ReturnBanner
