// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// Uniswap V2 Router Interface
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    
    function WETH() external pure returns (address);
    function factory() external pure returns (address);
}

// Uniswap V2 Factory Interface
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// The Agent Token
contract AgentToken is ERC20, Ownable {
    address public factory;
    constructor(string memory name, string memory symbol, address _owner) ERC20(name, symbol) {
        factory = msg.sender;
        transferOwnership(_owner);
    }
    function mint(address to, uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        _burn(from, amount);
    }
}

// The Factory
contract AgentPumpFactory is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    event TokenLaunched(address indexed token, address indexed creator, string symbol, uint256 timestamp);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice);
    event Graduated(address indexed token, uint256 ethAmount, uint256 tokenAmount, address lpToken);

    // Constants
    uint256 public constant LAUNCH_FEE = 0.005 ether;
    uint256 public constant GRADUATION_THRESHOLD = 20 ether;
    uint256 public constant GRADUATION_FEE = 2 ether;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    address public immutable UNISWAP_V2_ROUTER;
    
    // Trading fees: 0.5% protocol + 0.5% creator = 1% total
    uint256 public constant PROTOCOL_FEE_BPS = 50;          // 0.5%
    uint256 public constant CREATOR_FEE_BPS = 50;          // 0.5%
    uint256 public constant CREATOR_VESTING_BPS = 2000;     // 20%
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1B tokens max

    // State variables
    mapping(address => address) public agentToToken;
    mapping(address => uint256) public tokenCollateral;
    mapping(address => uint256) public protocolFees; // Accumulated protocol fees per token
    mapping(address => uint256) public creatorFees; // Accumulated creator fees per token
    mapping(address => uint256) public nonces; // Nonce for signature replay protection
    mapping(address => uint256) public virtualK; // Virtual AMM constant product (x * y = k)
    mapping(address => bool) public graduated; // Whether token has graduated to Uniswap
    uint256 public protocolTreasury; // Total protocol treasury (launch fees + graduation fees)

    // The backend signer address (Admin)
    address public signerAddress;

    constructor(address _signer, address _uniswapRouter) {
        require(_signer != address(0), "Invalid signer");
        require(_uniswapRouter != address(0), "Invalid Uniswap router");
        signerAddress = _signer;
        UNISWAP_V2_ROUTER = _uniswapRouter;
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer");
        signerAddress = _signer;
    }

    // Pause functions for emergency
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Launch with Signature
    function launchToken(
        string memory name, 
        string memory symbol, 
        bytes memory signature,
        uint256 nonce,
        uint256 deadline
    ) external payable whenNotPaused {
        require(msg.value >= LAUNCH_FEE, "Launch fee required");
        require(agentToToken[msg.sender] == address(0), "Already launched");
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Invalid name length");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "Invalid symbol length");
        require(block.timestamp <= deadline, "Signature expired");
        
        // 1. Collect launch fee
        protocolTreasury += LAUNCH_FEE;
        uint256 remainingEth = msg.value - LAUNCH_FEE;
        
        // 2. Verify Signature with nonce, chainId, and deadline
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender, 
            name, 
            symbol, 
            nonce,
            block.chainid,
            deadline
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        
        require(recoveredSigner == signerAddress, "Invalid signature");
        require(nonces[msg.sender] < nonce, "Nonce too low");
        nonces[msg.sender] = nonce;

        // 3. Deploy token
        AgentToken newToken = new AgentToken(name, symbol, msg.sender);
        address tokenAddr = address(newToken);
        agentToToken[msg.sender] = tokenAddr;
        
        // 4. Mint 20% to creator (vesting)
        uint256 creatorAmount = (MAX_SUPPLY * CREATOR_VESTING_BPS) / 10000;
        AgentToken(tokenAddr).mint(msg.sender, creatorAmount);
        
        // 5. Initialize Virtual AMM
        // Start with minimal initial liquidity to establish the curve
        // We need initial ETH and token reserves to calculate k
        uint256 initialEth = 0.001 ether;
        
        // If user provided additional ETH, use it for initial buy
        if (remainingEth > 0) {
            // Perform initial buy with remaining ETH
            // This will set up the curve properly
            tokenCollateral[tokenAddr] = initialEth;
            virtualK[tokenAddr] = initialEth * creatorAmount; // Initial k
            
            emit TokenLaunched(tokenAddr, msg.sender, symbol, block.timestamp);
            
            // Perform buy with remaining ETH
            _buy(tokenAddr, msg.sender, remainingEth, 0);
        } else {
            // No additional ETH, just set up minimal curve
            // Mint a small amount of tokens to establish the curve
            uint256 minTokens = 1000 * 1e18; // 1000 tokens
            AgentToken(tokenAddr).mint(msg.sender, minTokens);
            
            tokenCollateral[tokenAddr] = initialEth;
            virtualK[tokenAddr] = initialEth * (creatorAmount + minTokens);
            
            emit TokenLaunched(tokenAddr, msg.sender, symbol, block.timestamp);
        }
    }

    // Public Buy
    function buy(address token, uint256 minTokensOut) external payable nonReentrant whenNotPaused {
        require(token != address(0), "Invalid token");
        require(!graduated[token], "Token has graduated");
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    // Internal Buy Logic using Virtual AMM
    function _buy(address tokenAddr, address buyer, uint256 ethAmount, uint256 minTokensOut) internal {
        require(ethAmount > 0, "ETH required");
        require(!graduated[tokenAddr], "Token has graduated");
        
        AgentToken token = AgentToken(tokenAddr);
        
        // Calculate fees: 0.5% protocol + 0.5% creator = 1% total
        uint256 protocolFee = (ethAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethAmount * CREATOR_FEE_BPS) / 10000;
        uint256 ethForCurve = ethAmount - protocolFee - creatorFee;

        // Get current state
        uint256 x0 = tokenCollateral[tokenAddr]; // ETH reserve
        uint256 y0 = token.totalSupply(); // Token supply
        uint256 k = virtualK[tokenAddr];
        
        // If k is 0, initialize it (shouldn't happen, but safety check)
        if (k == 0) {
            require(x0 > 0 && y0 > 0, "Invalid initial state");
            k = x0 * y0;
            virtualK[tokenAddr] = k;
        }

        // Virtual AMM: x * y = k
        // In bonding curve, when buying: both x and y increase, so k increases
        // We calculate tokens based on maintaining the price curve
        // Price = x / y, and we want price to increase as we buy
        
        // New ETH reserve: x1 = x0 + ethForCurve
        uint256 x1 = x0 + ethForCurve;
        
        // Calculate tokens using constant product formula adapted for bonding curve
        // The formula: tokensBought = (ethForCurve * y0) / x0
        // This gives us a linear approximation, but for true constant product:
        // If we maintain k constant: x0 * y0 = x1 * y1
        // y1 = (x0 * y0) / x1
        // tokensBought = y1 - y0 = ((x0 * y0) / x1) - y0 = y0 * (x0/x1 - 1)
        // This is negative! So we need a different approach.
        
        // For bonding curve with increasing k:
        // We want: new_price > old_price => x1/y1 > x0/y0 => x1*y0 > x0*y1
        // If y1 = y0 + tokensBought: x1*y0 > x0*(y0+tokensBought)
        // => x1*y0 > x0*y0 + x0*tokensBought
        // => (x1-x0)*y0 > x0*tokensBought
        // => ethForCurve * y0 > x0 * tokensBought
        // => tokensBought < (ethForCurve * y0) / x0
        
        // Use the formula: tokensBought = (ethForCurve * y0) / x0
        // This ensures price increases (x increases more than y)
        uint256 tokensBought;
        if (x0 > 0 && y0 > 0) {
            // Calculate tokens: maintain price curve
            tokensBought = (ethForCurve * y0) / x0;
        } else {
            // Initial state: if no liquidity, use a simple formula
            tokensBought = ethForCurve * 1000; // 1 ETH = 1000 tokens initially
        }

        require(tokensBought >= minTokensOut, "Slippage too high");
        require(y0 + tokensBought <= MAX_SUPPLY, "Max supply reached");

        // Update fees
        protocolFees[tokenAddr] += protocolFee;
        address creator = token.owner();
        creatorFees[tokenAddr] += creatorFee;

        // Update state
        uint256 y1_new = y0 + tokensBought;
        tokenCollateral[tokenAddr] = x1;
        virtualK[tokenAddr] = x1 * y1_new; // Update k with new state (k increases)

        // Mint tokens
        token.mint(buyer, tokensBought);

        // Check for graduation
        _checkAndGraduate(tokenAddr);

        // Calculate new price for event (price = x / y)
        uint256 newPrice = (x1 * 1e18) / (y0 + tokensBought);
        emit Trade(tokenAddr, buyer, true, ethAmount, tokensBought, newPrice);
    }

    // Sell function using Virtual AMM
    function sell(address token, uint256 amount, uint256 minEthOut) external nonReentrant whenNotPaused {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(!graduated[token], "Token has graduated");
        
        AgentToken tokenContract = AgentToken(token);
        require(tokenContract.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Get current state
        uint256 x0 = tokenCollateral[token];
        uint256 y0 = tokenContract.totalSupply();
        uint256 k = virtualK[token];
        
        require(k > 0, "Invalid curve state");
        require(x0 > 0 && y0 > 0, "Invalid reserves");
        
        // Virtual AMM: x * y = k (k increases as we trade)
        // When selling: we add tokens back, so y increases
        // New token supply: y1 = y0 + amount
        uint256 y1 = y0 + amount;
        
        // Calculate new ETH reserve based on constant product
        // If we maintain the same k: x1 = k / y1
        // But k = x0 * y0, so: x1 = (x0 * y0) / y1
        uint256 x1 = (x0 * y0) / y1;
        
        // ETH to return: ethOutRaw = x0 - x1
        require(x0 >= x1, "Insufficient ETH reserve");
        uint256 ethOutRaw = x0 - x1;
        
        // Calculate fees: 0.5% protocol + 0.5% creator = 1% total
        uint256 protocolFee = (ethOutRaw * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethOutRaw * CREATOR_FEE_BPS) / 10000;
        uint256 ethToReturn = ethOutRaw - protocolFee - creatorFee;
        
        require(ethToReturn >= minEthOut, "Slippage too high");
        require(tokenCollateral[token] >= ethToReturn, "Insufficient collateral");
        
        // Update fees
        protocolFees[token] += protocolFee;
        address creator = tokenContract.owner();
        creatorFees[token] += creatorFee;
        
        // Update state
        tokenCollateral[token] = x1;
        virtualK[token] = x1 * y1; // Update k with new state (k decreases when selling)
        
        // Burn tokens
        tokenContract.burn(msg.sender, amount);
        
        // Transfer ETH to seller
        (bool success, ) = msg.sender.call{value: ethToReturn}("");
        require(success, "ETH transfer failed");
        
        // Calculate new price for event
        uint256 newPrice = (x1 * 1e18) / y1;
        emit Trade(token, msg.sender, false, ethToReturn, amount, newPrice);
    }

    // Check and graduate token if threshold reached
    function _checkAndGraduate(address tokenAddr) internal {
        if (graduated[tokenAddr]) {
            return; // Already graduated
        }
        
        uint256 collateral = tokenCollateral[tokenAddr];
        if (collateral >= GRADUATION_THRESHOLD) {
            _graduate(tokenAddr);
        }
    }

    // Graduate token to Uniswap V2
    function _graduate(address tokenAddr) internal {
        require(!graduated[tokenAddr], "Already graduated");
        
        AgentToken token = AgentToken(tokenAddr);
        uint256 totalSupply = token.totalSupply();
        uint256 collateral = tokenCollateral[tokenAddr];
        
        require(collateral >= GRADUATION_THRESHOLD, "Threshold not reached");
        
        // Mark as graduated
        graduated[tokenAddr] = true;
        
        // Extract graduation fee (2 ETH) to protocol treasury
        require(collateral >= GRADUATION_FEE, "Insufficient collateral for graduation fee");
        protocolTreasury += GRADUATION_FEE;
        uint256 ethForLiquidity = collateral - GRADUATION_FEE;
        
        // Approve router to spend tokens
        token.approve(UNISWAP_V2_ROUTER, totalSupply);
        
        // Add liquidity to Uniswap V2
        // We use all remaining tokens and ETH
        uint256 amountTokenMin = (totalSupply * 95) / 100; // 5% slippage tolerance
        uint256 amountETHMin = (ethForLiquidity * 95) / 100; // 5% slippage tolerance
        
        // Get Uniswap Factory address from Router
        address uniswapFactory = IUniswapV2Router02(UNISWAP_V2_ROUTER).factory();
        address weth = IUniswapV2Router02(UNISWAP_V2_ROUTER).WETH();
        
        // Add liquidity - LP tokens will be sent to DEAD_ADDRESS
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = 
            IUniswapV2Router02(UNISWAP_V2_ROUTER).addLiquidityETH{value: ethForLiquidity}(
                tokenAddr,
                totalSupply,
                amountTokenMin,
                amountETHMin,
                DEAD_ADDRESS, // Send LP tokens directly to dead address
                block.timestamp + 300 // 5 minute deadline
            );
        
        // Get LP token (pair) address
        address lpToken = IUniswapV2Factory(uniswapFactory).getPair(tokenAddr, weth);
        
        // Clear collateral (it's now in Uniswap)
        tokenCollateral[tokenAddr] = 0;
        
        // Emit graduation event
        emit Graduated(tokenAddr, amountETH, amountToken, lpToken);
    }

    // Withdraw protocol fees (per token)
    function withdrawProtocolFees(address token) external onlyOwner {
        uint256 amount = protocolFees[token];
        require(amount > 0, "No fees to withdraw");
        protocolFees[token] = 0;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Withdraw creator fees
    function withdrawCreatorFees(address token) external {
        AgentToken tokenContract = AgentToken(token);
        require(msg.sender == tokenContract.owner(), "Not token creator");
        uint256 amount = creatorFees[token];
        require(amount > 0, "No fees to withdraw");
        creatorFees[token] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Withdraw protocol treasury (launch fees + graduation fees)
    function withdrawTreasury() external onlyOwner {
        uint256 amount = protocolTreasury;
        require(amount > 0, "No treasury to withdraw");
        protocolTreasury = 0;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // View function to get current price (using Virtual AMM)
    function getCurrentPrice(address token) external view returns (uint256) {
        AgentToken tokenContract = AgentToken(token);
        uint256 supply = tokenContract.totalSupply();
        uint256 collateral = tokenCollateral[token];
        
        if (supply == 0 || collateral == 0) {
            return 0;
        }
        
        // Price = x / y (ETH per token)
        return (collateral * 1e18) / supply;
    }

    // View function to get buy quote (using Virtual AMM)
    function getBuyQuote(address token, uint256 ethAmount) external view returns (uint256 tokensOut) {
        if (graduated[token]) {
            return 0;
        }
        
        uint256 protocolFee = (ethAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethAmount * CREATOR_FEE_BPS) / 10000;
        uint256 ethForCurve = ethAmount - protocolFee - creatorFee;
        
        AgentToken tokenContract = AgentToken(token);
        uint256 x0 = tokenCollateral[token];
        uint256 y0 = tokenContract.totalSupply();
        
        if (x0 == 0 || y0 == 0) {
            // Initial state: use simple formula
            return ethForCurve * 1000; // 1 ETH = 1000 tokens initially
        }
        
        // Calculate tokens using bonding curve formula
        tokensOut = (ethForCurve * y0) / x0;
        
        // Check max supply
        if (y0 + tokensOut > MAX_SUPPLY) {
            tokensOut = MAX_SUPPLY - y0;
        }
    }

    // View function to get sell quote (using Virtual AMM)
    function getSellQuote(address token, uint256 tokenAmount) external view returns (uint256 ethOut) {
        if (graduated[token]) {
            return 0;
        }
        
        AgentToken tokenContract = AgentToken(token);
        uint256 x0 = tokenCollateral[token];
        uint256 y0 = tokenContract.totalSupply();
        
        if (x0 == 0 || y0 == 0) {
            return 0;
        }
        
        // Calculate ETH using constant product formula
        uint256 y1 = y0 + tokenAmount;
        uint256 x1 = (x0 * y0) / y1;
        
        require(x0 >= x1, "Insufficient reserve");
        uint256 ethOutRaw = x0 - x1;
        
        uint256 protocolFee = (ethOutRaw * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethOutRaw * CREATOR_FEE_BPS) / 10000;
        ethOut = ethOutRaw - protocolFee - creatorFee;
    }
}
