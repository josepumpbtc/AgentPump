import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { agentName, verificationCode, walletAddress, tokenName, tokenSymbol, nonce, chainId, deadline } = req.body;

  if (!walletAddress || !agentName || !tokenName || !tokenSymbol || nonce === undefined || chainId === undefined || deadline === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch Agent's recent posts from Moltbook
    const MOLTBOOK_KEY = process.env.MOLTBOOK_READ_KEY; 
    
    if (!MOLTBOOK_KEY) {
      return res.status(500).json({ error: 'MOLTBOOK_READ_KEY not configured' });
    }
    
    const response = await fetch(`https://moltbook.com/api/v1/agents/profile?name=${agentName}`, {
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`
      }
    });
    
    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch agent profile' });
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ error: 'Agent not found' });
    }

    // 2. Check recent posts for the verification code
    const posts = data.recentPosts || [];
    const found = posts.some((p: any) => p.content.includes(verificationCode));

    if (!found) {
      return res.status(400).json({ error: 'Verification post not found yet. Try again in 30s.' });
    }

    // 3. Generate signature for contract
    const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      return res.status(500).json({ error: 'SIGNER_PRIVATE_KEY not configured' });
    }

    // Create message hash: keccak256(abi.encodePacked(walletAddress, tokenName, tokenSymbol, nonce, chainId, deadline))
    // Note: abi.encodePacked concatenates values without padding, exactly as Solidity does
    const walletAddressBytes = ethers.getBytes(ethers.getAddress(walletAddress));
    const nameBytes = ethers.toUtf8Bytes(tokenName);
    const symbolBytes = ethers.toUtf8Bytes(tokenSymbol);
    
    // For uint256 in abi.encodePacked, we need 32 bytes (big-endian)
    const nonceHex = ethers.toBeHex(nonce, 32);
    const nonceBytes = ethers.getBytes(nonceHex);
    
    const chainIdHex = ethers.toBeHex(chainId, 32);
    const chainIdBytes = ethers.getBytes(chainIdHex);
    
    const deadlineHex = ethers.toBeHex(deadline, 32);
    const deadlineBytes = ethers.getBytes(deadlineHex);
    
    // Concatenate all bytes (abi.encodePacked style)
    const packedData = ethers.concat([
      walletAddressBytes,
      nameBytes,
      symbolBytes,
      nonceBytes,
      chainIdBytes,
      deadlineBytes
    ]);
    
    // Hash the packed data
    const messageHash = ethers.keccak256(packedData);

    // Sign the message hash
    // The contract uses toEthSignedMessageHash(), so we need to sign with the Ethereum Signed Message prefix
    const wallet = new ethers.Wallet(signerPrivateKey);
    // Convert hash to hex string for signMessage
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return res.status(200).json({ 
      success: true, 
      signature: signature,
      message: 'Verified! You can now launch.' 
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
