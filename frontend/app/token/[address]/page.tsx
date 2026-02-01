'use client'
import { useParams } from 'next/navigation';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contract';
import { erc20Abi } from 'viem';
import TradePanel from '@/components/TradePanel';
import Link from 'next/link';

const GRADUATION_THRESHOLD = 20n * 10n**18n; // 20 ETH

export default function TokenPage() {
  const params = useParams();
  const tokenAddress = params.address as `0x${string}`;

  // Read token info
  const { data: tokenName } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'totalSupply',
  });

  // Read factory data
  const { data: collateral } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'tokenCollateral',
    args: [tokenAddress],
  });

  const { data: graduated } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'graduated',
    args: [tokenAddress],
  });

  const { data: currentPrice } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getCurrentPrice',
    args: [tokenAddress],
  });

  const { data: creatorFeeBps } = useReadContract({
    address: FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getCreatorFeeBps',
    args: [tokenAddress],
  });

  const progressPercent = collateral && collateral > 0n
    ? Number((collateral * 100n) / GRADUATION_THRESHOLD)
    : 0;

  const marketCap = currentPrice && totalSupply
    ? (currentPrice * totalSupply) / 10n**18n
    : 0n;

  return (
    <div className="min-h-screen bg-yellow-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-black mb-2">
            {tokenName || 'Loading...'} ({tokenSymbol || '...'})
          </h1>
          <p className="text-sm text-gray-600 font-mono">
            {tokenAddress}
          </p>
        </div>

        {/* Status Banner */}
        {graduated ? (
          <div className="mb-6 p-4 bg-purple-200 border-4 border-purple-600">
            <p className="text-xl font-black">🎓 GRADUATED TO UNISWAP V2</p>
            <p className="text-sm mt-2">This token has graduated and is now trading on Uniswap V2.</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-blue-200 border-4 border-blue-600">
            <p className="text-xl font-black">📈 BONDING CURVE ACTIVE</p>
            <p className="text-sm mt-2">Trading on bonding curve until 20 ETH collateral is reached.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Token Info */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-2xl font-black mb-4">Price Info</h2>
              {currentPrice ? (
                <div>
                  <p className="text-3xl font-black mb-2">
                    {formatEther(currentPrice)} ETH
                  </p>
                  <p className="text-sm text-gray-600">per {tokenSymbol || 'token'}</p>
                </div>
              ) : (
                <p className="text-gray-500">Loading...</p>
              )}
            </div>

            {/* Market Cap */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-2xl font-black mb-4">Market Cap</h2>
              {marketCap > 0n ? (
                <p className="text-3xl font-black">
                  {formatEther(marketCap)} ETH
                </p>
              ) : (
                <p className="text-gray-500">Calculating...</p>
              )}
            </div>

            {/* Bonding Curve Progress */}
            {!graduated && (
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
                <h2 className="text-2xl font-black mb-4">Graduation Progress</h2>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Collateral: {collateral ? formatEther(collateral) : '0'} ETH</span>
                    <span>Target: 20 ETH</span>
                  </div>
                  <div className="h-8 w-full bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-600">
                    {progressPercent.toFixed(2)}% to graduation
                  </p>
                </div>
              </div>
            )}

            {/* Fee Info */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-2xl font-black mb-4">Trading Fees</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Protocol Fee:</span>
                  <span className="font-bold">1%</span>
                </div>
                <div className="flex justify-between">
                  <span>Creator Fee:</span>
                  <span className="font-bold">
                    {creatorFeeBps ? `${Number(creatorFeeBps) / 100}%` : '0.95%'}
                  </span>
                </div>
                <div className="flex justify-between border-t-2 border-black pt-2 mt-2">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">
                    {creatorFeeBps ? `${(100 + Number(creatorFeeBps)) / 100}%` : '1.95%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Supply */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-2xl font-black mb-4">Token Supply</h2>
              {totalSupply ? (
                <p className="text-xl font-black">
                  {formatEther(totalSupply)} {tokenSymbol || 'tokens'}
                </p>
              ) : (
                <p className="text-gray-500">Loading...</p>
              )}
            </div>
          </div>

          {/* Right Column: Trading */}
          <div>
            {graduated ? (
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
                <h2 className="text-2xl font-black mb-4">Trading</h2>
                <p className="mb-4">
                  This token has graduated to Uniswap V2. Please trade on Uniswap.
                </p>
                <a
                  href={`https://app.uniswap.org/#/swap?chain=base&inputCurrency=ETH&outputCurrency=${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-500 text-white p-4 border-2 border-black font-bold text-center hover:bg-blue-400"
                >
                  Trade on Uniswap →
                </a>
              </div>
            ) : (
              <TradePanel tokenAddress={tokenAddress} tokenSymbol={tokenSymbol} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
