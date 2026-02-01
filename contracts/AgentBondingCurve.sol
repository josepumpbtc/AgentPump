// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AgentToken is ERC20, Ownable {
    address public factory;

    constructor(string memory name, string memory symbol, address _owner) ERC20(name, symbol) {
        factory = msg.sender;
        transferOwnership(_owner);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == factory, "Only factory can mint");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == factory, "Only factory can burn");
        _burn(from, amount);
    }
}

contract AgentPumpFactory is ReentrancyGuard, Ownable {
    
    // Events
    event TokenCreated(address indexed token, address indexed creator, string symbol, uint256 timestamp);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice);

    // Config
    uint256 public constant INITIAL_PRICE = 0.0000001 ether; // Starting price
    uint256 public constant SLOPE = 0.00000001 ether;        // Price increase per token
    uint256 public constant PROTOCOL_FEE_BPS = 100;          // 1%
    uint256 public constant CREATOR_FEE_BPS = 100;           // 1%

    mapping(address => address) public getAgentToken;
    address[] public allTokens;

    // --- Core Logic ---

    // Calculate ETH cost for 'amount' tokens at current 'supply'
    // Linear Curve Cost = Integral of (mx + c) = m/2 * (x2^2 - x1^2) + c * (x2 - x1)
    function getBuyCost(uint256 currentSupply, uint256 amountToBuy) public pure returns (uint256) {
        uint256 supplyAfter = currentSupply + amountToBuy;
        uint256 cost = (SLOPE * (supplyAfter**2 - currentSupply**2)) / 2 + (INITIAL_PRICE * amountToBuy);
        return cost / 1e18; // Adjust for decimals if needed (assuming 1e18 base)
    }

    function getSellRefund(uint256 currentSupply, uint256 amountToSell) public pure returns (uint256) {
        uint256 supplyAfter = currentSupply - amountToSell;
        uint256 refund = (SLOPE * (currentSupply**2 - supplyAfter**2)) / 2 + (INITIAL_PRICE * amountToSell);
        return refund / 1e18;
    }

    // --- Actions ---

    function createToken(string memory name, string memory symbol) external returns (address) {
        // 1. Check if user already deployed? (Optional restriction)
        // require(getAgentToken[msg.sender] == address(0), "One token per agent");

        // 2. Deploy
        AgentToken newToken = new AgentToken(name, symbol, msg.sender);
        address tokenAddr = address(newToken);
        
        // 3. Store
        getAgentToken[msg.sender] = tokenAddr;
        allTokens.push(tokenAddr);

        emit TokenCreated(tokenAddr, msg.sender, symbol, block.timestamp);
        return tokenAddr;
    }

    function buy(address tokenAddress, uint256 minTokensOut) external payable nonReentrant {
        require(msg.value > 0, "ETH required");
        AgentToken token = AgentToken(tokenAddress);
        
        // 1. Calculate Fees
        uint256 protocolFee = (msg.value * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (msg.value * CREATOR_FEE_BPS) / 10000;
        uint256 ethForCurve = msg.value - protocolFee - creatorFee;

        // 2. Distribute Fees
        // TODO: Send to treasury and creator. For MVP we keep in contract or send immediately.
        // payable(owner()).transfer(protocolFee); 
        // payable(token.owner()).transfer(creatorFee); 

        // 3. Calculate Tokens Out based on Curve
        // This is a simplification. In prod, we solve quadratic equation for exact ETH input.
        // For MVP, we estimate price at current supply and execute. 
        // Better implementation: solve  for .
        
        // Inverse Linear: amount = (sqrt(c^2 + 2m*ETH) - c) / m  (roughly)
        // Let's use a simplified iterative approach or fixed formula for Gas efficiency.
        // For this demo, let's assume price is roughly constant for small buys (Not safe for prod)
        // OR better: Just implement the inverse formula.
        
        uint256 currentSupply = token.totalSupply();
        // Formula: Delta S = (sqrt( (m*S + c)^2 + 2*m*ETH ) - (m*S + c)) / m
        // This is complex in Solidity without float. 
        
        // Alternative: Bancor Formula or simple XYK.
        // Let's stick to a simpler model for MVP: Price increases by 1% every buy? 
        // Or just use the standard linear approximation.
        
        // Linear Approximation for MVP:
        // Price = Slope * Supply. 
        // Tokens = ETH / CurrentPrice.
        
        uint256 currentPrice = INITIAL_PRICE + (SLOPE * currentSupply / 1e18);
        uint256 tokensBought = (ethForCurve * 1e18) / currentPrice;

        require(tokensBought >= minTokensOut, "Slippage too high");

        // 4. Mint
        token.mint(msg.sender, tokensBought);

        emit Trade(tokenAddress, msg.sender, true, msg.value, tokensBought, currentPrice);
    }

    function sell(address tokenAddress, uint256 tokenAmount, uint256 minEthOut) external nonReentrant {
        AgentToken token = AgentToken(tokenAddress);
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        // 1. Calculate ETH Value
        uint256 currentSupply = token.totalSupply();
        // Refund = roughly Tokens * CurrentPrice (minus slippage impact)
        uint256 currentPrice = INITIAL_PRICE + (SLOPE * currentSupply / 1e18);
        uint256 ethValue = (tokenAmount * currentPrice) / 1e18;

        // 2. Fees (on Sell too?) - Pump.fun usually has fees on both.
        uint256 protocolFee = (ethValue * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethValue * CREATOR_FEE_BPS) / 10000;
        uint256 ethToReturn = ethValue - protocolFee - creatorFee;

        require(ethToReturn >= minEthOut, "Slippage too high");

        // 3. Burn Tokens
        token.burn(msg.sender, tokenAmount);

        // 4. Send ETH
        payable(msg.sender).transfer(ethToReturn);

        emit Trade(tokenAddress, msg.sender, false, ethToReturn, tokenAmount, currentPrice);
    }
}
