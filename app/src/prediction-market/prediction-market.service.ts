import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PredictionMarket } from './entities/market.entity';
import {
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  Not,
  Repository,
  TreeRepository,
} from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { PredictionMarketContractsService } from '../prediction-market-contracts/prediction-market-contracts.service';
import { CryptoTokenEnum } from '../prediction-market-contracts/enums/crypto-token.enum';
import { Oracle, OracleTypesEnum } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';
import { MarketCategory } from './entities/market-category.entity';
import { GetMarketsQuery } from './dto/get-markets.dto';
import { User } from '../user/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionMarketStatusEnum } from './enums/market-status.enum';
import { PredictionMarketTradeDataType } from '../blockchain-indexer/types/trade-data.type';
import { BlockchainWalletService } from '../blockchain-wallet/blockchain-wallet.service';
import { PredictionMarketResolutionDataType } from 'src/blockchain-indexer/types/resolution-data.type';
import { LoggerService } from 'src/logger/logger.service';
import { UpdatePredictionMarketCategoryDto } from './dto/update-category-data.dto';

@Injectable()
export class PredictionMarketService {
  constructor(
    @InjectRepository(PredictionMarket)
    private readonly predictionMarketRepository: Repository<PredictionMarket>,
    @InjectRepository(PredictionOutcome)
    private readonly predictionOutcomeRepository: Repository<PredictionOutcome>,
    @InjectRepository(Oracle)
    private readonly oracleRepository: Repository<Oracle>,
    @InjectRepository(ConditionalToken)
    private readonly conditionalTokenRepository: Repository<ConditionalToken>,
    @InjectRepository(OutcomeCollection)
    private readonly outcomeCollectionRepository: Repository<OutcomeCollection>,
    @InjectRepository(MarketCategory)
    private readonly marketCategoryRepository: TreeRepository<MarketCategory>,
    private readonly predictionMarketContractsService: PredictionMarketContractsService,
    private readonly blockchainWalletService: BlockchainWalletService,
    private readonly loggerService: LoggerService,
  ) {}

  async getDefaultOracle() {
    return this.oracleRepository.findOne({
      where: {
        id: 0,
      },
    });
  }

  getPredictionOutcomes(outcomes: string[]) {
    return Promise.all(
      outcomes.map(async (outcome) => {
        const existingOutcome = await this.predictionOutcomeRepository.findOne({
          where: {
            title: ILike(outcome.trim()),
          },
        });
        if (existingOutcome) return existingOutcome;

        return this.predictionOutcomeRepository.save(
          this.predictionOutcomeRepository.create({ title: outcome }),
        );
      }),
    );
  }

  findByQuestion(question: string, ...relations: string[]) {
    return this.predictionMarketRepository.find({
      where: {
        question: ILike(question.trim()),
        ...(relations?.length ? { relations } : {}),
      },
    });
  }

  findByQuestionId(
    questionId: string,
    {
      conditionId = null, // conditionId can be used to make sure for more assurance
      relations = null,
      order = null,
    }: {
      conditionId?: string;
      relations?: string[];
      order: FindOptionsOrder<PredictionMarket>;
    },
  ) {
    return this.predictionMarketRepository.findOne({
      where: {
        questionId,
        ...(conditionId ? { conditionId } : {}),
      },
      ...(relations?.length ? { relations } : {}),
      ...(order ? { order } : {}),
    });
  }

  async isQuestionRepetitive(question: string) {
    return Boolean(
      await this.predictionMarketRepository.findOneBy({
        question: ILike(question.trim()),
      }),
    );
  }

  formatQuestionText(question: string) {
    // Generate a unique string from question, since using repetitive question texts will generate repetitive hashes, which causes the new market creation operation to crash.
    return `${Date.now()}-${question}`;
  }

  async doesCategoryExist(categoryId: number) {
    return Boolean(
      await this.marketCategoryRepository.findOneBy({ id: categoryId }),
    );
  }

  async getCategory(
    id: number,
    {
      relations = null,
      subCategoriesOrder = null,
    }: {
      relations?: string[];
      subCategoriesOrder?: FindOptionsOrder<MarketCategory>;
    } = {},
  ) {
    const category = await this.marketCategoryRepository.findOne({
      where: { id },
      ...(relations?.length ? { relations } : {}),
      ...(subCategoriesOrder
        ? { order: { subCategories: subCategoriesOrder } }
        : {}),
    });
    if (category.subCategories?.length)
      category.subCategories = (
        await this.marketCategoryRepository.findDescendantsTree(category)
      ).subCategories;
    if (category.parent)
      category.parent = (
        await this.marketCategoryRepository.findAncestorsTree(category)
      ).parent;
    return category;
  }

