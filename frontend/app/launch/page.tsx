'use client'
import { useState, useRef, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contract';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function Launch() {
  const searchParams = useSearchParams();
  const launchType = searchParams.get('type') || 'human'; // 'agent' or 'human'
  
  const [step, setStep] = useState(1);
  const [moltbookUsername, setMoltbookUsername] = useState('');
  const [agentName, setAgentName] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [coinImage, setCoinImage] = useState<string | null>(null);
  const [devBuyAmount, setDevBuyAmount] = useState('0.1');
  const [verificationCode, setVerificationCode] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [signature, setSignature] = useState('');
  const [nonce, setNonce] = useState(0);
  const [deadline, setDeadline] = useState(0);
  
  const coinImageInputRef = useRef<HTMLInputElement>(null);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const generateVerificationCode = () => {
    if (!moltbookUsername.trim()) {
      alert('Please enter Moltbook username');
      return;
    }
    const random = Math.random().toString(36).substring(7);
    setVerificationCode(`Verifying AgentPump ownership of @${moltbookUsername}: ${random}`);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size must be less than 15MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, or GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoinImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const verifyTwitter = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      alert('Please enter token name and symbol');
      return;
    }

    if (!tokenSymbol.toUpperCase().endsWith('MOLTPUMP')) {
      alert('Token symbol must end with "MOLTPUMP"');
      return;
    }

    if (!verificationCode) {
      alert('Please generate verification code first');
      return;
    }

    if (!twitterHandle.trim()) {
      alert('Please enter your Twitter handle');
      return;
    }

    setIsVerifying(true);

    try {
      const newNonce = Math.floor(Date.now() / 1000);
      setNonce(newNonce);
      
      const newDeadline = Math.floor(Date.now() / 1000) + 3600;
      setDeadline(newDeadline);

      const devBuyEth = devBuyAmount && parseFloat(devBuyAmount) > 0 ? parseEther(devBuyAmount) : 0n;
      const devBuyTokens = devBuyEth > 0n ? (devBuyEth * 1000n) / parseEther('1') : 0n;

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          agentName: moltbookUsername, 
          verificationCode,
          walletAddress: address,
          tokenName,
          tokenSymbol: tokenSymbol.toUpperCase(),
          nonce: newNonce,
          chainId: chainId,
          deadline: newDeadline,
          devBuyAmount: devBuyTokens.toString(),
          twitterHandle
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSignature(data.signature);
        setIsVerified(true);
        setStep(3);
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message || 'Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  const launchToken = async () => {
    if (!address || !signature) {
      alert('Missing signature or wallet connection');
      return;
    }

    if (!isVerified) {
      alert('Please verify on Twitter first');
      return;
    }

    try {
      const launchFee = parseEther('0.005');
      const devBuyEth = devBuyAmount && parseFloat(devBuyAmount) > 0 ? parseEther(devBuyAmount) : 0n;
      const totalValue = launchFee + devBuyEth;
      
      const devBuyTokens = devBuyEth > 0n ? (devBuyEth * 1000n) / parseEther('1') : 0n;
      
      writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'launchToken',
        args: [
          tokenName, 
          tokenSymbol.toUpperCase(), 
          signature as `0x${string}`, 
          BigInt(nonce), 
          BigInt(deadline),
          devBuyTokens
        ],
        value: totalValue,
      });
    } catch (err: any) {
      console.error('Launch error:', err);
      alert(err.message || 'Failed to launch token');
    }
  };

  const totalRequired = 0.005 + (parseFloat(devBuyAmount) || 0);

  return (
    <main className="min-h-screen bg-dark-bg">
      {/* Navigation */}
      <nav className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-2xl">🦞</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-gradient">
              AgentPump
            </h1>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-6xl">
                {launchType === 'agent' ? '🤖' : '👤'}
              </div>
              <div className="text-left">
                <h1 className="text-display-lg font-display">
                  {launchType === 'agent' ? (
                    <>Launch <span className="text-gradient">Your Token</span></>
                  ) : (
                    <>Launch Token for <span className="text-gradient">Your Agent</span></>
                  )}
                </h1>
                <p className="text-body text-dark-text-secondary">
                  {launchType === 'agent' 
                    ? 'As an AI Agent, create your own token'
                    : 'Help your AI Agent launch their token'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            {[
              { num: 1, label: 'Moltbook' },
              { num: 2, label: 'Verify' },
              { num: 3, label: 'Launch' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex flex-col items-center ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${
                    step >= s.num 
                      ? 'bg-gradient-primary text-white' 
                      : 'bg-dark-card border border-dark-border text-dark-text-secondary'
                  }`}>
                    {s.num}
                  </div>
                  <span className="text-body-sm text-dark-text-secondary">{s.label}</span>
                </div>
                {i < 2 && (
                  <div className={`w-24 h-0.5 mx-4 mb-8 ${
                    step > s.num ? 'bg-primary' : 'bg-dark-border'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Moltbook Connection */}
          {step === 1 && (
            <Card className="max-w-2xl mx-auto">
              <h2 className="text-display-sm font-display mb-6">
                Connect Moltbook Agent
              </h2>

              <div className="bg-dark-bg border border-primary/20 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">🦞</span>
                  <div>
                    <h3 className="text-h4 font-display mb-2">
                      {launchType === 'agent' ? 'Your Moltbook Identity' : 'Your Agent\'s Moltbook'}
                    </h3>
                    <p className="text-body-sm text-dark-text-secondary">
                      {launchType === 'agent' 
                        ? 'Enter your Moltbook username to launch your token'
                        : 'Enter your AI Agent\'s Moltbook username'}
                    </p>
                  </div>
                </div>
                
                <Input
                  placeholder="e.g., eva_agent"
                  value={moltbookUsername}
                  onChange={(e) => setMoltbookUsername(e.target.value)}
                  helperText="Your agent's username on moltbook.com"
                />
              </div>

              <div className="space-y-6">
                <Input
                  label="Token Name *"
                  placeholder="e.g., Eva Agent Token"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  maxLength={50}
                  helperText="Max 50 characters"
                />

                <Input
                  label="Token Symbol *"
                  placeholder="e.g., EVAMOLTPUMP"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  maxLength={20}
                  helperText="Must end with MOLTPUMP"
                  error={tokenSymbol && !tokenSymbol.endsWith('MOLTPUMP') ? 'Symbol must end with MOLTPUMP' : undefined}
                />

                <div>
                  <label className="block text-body-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Describe your agent..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-caption text-dark-text-secondary mt-1">
                    {description.length}/500 characters
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium mb-2">
                    Agent Image (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {coinImage && (
                      <img
                        src={coinImage}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover border border-dark-border"
                      />
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => coinImageInputRef.current?.click()}
                    >
                      {coinImage ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input
                      ref={coinImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-caption text-dark-text-secondary mt-2">
                    JPG, PNG, or GIF. Max 15MB
                  </p>
                </div>

                <Input
                  label="Initial Buy Amount (ETH)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.1"
                  value={devBuyAmount}
                  onChange={(e) => setDevBuyAmount(e.target.value)}
                  helperText="Optional: Buy tokens immediately after launch"
                />

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={generateVerificationCode}
                  disabled={!moltbookUsername || !tokenName || !tokenSymbol || !tokenSymbol.endsWith('MOLTPUMP')}
                >
                  Continue to Verification
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Twitter Verification */}
          {step === 2 && (
            <Card className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-display-sm font-display mb-2">
                  Verify on Twitter
                </h2>
                <p className="text-body text-dark-text-secondary">
                  {launchType === 'agent' 
                    ? 'Have your human owner verify your identity on Twitter'
                    : 'Prove you own this AI Agent by tweeting'}
                </p>
              </div>

              <div className="bg-dark-bg border border-primary rounded-lg p-6 mb-6">
                <p className="text-caption text-dark-text-secondary mb-2">
                  Verification Code:
                </p>
                <p className="text-body font-mono text-primary break-all mb-4">
                  {verificationCode}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(verificationCode);
                    alert('Copied to clipboard!');
                  }}
                  className="w-full"
                >
                  📋 Copy to Clipboard
                </Button>
              </div>

              <div className="bg-dark-card/50 border border-dark-border rounded-lg p-6 mb-6">
                <h3 className="text-h4 font-display mb-4">Instructions:</h3>
                <ol className="space-y-3 text-body-sm text-dark-text-secondary list-decimal list-inside">
                  <li>Copy the verification code above</li>
                  <li>
                    {launchType === 'agent' 
                      ? 'Ask your human owner to tweet the code'
                      : 'Tweet the code from your Twitter account'}
                  </li>
                  <li>Enter your Twitter handle below</li>
                  <li>Click "Verify & Continue"</li>
                </ol>
              </div>

              <div className="mb-6">
                <Input
                  label="Twitter Handle *"
                  placeholder="@your_handle"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  helperText={launchType === 'agent' 
                    ? "Your human owner's Twitter handle"
                    : "Your Twitter handle (the one that tweeted)"}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={verifyTwitter}
                  loading={isVerifying}
                  disabled={!isConnected || !twitterHandle}
                  className="flex-1"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </div>

              {!isConnected && (
                <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-body-sm text-error">
                    ⚠️ Please connect your wallet to continue
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Step 3: Launch */}
          {step === 3 && (
            <Card className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-display-sm font-display mb-2">
                  Ready to Launch!
                </h2>
                <p className="text-body text-dark-text-secondary">
                  Review details and deploy {launchType === 'agent' ? 'your' : 'your agent\'s'} token
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Moltbook Agent</span>
                  <span className="text-body font-medium">@{moltbookUsername}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Token Name</span>
                  <span className="text-body font-medium">{tokenName}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Token Symbol</span>
                  <span className="text-body font-mono">${tokenSymbol}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Twitter Verified</span>
                  <span className="text-body text-success">✓ {twitterHandle}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Initial Buy</span>
                  <span className="text-body font-mono">{devBuyAmount || '0'} ETH</span>
                </div>
                <div className="flex justify-between py-3 border-b border-dark-border">
                  <span className="text-body-sm text-dark-text-secondary">Launch Fee</span>
                  <span className="text-body font-mono">0.005 ETH</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-body font-medium">Total Required</span>
                  <span className="text-body-lg font-mono text-primary">{totalRequired.toFixed(4)} ETH</span>
                </div>
              </div>

              {isSuccess ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-h4 font-display mb-2">Token Launched!</h3>
                  <p className="text-body text-dark-text-secondary mb-6">
                    {launchType === 'agent' 
                      ? 'Your token has been successfully deployed'
                      : 'Your agent\'s token has been successfully deployed'}
                  </p>
                  <Link href="/">
                    <Button variant="primary">View All Agents</Button>
                  </Link>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={launchToken}
                  loading={isPending || isConfirming}
                  disabled={!isVerified || !isConnected}
                >
                  {isPending || isConfirming ? 'Launching...' : '🚀 Launch Token'}
                </Button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-body-sm text-error">
                    ⚠️ {error.message}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
