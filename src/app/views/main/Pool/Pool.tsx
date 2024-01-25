import { Box, IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import BrightnessLowIcon from '@material-ui/icons/BrightnessLowRounded';
import { Notifications, ShowAdvanced } from "app/components";
import ReturnBanner from "app/components/Banner/ReturnBanner";
import MainCard from "app/layouts/MainCard";
import { actions } from "app/store";
import { LayoutState, RootState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import cls from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { PoolDeposit, PoolManage, PoolToggleButton, PoolWithdraw } from "./components";

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    padding: theme.spacing(4, 4, 0),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2, 2, 0),
    },
    marginBottom: 12
  },
  createButton: {
    borderRadius: 12,
  },
  actionButton: {
    marginTop: 45,
    marginBottom: 40,
    height: 46
  },
  iconButton: {
    color: theme.palette.label,
    backgroundColor: theme.palette.currencyInput,
    borderRadius: 12,
    padding: 5,
    marginLeft: 5,
  },
  advancedSettingContainer: {
    padding: theme.spacing(0, 4, 2),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(0, 2, 2),
    },
  },
  plusIcon: {
    "& path": {
      fill: theme.palette.icon
    }
  }
}));
const PoolView: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props;
  const classes = useStyles();
  const dispatch = useDispatch();
  const layoutState = useSelector<RootState, LayoutState>(state => state.layout);

  const { showPoolType: poolType } = layoutState;

  const toggleAdvancedSetting = () => {
    dispatch(actions.Layout.showAdvancedSetting(!layoutState.showAdvancedSetting));
  }

  return (
    <MainCard {...rest} className={cls(classes.root, className)} header={(<ReturnBanner />)}>
      <Notifications />
      {/* <AddLiquidityEarnMessage /> */}

      {!layoutState.showAdvancedSetting && (
        <Box display="flex" flexDirection="column" mt={4}>
          {poolType !== "remove" && (
            <>
              <Box marginLeft={4}>
                <PoolToggleButton />
              </Box>
              <Box display="flex" justifyContent="flex-end" className={classes.advancedSettingContainer}>
                <Box flex={1} />
                <IconButton onClick={() => toggleAdvancedSetting()} className={classes.iconButton}>
                  <BrightnessLowIcon />
                </IconButton>
              </Box>
            </>
          )}
          {poolType === "add" && (<PoolDeposit />)}
          {poolType === "manage" && (<PoolManage />)}
          {poolType === "remove" && (<PoolWithdraw />)}

        </Box>
      )}
      <ShowAdvanced showAdvanced={layoutState.showAdvancedSetting} />
    </MainCard>
  );
};

export default PoolView;