  findCategories({
    relations = null,
    order = null,
    treeView = false,
  }: {
    relations?: string[];
    order?: FindOptionsOrder<MarketCategory>;
    treeView?: boolean;
  } = {}) {
    if (treeView) return this.marketCategoryRepository.findTrees();
    return this.marketCategoryRepository.find({
      ...(relations?.length ? { relations } : {}),
      ...(order ? { order } : {}),
    });
  }

  async addNewCategory(
    name: string,
    description?: string,
    iconUrl?: string,
    parentId?: number,
  ) {
    if (await this.marketCategoryRepository.findOneBy({ name: ILike(name) }))
      throw new ConflictException('This category already exists.');
    if (parentId != null && !(await this.doesCategoryExist(parentId)))
      throw new NotFoundException(
        "The parent category specified doesn't actually exist!",
      );
    return this.marketCategoryRepository.save(
      this.marketCategoryRepository.create({
        name,
        description,
        parentId,
        icon: iconUrl,
      }),
    );
  }

  async updateCategoryData(
    id: number,
    updatedFieldsData: UpdatePredictionMarketCategoryDto,
  ) {
    const category = await this.getCategory(id);
    if (!category) throw new NotFoundException('No such category!');
    if (
      updatedFieldsData.name?.length &&
      (await this.marketCategoryRepository.findOneBy({
        name: ILike(updatedFieldsData.name),
      }))
    )
      throw new ConflictException(
        'A category with this new name exists already.',
      );
    if (
      updatedFieldsData.parentId != null &&
      !(await this.doesCategoryExist(updatedFieldsData.parentId))
    )
      throw new NotFoundException(
        "The parent category specified doesn't actually exist!",
      );
    Object.assign(category, updatedFieldsData);
    return this.marketCategoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.getCategory(id);
    if (!category) throw new NotFoundException('No such category!');
    return this.marketCategoryRepository.remove(category);
  }

  async createNewMarket(
    question: string,
    outcomes: string[],
    initialLiquidityInEth: number,
    shouldResolveAt: Date,
    categoryId?: number,
    subject?: string,
  ) {
    if (await this.isQuestionRepetitive(question))
      throw new ConflictException('This question has been asked previously!');

    const chainId =
      await this.predictionMarketContractsService.getCurrentChainId();
    const [predictionOutcomes, marketMaker, oracle] = await Promise.all([
      this.getPredictionOutcomes(outcomes),
      this.predictionMarketContractsService.getDefaultMarketMaker(chainId),
      this.getDefaultOracle(),
    ]);

    const formattedQuestion = this.formatQuestionText(question);

    const result = await this.predictionMarketContractsService.createMarket(
      marketMaker,
      CryptoTokenEnum.WETH9,
      formattedQuestion,
      predictionOutcomes,
      initialLiquidityInEth,
      oracle,
      shouldResolveAt,
    );

    if (
      !(await this.predictionMarketContractsService.validateMarketCreation(
        result.conditionId,
        outcomes.length,
      ))
    )
      throw new ConflictException(
        'Something failed while creating market in the blockchain.',
      );

    if (categoryId && !(await this.getCategory(categoryId)))
      throw new BadRequestException('No such category!');

    const market = await this.predictionMarketRepository.save(
      this.predictionMarketRepository.create({
        type: result.marketMakerFactory.type,
        conditionId: result.conditionId,
        address: result.marketMakerAddress,
        question,
        formattedQuestion: result.question,
        questionId: result.questionId,
        ammFactoryId: result.marketMakerFactory.id,
        oracleId: result.oracle.id,
        chainId: result.chainId,
        collateralTokenId: result.collateralToken.id,
        initialLiquidity: result.liquidity,
        creatorId: result.creatorId,
        createMarketTxHash: result.createMarketTxHash,
        prepareConditionTxHash: result.prepareConditionTxHash,
        shouldResolveAt,
        categoryId,
        subject,
        numberOfOutcomes: outcomes.length,
      }),
    );

    const conditionalTokens = await Promise.all(
      predictionOutcomes.map((outcome, i) =>
        this.createConditionalToken(market, i, outcome),
      ),
    );
    await Promise.all([
      this.conditionalTokenRepository.save(conditionalTokens),
      this.createAllCollections(market, predictionOutcomes),
    ]);
  }

