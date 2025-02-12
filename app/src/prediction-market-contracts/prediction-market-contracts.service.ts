import {
  BadRequestException,
  ConflictException,
  Injectable,
  LoggerService,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ethers, TransactionReceipt } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConditionTokenContractData } from './abis/ctf.abi';
import { CryptocurrencyToken } from '../blockchain-core/entities/cryptocurrency-token.entity';
import {
  Oracle,
  OracleTypesEnum,
} from '../prediction-market/entities/oracle.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { CryptoTokenEnum } from '../blockchain-core/enums/crypto-token.enum';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import BigNumber from 'bignumber.js';
import { PredictionMarketTypesEnum } from './enums/market-types.enum';
import { LmsrMarketHelperService } from './helpers/lmsr-market-helper.service';
import { BlockchainWalletService } from '../blockchain-core/blockchain-wallet.service';
import { BlockchainHelperService } from '../blockchain-core/blockchain-helper.service';
import { BaseConditionalToken } from '../prediction-market/entities/bases/base-conditional-token.entity';

@Injectable()
export class PredictionMarketContractsService {
  toKeccakHash(data: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  constructor(
    @InjectRepository(MarketMakerFactory)
    private readonly marketMakerFactoryRepository: Repository<MarketMakerFactory>,
    private readonly blockchainWalletService: BlockchainWalletService,
    private readonly blockchainHelperService: BlockchainHelperService,
    private readonly lmsrMarketHelperService: LmsrMarketHelperService,
    private readonly loggerService: LoggerService,
  ) {}

  get conditionalTokensContract(): ethers.Contract {
    return this.blockchainHelperService.getContractHandler(
      ConditionTokenContractData,
    );
  }

  getMarketMakerFactoryById(id: number) {
    return this.marketMakerFactoryRepository.findOneBy({ id });
  }

  async getDefaultMarketMakerFactory(chainId?: number) {
    return this.marketMakerFactoryRepository.findOne({
      where: {
        chainId:
          chainId || (await this.blockchainHelperService.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async getMarketMakerFactoryByType(
    type: PredictionMarketTypesEnum,
    {
      chainId = null,
      shouldThrow = false,
    }: { chainId?: number; shouldThrow?: boolean } = {},
  ) {
    const factory = await this.marketMakerFactoryRepository.findOne({
      where: {
        type,
        chainId:
          chainId || (await this.blockchainHelperService.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
      },
    });
    if (!factory && shouldThrow) {
      throw new NotImplementedException(
        `OmenArena doesn't support ${type} market on this chain yet!`,
      );
    }
    return factory;
  }

  outcomeIndexToIndexSet(outcomeIndices: number | number[]) {
    if (!(outcomeIndices instanceof Array)) {
      return parseInt((10 ** +outcomeIndices).toString(), 2);
    }
    let value = 0;
    for (const index of outcomeIndices) {
      value += parseInt((10 ** index).toString(), 2);
    }
    return value;
  }

  getNumberOfOutcomeCollections(outcomesCount: number) {
    return 2 ** outcomesCount;
  }

  async createMarket(
    marketMakerFactoryIdentifier: number | MarketMakerFactory,
    collateralTokenOrSymbol: CryptocurrencyToken | CryptoTokenEnum,
    question: string,
    outcomes: BaseConditionalToken[],
    initialLiquidityInEth: number,
    oracle: Oracle,
  ) {
    const currentChainId =
      await this.blockchainHelperService.getCurrentChainId();

    const [factory, collateralToken] = await Promise.all([
      marketMakerFactoryIdentifier instanceof MarketMakerFactory
        ? marketMakerFactoryIdentifier
        : this.marketMakerFactoryRepository.findOneBy({
            id: marketMakerFactoryIdentifier,
            chainId: currentChainId,
          }),
      collateralTokenOrSymbol instanceof CryptocurrencyToken
        ? collateralTokenOrSymbol
        : this.blockchainHelperService.getCryptocurrencyToken(
            collateralTokenOrSymbol,
            currentChainId,
          ),
    ]);
    if (!factory) {
      throw new NotFoundException("This kind of AMM doesn't exist!");
    }
    if (
      factory.maxSupportedOutcomes &&
      factory.maxSupportedOutcomes < outcomes.length
    )
      throw new BadRequestException(
        `This AMM doesn't support more than ${factory.maxSupportedOutcomes} outcomes.`,
      );

    if (!collateralToken?.abi?.length)
      throw new BadRequestException(
        'Unfortunately this cryptocurrency is not supported to be used as collateral token in this network.',
      );
    const marketMakerFactoryContract =
        this.blockchainHelperService.getContractHandler(factory),
      collateralTokenContract =
        this.blockchainHelperService.getContractHandler(collateralToken);
    const initialLiquidity = ethers.parseEther(
      initialLiquidityInEth.toString(),
    );

    const questionId = this.toKeccakHash(question);
    this.loggerService.debug(
      `#DeployMarket: ${question} - questionId = ${questionId} - START`,
    );

    const prepareConditionTx =
      await this.blockchainHelperService.call<ethers.TransactionReceipt>(
        this.conditionalTokensContract,
        { name: 'prepareCondition' },
        oracle.address,
        questionId,
        outcomes.length,
      );

    const conditionId = await this.blockchainHelperService.call<string>(
      this.conditionalTokensContract,
      { name: 'getConditionId', isView: true },
      oracle.address,
      questionId,
      outcomes.length,
    );

    this.loggerService.debug(
      `#DeployMarket: Preparing Condition - SUCCESS => conditionId: ${conditionId}`,
    );

    const operatorCollateralBalance =
      await this.blockchainHelperService.call<bigint>(
        collateralTokenContract,
        { name: 'balanceOf', isView: true },
        this.blockchainHelperService.operatorAccount.address,
      );

    this.loggerService.debug(
      `#DeployMarket: Get Operator Collateral Balance - SUCCESS => ${operatorCollateralBalance}`,
    );

    if (operatorCollateralBalance < initialLiquidity) {
      await this.blockchainHelperService.call(
        collateralTokenContract,
        { name: 'deposit' },
        {
          value: initialLiquidity - operatorCollateralBalance,
        },
      );

      this.loggerService.debug(
        `#DeployMarket: Deposit ${initialLiquidityInEth} Collateral for Liquidity - SUCCESS`,
      );
    }

    await this.blockchainHelperService.call(
      collateralTokenContract,
      { name: 'approve' },
      factory.address,
      initialLiquidity,
    );

    this.loggerService.debug(
      '#DeployMarket: Collateral Use Approval for AMM Factory - SUCCESS',
    );

    const lmsrFactoryTx =
      await this.blockchainHelperService.call<ethers.ContractTransactionReceipt>(
        marketMakerFactoryContract,
        { name: 'createLMSRMarketMaker' },
        ConditionTokenContractData.address, // pmSystem
        collateralToken.address,
        [conditionId],
        0, // market fee
        '0x0000000000000000000000000000000000000000', // whitelist
        initialLiquidity,
      );

    this.loggerService.debug(
      `#DeployMarket: LMSR MARKET CREATION - SUCCESS => txHash: ${lmsrFactoryTx.hash}`,
    );

    const startedAt = new Date();

    const creationLog =
      await this.blockchainHelperService.getEventLogFromReceipt(
        lmsrFactoryTx,
        marketMakerFactoryContract,
        factory.marketMakerCreationEvent,
      );

    if (!creationLog[0]?.args?.[factory.marketMakerAddressField]) {
      this.loggerService.error(
        'Failed to find out the created market maker contract address data: creationLog:',
        null,
        { data: { tx: JSON.stringify(lmsrFactoryTx, null, 2) } },
      );
      throw new ConflictException(
        'Although the market creation seems ok, but server fails to find its contract!',
      );
    }

    this.loggerService.debug(
      `#DeployMarket: Find Market Address from Market Creation Log - SUCCESS => MarketAddress: ${
        creationLog[0].args[factory.marketMakerAddressField]
      }\n#DeployMarket: Market Successfully Deployed To Blockchain.`,
    );

    return {
      conditionId: conditionId,
      question,
      questionId,
      marketMakerFactory: factory,
      marketMakerAddress: creationLog[0].args[factory.marketMakerAddressField],
      oracle,
      collateralToken,
      liquidity: initialLiquidityInEth,
      liquidityWei: initialLiquidity,
      prepareConditionTxHash: prepareConditionTx.hash,
      createMarketTxHash: lmsrFactoryTx.hash,
      chainId: currentChainId,
      startedAt,
    };
  }

  getCollectionId(
    conditionId: string,
    possibleOutcomeIndices: number | number[],
    parentCollectionId: string | null = null,
  ) {
    return this.conditionalTokensContract.getCollectionId(
      parentCollectionId || this.blockchainHelperService.zeroAddress,
      conditionId,
      this.outcomeIndexToIndexSet(possibleOutcomeIndices),
    );
  }

  getCollectionIdByIndexSetValue(
    conditionId: string,
    indexSetValue: number,
    parentCollectionId: string | null = null,
  ) {
    return this.conditionalTokensContract.getCollectionId(
      parentCollectionId || this.blockchainHelperService.zeroAddress,
      conditionId,
      indexSetValue,
    );
  }

  getOutcomeSlotsCount(conditionId: string) {
    return this.conditionalTokensContract.getOutcomeSlotCount(conditionId);
  }

  async getPositionId(
    collateralToken: CryptocurrencyToken,
    collectionId: string,
  ) {
    return this.conditionalTokensContract.getPositionId(
      collateralToken.address,
      collectionId,
    );
  }

  async validateMarketCreation(
    conditionId: string,
    marketOutcomesCount: number = 2,
  ) {
    return (
      Number(await this.getOutcomeSlotsCount(conditionId)) ===
      marketOutcomesCount
    ); // As gnosis docs says, this is the proper way to validate the market creation operation, after calling prepareCondition.
  }

  async trade(
    traderId: number,
    market: PredictionMarket,
    selectedOutcomeIndex: number,
    amount: number,
    manualCollateralLimit: number = null,
  ) {
    const trader = this.blockchainHelperService.getEthereumAccount(
      await this.blockchainWalletService.getWallet(traderId),
    );
    const marketMakerContract =
      this.blockchainHelperService.getAmmContractHandler(market, trader.ethers);
    const collateralTokenContract =
      this.blockchainHelperService.getContractHandler(
        market.collateralToken,
        trader.ethers,
      );

    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const [formattedAmount, formattedCollateralLimit] = await Promise.all([
          this.blockchainHelperService.toWei(
            Math.abs(amount),
            market.collateralToken,
          ),
          manualCollateralLimit
            ? this.blockchainHelperService.toWei(
                manualCollateralLimit,
                market.collateralToken,
              )
            : null,
        ]);

        return amount > 0
          ? this.lmsrMarketHelperService.buyOutcomeToken(
              trader,
              market,
              BigInt(formattedAmount.toFixed()), // using BigNumber.toFixed() to prevent it from converting too large/small numbers to their scientific notion string
              //  which causes BigInt() throw conversion error.
              selectedOutcomeIndex,
              marketMakerContract,
              collateralTokenContract,
              formattedCollateralLimit
                ? BigInt(formattedCollateralLimit.toFixed())
                : null,
            )
          : this.lmsrMarketHelperService.sellOutcomeToken(
              trader,
              market,
              BigInt(formattedAmount.toFixed()),
              selectedOutcomeIndex,
              marketMakerContract,
              formattedCollateralLimit
                ? BigInt(formattedCollateralLimit.toFixed())
                : null,
            );
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
    throw new ConflictException(
      'Invalid market type! Can not perform the trade.',
    );
  }

  async getConditionalTokenBalance(
    market: PredictionMarket,
    outcomeIndex: number,
    target: string,
  ) {
    const collectionId = await this.getCollectionId(
      market.conditionId,
      outcomeIndex,
    );
    if (!collectionId) throw new NotFoundException('Invalid outcome!');
    const positionId = await this.getPositionId(
      market.collateralToken,
      collectionId,
    );

    if (!positionId)
      throw new ConflictException(
        'Something went wrong while calculating balance',
      );
    const balanceWei = await this.conditionalTokensContract.balanceOf(
      target,
      positionId,
    );

    return this.blockchainHelperService.toEthers(
      balanceWei,
      market.collateralToken,
    );
  }

  async getUserConditionalTokenBalance(
    userId: number,
    market: PredictionMarket,
    indexSet: number,
  ) {
    const userBlockchainWallet =
      await this.blockchainWalletService.getWallet(userId);
    return this.getConditionalTokenBalance(
      market,
      indexSet,
      userBlockchainWallet.address,
    );
  }

  getMarketConditionalTokenBalance(market: PredictionMarket, indexSet: number) {
    return this.getConditionalTokenBalance(market, indexSet, market.address);
  }

  async getMarketOutcomePrice(
    market: PredictionMarket,
    index: number,
    amount: number = 1,
  ) {
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const unitInWei = await this.blockchainHelperService.toWei(
          amount,
          market.collateralToken,
        );

        return this.blockchainHelperService.toEthers(
          await this.lmsrMarketHelperService.calculateOutcomeTokenPrice(
            market,
            index,
            BigInt(unitInWei.toFixed()),
          ),
          market.collateralToken,
        );
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
  }

  async getBatchOutcomePrices(market: PredictionMarket, amounts: number[]) {
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const amountsInWei = await Promise.all(
          amounts.map((amount) =>
            this.blockchainHelperService.toWei(amount, market.collateralToken),
          ),
        );

        return this.blockchainHelperService.toEthers(
          await this.lmsrMarketHelperService.calculatePriceOfBatchOutcomes(
            market,
            amountsInWei.map((x) => BigInt(x.toFixed())),
          ),
          market.collateralToken,
        );
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
  }

  async getMarketAllOutcomePrices(
    market: PredictionMarket,
    amount: number = 1,
  ) {
    const amountInWei = BigInt(
      (
        await this.blockchainHelperService.toWei(
          amount || 1,
          market.collateralToken,
        )
      ).toFixed(),
    );

    if (!market.isOpen) {
      return market.outcomeTokens?.map((outcome) => ({
        id: outcome.id,
        outcome: outcome.predictionOutcome.title,
        index: outcome.tokenIndex,
        price: outcome.truenessRatio,
        token: outcome,
      }));
    }

    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const prices = await Promise.all(
          (
            await Promise.all(
              market.outcomeTokens.map((outcome) =>
                this.lmsrMarketHelperService.calculateOutcomeTokenPrice(
                  market,
                  outcome.tokenIndex,
                  amountInWei,
                ),
              ),
            )
          ).map((priceInWei) =>
            this.blockchainHelperService.toEthers(
              priceInWei,
              market.collateralToken,
            ),
          ),
        );

        return prices.map((price, i) => ({
          id: market.outcomeTokens[i].id,
          outcome: market.outcomeTokens[i].predictionOutcome.title,
          index: market.outcomeTokens[i].tokenIndex,
          price: price.toNumber(),
          token: market.outcomeTokens[i],
        }));
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
  }

  async closeMarket(market: PredictionMarket) {
    const marketMakerContract =
      this.blockchainHelperService.getAmmContractHandler(market);

    return this.blockchainHelperService.call<ethers.TransactionReceipt>(
      marketMakerContract,
      { name: 'close' },
    );
  }

  async getOutcomeTokenMarginalPrices(
    market: PredictionMarket,
    outcomeIndex: number,
  ) {
    let weiPrice: bigint | number = 0n;
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        weiPrice =
          await this.lmsrMarketHelperService.getOutcomeTokenMarginalPrices(
            market,
            outcomeIndex,
          );
        break;
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
      default:
        throw new ConflictException('Invalid market type!');
    }
    return new BigNumber(weiPrice.toString()).div(
      10 **
        (await this.blockchainHelperService.getCryptoTokenDecimals(
          market.collateralToken,
        )),
    );
  }

  async resolveMarket(
    market: PredictionMarket,
    payoutVector: number[],
  ): Promise<TransactionReceipt> {
    switch (market.oracle.type) {
      case OracleTypesEnum.CENTRALIZED.toString():
        const oracleEthereumAccount =
          this.blockchainHelperService.getEthereumAccount(
            market.oracle.account,
            market.chain,
          );
        const conditionalTokenContract =
          this.blockchainHelperService.getContractHandler(
            ConditionTokenContractData,
            oracleEthereumAccount.ethers,
          );
        return this.blockchainHelperService.call<ethers.TransactionReceipt>(
          conditionalTokenContract,
          { name: 'reportPayouts', runner: oracleEthereumAccount },
          market.questionId,
          payoutVector,
        );

      case OracleTypesEnum.DECENTRALIZED.toString():
        throw new NotImplementedException(
          'Decentralized oracle is not implemented yet.',
        );
    }
  }

  async redeemMarketRewards(userId: number, market: PredictionMarket) {
    const indexSets = market.outcomeTokens.map((outcomeToken) =>
      this.outcomeIndexToIndexSet(outcomeToken.tokenIndex),
    );
    const redeemer =
      await this.blockchainWalletService.getEthereumAccount(userId);
    const redeemReceipt =
      await this.blockchainHelperService.call<ethers.TransactionReceipt>(
        ConditionTokenContractData,
        { name: 'redeemPositions', runner: redeemer },
        market.collateralToken.address,
        this.blockchainHelperService.zeroAddress,
        market.conditionId,
        indexSets,
      );

    // TODO: search for PayoutRedemption event:
    //    also Get total amount redeemed for user; return/throw proper message if the amount is zero
    return {
      receipt: redeemReceipt,
    };
  }

  getMarketTradeFee(market: PredictionMarket) {
    const marketMakerContract =
      this.blockchainHelperService.getAmmContractHandler(market);
    return this.blockchainHelperService.call(marketMakerContract, {
      name: 'fee',
      isView: true,
    });
  }

  async getMarketFunding(market: PredictionMarket) {
    const marketMakerContract =
      this.blockchainHelperService.getAmmContractHandler(market);
    const fundingInWei = await this.blockchainHelperService.call<bigint>(
      marketMakerContract,
      {
        name: 'funding',
        isView: true,
      },
    );
    return (
      await this.blockchainHelperService.toEthers(
        fundingInWei,
        market.collateralToken,
      )
    ).toNumber();
  }
}
