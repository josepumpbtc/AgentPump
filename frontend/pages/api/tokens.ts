import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, http, formatEther } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { FACTORY_ABI } from '@/lib/contract'
import { erc20Abi } from 'viem'

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

interface TokenInfo {
  address: string
  name: string
  symbol: string
  creator: string
  collateral: string
  price: string
  marketCap: string
  progress: number
  graduated: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const chainId = parseInt(req.query.chainId as string) || 8453
    const chain = chainId === 84532 ? baseSepolia : base
    
    const client = createPublicClient({
      chain,
      transport: http(),
    })

    if (!FACTORY_ADDRESS || FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return res.status(200).json({ tokens: [] })
    }

    // Get TokenLaunched events to find all tokens
    const fromBlock = BigInt(0) // Start from genesis, or use a more recent block
    const toBlock = 'latest' as const

    const logs = await client.getLogs({
      address: FACTORY_ADDRESS,
      event: {
        type: 'event',
        name: 'TokenLaunched',
        inputs: [
          { indexed: true, name: 'token', type: 'address' },
          { indexed: true, name: 'creator', type: 'address' },
          { indexed: false, name: 'symbol', type: 'string' },
          { indexed: false, name: 'timestamp', type: 'uint256' },
        ],
      },
      fromBlock,
      toBlock,
    })

    const tokens: TokenInfo[] = []

    for (const log of logs) {
      try {
        const tokenAddress = log.args.token as `0x${string}`
        const creator = log.args.creator as string

        // Read token info
        const [name, symbol, totalSupply] = await Promise.all([
          client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'name',
          }),
          client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
          client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'totalSupply',
          }),
        ])

        // Read factory data
        const [collateral, graduated, currentPrice] = await Promise.all([
          client.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'tokenCollateral',
            args: [tokenAddress],
          }),
          client.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'graduated',
            args: [tokenAddress],
          }),
          client.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'getCurrentPrice',
            args: [tokenAddress],
          }),
        ])

        const collateralEth = formatEther(collateral as bigint)
        const priceEth = formatEther(currentPrice as bigint)
        const marketCapEth = formatEther((currentPrice as bigint * totalSupply as bigint) / BigInt(10 ** 18))
        const progress = graduated ? 100 : Math.min(Number((collateral as bigint * 100n) / (20n * 10n ** 18n)), 100)

        tokens.push({
          address: tokenAddress,
          name: name as string,
          symbol: symbol as string,
          creator,
          collateral: collateralEth,
          price: priceEth,
          marketCap: marketCapEth,
          progress,
          graduated: graduated as boolean,
        })
      } catch (err) {
        console.error(`Error processing token ${log.args.token}:`, err)
        // Continue with next token
      }
    }

    // Sort by market cap descending
    tokens.sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap))

    res.status(200).json({ tokens })
  } catch (error: any) {
    console.error('Error fetching tokens:', error)
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
