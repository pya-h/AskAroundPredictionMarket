import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PredictionMarket } from './entities/market.entity';
import { ILike, Repository } from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CryptoTokenEnum } from '../blockchain/enums/crypto-token.enum';
import { Oracle } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';
import { MarketCategory } from './entities/market-category.entity';
import { GetMarketsQuery } from './dto/get-markets.dto';

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

    const result = await this.blockchainService.createMarket(
      marketMaker,
      CryptoTokenEnum.WETH9,
      question,
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
        conditionId: result.conditionId,
        address: result.marketMakerAddress,
        question: result.question,
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
    { take, skip, category, subject }: GetMarketsQuery = {},
    relations?: string[],
  ) {
    return this.predictionMarketRepository.find({
      where: {
        ...(category ? { categoryId: +category } : {}),
        ...(subject ? { subject: ILike(subject.trim()) } : {}),
      },
      ...(take ? { take: +take } : {}),
      ...(skip ? { skip: +skip } : {}),
      ...(relations ? { relations } : {}),
    });
  }

  async getMarket(id: number, relations?: string[]) {
    const market = await this.predictionMarketRepository.findOne({
      where: { id },
      ...(relations ? { relations } : {}),
    });

    if (!market) throw new NotFoundException('No such market!');
    return market;
  }

  async trade({
    marketId,
    amount,
    outcomeIndex,
    collateralLimit = 0.0,
  }: {
    marketId: number;
    amount: number;
    outcomeIndex: number;
    collateralLimit?: number;
  }) {

  }
}
