import { useState, useEffect } from 'react';

export function useEthPrice() {
  const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        if (isMounted && data.ethereum?.usd) {
          setEthPriceUsd(data.ethereum.usd);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price', error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // refresh every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatUsd = (ethAmount: string | number) => {
    if (ethPriceUsd === null) return 'Loading...';
    const num = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num * ethPriceUsd);
  };

  return { ethPriceUsd, formatUsd };
}
