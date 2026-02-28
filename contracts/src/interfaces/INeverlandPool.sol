// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INeverlandPool {
    /**
     * @notice Supply assets to the pool
     * @param asset The address of the asset to supply
     * @param amount The amount to supply
     * @param onBehalfOf The address that will receive the aTokens
     * @param referralCode The referral code (typically 0)
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @notice Withdraw assets from the pool
     * @param asset The address of the asset to withdraw
     * @param amount The amount to withdraw
     * @param to The address that will receive the withdrawn assets
     * @return The actual amount withdrawn
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /**
     * @notice Get user account data
     * @param user The address of the user
     * @return totalCollateralBase Total collateral in base currency
     * @return totalDebtBase Total debt in base currency
     * @return availableBorrowsBase Available borrows in base currency
     * @return currentLiquidationThreshold Current liquidation threshold
     * @return ltv Loan-to-value ratio
     * @return healthFactor Health factor
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );

    /**
     * @notice Get reserve data for an asset
     * @param asset The address of the asset
     * @return configuration Reserve configuration
     * @return liquidityIndex Liquidity index
     * @return variableBorrowIndex Variable borrow index
     * @return currentLiquidityRate Current liquidity rate
     * @return currentVariableBorrowRate Current variable borrow rate
     * @return currentStableBorrowRate Current stable borrow rate
     * @return lastUpdateTimestamp Last update timestamp
     * @return aTokenAddress AToken address
     * @return stableDebtTokenAddress Stable debt token address
     * @return variableDebtTokenAddress Variable debt token address
     * @return interestRateStrategyAddress Interest rate strategy address
     * @return id Reserve ID
     */
    function getReserveData(address asset)
        external
        view
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 variableBorrowIndex,
            uint128 currentLiquidityRate,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint8 id
        );

    /**
     * @notice Get the current liquidity rate for an asset
     * @param asset The address of the asset
     * @return The current liquidity rate in rays (1e27)
     */
    function getCurrentLiquidityRate(address asset) external view returns (uint256);
}
