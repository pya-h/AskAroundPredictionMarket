import { ethers } from 'ethers';
import { ConditionTokenContractData } from '../abis/ctf.abi';
import { PredictionMarket } from '../../prediction-market/entities/market.entity';

export class LmsrMarketHelper {
  private static instance: LmsrMarketHelper;

  private constructor(private readonly provider: ethers.JsonRpcProvider) {
    if (LmsrMarketHelper.instance) return LmsrMarketHelper.instance;
  }

  static get(provider: ethers.JsonRpcProvider) {
    if (!LmsrMarketHelper.instance) return new LmsrMarketHelper(provider);
    return LmsrMarketHelper.instance;
  }

  async buyOutcomeToken(
    buyerAddress: string,
    market: PredictionMarket,
    formattedAmount: bigint,
    selectedOutcomeIndex: number,
    marketMakerContract: ethers.Contract,
    collateralTokenContract: ethers.Contract,
  ) {
    const outcomeTokenAmounts = Array.from(
      { length: market.numberOfOutcomes },
      (_: unknown, index: number) =>
        index === selectedOutcomeIndex ? formattedAmount : 0n,
    );

    const [cost, collateralBalance] = (
      await Promise.all([
        marketMakerContract.calcNetCost(outcomeTokenAmounts),
        collateralTokenContract.balanceOf(buyerAddress),
      ])
    ).map((x) => BigInt(x));

    console.log(
      'Buy cost is: ',
      cost,
      'User collateral Balance: ',
      collateralBalance,
    );

    if (cost > collateralBalance) {
      // If user does not have enough collateral, deposit ETH from their wallet to gain collateral.
      const collateralDepositTx = await collateralTokenContract.deposit({
        value: (cost - collateralBalance).toString(),
      });
      await collateralDepositTx.wait();

      const approveTx = await collateralTokenContract.approve(
        market.address,
        formattedAmount.toString(),
      );
      await approveTx.wait();
      console.warn(
        'New user balance after supporting deposit: ',
        await collateralTokenContract.balanceOf(buyerAddress),
      );
    }
    // TODO: Handle this special situations properly and precisely:
    // 1- Market does not have enough tokens to provide and sell to the user.
    // 2- User Does not have enough Collateral(e.g. WETH9) to buy such amount of token.

    return marketMakerContract.trade(outcomeTokenAmounts, cost);
  }

  async sellOutcomeToken(
    sellerAddress: string,
    sellerEthersWallet: ethers.Wallet,
    market: PredictionMarket,
    formattedAmount: bigint,
    selectedOutcomeIndex: number,
    marketMakerContract: ethers.Contract,
  ) {
    const conditionalTokensContract = new ethers.Contract(
      ConditionTokenContractData.address,
      ConditionTokenContractData.abi,
      sellerEthersWallet,
    );
    // TODO: Checkout if user has such amount of selected tokens to sell ot noy
    const isApproved = await conditionalTokensContract.isApprovedForAll(
      sellerAddress,
      market.address,
    );
    if (!isApproved) {
      await conditionalTokensContract.setApprovalForAll(market.address, true, {
        nonce: await sellerEthersWallet.getNonce(),
      });
    }

    const outcomeTokenAmounts = Array.from(
      { length: market.numberOfOutcomes },
      (_: unknown, index: number) =>
        index === selectedOutcomeIndex ? -formattedAmount : 0n,
    );
    const profit =
      -(await marketMakerContract.calcNetCost(outcomeTokenAmounts));

    return marketMakerContract.trade(outcomeTokenAmounts, profit);
  }

  async getOutcomeTokenMarginalPrices(
    market: PredictionMarket,
    outcomeIndex: number,
  ) {
    const marketMakerContract = new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      this.provider,
    );
    return marketMakerContract.calcMarginalPrice(outcomeIndex, {
      from: market.address,
    });
  }
}
