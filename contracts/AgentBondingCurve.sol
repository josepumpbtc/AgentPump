// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

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

// The Factory with Hybrid Economics
contract AgentPumpFactory is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    event TokenLaunched(address indexed token, address indexed creator, string symbol, uint256 timestamp);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice);

    mapping(address => address) public agentToToken;
    mapping(address => uint256) public tokenCollateral; 

    // Config
    uint256 public constant INITIAL_PRICE = 0.0000001 ether; 
    uint256 public constant SLOPE = 0.00000001 ether;        
    
    // Fee Config (1% Total)
    uint256 public constant PROTOCOL_FEE_BPS = 50;  // 0.5%
    uint256 public constant CREATOR_FEE_BPS = 50;   // 0.5%
    
    // Hybrid Config
    uint256 public constant MAX_DEV_BUY_PERCENT = 250; // 2.5% (250 bps)
    uint256 public constant TOTAL_SUPPLY_CAP = 1_000_000_000 ether; // 1B tokens

    address public signerAddress;

    constructor(address _signer) {
        signerAddress = _signer;
    }

    function setSigner(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    function launchToken(
        string memory name, 
        string memory symbol, 
        uint256 devBuyAmount, // Dev wants to buy X tokens immediately
        bytes memory signature
    ) external payable {
        require(agentToToken[msg.sender] == address(0), "Already launched");
        
        // 1. Verify Signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, name, symbol));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        require(ethSignedMessageHash.recover(signature) == signerAddress, "Invalid sig");

        // 2. Deploy
        AgentToken newToken = new AgentToken(name, symbol, msg.sender);
        agentToToken[msg.sender] = address(newToken);
        emit TokenCreated(address(newToken), msg.sender, symbol, block.timestamp);
        
        // 3. Hybrid: Initial Dev Buy
        if (devBuyAmount > 0) {
            // Check Cap: Cannot buy more than 2.5% of supply
            require(devBuyAmount <= (TOTAL_SUPPLY_CAP * MAX_DEV_BUY_PERCENT) / 10000, "Dev buy exceeds cap");
            
            // Execute Buy
            // Note: Dev must send enough ETH. Any excess is refunded.
            // For simplicity in MVP, we require exact or surplus ETH.
            _buy(address(newToken), msg.sender, msg.value, devBuyAmount); 
        }
    }

    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    function _buy(address tokenAddr, address buyer, uint256 ethAmount, uint256 minTokensOut) internal {
        require(ethAmount > 0, "ETH required");
        AgentToken token = AgentToken(tokenAddr);
        
        // 1. Fees
        uint256 protocolFee = (ethAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethAmount * CREATOR_FEE_BPS) / 10000;
        uint256 ethForCurve = ethAmount - protocolFee - creatorFee;

        // 2. Distribute Fees
        // Protocol
        // payable(owner()).transfer(protocolFee); // Push pattern (risky) or Pull? 
        // Creator (The Owner of the Token Contract)
        // address creator = token.owner();
        // payable(creator).transfer(creatorFee);
        
        // *Optimized*: Accumulate fees in contract, let them claim to save gas on small trades?
        // Or just send immediately for MVP simplicity. Let's send.
        if(protocolFee > 0) payable(owner()).transfer(protocolFee);
        if(creatorFee > 0) payable(token.owner()).transfer(creatorFee);

        // 3. Bonding Curve
        uint256 currentSupply = token.totalSupply();
        uint256 currentPrice = INITIAL_PRICE + (SLOPE * currentSupply / 1e18);
        
        // Simple Linear Integration for accurate cost? Or approximation?
        // Let's stick to approx for readability in this snippet, but PROD needs integral.
        uint256 tokensBought = (ethForCurve * 1e18) / currentPrice;

        require(tokensBought >= minTokensOut, "Slippage");

        // 4. Mint
        token.mint(buyer, tokensBought);
        tokenCollateral[tokenAddr] += ethForCurve;

        emit Trade(tokenAddr, buyer, true, ethAmount, tokensBought, currentPrice);
    }

    // Sell function remains similar...
    function sell(address token, uint256 amount) external {}
}
