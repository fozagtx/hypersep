// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pair} from "./Pair.sol";

interface IFactory {
    function getPair(address tokenA, address tokenB, uint16 feeBps) external view returns (address);
    function getPairs(address tokenA, address tokenB) external view returns (address[] memory);
    function createPair(address tokenA, address tokenB, uint16 feeBps) external returns (address);
}

/// @title PortalX MiniAMM Router
/// @notice Liquidity provisioning + multi-hop swaps against fee-tiered MiniAMM
///         pairs, with the same on-chain quote math the off-chain engine uses.
contract Router {
    address public immutable factory;

    uint256 private constant FEE_DENOMINATOR = 10_000;

    constructor(address _factory) {
        factory = _factory;
    }

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "EXPIRED");
        _;
    }

    // ------------------------------------------------------------ liquidity

    /// @notice Add liquidity to the pool for (tokenA, tokenB) at `feeBps`.
    ///         If the pool does not exist it is created with `feeBps`.
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint16 feeBps,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair = IFactory(factory).getPair(tokenA, tokenB, feeBps);
        if (pair == address(0)) {
            pair = IFactory(factory).createPair(tokenA, tokenB, feeBps);
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            (uint256 reserveA, uint256 reserveB) = _reservesOf(pair, tokenA, tokenB);
            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                    require(amountAOptimal <= amountADesired, "EXCESSIVE_A_AMOUNT");
                    require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }

        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = Pair(pair).mint(to);
        require(liquidity > 0, "ZERO_LIQUIDITY");
    }

    // ----------------------------------------------------------------- swap

    /// @notice Swap an exact input along `path`, using the fee tier specified
    ///         in `fees` for each hop (fees.length == path.length - 1).
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint16[] calldata fees,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path.length >= 2, "INVALID_PATH");
        require(fees.length == path.length - 1, "FEES_LENGTH_MISMATCH");
        amounts = getAmountsOut(amountIn, path, fees);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        _safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1], fees[0]), amounts[0]);

        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address recipient = i < path.length - 2 ? _pairFor(output, path[i + 2], fees[i + 1]) : to;
            Pair(_pairFor(input, output, fees[i])).swap(amount0Out, amount1Out, recipient, "");
        }
    }

    // ---------------------------------------------------------------- quote

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint16 feeBps)
        public
        pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - feeBps);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path, uint16[] calldata fees)
        public
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "INVALID_PATH");
        require(fees.length == path.length - 1, "FEES_LENGTH_MISMATCH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            address pair = _pairFor(path[i], path[i + 1], fees[i]);
            require(pair != address(0), "PAIR_NOT_FOUND");
            (uint256 reserveIn, uint256 reserveOut) = _reservesOf(pair, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut, Pair(pair).feeBps());
        }
    }

    // ------------------------------------------------------------- internals

    function _pairFor(address tokenA, address tokenB, uint16 feeBps) internal view returns (address) {
        return IFactory(factory).getPair(tokenA, tokenB, feeBps);
    }

    function _reservesOf(address pair, address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint112 reserve0, uint112 reserve1,) = Pair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }
}
