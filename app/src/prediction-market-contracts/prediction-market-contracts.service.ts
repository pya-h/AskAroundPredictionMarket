import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PredictionOutcome } from '../prediction-market/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainWallet } from '../blockchain-wallet/entities/blockchain-wallet.entity';
import { ConditionTokenContractData } from './abis/ctf.abi';
import { CryptocurrencyToken } from '../blockchain-wallet/entities/cryptocurrency-token.entity';
import {
  Oracle,
  OracleTypesEnum,
} from '../prediction-market/entities/oracle.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import BigNumber from 'bignumber.js';
import { PredictionMarketTypesEnum } from './enums/market-types.enum';
import { LmsrMarketHelper } from './helpers/lmsr-market.helper';
import { BlockchainWalletService } from '../blockchain-wallet/blockchain-wallet.service';

@Injectable()
export class PredictionMarketContractsService {
  private provider: ethers.JsonRpcProvider;
  private operator: { wallet: BlockchainWallet; ethers: ethers.Wallet };
  private conditionalTokensContract: ethers.Contract;

  toKeccakHash(data: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  constructor(
    @InjectRepository(MarketMakerFactory)
    private readonly marketMakerFactoryRepository: Repository<MarketMakerFactory>,
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const localTestnet = await this.blockchainWalletService.getChain(1337);
    this.provider = new ethers.JsonRpcProvider(localTestnet.rpcUrl);
    const wallet = await this.blockchainWalletService.getOperatorWallet();
    this.operator = {
      wallet,
      ethers: new ethers.Wallet(wallet.privateKey, this.provider),
    };

    this.conditionalTokensContract = new ethers.Contract(
      ConditionTokenContractData.address,
      ConditionTokenContractData.abi,
      this.operator.ethers,
    );
  }

  async getCurrentChainId() {
    return Number((await this.provider.getNetwork()).chainId);
  }

  async getDefaultMarketMaker(chainId?: number) {
    return this.marketMakerFactoryRepository.findOne({
      where: {
        chainId: chainId || (await this.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
      },
    });
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
    collateralTokenSymbol: CryptoTokenEnum,
    question: string,
    outcomes: PredictionOutcome[],
    initialLiquidityInEth: number,
    oracle: Oracle,
    _shouldResolveAt: Date,
  ) {
    const currentChainId = await this.getCurrentChainId();

    const [factory, collateralToken] = await Promise.all([
      marketMakerFactoryIdentifier instanceof MarketMakerFactory
        ? marketMakerFactoryIdentifier
        : this.marketMakerFactoryRepository.findOneBy({
            id: marketMakerFactoryIdentifier,
            chainId: currentChainId,
          }),
      this.blockchainWalletService.getCryptocurrencyToken(
        collateralTokenSymbol,
        currentChainId,
      ),
    ]);
    if (!factory) {
      throw new NotFoundException("This kind of AMM doesn't exist!");
    }
    if (factory.maxSupportedOutcomes < outcomes.length)
      throw new BadRequestException(
        `This AMM doesn't support more than ${factory.maxSupportedOutcomes} outcomes.`,
      );

    if (!collateralToken?.abi?.length)
      throw new BadRequestException(
        'Unfortunately this cryptocurrency is not supported to be used as collateral token in this network.',
      );
    const marketMakerFactoryContract = new ethers.Contract(
        factory.address,
        factory.abi,
        this.operator.ethers,
      ),
      collateralTokenContract = new ethers.Contract(
        collateralToken.address,
        collateralToken.abi,
        this.operator.ethers,
      );
    const initialLiquidity = ethers.parseEther(
      initialLiquidityInEth.toString(),
    );
    const questionId = this.toKeccakHash(question);
    const prepareConditionTx =
      await this.conditionalTokensContract.prepareCondition(
        oracle.address,
        questionId,
        outcomes.length,
      );
    await prepareConditionTx.wait();
    console.log('Prepare condition finished, trx: ', prepareConditionTx);

    const conditionId = await this.conditionalTokensContract.getConditionId(
      oracle.address,
      questionId,
      outcomes.length,
    );
    console.warn('Condition id = ', conditionId);

    const collateralDepositTx = await collateralTokenContract.deposit({
      value: initialLiquidity,
      nonce: await this.operator.ethers.getNonce(),
    });
    await collateralDepositTx.wait();
    console.log(
      'Collateral token deposit completed, trx:',
      collateralDepositTx,
    );

    const approveTx = await collateralTokenContract.approve(
      factory.address,
      initialLiquidity,
    );
    await approveTx.wait();
    console.warn('Liquidity deposit completed and approved.');

    let lmsrFactoryTx = await marketMakerFactoryContract.createLMSRMarketMaker(
      ConditionTokenContractData.address,
      collateralToken.address,
      [conditionId],
      0,
      '0x0000000000000000000000000000000000000000',
      initialLiquidity,
      {
        from: this.operator.ethers.address,
        nonce: await this.operator.ethers.getNonce(),
      },
    );

    lmsrFactoryTx = await lmsrFactoryTx.wait();
    console.log('LMSR Market creation finished, trx: ', lmsrFactoryTx);

    const creationLog = await this.findEventByName(
      lmsrFactoryTx,
      marketMakerFactoryContract,
      factory.marketMakerCreationEvent,
    );

    if (!creationLog[0]?.args?.[factory.marketMakerAddressField]) {
      console.error(
        'Failed to find out the created market maker contract address data: creationLog:',
        creationLog,
        'trx: ',
        JSON.stringify(lmsrFactoryTx, null, 2),
      );
      throw new ConflictException(
        'Although the market creation seems ok, but server fails to find its contract!',
      );
    }

    console.log(
      'Found MarketMaker contract address data. Blockchain processes all finished.',
    );

    return {
      conditionId: conditionId as string,
      creatorId: this.operator.wallet.userId,
      question,
      questionId,
      marketMakerFactory: factory,
      marketMakerAddress: creationLog[0].args[factory.marketMakerAddressField],
      oracle,
      collateralToken,
      liquidity: initialLiquidityInEth,
      liquidityWei: initialLiquidity,
      prepareConditionTxHash: prepareConditionTx.hash as string,
      createMarketTxHash: lmsrFactoryTx.hash as string,
      chainId: currentChainId,
    };
  }

  async findEventByName(
    transactionReceipt: ethers.ContractTransactionReceipt,
    contract: ethers.Contract,
    eventName: string,
  ): Promise<ethers.LogDescription[]> {
    try {
      const eventFragment = contract.interface.getEvent(eventName);
      const eventTopics = contract.interface.encodeFilterTopics(
        eventFragment,
        [],
      );

      const logs = transactionReceipt.logs.filter(
        (log) => log.topics[0] === eventTopics[0], // Compare the event signature topic
      );

      return logs.map((log) => contract.interface.parseLog(log));
    } catch (error) {
      console.error('Error finding event by name:', error);
      throw error;
    }
  }

  getCollectionId(
    conditionId: string,
    possibleOutcomeIndices: number | number[],
    parentCollectionId: string | null = null,
  ) {
    return this.conditionalTokensContract.getCollectionId(
      parentCollectionId || this.blockchainWalletService.zeroAddress,
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
      parentCollectionId || this.blockchainWalletService.zeroAddress,
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
  ) {
    const traderWallet = await this.blockchainWalletService.getWallet(traderId);
    const tradersEthersWallet = new ethers.Wallet(
      traderWallet.privateKey,
      this.provider,
    );
    const marketMakerContract = new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      tradersEthersWallet,
    );
    const collateralTokenContract = new ethers.Contract(
      market.collateralToken.address,
      market.collateralToken.abi,
      tradersEthersWallet,
    );
    console.log(
      'weth9 decimals: ',
      await this.blockchainWalletService.getCryptoTokenDecimals(
        market.collateralToken,
      ),
    );

    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const formattedAmount = await this.blockchainWalletService.etherToWei(
          Math.abs(amount),
          market.collateralToken,
        );
        return amount > 0
          ? LmsrMarketHelper.get(this.provider).buyOutcomeToken(
              traderWallet.address,
              market,
              BigInt(formattedAmount.toString()),
              selectedOutcomeIndex,
              marketMakerContract,
              collateralTokenContract,
            )
          : LmsrMarketHelper.get(this.provider).sellOutcomeToken(
              traderWallet.address,
              tradersEthersWallet,
              market,
              BigInt(formattedAmount.toString()),
              selectedOutcomeIndex,
              marketMakerContract,
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

    console.log('balance (wei):', balanceWei);
    return this.blockchainWalletService.weiToEthers(
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

  async getMarketOutcomePrice(market: PredictionMarket, index: number) {
    const marketMakerContract = new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      this.operator.ethers,
    );
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const unitInWei = await this.blockchainWalletService.etherToWei(
          1,
          market.collateralToken,
        );
        return this.blockchainWalletService.weiToEthers(
          await LmsrMarketHelper.get(this.provider).calculateOutcomeTokenPrice(
            market,
            index,
            BigInt(unitInWei.toString()),
            marketMakerContract,
          ),
          market.collateralToken,
        );
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
  }

  async getMarketAllOutcomePrices(market: PredictionMarket) {
    const marketMakerContract = new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      this.operator.ethers,
    );
    const unitInWei = BigInt(
      (
        await this.blockchainWalletService.etherToWei(1, market.collateralToken)
      ).toString(),
    );

    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const mmHelper = LmsrMarketHelper.get(this.provider);
        const prices = await Promise.all(
          (
            await Promise.all(
              market.outcomeTokens.map((outcome) =>
                mmHelper.calculateOutcomeTokenPrice(
                  market,
                  outcome.tokenIndex,
                  unitInWei,
                  marketMakerContract,
                ),
              ),
            )
          ).map((priceInWei) =>
            this.blockchainWalletService.weiToEthers(
              priceInWei,
              market.collateralToken,
            ),
          ),
        );

        return prices.map((price, i) => ({
          outcome: market.outcomeTokens[i].predictionOutcome.title,
          index: market.outcomeTokens[i].tokenIndex,
          price,
          token: market.outcomeTokens[i],
        }));
      case PredictionMarketTypesEnum.FPMM.toString():
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
    }
  }

  async closeMarket(market: PredictionMarket) {
    const marketMakerContract = new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      this.operator.ethers,
    );
    return (await marketMakerContract.close()).wait();
  }

  async getOutcomeTokenMarginalPrices(
    market: PredictionMarket,
    outcomeIndex: number,
  ) {
    let weiPrice: bigint = 0n;
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        weiPrice = await LmsrMarketHelper.get(
          this.provider,
        ).getOutcomeTokenMarginalPrices(market, outcomeIndex);
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
        (await this.blockchainWalletService.getCryptoTokenDecimals(
          market.collateralToken,
        )),
    );
  }

