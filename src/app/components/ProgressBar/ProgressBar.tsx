import React from 'react';
import { Box, Typography, makeStyles } from '@material-ui/core';
import { AppTheme } from 'app/theme/types';
import { Text } from 'app/components';
import { PartialBoxProps, extractBoxProps } from 'app/utils';

interface Props extends PartialBoxProps {
  progress: number;
  threshold?: number;
}

interface StyleProps {
  left: string;
  borderRadius: string;
}

const useStyles = makeStyles<AppTheme, StyleProps>(theme => ({
  thresholdBox: props => ({
    left: props.left,
    position: 'absolute',
    top: '-34px',
  }),
  root: {},
  background: props => ({
    backgroundColor: theme.palette.primary.dark,
    borderTopLeftRadius: '12px',
    borderBottomLeftRadius: '12px',
    borderTopRightRadius: props.borderRadius,
    borderBottomRightRadius: props.borderRadius,
  }),
  text: {
    color: theme.palette.primary.contrastText,
    textShadow: '0 0 4px rgba(0,0,0,0.95)',
  },
  barBackground: props => ({
    backgroundColor: 'rgba(0, 51, 64, 0.5)',
  }),
  thresholdContainer: {
    width: '100%',
    left: '0px',
  },
  highlight: {
    fontSize: '14px',
    color: theme.palette.type === 'dark' ? '#00FFB0' : '#003340',
  },
}));

const ProgressBar: React.FC<Props> = (props: Props) => {
  const { boxProps } = extractBoxProps(props);
  const { progress, threshold } = props;
  const borderRadius = progress > 90 ? '12px' : '0px';
  const styleProps = { left: `${threshold}%`, borderRadius };
  const classes = useStyles(styleProps);

  return (
    <Box
      marginTop={6}
      bgcolor="background.contrast"
      display="flex"
      flexDirection="column"
      borderRadius={12}
      padding={1}
      position="relative"
    >
      <Box
        {...boxProps}
        className={classes.barBackground}
        position="relative"
        display="flex"
        alignItems="stretch"
        bgcolor="background.default"
        mt={0}
        borderRadius={12}
      >
        <Box padding={2} width={`${progress}%`} className={classes.background} />
        <Box
          className={classes.text}
          fontWeight="fontWeightBold"
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography className={classes.text}>{progress}%</Typography>
        </Box>
      </Box>
      {threshold && (
        <Box className={classes.thresholdContainer} position="absolute">
          <span className={classes.thresholdBox}>
            <Text>
              Success Threshold <span className={classes.highlight}>{threshold}%</span>
            </Text>
          </span>
        </Box>
      )}
    </Box>
  );
};

export default ProgressBar;
