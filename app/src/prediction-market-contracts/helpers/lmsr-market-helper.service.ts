import { ethers } from 'ethers';
import { ConditionTokenContractData } from '../abis/ctf.abi';
import { PredictionMarket } from '../../prediction-market/entities/market.entity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BlockchainHelperService } from '../../blockchain-core/blockchain-helper.service';
import { EthereumAccount } from '../../blockchain-core/types/ethereum-account.class';
import { MarketEconomicConstants } from '../../core/constants/constants';
import BigNumber from 'bignumber.js';

@Injectable()
export class LmsrMarketHelperService {
  constructor(
    private readonly blockchainHelperService: BlockchainHelperService,
  ) {}

  async calculateOutcomeTokenPrice(
    market: PredictionMarket,
    outcomeIndex: number,
    amountInWei: bigint | string,
  ) {
    return this.blockchainHelperService.call<bigint>(
      this.blockchainHelperService.getAmmContractHandler(market),
      { name: 'calcNetCost', isView: true },
      Array.from(
        { length: market.numberOfOutcomes },
        (_: unknown, index: number) =>
          index === outcomeIndex ? amountInWei : 0n,
      ),
    );
  }

  async calculateTradeFee(
    market: PredictionMarket,
    {
      tradeCostWei = null,
      amountInWei = null,
      outcomeIndex = null,
    }: {
      tradeCostWei?: bigint | string;
      outcomeIndex?: number;
      amountInWei?: bigint | string;
    } = {},
  ): Promise<{ cost: bigint | string; fee: bigint | string }> {
    if (tradeCostWei == null) {
      if (amountInWei == null || outcomeIndex == null) {
        throw new BadRequestException(
          'Can not calculate trade fee due to insufficient information!',
        );
      }
      tradeCostWei = await this.calculateOutcomeTokenPrice(
        market,
        outcomeIndex,
        amountInWei,
      );
    }
    return {
      cost: tradeCostWei,
      fee: await this.blockchainHelperService.call<bigint>(
        this.blockchainHelperService.getAmmContractHandler(market),
        { name: 'calcMarketFee', isView: true },
        tradeCostWei,
      ),
    };
  }

  async calculateTradesAfterFeeCost(
    market: PredictionMarket | ethers.Contract,
    outcomeAmountsInWei: bigint[],
  ) {
    const marketMakerContract =
      market instanceof ethers.Contract
        ? market
        : this.blockchainHelperService.getAmmContractHandler(market);
    const cost = await this.blockchainHelperService.call<bigint>(
        marketMakerContract,
        { name: 'calcNetCost', isView: true },
        outcomeAmountsInWei,
      ),
      fee = await this.blockchainHelperService.call<bigint>(
        marketMakerContract,
        { name: 'calcMarketFee', isView: true },
        cost >= 0 ? cost : -cost,
      );
    return cost + fee;
  }

  async calculatePriceOfBatchOutcomes(
    market: PredictionMarket,
    amountsRespectively: bigint[],
  ) {
    return this.blockchainHelperService.call<bigint>(
      this.blockchainHelperService.getAmmContractHandler(market),
      { name: 'calcNetCost', isView: true },
      amountsRespectively,
    );
  }

  async buyOutcomeToken(
    buyer: EthereumAccount,
    market: PredictionMarket,
    amountInWei: bigint,
    selectedOutcomeIndex: number,
    marketMakerContract: ethers.Contract,
    collateralTokenContract: ethers.Contract,
    manualCollateralLimit: number | bigint = null,
  ) {
    const outcomeTokenAmounts = Array.from(
      { length: market.numberOfOutcomes },
      (_: unknown, index: number) =>
        index === selectedOutcomeIndex ? amountInWei : 0n,
    );

    const [cost, collateralBalance] = await Promise.all([
      this.calculateTradesAfterFeeCost(
        marketMakerContract,
        outcomeTokenAmounts,
      ),
      this.blockchainHelperService.call<bigint | number>(
        collateralTokenContract,
        { name: 'balanceOf', isView: true },
        buyer.address,
      ),
    ]);

    const costForSure =
      cost +
      (MarketEconomicConstants.TRADE_SLIPPAGE
        ? BigInt(
            new BigNumber(cost.toString())
              .multipliedBy(MarketEconomicConstants.TRADE_SLIPPAGE)
              .toFixed(0),
          )
        : 0n);

    if (costForSure > collateralBalance) {
      const [costShorted, collateralBalanceShorted] = await Promise.all([
        this.blockchainHelperService.toEthers(
          costForSure,
          market.collateralToken,
        ),
        this.blockchainHelperService.toEthers(
          collateralBalance,
          market.collateralToken,
        ),
      ]);
      throw new ForbiddenException(
        `Insufficient funds! You purchase may cost ${costShorted.toFixed(
          3,
        )} tokens. You need ${costShorted
          .minus(collateralBalanceShorted)
          .toFixed(3)} tokens more which exceeds you current balance!`,
      );
    }
    await this.blockchainHelperService.call(
      collateralTokenContract,
      { name: 'approve', runner: buyer },
      market.address,
      costForSure.toString(),
    );
    // TODO: Maybe separately add cost and fee to response?
    return this.blockchainHelperService.call(
      marketMakerContract,
      { name: 'trade', runner: buyer },
      outcomeTokenAmounts,
      manualCollateralLimit == null || costForSure < manualCollateralLimit
        ? costForSure
        : manualCollateralLimit,
    );
  }

  async sellOutcomeToken(
    seller: EthereumAccount,
    market: PredictionMarket,
    formattedAmount: bigint,
    selectedOutcomeIndex: number,
    marketMakerContract: ethers.Contract,
    manualCollateralLimit: number | bigint = null,
  ) {
    const conditionalTokensContract = new ethers.Contract(
      ConditionTokenContractData.address,
      ConditionTokenContractData.abi,
      seller.ethers,
    );

    const isApproved = await this.blockchainHelperService.call<boolean>(
      conditionalTokensContract,
      { name: 'isApprovedForAll', isView: true, runner: seller },
      seller.address,
      market.address,
    );

    if (!isApproved) {
      await this.blockchainHelperService.call(
        conditionalTokensContract,
        {
          name: 'setApprovalForAll',
          runner: seller,
          dontWait: true,
        },
        market.address,
        true,
      );
    }

    const outcomeTokenAmounts = Array.from(
      { length: market.numberOfOutcomes },
      (_: unknown, index: number) =>
        index === selectedOutcomeIndex ? -formattedAmount : 0n,
    );

    const profit = -(
      manualCollateralLimit ||
      (await this.calculateTradesAfterFeeCost(
        marketMakerContract,
        outcomeTokenAmounts,
      ))
    );

    return this.blockchainHelperService.call<ethers.TransactionReceipt>(
      marketMakerContract,
      { name: 'trade', runner: seller },
      outcomeTokenAmounts,
      profit,
    );
  }

  async getOutcomeTokenMarginalPrices(
    market: PredictionMarket,
    outcomeIndex: number,
  ) {
    return this.blockchainHelperService.call<bigint | number>(
      this.blockchainHelperService.getAmmContractHandler(market),
      { name: 'calcMarginalPrice', isView: true },
      outcomeIndex,
      { from: market.address },
    );
  }
}
