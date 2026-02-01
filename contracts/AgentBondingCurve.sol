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

// The Factory
contract AgentPumpFactory is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    event TokenLaunched(address indexed token, address indexed creator, string symbol, uint256 timestamp);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice);

    mapping(address => address) public agentToToken;
    mapping(address => uint256) public tokenCollateral; 

    uint256 public constant INITIAL_PRICE = 0.0000001 ether; 
    uint256 public constant SLOPE = 0.00000001 ether;        
    uint256 public constant PROTOCOL_FEE_BPS = 100;          
    uint256 public constant CREATOR_FEE_BPS = 100;           

    // The backend signer address (Admin)
    address public signerAddress;

    constructor(address _signer) {
        signerAddress = _signer;
    }

    function setSigner(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    // Launch with Signature
    function launchToken(
        string memory name, 
        string memory symbol, 
        bytes memory signature
    ) external payable {
        require(agentToToken[msg.sender] == address(0), "Already launched");
        
        // 1. Verify Signature
        // Message: keccak256(abi.encodePacked(msg.sender, name, symbol))
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, name, symbol));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        
        require(recoveredSigner == signerAddress, "Invalid signature");

        // 2. Deploy
        AgentToken newToken = new AgentToken(name, symbol, msg.sender);
        agentToToken[msg.sender] = address(newToken);
        
        emit TokenCreated(address(newToken), msg.sender, symbol, block.timestamp);
        
        // 3. Optional Buy
        if (msg.value > 0) {
            _buy(address(newToken), msg.sender, msg.value, 0); 
        }
    }

    // Public Buy
    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    // Internal Buy Logic
    function _buy(address tokenAddr, address buyer, uint256 ethAmount, uint256 minTokensOut) internal {
        require(ethAmount > 0, "ETH required");
        AgentToken token = AgentToken(tokenAddr);
        
        uint256 protocolFee = (ethAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 creatorFee = (ethAmount * CREATOR_FEE_BPS) / 10000;
        uint256 ethForCurve = ethAmount - protocolFee - creatorFee;

        uint256 currentSupply = token.totalSupply();
        uint256 currentPrice = INITIAL_PRICE + (SLOPE * currentSupply / 1e18);
        uint256 tokensBought = (ethForCurve * 1e18) / currentPrice;

        require(tokensBought >= minTokensOut, "Slippage too high");

        token.mint(buyer, tokensBought);
        tokenCollateral[tokenAddr] += ethForCurve;

        emit Trade(tokenAddr, buyer, true, ethAmount, tokensBought, currentPrice);
    }

    // Sell (omitted for brevity, same as before)
    function sell(address token, uint256 amount) external {}
}
