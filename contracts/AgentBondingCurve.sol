// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// The Agent Token
contract AgentToken is ERC20 {
    address public factory;
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        factory = msg.sender;
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

// The Factory & Marketplace
contract AgentPumpFactory is Ownable, ReentrancyGuard {
    event TokenLaunched(address indexed token, address indexed creator, string symbol);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 amount, uint256 ethCost);

    mapping(address => address) public agentToToken;
    mapping(address => uint256) public tokenCollateral; // ETH in curve

    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100;  // 1%

    function launchToken(string memory name, string memory symbol) external payable {
        require(agentToToken[msg.sender] == address(0), "Already launched");
        
        AgentToken newToken = new AgentToken(name, symbol);
        agentToToken[msg.sender] = address(newToken);
        
        emit TokenLaunched(address(newToken), msg.sender, symbol);
    }

    function buyToken(address token, uint256 minAmountOut) public payable nonReentrant {
        // Buy logic placeholder
    }

    function sellToken(address token, uint256 amount) public nonReentrant {
        // Sell logic placeholder
    }
}
