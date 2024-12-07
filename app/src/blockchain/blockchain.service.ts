import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PredictionOutcome } from '../prediction-market/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';
import { BlockchainWallet } from '../blockchain-wallet/entities/blockchain-wallet.entity';
import { ConditionTokenContractData } from './abis/ctf.abi';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { Oracle } from '../prediction-market/entities/oracle.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import BigNumber from 'bignumber.js';
import { PredictionMarketTypesEnum } from './enums/market-types.enum';
import { LmsrMarketHelper } from './helpers/lmsr-market.helper';
import { BlockchainWalletService } from '../blockchain-wallet/blockchain-wallet.service';

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private operator: { wallet: BlockchainWallet; ethers: ethers.Wallet };
  private conditionalTokensContract: ethers.Contract;

  toKeccakHash(data: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
  }

  findChains() {
    return this.chainRepository.find();
  }

  updateChainData(chainId: number, data: Partial<Chain>) {
    return this.chainRepository.update({ id: chainId }, { ...data });
  }

  async syncCryptoTokenDecimalValue(token: CryptocurrencyToken) {
    const contract = new ethers.Contract(
      token.address,
      token.abi,
      this.operator.ethers,
    );
    token.decimals = Number(await contract.decimals());
    return this.cryptocurrencyTokenRepository.save(token);
  }

  async getCryptoTokenDecimals(token: CryptocurrencyToken) {
    if (!token.decimals) await this.syncCryptoTokenDecimalValue(token);
    return token.decimals;
  }

  constructor(
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
    @InjectRepository(MarketMakerFactory)
    private readonly marketMakerFactoryRepository: Repository<MarketMakerFactory>,
    @InjectRepository(CryptocurrencyToken)
    private readonly cryptocurrencyTokenRepository: Repository<CryptocurrencyToken>,
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const localTestnet = await this.getChain(1337); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(localTestnet.rpcUrl);
    const wallet = await this.blockchainWalletService.getOperatorWallet();
    this.operator = {
      wallet,
      ethers: new ethers.Wallet(wallet.getPrivateKey(), this.provider),
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
      this.cryptocurrencyTokenRepository.findOneBy({
        chainId: currentChainId, // TODO: Check this works fine?
        symbol: collateralTokenSymbol.toString(),
      }),
    ]);
    if (!factory) {
      throw new NotFoundException("This kind of AMM doesn't exist!");
    }
    if (factory.maxSupportedOutcomes < outcomes.length)
      throw new BadRequestException(
        `This AMM doesn't support more than ${factory.maxSupportedOutcomes} outcomes.`,
      );

    if (!collateralToken?.abi?.length)
      // TODO: check this works fine, too
      throw new BadRequestException(
        'Unfortunately this cryptocurrency is not supported to be used as collateral token in this network.',
      );
    const marketMakerFactoryContract = new ethers.Contract(
        factory.address,
        factory.factoryABI,
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
    const questionHash = this.toKeccakHash(question);
    const prepareConditionTx =
      await this.conditionalTokensContract.prepareCondition(
        oracle.address,
        questionHash,
        outcomes.length,
      );
    await prepareConditionTx.wait();
    console.log('Prepare condition finished, trx: ', prepareConditionTx);

    const conditionId = await this.conditionalTokensContract.getConditionId(
      oracle.address,
      questionHash,
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
      [conditionId], // TODO: Maybe write another method to create multiple markets at the same time?
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
      questionHash,
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
      traderWallet.secret,
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
      await this.getCryptoTokenDecimals(market.collateralToken),
    );

    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        const formattedAmount = new BigNumber(Math.abs(amount)).multipliedBy(
          10 ** (await this.getCryptoTokenDecimals(market.collateralToken)),
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
    const [positionId, ctDecimals] = await Promise.all([
      this.getPositionId(market.collateralToken, collectionId),
      this.getCryptoTokenDecimals(market.collateralToken), // TODO: Based on gnosis, this CT decimals equals to its collateral token decimals (?)
    ]);
    if (!positionId)
      throw new ConflictException(
        'Something went wrong while calculating balance',
      );
    const balanceWei = new BigNumber(
      await this.conditionalTokensContract.balanceOf(target, positionId),
    );
    console.log('balance (wei):', balanceWei, 'dec:', ctDecimals);
    return balanceWei.div(10 ** ctDecimals);
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
        // TODO: probably this one should be manually calculated using market liquidity.
        throw new NotImplementedException('Not fully implemented yet.');
      case PredictionMarketTypesEnum.ORDER_BOOK.toString():
        throw new NotImplementedException('Not implemented yet.');
        break;
      default:
        throw new ConflictException('Invalid market type!');
    }
    return new BigNumber(weiPrice.toString()).div(
      10 ** (await this.getCryptoTokenDecimals(market.collateralToken)),
    );
  }
}
