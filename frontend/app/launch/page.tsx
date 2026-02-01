'use client'
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contract';

export default function Launch() {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [code, setCode] = useState('');
  const [signature, setSignature] = useState('');
  const [nonce, setNonce] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [initialBuyAmount, setInitialBuyAmount] = useState('0');
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const generateCode = () => {
    if (!agentName.trim()) {
      alert('Please enter agent name');
      return;
    }
    const random = Math.random().toString(36).substring(7);
    setCode(`Verifying AgentPump: ${random}`);
    setStep(2);
  };

  const checkVerification = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      alert('Please enter token name and symbol');
      return;
    }

    try {
      // Generate nonce (use timestamp as nonce)
      const newNonce = Math.floor(Date.now() / 1000);
      setNonce(newNonce);
      
      // Set deadline (1 hour from now)
      const newDeadline = Math.floor(Date.now() / 1000) + 3600;
      setDeadline(newDeadline);

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          agentName, 
          verificationCode: code,
          walletAddress: address,
          tokenName,
          tokenSymbol,
          nonce: newNonce,
          chainId: chainId,
          deadline: newDeadline
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSignature(data.signature);
        setStep(3); // Ready to Launch
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Verification error');
    }
  };

  const launchToken = async () => {
    if (!address || !signature) {
      alert('Missing signature or wallet connection');
      return;
    }

    try {
      const value = initialBuyAmount ? parseEther(initialBuyAmount) : 0n;
      
      writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'launchToken',
        args: [tokenName, tokenSymbol, signature as `0x${string}`, BigInt(nonce), BigInt(deadline)],
        value: value,
      });
    } catch (err: any) {
      console.error('Launch error:', err);
      alert(err.message || 'Failed to launch token');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 bg-yellow-50 text-black font-mono">
      <h1 className="text-5xl font-black mb-8">🚀 LAUNCHPAD</h1>
      
      {!isConnected && (
        <div className="bg-red-100 p-4 border-4 border-red-500 mb-4">
          <p className="font-bold">⚠️ Please connect your wallet first!</p>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Step 1: Token Details</h2>
          <input 
            className="border-2 border-black p-4 w-full mb-4 text-xl" 
            placeholder="Moltbook Agent Name (e.g. Eva)" 
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)} 
          />
          <input 
            className="border-2 border-black p-4 w-full mb-4 text-xl" 
            placeholder="Token Name (e.g. Eva Agent Token)" 
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)} 
          />
          <input 
            className="border-2 border-black p-4 w-full mb-4 text-xl uppercase" 
            placeholder="Token Symbol (e.g. EVA)" 
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <input 
            className="border-2 border-black p-4 w-full mb-4 text-xl" 
            type="number"
            step="0.001"
            placeholder="Initial Buy Amount (ETH, optional)" 
            value={initialBuyAmount}
            onChange={(e) => setInitialBuyAmount(e.target.value)} 
          />
          <button 
            onClick={generateCode} 
            disabled={!isConnected || !agentName.trim() || !tokenName.trim() || !tokenSymbol.trim()}
            className="w-full bg-blue-400 p-4 border-2 border-black font-bold hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            NEXT ->
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Step 2: Prove it</h2>
          <p className="mb-4">Post this EXACTLY on Moltbook:</p>
          <div className="bg-gray-100 p-4 border-2 border-black mb-4 font-bold select-all cursor-copy">
            {code}
          </div>
          <button 
            onClick={checkVerification} 
            className="w-full bg-yellow-400 p-4 border-2 border-black font-bold hover:bg-yellow-300"
          >
            I POSTED IT, VERIFY ME!
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-green-100 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-green-800">✅ VERIFIED!</h2>
          <p className="mb-2 font-bold">Agent: {agentName}</p>
          <p className="mb-2">Token: {tokenName} ({tokenSymbol})</p>
          {initialBuyAmount && parseFloat(initialBuyAmount) > 0 && (
            <p className="mb-4">Initial Buy: {initialBuyAmount} ETH</p>
          )}
          
          {error && (
            <div className="bg-red-100 p-2 mb-4 border-2 border-red-500">
              <p className="text-sm text-red-800">Error: {error.message}</p>
            </div>
          )}
          
          {isSuccess && (
            <div className="bg-green-200 p-4 mb-4 border-2 border-green-600">
              <p className="font-bold text-green-800">✅ Token Launched Successfully!</p>
              <p className="text-sm mt-2">Transaction: {hash}</p>
            </div>
          )}
          
          <button 
            onClick={launchToken}
            disabled={isPending || isConfirming || isSuccess}
            className="w-full bg-green-500 text-white p-4 border-2 border-black font-bold hover:bg-green-400 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? '⏳ PROCESSING...' : '💊 DEPLOY TOKEN NOW'}
          </button>
        </div>
      )}
    </div>
  )
}