  async resolveMarket(market: PredictionMarket, payoutVector: number[]) {
    switch (market.oracle.type) {
      case OracleTypesEnum.CENTRALIZED.toString():
        const oracleWallet = new ethers.Wallet(
          market.oracle.account.privateKey,
          this.provider,
        );
        const conditionalTokenContract = new ethers.Contract(
          ConditionTokenContractData.address,
          ConditionTokenContractData.abi,
          oracleWallet,
        );
        const tx = await conditionalTokenContract.reportPayouts(
          market.questionId,
          payoutVector,
        );
        await tx.wait();
        return tx;

      case OracleTypesEnum.DECENTRALIZED.toString():
        throw new NotImplementedException(
          'Decentralized oracle is not implemented yet.',
        );
    }
  }

  async redeemMarketRewards(userId: number, market: PredictionMarket) {
    try {
      const indexSets = market.outcomeTokens.map((outcomeToken) =>
        this.outcomeIndexToIndexSet(outcomeToken.tokenIndex),
      );
      const userWallet = await this.blockchainWalletService.getWallet(userId);
      if (!userWallet?.secret)
        throw new ForbiddenException('Missing user blockchain wallet data!');
      const etherWallet = new ethers.Wallet(
        userWallet.privateKey,
        this.provider,
      );
      const ctContract = new ethers.Contract(
        ConditionTokenContractData.address,
        ConditionTokenContractData.abi,
        etherWallet,
      );
      const tx = await ctContract.redeemPositions(
        market.collateralToken.address,
        this.blockchainWalletService.zeroAddress,
        market.conditionId,
        indexSets,
      );

      await tx.wait();
      // TODO: search for PayoutRedemption event:
      //    also Get total amount redeemed for user; return/throw proper message if the amount is zero
      return {
        redeemTx: tx,
      };
    } catch (ex) {
      console.error(ex);
    }
  }
}
