// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PortalX Bridge (testnet)
/// @notice Custodial lock/release bridge used for real cross-chain execution
///         paths in the PortalX demo. Users `deposit` (lock) tokens on the
///         source chain; an off-chain relayer verifies the deposit event and
///         calls `release` on the destination chain. Each release is bound to
///         a unique depositId and can execute exactly once.
///
///         This is a testnet-grade bridge: trust is placed in the relayer.
///         The architecture note in the README explains how the relayer set
///         would be decentralized for mainnet.
contract PortalXBridge {
    address public owner;
    address public relayer;
    uint256 public depositCount;

    mapping(bytes32 => bool) public released;
    mapping(address => bool) public supportedTokens;

    event TokenSupported(address indexed token, bool supported);
    event RelayerChanged(address indexed relayer);
    event Deposited(
        bytes32 indexed depositId,
        address indexed token,
        uint256 amount,
        uint256 indexed destChainId,
        address sender,
        address recipient
    );
    event Released(bytes32 indexed depositId, address indexed token, uint256 amount, address indexed recipient);

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "NOT_RELAYER");
        _;
    }

    // ------------------------------------------------------------- admin

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerChanged(_relayer);
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    /// @notice Testnet escape hatch so demo funds are never stuck.
    function rescue(address token, address to, uint256 amount) external onlyOwner {
        _safeTransfer(token, to, amount);
    }

    // ------------------------------------------------------------ bridge

    /// @notice Lock tokens on this chain for release on `destChainId`.
    function deposit(address token, uint256 amount, uint256 destChainId, address recipient)
        external
        returns (bytes32 depositId)
    {
        require(supportedTokens[token], "UNSUPPORTED_TOKEN");
        require(amount > 0, "ZERO_AMOUNT");
        require(recipient != address(0), "ZERO_RECIPIENT");
        require(destChainId != block.chainid, "SAME_CHAIN");

        depositCount += 1;
        depositId = keccak256(abi.encodePacked(block.chainid, depositCount, msg.sender, token, amount));

        _safeTransferFrom(token, msg.sender, address(this), amount);
        emit Deposited(depositId, token, amount, destChainId, msg.sender, recipient);
    }

    /// @notice Release bridged funds on the destination chain. Called by the
    ///         relayer after verifying the matching source-chain deposit.
    function release(bytes32 depositId, address token, uint256 amount, address recipient) external onlyRelayer {
        require(!released[depositId], "ALREADY_RELEASED");
        require(recipient != address(0), "ZERO_RECIPIENT");

        released[depositId] = true;
        _safeTransfer(token, recipient, amount);
        emit Released(depositId, token, amount, recipient);
    }

    // ------------------------------------------------------------- token

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }
}