  async createConditionalToken(
    market: PredictionMarket,
    tokenIndex: number,
    relatedPredictionOutcome: PredictionOutcome,
  ) {
    const collectionId =
      await this.predictionMarketContractsService.getCollectionId(
        market.conditionId,
        tokenIndex,
      );
    return this.conditionalTokenRepository.create({
      collectionId,
      marketId: market.id,
      predictionOutcomeId: relatedPredictionOutcome.id,
      tokenIndex,
    });
  }

  async createAllCollections(
    market: PredictionMarket,
    outcomes: PredictionOutcome[],
  ) {
    const numberOfCollections =
      this.predictionMarketContractsService.getNumberOfOutcomeCollections(
        outcomes.length,
      );
    const collections = (
      await Promise.all(
        Array(numberOfCollections)
          .fill(null)
          .map((_, i) =>
            this.predictionMarketContractsService.getCollectionIdByIndexSetValue(
              market.conditionId,
              i,
            ),
          ),
      )
    ).map((collectionId, indexSetDecimal) =>
      this.outcomeCollectionRepository.create({
        collectionId: collectionId as string,
        indexSetDecimal,
        marketId: market.id,
      }),
    );

    const outcomeSet = [];
    collections[0].possibleOutcomes = [];
    for (let i = 0, ci = 1; i < outcomes.length; i++) {
      for (let j = i; j < outcomes.length; j++) {
        collections[ci++].possibleOutcomes = [...outcomeSet, outcomes[j]];
      }
      outcomeSet.push(outcomes[i]);
    }
    return this.outcomeCollectionRepository.save(collections);
  }

  async findMarkets(
    { take, skip, category, subject, status }: GetMarketsQuery = {},
    relations?: string[],
  ) {
    const mainFilters: FindOptionsWhere<PredictionMarket> = {};
    switch (status) {
      case PredictionMarketStatusEnum.ONGOING.toString():
        mainFilters.closedAt = null;
        break;
      case PredictionMarketStatusEnum.CLOSED.toString():
        mainFilters.closedAt = Not(null);
        break;
    }

    return this.predictionMarketRepository.find({
      where: {
        ...mainFilters,
        ...(category ? { categoryId: +category } : {}),
        ...(subject ? { subject: ILike(subject.trim()) } : {}),
      },
      ...(take ? { take: +take } : {}),
      ...(skip ? { skip: +skip } : {}),
      ...(relations ? { relations } : {}),
    });
  }

  async getMarket(id: number, ...relations: string[]) {
    const market = await this.predictionMarketRepository.findOne({
      where: { id },
      ...(relations ? { relations } : {}),
    });

    if (!market) throw new NotFoundException('Market not found!');
    return market;
  }

  async getMarketByAddress(
    address: string,
    {
      relations,
      outcomeTokensOrder = null,
      shouldThrow = true,
    }: {
      relations?: string[];
      shouldThrow?: boolean;
      outcomeTokensOrder?: FindOptionsOrder<ConditionalToken>;
    } = {},
  ) {
    const market = await this.predictionMarketRepository.findOne({
      where: { address },
      ...(relations ? { relations } : {}),
      ...(outcomeTokensOrder
        ? { order: { outcomeTokens: outcomeTokensOrder } }
        : {}),
    });

    if (!market && shouldThrow)
      throw new NotFoundException('Market not found!');
    return market;
  }

  updateMarketData(marketId: number, data: Partial<PredictionMarket>) {
    return this.predictionMarketRepository.update(
      { id: marketId },
      { ...data },
    );
  }
  async trade({
    marketId,
    amount,
    outcomeIndex,
    traderId,
  }: {
    marketId: number;
    traderId: number;
    amount: number;
    outcomeIndex: number;
  }) {
    const market = await this.getMarket(marketId, 'ammFactory'); // Also collateral token which is set 'eager', if you intend to disable the eager option, you should add it here.
    if (market.closedAt)
      throw new BadRequestException('This market is closed!');
    if (outcomeIndex >= market.numberOfOutcomes)
      throw new BadRequestException('You have selected an invalid outcome.');

    // TODO: Blockchain errors may seem to complicated, add some balance and other checks here to show the proper message in case.
    return this.predictionMarketContractsService.trade(
      traderId,
      market,
      outcomeIndex,
      amount,
    );
  }

