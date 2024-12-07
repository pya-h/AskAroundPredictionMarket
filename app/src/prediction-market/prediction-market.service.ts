import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PredictionMarket } from './entities/market.entity';
import {
  FindOptionsWhere,
  ILike,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CryptoTokenEnum } from '../blockchain/enums/crypto-token.enum';
import { Oracle } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';
import { MarketCategory } from './entities/market-category.entity';
import { GetMarketsQuery } from './dto/get-markets.dto';
import { User } from '../user/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionMarketStatusEnum } from './enums/market-status.enum';

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
    private readonly marketCategoryRepository: Repository<MarketCategory>,

    private readonly blockchainService: BlockchainService,
  ) {}

  async getDefaultOracle(chainId?: number) {
    return this.oracleRepository.findOne({
      where: {
        chainId: chainId || (await this.blockchainService.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
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

  findCategoryById(id: number) {
    return this.marketCategoryRepository.findOneBy({ id });
  }

  formatQuestionText(question: string) {
    // Generate a unique string from question, since using repetitive question texts will generate repetitive hashes, which causes the new market creation operation to crash.
    return `${Date.now()}-${question}`;
  }

  async createNewMarket(
    question: string,
    outcomes: string[],
    initialLiquidityInEth: number,
    shouldResolveAt: Date,
    categoryId?: number,
    subject?: string,
  ) {
    const chainId = await this.blockchainService.getCurrentChainId();
    const [predictionOutcomes, marketMaker, oracle] = await Promise.all([
      this.getPredictionOutcomes(outcomes),
      this.blockchainService.getDefaultMarketMaker(chainId),
      this.getDefaultOracle(chainId),
    ]);

    const formattedQuestion = this.formatQuestionText(question);

    const result = await this.blockchainService.createMarket(
      marketMaker,
      CryptoTokenEnum.WETH9,
      formattedQuestion,
      predictionOutcomes,
      initialLiquidityInEth,
      oracle,
      shouldResolveAt,
    );

    if (
      !(await this.blockchainService.validateMarketCreation(
        result.conditionId,
        outcomes.length,
      ))
    )
      throw new ConflictException(
        'Something failed while creating market in the blockchain.',
      );

    if (categoryId && !(await this.findCategoryById(categoryId)))
      throw new BadRequestException('No such category!');

    const market = await this.predictionMarketRepository.save(
      this.predictionMarketRepository.create({
        type: result.marketMakerFactory.type,
        conditionId: result.conditionId,
        address: result.marketMakerAddress,
        question: result.question,
        formattedQuestion,
        questionHash: result.questionHash,
        ammFactoryId: result.marketMakerFactory.id,
        oracleId: result.oracle.id,
        chainId: result.chainId,
        collateralTokenId: result.collateralToken.id,
        initialLiquidity: result.liquidity,
        liquidity: result.liquidity,
        creatorId: result.creatorId,
        createMarketTxHash: result.createMarketTxHash,
        prepareConditionTxHash: result.prepareConditionTxHash,
        shouldResolveAt,
        categoryId,
        subject,
        numberOfOutcomes: outcomes.length,
      }),
    );

    const conditionalTokens: ConditionalToken[] = Array(outcomes.length);
    for (let i = 0; i < outcomes.length; i++) {
      const collectionId = await this.blockchainService.getCollectionId(
        market.conditionId,
        i,
      );
      conditionalTokens[i] = this.conditionalTokenRepository.create({
        collectionId,
        marketId: market.id,
        predictionOutcomeId: predictionOutcomes[i].id,
        tokenIndex: i,
      });
    }
    await this.conditionalTokenRepository.save(conditionalTokens);

    await this.createAllCollections(market, predictionOutcomes); // TODO: You should select one approach: Using ConditionalToken || OutcomeCollection entity,
  }

  async createAllCollections(
    market: PredictionMarket,
    outcomes: PredictionOutcome[],
  ) {
    const numberOfCollections =
      this.blockchainService.getNumberOfOutcomeCollections(outcomes.length);
    const collections = (
      await Promise.all(
        Array(numberOfCollections)
          .fill(null)
          .map((_, i) =>
            this.blockchainService.getCollectionIdByIndexSetValue(
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

  resolveMarket() {
    // TODO:
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

    if (!market) throw new NotFoundException('No such market!');
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
    if (!market) throw new NotFoundException('No such market!');
    if (market.closedAt)
      throw new BadRequestException('This market is closed!');
    if (outcomeIndex >= market.numberOfOutcomes)
      throw new BadRequestException('You have selected an invalid outcome.');

    // TODO: Also check some other important checks
    return this.blockchainService.trade(traderId, market, outcomeIndex, amount);
  }

  async getConditionalTokenBalance(
    user: User,
    marketId: number,
    indexSet: number,
  ) {
    const market = await this.getMarket(marketId);
    if (!market) throw new NotFoundException('Market not found!');
    if (indexSet >= market.numberOfOutcomes)
      // TODO: If you want to use all different collections, this check condition must change
      throw new BadRequestException('This market does not have such outcome!');
    return this.blockchainService.getUserConditionalTokenBalance(
      user.id,
      market,
      indexSet,
    );
  }

  async getMarketLiquidity(marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    if (!market) throw new NotFoundException('Market not found!');
    const balances = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.blockchainService.getMarketConditionalTokenBalance(
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      balance: balances[i],
      token,
    }));
  }

  async getUserLiquidity(marketId: number, userId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    const balances = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.blockchainService.getUserConditionalTokenBalance(
          userId,
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      balance: balances[i],
      token,
    }));
  }

  async getMarketOutcomesMarginalPrices(marketId: number) {
    const market = await this.getMarket(
      marketId,
      'ammFactory',
      'outcomeTokens',
    );
    if (!market) throw new NotFoundException('Market not found!');
    const prices = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.blockchainService.getOutcomeTokenMarginalPrices(
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      outcome: token.predictionOutcome.title,
      price: prices[i],
      token,
    }));
  }

  async getConditionalTokenMarginalPrices(
    marketId: number,
    outcomeIndex: number,
  ) {
    const market = await this.getMarket(marketId, 'ammFactory');
    if (!market) throw new NotFoundException('Market not found!');
    if (outcomeIndex >= market.numberOfOutcomes)
      throw new BadRequestException('This market does not have such outcome!');
    return this.blockchainService.getOutcomeTokenMarginalPrices(
      market,
      outcomeIndex,
    );
  }

  findOngoingMarkets(onlyPassedDue: boolean = false, ...relations: string[]) {
    return this.predictionMarketRepository.find({
      where: {
        closedAt: null,
        ...(onlyPassedDue
          ? { shouldResolveAt: MoreThanOrEqual(new Date()) }
          : {}),
      },
      ...(relations?.length ? { relations } : {}),
    });
  }

  async closeMarket(market: PredictionMarket) {
    await this.blockchainService.closeMarket(market);
    await this.updateMarketData(market.id, { closedAt: new Date() }); // TODO: maybe its better to add another field called closed?
  }

  async finalizedMarket(market: PredictionMarket) {
    // TODO: Steps
    await this.closeMarket(market);
    // Step 2: Resolve market by oracle, and specify market answer and payout array
    // Step 3: Redeem rewards (positions)
    // Step 4: Save everything in database.
  }

  async forceCloseMarket(performer: User, marketId: number) {
    const market = await this.getMarket(marketId, 'ammFactory');
    if (!market) throw new NotFoundException('No such market!');
    if (market.closedAt)
      throw new BadRequestException('This market is already closed!');
    if (market.creatorId !== performer.id)
      throw new ForbiddenException(
        'Markets can only force close by their creator.',
      );
    // TODO: Also get the PayoutVector from Post request to force resolve the market.
    return this.finalizedMarket(market);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processPredictionMarkets() {
    const shouldBeResolvedMarkets = await this.findOngoingMarkets(
      true,
      'ammFactory',
    );
    await Promise.all(
      shouldBeResolvedMarkets.map((market: PredictionMarket) =>
        this.finalizedMarket(market),
      ),
    );
  }
}
