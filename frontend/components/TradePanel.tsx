'use client'
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contract';
import { erc20Abi } from 'viem';

interface TradePanelProps {
  tokenAddress: `0x${string}`;
  tokenSymbol?: string;
}

export default function TradePanel({ tokenAddress, tokenSymbol = 'TOKEN' }: TradePanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [slippage, setSlippage] = useState('1'); // 1% default slippage
  
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Read token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && tradeType === 'sell',
  });

  // Read buy quote
  const { data: buyQuote } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getBuyQuote',
    args: buyAmount && parseFloat(buyAmount) > 0 ? [tokenAddress, parseEther(buyAmount)] : undefined,
    enabled: tradeType === 'buy' && !!buyAmount && parseFloat(buyAmount) > 0,
  });

  // Read sell quote
  const { data: sellQuote } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getSellQuote',
    args: sellAmount && parseFloat(sellAmount) > 0 ? [tokenAddress, parseUnits(sellAmount, 18)] : undefined,
    enabled: tradeType === 'sell' && !!sellAmount && parseFloat(sellAmount) > 0,
  });

  // Read current price
  const { data: currentPrice } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getCurrentPrice',
    args: [tokenAddress],
  });

  // Read creator fee
  const { data: creatorFeeBps } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getCreatorFeeBps',
    args: [tokenAddress],
  });

  const handleBuy = async () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      alert('Please enter ETH amount');
      return;
    }

    if (!buyQuote) {
      alert('Unable to get quote. Please try again.');
      return;
    }

    const ethAmount = parseEther(buyAmount);
    const minTokensOut = (BigInt(buyQuote) * BigInt(100 - parseFloat(slippage))) / 100n;

    try {
      writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'buy',
        args: [tokenAddress, minTokensOut],
        value: ethAmount,
      });
    } catch (err: any) {
      console.error('Buy error:', err);
      alert(err.message || 'Failed to buy tokens');
    }
  };

  const handleSell = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert('Please enter token amount');
      return;
    }

    if (!sellQuote) {
      alert('Unable to get quote. Please try again.');
      return;
    }

    const tokenAmount = parseUnits(sellAmount, 18);
    const minEthOut = (BigInt(sellQuote) * BigInt(100 - parseFloat(slippage))) / 100n;

    try {
      // Factory can burn tokens directly (no approval needed)
      // The AgentToken.burn() function checks msg.sender == factory
      writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'sell',
        args: [tokenAddress, tokenAmount, minEthOut],
      });
    } catch (err: any) {
      console.error('Sell error:', err);
      alert(err.message || 'Failed to sell tokens');
    }
  };

  const totalFeeBps = creatorFeeBps ? 100 + Number(creatorFeeBps) : 195; // 1% protocol + creator fee

  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 p-3 font-bold border-2 border-black ${
            tradeType === 'buy' 
              ? 'bg-green-400 text-black' 
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 p-3 font-bold border-2 border-black ${
            tradeType === 'sell' 
              ? 'bg-red-400 text-black' 
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          SELL
        </button>
      </div>

      {currentPrice && (
        <div className="mb-4 p-3 bg-gray-100 border-2 border-black">
          <p className="text-sm font-bold">Current Price</p>
          <p className="text-2xl font-black">
            {formatEther(currentPrice)} ETH per {tokenSymbol}
          </p>
        </div>
      )}

      {tradeType === 'buy' ? (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">ETH Amount</label>
            <input
              type="number"
              step="0.001"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="w-full border-2 border-black p-3 text-xl"
              placeholder="0.0"
            />
          </div>

          {buyQuote && buyAmount && parseFloat(buyAmount) > 0 && (
            <div className="mb-4 p-3 bg-blue-100 border-2 border-black">
              <p className="text-sm font-bold">You will receive:</p>
              <p className="text-xl font-black">
                {formatEther(buyQuote)} {tokenSymbol}
              </p>
              <p className="text-xs mt-1">
                Fee: {totalFeeBps / 100}% (1% protocol + {creatorFeeBps ? Number(creatorFeeBps) / 100 : 0.95}% creator)
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Slippage Tolerance (%)</label>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-full border-2 border-black p-2"
              min="0.1"
              max="10"
              step="0.1"
            />
          </div>

          {!isConnected && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-500">
              <p className="text-sm font-bold">⚠️ Please connect your wallet</p>
            </div>
          )}

          <button
            onClick={handleBuy}
            disabled={!isConnected || isPending || isConfirming || !buyAmount || parseFloat(buyAmount) <= 0}
            className="w-full bg-green-500 text-white p-4 border-2 border-black font-bold text-xl hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? '⏳ PROCESSING...' : `BUY ${tokenSymbol}`}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">
              {tokenSymbol} Amount
              {tokenBalance && (
                <span className="text-xs text-gray-600 ml-2">
                  (Balance: {formatEther(tokenBalance)})
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.001"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="w-full border-2 border-black p-3 text-xl"
              placeholder="0.0"
            />
            <button
              onClick={() => tokenBalance && setSellAmount(formatEther(tokenBalance))}
              className="mt-2 text-xs text-blue-600 underline"
            >
              Use Max
            </button>
          </div>

          {sellQuote && sellAmount && parseFloat(sellAmount) > 0 && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-black">
              <p className="text-sm font-bold">You will receive:</p>
              <p className="text-xl font-black">
                {formatEther(sellQuote)} ETH
              </p>
              <p className="text-xs mt-1">
                Fee: {totalFeeBps / 100}% (1% protocol + {creatorFeeBps ? Number(creatorFeeBps) / 100 : 0.95}% creator)
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Slippage Tolerance (%)</label>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-full border-2 border-black p-2"
              min="0.1"
              max="10"
              step="0.1"
            />
          </div>

          {!isConnected && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-500">
              <p className="text-sm font-bold">⚠️ Please connect your wallet</p>
            </div>
          )}

          <button
            onClick={handleSell}
            disabled={!isConnected || isPending || isConfirming || !sellAmount || parseFloat(sellAmount) <= 0}
            className="w-full bg-red-500 text-white p-4 border-2 border-black font-bold text-xl hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? '⏳ PROCESSING...' : `SELL ${tokenSymbol}`}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border-2 border-red-500">
          <p className="text-sm text-red-800">Error: {error.message}</p>
        </div>
      )}

      {isSuccess && (
        <div className="mt-4 p-3 bg-green-200 border-2 border-green-600">
          <p className="font-bold text-green-800">✅ Transaction Successful!</p>
          <p className="text-xs mt-1">Hash: {hash}</p>
        </div>
      )}
    </div>
  );
}