  async getConditionalTokenBalance(
    user: User,
    marketId: number,
    indexSet: number,
  ) {
    const market = await this.getMarket(marketId);
    if (indexSet >= market.numberOfOutcomes)
      throw new BadRequestException('This market does not have such outcome!');
    return this.predictionMarketContractsService.getUserConditionalTokenBalance(
      user.id,
      market,
      indexSet,
    );
  }

  async getMarketLiquidity(marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    const balances = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.predictionMarketContractsService.getMarketConditionalTokenBalance(
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      index: token.tokenIndex,
      balance: balances[i],
      token,
    }));
  }

  async getUserLiquidity(marketId: number, userId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    const balances = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.predictionMarketContractsService.getUserConditionalTokenBalance(
          userId,
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      index: token.tokenIndex,
      balance: balances[i],
      token,
    }));
  }

  async getUserBalanceOfMarketCollateralToken(
    userId: number,
    marketId: number,
  ) {
    const market = await this.getMarket(marketId);
    return this.blockchainWalletService.getBalance(
      userId,
      market.collateralToken,
      market.chainId,
    );
  }

  async getAllOutcomesPrices(marketId: number) {
    const market = await this.getMarket(
      marketId,
      'ammFactory',
      'outcomeTokens',
    );
    return this.predictionMarketContractsService.getMarketAllOutcomePrices(
      market,
    );
  }

  async getSingleOutcomePrice(marketId: number, outcomeIndex: number) {
    const market = await this.getMarket(marketId, 'ammFactory');
    return this.predictionMarketContractsService.getMarketOutcomePrice(
      market,
      outcomeIndex,
    );
  }

  async getAllOutcomesMarginalPrices(marketId: number) {
    const market = await this.getMarket(
      marketId,
      'ammFactory',
      'outcomeTokens',
    );
    const prices = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.predictionMarketContractsService.getOutcomeTokenMarginalPrices(
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      index: token.tokenIndex,
      price: prices[i],
      token,
    }));
  }

  async getSingleOutcomeMarginalPrice(marketId: number, outcomeIndex: number) {
    const market = await this.getMarket(marketId, 'ammFactory');
    if (outcomeIndex >= market.numberOfOutcomes)
      throw new BadRequestException('This market does not have such outcome!');
    return this.predictionMarketContractsService.getOutcomeTokenMarginalPrices(
      market,
      outcomeIndex,
    );
  }

  findOngoingMarkets(onlyPassedDue: boolean = false, ...relations: string[]) {
    return this.predictionMarketRepository.find({
      where: {
        closedAt: null,
        ...(onlyPassedDue
          ? { shouldResolveAt: LessThanOrEqual(new Date()) }
          : {}),
      },
      ...(relations?.length ? { relations } : {}),
    });
  }

  async closeMarket(market: PredictionMarket) {
    await this.predictionMarketContractsService.closeMarket(market);
    await this.updateMarketData(market.id, { closedAt: new Date() });
  }

  async finalizeMarket(market: PredictionMarket) {
    await this.closeMarket(market);
    // TODO: Decentralized oracle implementation ...
  }

  async forceCloseMarket(performer: User, marketId: number) {
    const market = await this.getMarket(marketId, 'ammFactory');
    if (market.closedAt)
      throw new BadRequestException('This market is already closed!');
    if (market.creatorId !== performer.id)
      throw new ForbiddenException(
        'Markets can only force close by their creator.',
      );
    return this.finalizeMarket(market);
  }

  async manualResolve(
    user: User,
    marketId: number,
    marketAnswer: number | number[],
    forceClose: boolean = false,
  ) {
    const market = await this.getMarket(marketId, 'outcomeTokens', 'oracle');
    if (market.oracle.type !== OracleTypesEnum.CENTRALIZED.toString())
      throw new MethodNotAllowedException(
        'This action is only allowed on markets with centralized oracles.',
      );
    try {
      if (
        market.oracle.account.userId !== user.id ||
        market.oracle.account.address !==
          (await this.blockchainWalletService.getWallet(user.id, true))?.address
      )
        throw new ForbiddenException();
    } catch (ex) {
      // since blockchainWalletService may throw NotFound exception, this way the error message will still be related to the request.
      throw new ForbiddenException(
        "You're not allowed to do this since you're not this market's oracle.",
      );
    }

    if (market.isOpen) {
      if (!forceClose || !user.admin) {
        throw new BadRequestException(
          'Market is not closed yet! This action is only available after market closes.',
        );
      }
      await this.closeMarket(market);
    }

    if (!(marketAnswer instanceof Array)) {
      marketAnswer = Array(market.numberOfOutcomes)
        .fill(0)
        .map((_, i) => (i === marketAnswer ? 1 : 0));
    }

    const _result = await this.predictionMarketContractsService.resolveMarket(
      market,
      marketAnswer,
    );
  }

  async updateParticipationStatistics(
    market: PredictionMarket,
    { tokenAmounts }: PredictionMarketTradeDataType,
  ) {
    if (tokenAmounts.length !== market.outcomeTokens.length)
      throw new Error(
        "Invalid event log decoding, trade data doesn't match market info.",
      );
    // Note: outcomeTokens field must be ordered by tokenIndex
    for (let i = 0; i < tokenAmounts.length; i++) {
      const amountInEth = (
        await this.blockchainWalletService.weiToEthers(
          tokenAmounts[i],
          market.collateralToken,
        )
      ).toNumber(); // TODO/Check: Use Number or BigInt for amountInvested?
      market.outcomeTokens[i].amountInvested += amountInEth;
    }

    await Promise.all([
      this.conditionalTokenRepository.save(market.outcomeTokens),
      this.predictionMarketRepository.save(market),
    ]);
  }

  async getMarketParticipationStatistics(marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    let totalInvestment = 0;
    market.outcomeTokens.forEach((token) => {
      totalInvestment += token.amountInvested;
    });
    return market.outcomeTokens.map((token) => ({
      outcome: token.predictionOutcome.title,
      index: token.tokenIndex,
      participationPossibility: (100 * token.amountInvested) / totalInvestment,
      token,
    }));
  }

  async setMarketResolutionData(
    resolutionData: PredictionMarketResolutionDataType,
  ) {
    const market = await this.findByQuestionId(resolutionData.questionId, {
      conditionId: resolutionData.conditionId,
      relations: ['outcomeTokens'],
      order: {
        outcomeTokens: { tokenIndex: 'ASC' },
      },
    });
    if (!market) throw new Error('No such market!');
    if (market.isOpen)
      throw new Error(
        `A ConditionResolution event has been fired in blockchain, for market#${market.id} which is still open! It seems something has gone wrong!`,
      );
    market.resolvedAt = new Date();

    // Note: market.outcomeTokens must be sorted by tokenIndex to prevent any possible position mismatch
    let sumOfRatios = 0;
    resolutionData.payoutNumerators.forEach((ratio) => {
      sumOfRatios += ratio;
    });

    for (let i = 0; i < market.outcomeTokens.length; i++) {
      market.outcomeTokens[i].truenessRatio =
        resolutionData.payoutNumerators[i] / sumOfRatios;
    }

    await Promise.all([
      this.conditionalTokenRepository.save(market.outcomeTokens),
      this.predictionMarketRepository.save(market),
    ]);

    this.loggerService.debug(`Market#${market.id} has been resolved.`, {
      data: {
        market: {
          id: market.id,
          question: market.question,
          outcomes: market.outcomeDetails,
          resolutionData,
        },
      },
    });
  }

  async redeemUserRewards(user: User, marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    if (!market.closedAt)
      throw new ForbiddenException(
        'Market is still open, this action will be only available after the market is resolved.',
      );
    if (!market.resolvedAt)
      throw new ForbiddenException(
        'Although market is closed, oracle has not resolved and released results yet; When resolved, you can come back and collect your rewards.',
      );
    const result =
      await this.predictionMarketContractsService.redeemMarketRewards(
        user.id,
        market,
      );
    return result;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processPredictionMarkets() {
    const shouldBeResolvedMarkets = await this.findOngoingMarkets(
      true,
      'ammFactory',
    );
    await Promise.all(
      shouldBeResolvedMarkets.map((market: PredictionMarket) =>
        this.finalizeMarket(market),
      ),
    );
  }
}
