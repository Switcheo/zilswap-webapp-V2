import { makeStyles, useTheme } from '@material-ui/core';
import { toBech32Address } from '@zilliqa-js/crypto';
import { AppTheme } from 'app/theme/types';
import { useNetwork } from 'app/utils';
import cls from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { Network } from 'zilswap-sdk/lib/constants';
import legacySvg from './legacy-zil.svg';

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    width: 30,
    height: 30,
    display: 'flex',
    borderRadius: 14,
    padding: 2,
  },
  svg: {
    maxWidth: '100%',
    width: 'unset',
    height: 'unset',
    flex: 1,
  },
}));

const CurrencyLogo = (props: any) => {
  const {
    currency,
    address,
    className,
    legacy,
  }: {
    currency: string | false;
    address: string;
    className: string;
    legacy?: boolean;
  } = props;
  const classes = useStyles();
  const theme = useTheme();
  const [error, setError] = useState<boolean>(false);
  const network = useNetwork();

  const urlSuffix = theme.palette.type === 'dark' ? '?t=dark' : '';
  const isZil = typeof currency === 'string' && ['eZIL', 'ZIL'].includes(currency);
  
  useEffect(() => {
    setError(false)
  }, [address])
  
  const tokenIconUrl = useMemo(() => {
    let tokenIconUrl: string;

    if (network === Network.TestNet) {
      if (isZil) tokenIconUrl = `https://meta.viewblock.io/ZIL/logo${urlSuffix}`;
      else
        tokenIconUrl = `https://dr297zt0qngbx.cloudfront.net/tokens/testnet/${address}`;
    } else {
      let tokenKey = isZil ? 'ZIL' : `ZIL.${address}`;
      if (address?.startsWith('0x') && !isZil)
        tokenKey = `ZIL.${toBech32Address(address)}`;
      tokenIconUrl = `https://meta.viewblock.io/${tokenKey}/logo${urlSuffix}`;
    }

    return tokenIconUrl;
  }, [address, network, isZil, urlSuffix])
  const fallbackImg = `https://meta.viewblock.io/ZIL.notfound/logo${urlSuffix}`;

  return (
    <div className={cls(classes.root, className)}>
      {legacy ? (
        <img
          className={classes.svg}
          src={legacySvg}
          alt={`${currency} Token Logo`}
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <img
          className={classes.svg}
          src={error ? fallbackImg : tokenIconUrl}
          alt={`${currency} Token Logo`}
          loading="lazy"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

export default CurrencyLogo;
