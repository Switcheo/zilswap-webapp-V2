import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Button, ButtonGroup, makeStyles, Typography } from "@material-ui/core";
import BigNumber from "bignumber.js";
import { createChart, CrosshairMode, IChartApi, LineData, UTCTimestamp, WhitespaceData } from "lightweight-charts";
import { ArkBox } from "app/components";
import { AppTheme } from "app/theme/types";
import { getBlockchain } from "app/saga/selectors";
import { ArkClient } from "core/utilities";
import { useAsyncTask } from "app/utils";
import { fromBech32Address } from "core/zilswap";

interface Props {
  collectionId: string;
  tokenId: string;
  interval: string;
}

interface FloorPrice {
  floorPrice: number,
  intervalTime: string,
}

interface SalePrice {
  highestSale: number,
  intervalTime: string,
}

interface BidPrice {
  highestBid: number,
  intervalTime: string,
}

const useStyles = makeStyles((theme: AppTheme) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    marginTop: theme.spacing(3),
    padding: theme.spacing(2, 5),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1, 2),
    },
  },
  graph: {
    overflow: "hidden",
    minWidth: 300,
    boxShadow: theme.palette.mainBoxShadow,
    display: "center",
  },
  noBorder: {
    border: "none",
    borderRight: "none!important",
    padding: 0,
  },
}));

const ArkPriceHistoryGraph: React.FC<Props> = (props: Props) => {
  const { collectionId, tokenId, interval } = props;
  const collection = fromBech32Address(collectionId).toLowerCase();
  const classes = useStyles();
  const { network } = useSelector(getBlockchain);
  const [runGetCollectionFloor] = useAsyncTask("getCollectionFloor");
  const [runGetSalePrice] = useAsyncTask("getSalePrice");
  const [runGetBidPrice] = useAsyncTask("getBidPrice");
  const [collectionFloor, setCollectionFloor] = useState<LineData[] | null>(null);
  const [salePrice, setSalePrice] = useState<LineData[] | null>(null);
  const [bidPrice, setBidPrice] = useState<LineData[] | null>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [currentInterval, setCurrentInterval] = useState("1h")
  const graphRef = useRef<HTMLDivElement | null>(null);

  const whiteSpace: WhitespaceData[] = [
    { time: 1635314400 as UTCTimestamp },
    { time: 1635318000 as UTCTimestamp },
    { time: 1635321600 as UTCTimestamp },
    { time: 1635325200 as UTCTimestamp },
    { time: 1635328800 as UTCTimestamp },
    { time: 1635332400 as UTCTimestamp },
    { time: 1635336000 as UTCTimestamp },
    { time: 1635339600 as UTCTimestamp }
  ]
  useEffect(() => {
    getCollectionFloor();
    getSalePrice();
    getBidPrice();
    // eslint-disable-next-line
  }, [])

  const getCollectionFloor = () => {
    runGetCollectionFloor(async () => {
      const arkClient = new ArkClient(network);
      const result = await arkClient.getCollectionFloor({ collection, interval });
      const floors: FloorPrice[] = result.result;
      let collectionFloors = new Array<LineData>();
      floors.forEach(floor => {
        collectionFloors.push({
          value: new BigNumber(floor.floorPrice).shiftedBy(-12).toNumber(),
          time: (Date.parse(floor.intervalTime) / 1000) as UTCTimestamp,
        })
      });
      console.log(collectionFloors);
      setCollectionFloor(collectionFloors)
    })
  }

  const getSalePrice = () => {
    runGetSalePrice(async () => {
      const arkClient = new ArkClient(network);
      const result = await arkClient.getSalePrice({ collection, tokenId, interval });
      const prices: SalePrice[] = result.result;
      let salePrices = new Array<LineData>();
      prices.forEach(price => {
        salePrices.push({
          value: new BigNumber(price.highestSale).shiftedBy(-12).toNumber(),
          time: (Date.parse(price.intervalTime) / 1000) as UTCTimestamp,
        })
      });
      console.log(salePrices);
      setSalePrice(salePrices);
    })
  }

  const getBidPrice = () => {
    runGetBidPrice(async () => {
      const arkClient = new ArkClient(network);
      const result = await arkClient.getBidPrice({ collection, tokenId, interval });
      const prices: BidPrice[] = result.result;
      let bidPrices = new Array<LineData>();
      prices.forEach(price => {
        bidPrices.push({
          value: new BigNumber(price.highestBid).shiftedBy(-12).toNumber(),
          time: (Date.parse(price.intervalTime) / 1000) as UTCTimestamp,
        })
      });
      console.log(bidPrices);
      setBidPrice(bidPrices);
    })
  }

  useEffect(() => {
    if (!collectionFloor || !salePrice || !bidPrice) return;
    if (graphRef.current && !chart) {
      const newChart = createChart(graphRef.current, {
        width: 600,
        height: 400,
        layout: {
          backgroundColor: "#131722",
          textColor: "#d1d4dc"
        },
        grid: {
          vertLines: {
            color: "rgba(42, 46, 57, 0.6)",
            style: 1,
            visible: false,
          },
          horzLines: {
            color: "rgba(42, 46, 57, 0.6)",
            style: 1,
            visible: false,
          },
        },
        timeScale: {
          rightOffset: 10,
          lockVisibleTimeRangeOnResize: true,
          timeVisible: true,
          secondsVisible: false,
          borderColor: "rgba(222, 255, 255, 0.1)",
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
      });

      const floorSeries = newChart.addLineSeries({
        color: "rgba(73, 194, 121, 1)",
        lineWidth: 1
      });

      const bidSeries = newChart.addLineSeries({
        color: "rgba(73, 14, 121, 1)",
        lineWidth: 1
      });

      const saleSeries = newChart.addLineSeries({
        color: "rgba(155, 14, 121, 1)",
        lineWidth: 1
      });

      const whiteSeries = newChart.addLineSeries();
      floorSeries.setData(collectionFloor);
      bidSeries.setData(bidPrice);
      saleSeries.setData(salePrice);
      whiteSeries.setData(whiteSpace);
      setChart(newChart);
    }
    // eslint-disable-next-line
  }, [collectionFloor, bidPrice, salePrice, chart])

  const getColor = (interval: string) => {
    if (interval === currentInterval) {
      return "default";
    }
    return "inherit"
  }

  return (
    <ArkBox variant="base" className={classes.container}>
      <Box display="flex" justifyContent="flex-end">
        <ButtonGroup variant="text">
          <Button color={getColor("1h")} onClick={() => setCurrentInterval("1h")} className={classes.noBorder}><Typography>1H</Typography></Button>
          <Button color={getColor("1d")} onClick={() => setCurrentInterval("1d")} className={classes.noBorder}><Typography>1D</Typography></Button>
          <Button color={getColor("1w")} onClick={() => setCurrentInterval("1w")} className={classes.noBorder}><Typography>1W</Typography></Button>
          {/* <Button color={getColor("1month")} onClick={() => setIntervalAndPeriod("1month", "24month")} className={classes.noBorder}><Typography>1M</Typography></Button> */}
        </ButtonGroup>
      </Box>
      <Box className={classes.graph} {...{ ref: graphRef }}></Box>
    </ArkBox>

  )
};

export default ArkPriceHistoryGraph;
