// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pair} from "./Pair.sol";

/// @title PortalX MiniAMM Factory
/// @notice Creates fee-configurable constant-product pairs, keyed by
///         (tokenA, tokenB, feeBps). Two pools of the same token pair with
///         different fees = two venues the aggregator can route between.
contract Factory {
    mapping(address => mapping(address => mapping(uint16 => address))) public getPair;
    mapping(address => mapping(address => address[])) private pairsByTokens;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, uint16 feeBps, address pair, uint256 index);

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /// @notice All pools for a token pair, across fee tiers (venue discovery).
    function getPairs(address tokenA, address tokenB) external view returns (address[] memory) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        return pairsByTokens[token0][token1];
    }

    function createPair(address tokenA, address tokenB, uint16 feeBps) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1][feeBps] == address(0), "PAIR_EXISTS");

        pair = address(new Pair(token0, token1, feeBps));
        getPair[token0][token1][feeBps] = pair;
        getPair[token1][token0][feeBps] = pair;
        pairsByTokens[token0][token1].push(pair);
        allPairs.push(pair);

        emit PairCreated(token0, token1, feeBps, pair, allPairs.length - 1);
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
}
