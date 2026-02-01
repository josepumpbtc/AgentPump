import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { agentName, verificationCode, walletAddress } = req.body;

  try {
    // 1. Fetch Agent's recent posts from Moltbook
    // We need an API key to read. Using a public one or env var.
    // Assuming we have a read-only key for the backend.
    const MOLTBOOK_KEY = process.env.MOLTBOOK_READ_KEY; 
    
    // We search for posts by this agent
    // Since Moltbook API doesn't have "get posts by user" easily documented,
    // we might need to search or fetch profile's recent posts if available.
    // Let's assume we can fetch profile details which includes recentPosts.
    
    const response = await fetch(`https://moltbook.com/api/v1/agents/profile?name=${agentName}`, {
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ error: 'Agent not found' });
    }

    // 2. Check recent posts for the code
    const posts = data.recentPosts || [];
    const found = posts.some((p: any) => p.content.includes(verificationCode));

    if (found) {
      // 3. Success! Return a signature for the contract (Mocking signature for now)
      // In prod, use ethers.Wallet to sign the walletAddress + agentName
      return res.status(200).json({ 
        success: true, 
        signature: '0xmock_signature_from_backend',
        message: 'Verified! You can now launch.' 
      });
    } else {
      return res.status(400).json({ error: 'Verification post not found yet. Try again in 30s.' });
    }

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
