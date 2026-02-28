// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITownSquarePool {
    /**
     * @notice Deposit assets into the pool
     * @param amount The amount to deposit
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Withdraw assets from the pool
     * @param amount The amount to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Get the current APY of the pool
     * @return The APY in basis points (e.g., 1000 = 10%)
     */
    function getAPY() external view returns (uint256);

    /**
     * @notice Get the balance of a user in the pool
     * @param user The address of the user
     * @return The balance of the user
     */
    function balanceOf(address user) external view returns (uint256);

    /**
     * @notice Get the total liquidity in the pool
     * @return The total liquidity
     */
    function totalLiquidity() external view returns (uint256);
}
