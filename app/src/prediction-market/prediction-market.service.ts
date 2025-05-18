import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  LoggerService,
  MethodNotAllowedException,
  NotFoundException,
  NotImplementedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PredictionMarket } from './entities/market.entity';
import {
  Between,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
  TreeRepository,
} from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { PredictionMarketContractsService } from '../prediction-market-contracts/prediction-market-contracts.service';
import { CryptoTokenEnum } from '../blockchain-core/enums/crypto-token.enum';
import { Oracle, OracleTypesEnum } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';
import { MarketCategory } from './entities/market-category.entity';
import { GetMarketsQuery } from './dto/get-markets.dto';
import { User } from '../user/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionMarketStatusEnum } from './enums/market-status.enum';
import { PredictionMarketTradeDataType } from '../blockchain-indexer/types/trade-data.type';
import { BlockchainWalletService } from '../blockchain-core/blockchain-wallet.service';
import { PredictionMarketResolutionDataType } from '../blockchain-indexer/types/resolution-data.type';
import { UpdatePredictionMarketCategoryDto } from './dto/update-category-data.dto';
import { BlockchainHelperService } from '../blockchain-core/blockchain-helper.service';
import { UserService } from '../user/user.service';
import { NewPredictionMarketOutcomeInfoDto } from './dto/create-market.dto';
import { PredictionMarketParticipation } from './entities/participation.entity';
import {
  PredictionMarketParticipationModesEnum,
  PredictionMarketParticipationSortByOptionsEnum,
  PredictionMarketTradeModesEnum,
} from './enums/market-participation.enums';
import {
  TotalTradeOptionsDto,
  TradeHistoryOptionsDto,
} from './dto/get-my-trades.dto';
import {
  PredictionMarketSortOptionsDto,
  ReservedPredictionMarketSortOptionsDto,
} from './enums/prediction-market-sort-options.enum';
import { TotalPerOutcomeTradeStatisticsDto } from './dto/responses/total-trade-statistics.dto';
import { MarketEconomicConstants } from '../core/constants/constants';
import { MinioService } from '../minio/minio.service';
import {
  OutcomeStatistics,
  OutcomeStatisticsWithParticipants,
  PredictionMarketEntityWithParticipantsCount,
} from './dto/responses/prediction-market-extra.dto';
import { BasePredictionMarket } from './entities/bases/base-market.entity';
import { BaseConditionalToken } from './entities/bases/base-conditional-token.entity';
import { GetReservedMarketsQuery } from './dto/get-reserved-markets.dto';
import { BasePredictionMarketExtraDto } from './dto/responses/base-market-extra.dto';
import { UpdateReservedPredictionMarketDto } from './dto/update-reserved-market.dto';
import { PredictionMarketTypesEnum } from '../prediction-market-contracts/enums/market-types.enum';
import { UpdatePredictionMarketDto } from './dto/update-market.dto';
import { approximate } from '../core/utils/calculus';
import { PayoutRedemptionEventDataType } from '../blockchain-indexer/types/payout-redemption-data.copy';
import { RedeemHistory } from './entities/redeem-history.entity';
import { GetUserMarketsDto } from './dto/get-user-markets.dto';
import BigNumber from 'bignumber.js';
import { OutcomePossibilityBasisEnum } from './enums/outcome-popularity-basis.enum';
import { OutcomeTokenParticipationInfo } from './dto/responses/outcome-token-stats.dtos';
import { WebPushNotificationService } from '../notification/web-push-notification.service';
import {
  GlobalPredictionMarketNotificationTypes,
  SendGlobalMarketNotificationDto,
} from './dto/send-global-market-notification.dto';
import { truncateString } from '../core/utils/strings';
import { AmmMarketPriceCacheType } from './types/amm-price-cache.type';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class PredictionMarketService implements OnModuleInit {
  public static marketsCheckoutIntervalInMinutes: number = 10;
  public static hoursRemainingToMarketClosureReminder: number = 1;

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
    @InjectRepository(PredictionMarketParticipation)
    private readonly predictionMarketParticipationRepository: Repository<PredictionMarketParticipation>,
    @InjectRepository(RedeemHistory)
    private readonly redeemHistoryRepository: Repository<RedeemHistory>,
    @InjectRepository(BasePredictionMarket)
    private readonly basePredictionMarketRepository: Repository<BasePredictionMarket>,
    @InjectRepository(BaseConditionalToken)
    private readonly baseConditionalTokenRepository: Repository<BaseConditionalToken>,
    private readonly predictionMarketContractsService: PredictionMarketContractsService,
    private readonly blockchainWalletService: BlockchainWalletService,
    private readonly blockchainHelperService: BlockchainHelperService,
    private readonly loggerService: LoggerService,
    private readonly userService: UserService,
    private readonly minioService: MinioService,
    private readonly webPushNotificationService: WebPushNotificationService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  onModuleInit() {
    this.periodicUpdateOngoingMarketPriceCaches().catch((ex) =>
      this.loggerService.error(
        'Periodic AMM price caching processor failed to cache ongoing markets prices at startup.',
        ex as Error,
      ),
    );
  }
  async getOracle(
    oracleId: number = 0,
    {
      shouldThrow = false,
      relations = null,
    }: {
      shouldThrow?: boolean;
      relations?: FindOptionsRelations<Oracle>;
    } = {},
  ) {
    const oracle = await this.oracleRepository.findOne({
      where: {
        id: oracleId,
      },
      ...(relations ? { relations } : {}),
    });
    if (!oracle && shouldThrow) {
      throw new NotFoundException('Oracle not found!');
    }
    return oracle;
  }

  async findOracles({
    take = null,
    skip = null,
  }: {
    skip?: number;
    take?: number;
  } = {}) {
    return this.oracleRepository.find({
      ...(skip ? { skip } : {}),
      ...(take ? { take } : {}),
    });
  }

  async getSinglePredictionOutcomeInstance(outcome: {
    title: string;
    icon?: string;
  }) {
    const existingOutcome = await this.predictionOutcomeRepository.findOne({
      where: {
        title: ILike(outcome.title),
        ...(outcome.icon ? { icon: outcome.icon } : {}),
      },
    });
    if (existingOutcome) {
      return existingOutcome;
    }

    return this.predictionOutcomeRepository.save(
      this.predictionOutcomeRepository.create({
        title: outcome.title,
        icon: outcome.icon,
      }),
    );
  }

  getPredictionOutcomes(outcomes: NewPredictionMarketOutcomeInfoDto[]) {
    return Promise.all(
      outcomes.map(async (outcome) =>
        this.getSinglePredictionOutcomeInstance(outcome),
      ),
    );
  }

  findByQuestion(question: string, ...relations: string[]) {
    return this.predictionMarketRepository.find({
      where: {
        question: ILike(question),
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
    const [isCreatedBefore, isReserved] = await Promise.all([
      this.predictionMarketRepository.findOneBy({
        question: ILike(question),
      }),
      this.basePredictionMarketRepository.findOneBy({
        question: ILike(question),
      }),
    ]);
    return Boolean(isCreatedBefore || isReserved);
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
      shouldThrow = false,
    }: {
      relations?: string[];
      subCategoriesOrder?: FindOptionsOrder<MarketCategory>;
      shouldThrow?: boolean;
    } = {},
  ) {
    const category = await this.marketCategoryRepository.findOne({
      where: { id },
      ...(relations?.length ? { relations } : {}),
      ...(subCategoriesOrder
        ? { order: { subCategories: subCategoriesOrder } }
        : {}),
    });
    if (!category) {
      if (shouldThrow) {
        throw new NotFoundException('No such category!');
      }
      return null;
    }

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
    let parent: MarketCategory | null = null;
    if (parentId != null) {
      parent = await this.getCategory(parentId, {
        relations: ['parent', 'subCategories'], // Setting parentId without setting the 'parent' will cause problem in category hierarchy;
      });
      if (!parent) {
        throw new NotFoundException(
          "The parent category specified doesn't actually exist!",
        );
      }
    }
    return this.marketCategoryRepository.save(
      this.marketCategoryRepository.create({
        name,
        description,
        icon: iconUrl,
        ...(parent ? { parent } : {}),
      }),
    );
  }

  async updateCategoryData(
    id: number,
    updatedFieldsData: UpdatePredictionMarketCategoryDto,
  ) {
    const category = await this.getCategory(id, { shouldThrow: true });
    if (
      updatedFieldsData.name?.length &&
      (await this.marketCategoryRepository.findOneBy({
        name: ILike(updatedFieldsData.name),
      }))
    ) {
      throw new ConflictException(
        'A category with this new name exists already.',
      );
    }
    if (updatedFieldsData.parentId !== undefined) {
      if (updatedFieldsData.parentId !== null) {
        // setting parentId to null means make the category a primary category; It differs from parentId === undefined [: don't change the parent].
        category.parent = null;
      } else if (updatedFieldsData.parentId !== category.parentId) {
        const parent: MarketCategory = await this.getCategory(
          updatedFieldsData.parentId,
          {
            relations: ['parent', 'subCategories'],
          },
        );
        if (!parent) {
          throw new NotFoundException(
            "The parent category specified doesn't actually exist!",
          );
        }
        category.parent = parent;
      }
    }

    Object.assign(category, updatedFieldsData);
    return this.marketCategoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.getCategory(id);
    if (!category) throw new NotFoundException('No such category!');
    return this.marketCategoryRepository.remove(category);
  }

  static areItemsUnique(items: unknown[]) {
    for (let i = 0; i < items.length - 1; i++)
      for (let j = i + 1; j < items.length; j++)
        if (items[i] === items[j]) return false;

    return true;
  }

  async deployMarket(
    baseMarket: BasePredictionMarket,
    baseOutcomes: BaseConditionalToken[],
  ) {
    const formattedQuestion = this.formatQuestionText(baseMarket.question);

    const result = await this.predictionMarketContractsService.createMarket(
      baseMarket.ammFactory,
      baseMarket.collateralToken,
      formattedQuestion,
      baseOutcomes,
      baseMarket.initialLiquidity,
      baseMarket.oracle,
      baseMarket.fee,
    );

    if (
      !(await this.predictionMarketContractsService.validateMarketCreation(
        result.conditionId,
        baseOutcomes.length,
      ))
    )
      throw new ConflictException(
        'Something failed while creating market in the blockchain.',
      );

    const { id: reservedMarketId, ...marketFeatures } = baseMarket;

    const market = await this.predictionMarketRepository.save(
      this.predictionMarketRepository.create({
        ...marketFeatures,
        conditionId: result.conditionId,
        address: result.marketMakerAddress,
        formattedQuestion: result.question,
        questionId: result.questionId,
        ammFactoryId: result.marketMakerFactory.id,
        oracleId: result.oracle.id,
        chainId: result.chainId,
        collateralTokenId: result.collateralToken.id,
        initialLiquidity: result.liquidity,
        createMarketTxHash: result.createMarketTxHash,
        prepareConditionTxHash: result.prepareConditionTxHash,
        startedAt: result.startedAt,
      }),
    ); // The reason for using result object fields, instead of the exact field in baseMarket,
    // is to make sure that market instance is created with final configuration;

    const conditionalTokens = await Promise.all(
      baseOutcomes.map((ct, i) =>
        this.createConditionalToken(
          market,
          i,
          ct.predictionOutcome,
          ct.description,
        ),
      ),
    );
    await Promise.all([
      this.conditionalTokenRepository.save(conditionalTokens),
      this.createAllCollections(
        market,
        baseOutcomes.map((ct) => ct.predictionOutcome),
      ),
    ]);
    market.outcomeTokens = conditionalTokens;

    this.cacheOngoingMarketPrices(market);
    this.webPushNotificationService
      .pushCheckoutPredictionMarketToSubscribers(market, {
        newPredictionMarket: true,
      })
      .catch((ex) =>
        this.loggerService.error(
          'Panic at New Prediction Market web push: ',
          ex,
          { data: { marketId: market.id, question: market.question } },
        ),
      );
    await this.basePredictionMarketRepository.delete({ id: reservedMarketId });
    return market;
  }

  async sendGlobalMarketNotification({
    marketId,
    type = GlobalPredictionMarketNotificationTypes.NEW_MARKET,
  }: SendGlobalMarketNotificationDto) {
    const market = await this.getMarket(marketId, 'outcomeTokens');

    switch (type) {
      case GlobalPredictionMarketNotificationTypes.NEW_MARKET:
        await this.webPushNotificationService.pushCheckoutPredictionMarketToSubscribers(
          market,
          { newPredictionMarket: true },
        );
        break;
      case GlobalPredictionMarketNotificationTypes.MARKET_SOON_CLOSES:
        await this.webPushNotificationService.pushCheckoutPredictionMarketToSubscribers(
          market,
          { predictionMarketClosingSoon: true },
          '⚠️ This Market Will Close Soon...',
        );
        break;
      case GlobalPredictionMarketNotificationTypes.MARKET_RESOLVED:
        const participants: User[] = await this.findParticipants(
          market.id,
          'market',
        );
        await this.webPushNotificationService.pushPredictionMarketIsResolvedToParticipants(
          market,
          participants,
        );
        break;
      default:
        throw new NotImplementedException();
    }
  }

  async createNewMarket(
    question: string,
    outcomes: NewPredictionMarketOutcomeInfoDto[],
    initialLiquidityInEth: number,
    shouldResolveAt: Date,
    categoryId: number,
    creatorId: number,
    shouldStartAt?: Date,
    extraInfo?: {
      description?: string;
      subject?: string;
      image?: string;
      reference?: string;
      oracleId?: number;
      collateralToken?: CryptoTokenEnum;
      fee?: number;
    },
  ) {
    if (await this.isQuestionRepetitive(question))
      throw new ConflictException('This question has been asked previously!');

    if (shouldResolveAt <= new Date())
      throw new BadRequestException('Resolve date has passed already!');

    if (
      !PredictionMarketService.areItemsUnique(
        outcomes.map((outcome) => outcome.title.toLowerCase()),
      )
    )
      throw new BadRequestException(
        'Market outcomes must differ from each other.',
      );

    if (shouldStartAt) {
      if (shouldStartAt <= new Date()) {
        throw new BadRequestException('startAt date has passed.');
      }
      if (shouldResolveAt <= shouldStartAt) {
        throw new BadRequestException(
          'Market resolution data must be after its start time!',
        );
      }
    }

    if (categoryId && !(await this.doesCategoryExist(categoryId)))
      throw new BadRequestException('No such category!');

    if (!(await this.userService.findOne(creatorId, false)))
      throw new BadRequestException('Creator must be an existing user!');
    const oracle = await this.getOracle(extraInfo?.oracleId || 0, {
      shouldThrow: true,
    });

    const chainId = await this.blockchainHelperService.getCurrentChainId();
    const [predictionOutcomes, marketMaker, collateralToken] =
      await Promise.all([
        this.getPredictionOutcomes(outcomes),
        this.predictionMarketContractsService.getDefaultMarketMakerFactory(
          chainId,
        ), // TODO: After completing FPMM Market code, add option to select amm type.
        this.blockchainHelperService.getCryptocurrencyToken(
          extraInfo.collateralToken || CryptoTokenEnum.WETH9,
          chainId,
        ),
      ]);

    if (!marketMaker) {
      throw new NotImplementedException(
        "OmenArena doesn't support this kind of AMM!",
      );
    }
    if (!collateralToken?.abi?.length) {
      throw new NotImplementedException(
        `OmenArena does not support ${extraInfo.collateralToken} as market collateral [on chain#${chainId}] yet!`,
      );
    }
    if (outcomes?.length !== predictionOutcomes?.length) {
      throw new BadRequestException(
        "There's something wrong with your provided outcomes list!",
      );
    }

    if (extraInfo.fee < 0 || extraInfo.fee >= 100) {
      throw new BadRequestException(
        'Invalid fee! supported range for fee is [0-100)',
      );
    }
    const reservedMarket: BasePredictionMarket =
      await this.basePredictionMarketRepository.save(
        this.basePredictionMarketRepository.create({
          type: marketMaker.type,
          question,
          ammFactory: marketMaker,
          oracle: oracle,
          chainId,
          collateralToken,
          initialLiquidity: initialLiquidityInEth,
          creatorId,
          shouldStartAt,
          shouldResolveAt,
          categoryId,
          numberOfOutcomes: predictionOutcomes.length,
          image: extraInfo.image,
          reference: extraInfo.reference,
          subject: extraInfo.subject,
          description: extraInfo.description,
          fee: (extraInfo.fee ?? 0) / 100.0,
        }),
      );

    const baseConditionalTokens = predictionOutcomes.map((outcome, i) =>
      this.baseConditionalTokenRepository.create({
        tokenIndex: i,
        market: reservedMarket,
        predictionOutcome: outcome,
        description: outcomes[i].description,
      }),
    );
    if (reservedMarket.shouldStartAt) {
      await this.baseConditionalTokenRepository.save(baseConditionalTokens);
      return reservedMarket;
    }

    let market: BasePredictionMarket;
    try {
      market = await this.deployMarket(reservedMarket, baseConditionalTokens);
    } catch (ex) {
      await this.basePredictionMarketRepository.delete({
        shouldStartAt: IsNull(),
      }); // BasePredictionMarket must remove if everything goes OK;
      // In case an error happened along the way, make sure to remove half-deployed base markets. Since they will cause QuestionExists error on retry.
      throw ex;
    }

    return market;
  }

  async createConditionalToken(
    market: PredictionMarket,
    tokenIndex: number,
    relatedPredictionOutcome: PredictionOutcome,
    description?: string,
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
      predictionOutcome: relatedPredictionOutcome,
      tokenIndex,
      description: description,
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

  async getNumberOfParticipants(
    id: number,
    participationTargetType: 'market' | 'outcome' = 'market',
  ) {
    const targetFieldName = `${participationTargetType}_id`;
    return +(
      (
        await this.predictionMarketParticipationRepository
          .createQueryBuilder('pmp')
          .select(['COUNT(DISTINCT pmp.user_id) AS participants'])
          .where(`pmp.${targetFieldName} = :${targetFieldName}`, {
            [targetFieldName]: id,
          })
          .getRawOne()
      )?.participants || 0
    );
  }

  async findParticipants(
    id: number,
    participationTargetType: 'market' | 'outcome' = 'market',
    {
      take = null,
      skip = null,
      outcome = null, // Only set when participationTargetType=='market', then function will find outcome id by itself; o.w. 'id' arg's the outcomeId itself
    }: { skip?: number; take?: number; outcome?: number } = {},
  ) {
    let targetFieldName = `${participationTargetType}_id`;
    if (outcome != null && participationTargetType === 'market') {
      const market = await this.getMarket(id, 'outcomeTokens');
      id = market.outcomeTokens.find(
        (token) => token.tokenIndex === outcome,
      )?.id; // now the market id argument is converted to outcome id.
      if (id == null) {
        throw new NotFoundException('Outcome not found!');
      }
      targetFieldName = 'outcome_id';
    }
    const query = this.predictionMarketParticipationRepository
      .createQueryBuilder('pmp')
      .innerJoinAndSelect('pmp.user', 'user')
      .select('DISTINCT user.id')
      .where(`pmp.${targetFieldName} = :${targetFieldName}`, {
        [targetFieldName]: id,
      });
    if (take) {
      query.limit(+take);
    }
    if (skip) {
      query.offset(+skip);
    }

    return this.userService.findBatch(
      (await query.getRawMany()).map((item) => +item?.id),
    );
  }

  async findMarkets(
    {
      take,
      skip,
      category,
      subject,
      status,
      creator,
      sort = PredictionMarketSortOptionsDto.CREATION_DATE,
      descending = false,
      prioritized = false,
    }: GetMarketsQuery = {},
    ...relations: string[]
  ) {
    const mainFilters: FindOptionsWhere<PredictionMarket> = {};
    switch (status) {
      case PredictionMarketStatusEnum.ONGOING.toString():
        mainFilters.closedAt = IsNull();
        break;
      case PredictionMarketStatusEnum.RESOLVED.toString():
        mainFilters.resolvedAt = Not(IsNull());
      case PredictionMarketStatusEnum.CLOSED.toString():
        mainFilters.closedAt = Not(IsNull());
        break;
    }

    const sortOptions: {
      order?: FindOptionsOrder<PredictionMarket>;
      take?: number;
      skip?: number;
    } = {};
    const isSortByParticipantRequested =
      sort === PredictionMarketSortOptionsDto.PARTICIPANTS.toString();
    if (!isSortByParticipantRequested) {
      const orderField = {
        [PredictionMarketSortOptionsDto.CREATION_DATE]: 'createdAt',
        [PredictionMarketSortOptionsDto.RESOLUTION_DATE]: 'shouldResolveAt',
        [PredictionMarketSortOptionsDto.START_DATE]: 'startedAt',
        [PredictionMarketSortOptionsDto.QUESTION_TEXT]: 'question',
        [PredictionMarketSortOptionsDto.NUMBER_OF_OUTCOMES]: 'numberOfOutcomes',
        [PredictionMarketSortOptionsDto.OUTCOMES_INDEX]: 'outcomeTokens',
      }[sort || PredictionMarketSortOptionsDto.CREATION_DATE];
      sortOptions.order = {
        ...(prioritized ? { priority: 'DESC' } : {}),
        [orderField]:
          orderField !== 'outcomeTokens'
            ? descending
              ? 'DESC'
              : 'ASC'
            : { tokenIndex: descending ? 'DESC' : 'ASC' },
      };
      if (take) {
        sortOptions.take = +take;
      }
      if (skip) {
        sortOptions.skip = +skip;
      }
    }

    const markets = await Promise.all(
      (
        await this.predictionMarketRepository.find({
          where: {
            ...mainFilters,
            ...(category ? { categoryId: +category } : {}),
            ...(creator ? { creatorId: +creator } : {}),
            ...(subject ? { subject: ILike(subject) } : {}),
          },
          ...sortOptions,
          ...(relations ? { relations } : {}),
        })
      ).map(async (market) => {
        market['participants'] = await this.getNumberOfParticipants(
          market.id,
          'market',
        );
        return market as PredictionMarketEntityWithParticipantsCount;
      }),
    );

    if (!markets?.length) {
      return [];
    }

    if (isSortByParticipantRequested) {
      // sort by participants & its pagination differs from normal sorts
      markets.sort(
        descending
          ? (m1, m2) => m2.participants - m1.participants
          : (m1, m2) => m1.participants - m2.participants,
      );
      if (skip != null || take != null) {
        return markets.slice(skip, take);
      }
    }
    return markets;
  }

  async getMarket(id: number, ...relations: string[]) {
    const market = await this.predictionMarketRepository.findOne({
      where: { id },
      ...(relations ? { relations } : {}),
      ...(relations.includes('outcomeTokens')
        ? {
            order: {
              outcomeTokens: {
                tokenIndex: 'ASC',
              },
            },
          }
        : {}),
    });

    if (!market) {
      throw new NotFoundException('Market not found!');
    }
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

  async findMarketByCondition(
    conditionId: string,
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
      where: { conditionId },
      ...(relations ? { relations } : {}),
      ...(outcomeTokensOrder
        ? { order: { outcomeTokens: outcomeTokensOrder } }
        : {}),
    });

    if (!market && shouldThrow)
      throw new NotFoundException('Market not found!');
    return market;
  }

  async updatePredictionMarketData(
    id: number,
    updatedFieldsData: UpdatePredictionMarketDto,
  ) {
    const market = await this.getMarket(
      id,
      ...(updatedFieldsData?.fee != null ? ['ammFactory'] : []),
    );

    if (
      updatedFieldsData.creatorId != null &&
      !(await this.userService.findOne(updatedFieldsData.creatorId, false))
    ) {
      throw new NotFoundException('New creator not found!');
    }

    if (
      updatedFieldsData.categoryId != null &&
      !(await this.doesCategoryExist(updatedFieldsData.categoryId))
    ) {
      throw new NotFoundException('No such category!');
    }

    const mappedFields: Partial<BasePredictionMarket> = {};

    if (updatedFieldsData.resolveAt) {
      if (updatedFieldsData.resolveAt <= new Date()) {
        throw new BadRequestException('Provided resolveAt data has passed!');
      }
      mappedFields.shouldResolveAt = updatedFieldsData.resolveAt;
      delete updatedFieldsData.resolveAt;
    }

    if (updatedFieldsData.fee != null) {
      updatedFieldsData.fee /= 100.0;
      if (updatedFieldsData.fee < 0 || updatedFieldsData.fee >= 100) {
        throw new BadRequestException(
          'Invalid fee! supported range for fee is [0-100)',
        );
      }
    }
    if (market.fee !== updatedFieldsData.fee) {
      await this.predictionMarketContractsService.changeMarketFeeRatio(
        market,
        updatedFieldsData.fee,
      );
    }
    Object.assign(mappedFields, updatedFieldsData);
    Object.assign(market, mappedFields);

    return this.predictionMarketRepository.save(market);
  }

  async pinMarket(id: number) {
    await this.predictionMarketRepository
      .createQueryBuilder('pm')
      .update()
      .set({
        priority: () =>
          `(SELECT COALESCE(MAX(priority), 1) + 1 FROM prediction_market WHERE id != ${id})`,
      })
      .where('id = :id', { id })
      .execute();
  }

  async softRemovePredictionMarket(id: number) {
    const [market, outcomeCollections] = await Promise.all([
      this.getMarket(id, 'outcomeTokens'),
      this.outcomeCollectionRepository.findBy({ marketId: id }),
    ]);

    return Promise.all([
      this.predictionMarketRepository.softRemove(market),
      this.conditionalTokenRepository.softRemove(market.outcomeTokens),
      this.outcomeCollectionRepository.softRemove(outcomeCollections),
    ]); // TODO/ASK: SoftRemove PredictionMarketParticipation or not? (considering that it causes get-stat endpoints take into account removed markets participations)
  }

  async findReservedPredictionMarkets(
    {
      take,
      skip,
      category,
      subject,
      creator,
      sort = ReservedPredictionMarketSortOptionsDto.START_DATE,
      descending = false,
      willStartBefore = null,
      prioritized = false,
    }: GetReservedMarketsQuery = {},
    ...relations: string[]
  ) {
    const orderField = {
      [ReservedPredictionMarketSortOptionsDto.CREATION_DATE]: 'createdAt',
      [ReservedPredictionMarketSortOptionsDto.RESOLUTION_DATE]:
        'shouldResolveAt',
      [ReservedPredictionMarketSortOptionsDto.START_DATE]: 'shouldStartAt',
      [ReservedPredictionMarketSortOptionsDto.QUESTION_TEXT]: 'question',
      [ReservedPredictionMarketSortOptionsDto.NUMBER_OF_OUTCOMES]:
        'numberOfOutcomes',
    }[sort || ReservedPredictionMarketSortOptionsDto.START_DATE];

    const markets = await this.basePredictionMarketRepository.find({
      where: {
        ...(willStartBefore
          ? { shouldStartAt: LessThanOrEqual(willStartBefore) }
          : {}),
        ...(category ? { categoryId: +category } : {}),
        ...(creator ? { creatorId: +creator } : {}),
        ...(subject ? { subject: ILike(subject) } : {}),
      },
      order: {
        ...(prioritized ? { priority: 'DESC' } : {}),
        [orderField]: descending ? 'DESC' : 'ASC',
      },
      ...(take ? { take: +take } : {}),
      ...(skip ? { skip: +skip } : {}),
      ...(relations ? { relations } : {}),
    });

    return Promise.all(
      markets.map(async (market) => ({
        ...market,
        outcomeTokens: await this.baseConditionalTokenRepository.find({
          where: { marketId: market.id },
          order: {
            tokenIndex: 'ASC',
          },
        }),
      })),
    );
  }

  async getReservedPredictionMarket(id: number, ...relations: string[]) {
    const [market, outcomeTokens] = await Promise.all([
      this.basePredictionMarketRepository.findOne({
        where: { id },
        ...(relations ? { relations } : {}),
      }),
      this.baseConditionalTokenRepository.find({
        where: { marketId: id },
        order: {
          tokenIndex: 'ASC',
        },
      }),
    ]);

    if (!market) {
      throw new NotFoundException('There is no reserved market with such id!');
    }
    return { ...market, outcomeTokens };
  }

  async updateReservedPredictionMarketData(
    id: number,
    updatedFieldsData: UpdateReservedPredictionMarketDto,
  ) {
    const reservedMarket = await this.getReservedPredictionMarket(id);

    if (
      updatedFieldsData.question?.length &&
      (await this.isQuestionRepetitive(updatedFieldsData.question))
    ) {
      throw new BadRequestException(
        'There is an existing market/reserved market with such question!',
      );
    }

    if (
      updatedFieldsData.creatorId != null &&
      !(await this.userService.findOne(updatedFieldsData.creatorId, false))
    ) {
      throw new NotFoundException('New creator not found!');
    }

    if (
      updatedFieldsData.categoryId != null &&
      !(await this.doesCategoryExist(updatedFieldsData.categoryId))
    ) {
      throw new NotFoundException('No such category!');
    }

    const mappedFields: Partial<BasePredictionMarket> = {};
    if (updatedFieldsData.startAt) {
      if (updatedFieldsData.startAt <= new Date()) {
        throw new BadRequestException('Provided start date has passed!');
      }
      if (updatedFieldsData.resolveAt) {
        if (updatedFieldsData.resolveAt <= updatedFieldsData.startAt) {
          throw new BadRequestException(
            'Provided resolveAt date is before provided startAt date!',
          );
        }
      } else if (updatedFieldsData.startAt >= reservedMarket.shouldResolveAt) {
        throw new BadRequestException(
          "Provided start date is passed market's resolution date! Either provide a valid start date or provide a new resolveAt date too.",
        );
      }
      mappedFields.shouldStartAt = updatedFieldsData.startAt;
      delete updatedFieldsData.startAt; // since Object.assign is used & BasePredictionMarket doesn't have startAt field
    }

    if (updatedFieldsData.resolveAt) {
      if (
        updatedFieldsData.resolveAt <= new Date() ||
        (updatedFieldsData.resolveAt <= reservedMarket.shouldStartAt &&
          !updatedFieldsData.startAt)
      ) {
        throw new BadRequestException(
          'Invalid resolution date provided! Either provide a resolveAt date in future & after market start date, or provide a new startAt too.',
        );
      }
      mappedFields.shouldResolveAt = updatedFieldsData.resolveAt;
      delete updatedFieldsData.resolveAt;
    }

    if (updatedFieldsData.collateralToken?.length) {
      const collateralToken =
        await this.blockchainHelperService.getCryptocurrencyToken(
          updatedFieldsData.collateralToken as CryptoTokenEnum,
          reservedMarket.chainId,
        );
      if (!collateralToken?.abi?.length) {
        throw new NotImplementedException(
          `OmenArena does not support ${updatedFieldsData.collateralToken} as market collateral [on chain#${reservedMarket.chainId}] yet!`,
        );
      }
      mappedFields.collateralToken = collateralToken;
      delete updatedFieldsData.collateralToken; // since Object.assign is used & BasePredictionMarket.collateralToken differs in type.
    }

    if (updatedFieldsData.marketType) {
      const factory =
        await this.predictionMarketContractsService.getMarketMakerFactoryByType(
          updatedFieldsData.marketType as PredictionMarketTypesEnum,
          { chainId: reservedMarket.chainId, shouldThrow: true },
        );
      if (!factory?.abi?.length || !factory?.address)
        throw new NotImplementedException(
          `OmenArena doesn't support ${updatedFieldsData.marketType} markets [on chain#${reservedMarket.chainId}] yet!`,
        );
      mappedFields.ammFactory = factory;
      delete updatedFieldsData.marketType;
    }

    if (updatedFieldsData.oracleId != null) {
      mappedFields.oracle = await this.getOracle(updatedFieldsData.oracleId, {
        shouldThrow: true,
      });
    }

    if (updatedFieldsData.outcomes?.length) {
      await this.baseConditionalTokenRepository.softRemove(
        reservedMarket.outcomeTokens,
      );
      reservedMarket.outcomeTokens.splice(
        0,
        reservedMarket.outcomeTokens.length,
      );

      const predictionOutcomes = await this.getPredictionOutcomes(
        updatedFieldsData.outcomes,
      );

      reservedMarket.outcomeTokens =
        await this.baseConditionalTokenRepository.save(
          predictionOutcomes.map((outcome, i) =>
            this.baseConditionalTokenRepository.create({
              tokenIndex: i,
              market: reservedMarket,
              predictionOutcome: outcome,
              description: updatedFieldsData.outcomes[i].description,
            }),
          ),
        );
      mappedFields.numberOfOutcomes = reservedMarket.outcomeTokens.length;
      updatedFieldsData.outcomes.splice(0, updatedFieldsData.outcomes.length); // making sure of garbage collection.
      delete updatedFieldsData.outcomes;
    }

    if (updatedFieldsData.fee != null) {
      updatedFieldsData.fee /= 100.0;
      if (updatedFieldsData.fee < 0 || updatedFieldsData.fee >= 100) {
        throw new BadRequestException(
          `Invalid fee! supported range for fee is [0-100)`,
        );
      }
    }
    Object.assign(mappedFields, updatedFieldsData);
    Object.assign(reservedMarket, mappedFields);
    await this.basePredictionMarketRepository.save(
      reservedMarket as BasePredictionMarket,
    );
    return reservedMarket;
  }

  async softRemoveReservedPredictionMarket(id: number) {
    const reservedMarket = await this.getReservedPredictionMarket(id);

    return Promise.all([
      this.basePredictionMarketRepository.softRemove(
        reservedMarket as BasePredictionMarket,
      ),
      reservedMarket?.outcomeTokens?.length
        ? this.baseConditionalTokenRepository.softRemove(
            reservedMarket.outcomeTokens,
          )
        : null,
    ]);
  }

  async updateOutcomeIcon(
    id: number,
    iconFilename: string,
    {
      reserved = false,
      shouldThrow = true,
    }: { reserved?: boolean; shouldThrow?: boolean } = {},
  ): Promise<BaseConditionalToken | ConditionalToken | null> {
    const outcome: BaseConditionalToken | ConditionalToken | null = await (
      reserved
        ? this.baseConditionalTokenRepository
        : this.conditionalTokenRepository
    ).findOne({ where: { id } });
    if (!outcome) {
      if (shouldThrow) {
        throw new NotFoundException('No such outcome to update!');
      }
      return null;
    }
    outcome.predictionOutcome = await this.getSinglePredictionOutcomeInstance({
      title: outcome.title,
      icon: iconFilename,
    }); // The reason were not directly updating outcome.predictionOutcome.icon is because that PredictionOutcome instance is used in other conditional tokens.

    return outcome instanceof ConditionalToken
      ? this.conditionalTokenRepository.save(outcome)
      : this.baseConditionalTokenRepository.save(outcome);
  }

  async checkCanSell(
    user: User,
    marketId: number,
    outcomeIndex: number,
    sellAmount: number,
  ) {
    const balance = +(await this.getConditionalTokenBalance(
      user,
      +marketId,
      +outcomeIndex,
    ));
    if (sellAmount > balance) {
      throw new ForbiddenException(
        `You don't have such amount to sell! You're ${
          sellAmount - balance
        } tokens short!`,
      );
    }
    return 'OK';
  }

  async trade(
    traderId: number,
    {
      marketId,
      amount = null,
      payment = null,
      outcomeIndex,
    }: {
      marketId: number;
      amount?: number;
      payment?: number;
      outcomeIndex: number;
    },
    isSelling: boolean = false,
  ) {
    if ((!amount && !payment) || (amount && payment))
      throw new BadRequestException(
        'You must either specify outcome amount or payment amount',
      );
    const market = await this.getMarket(marketId, 'outcomeTokens'); // Also collateral token which is set 'eager', if you intend to disable the eager option, you should add it here.
    if (market.closedAt)
      throw new BadRequestException('This market is closed!');
    if (outcomeIndex >= market.numberOfOutcomes)
      throw new BadRequestException('You have selected an invalid outcome.');

    if (payment) {
      ({ payment, amount } = await this.calculatePurchasableTokens(
        market,
        outcomeIndex,
        !isSelling ? payment : -payment,
      ));
    } else if (isSelling) {
      amount *= -1;
    }

    return {
      amount: Math.abs(amount),
      receipt: await this.predictionMarketContractsService.trade(
        traderId,
        market,
        outcomeIndex,
        amount,
        payment,
      ),
    };
  }

  async calculatePurchasableTokens(
    marketId: number,
    outcomeIndex: number,
    paymentAmount: number,
  ): Promise<{ payment: number; amount: number }>;
  async calculatePurchasableTokens(
    market: PredictionMarket,
    outcomeIndex: number,
    paymentAmount: number,
  ): Promise<{ payment: number; amount: number }>;
  async calculatePurchasableTokens(
    marketIdent: PredictionMarket | number,
    outcomeIndex: number,
    paymentAmount: number,
  ): Promise<{ payment: number; amount: number }> {
    const market =
      typeof marketIdent === 'number'
        ? await this.getMarket(marketIdent, 'ammFactory', 'outcomeTokens')
        : marketIdent;
    switch (market.type as PredictionMarketTypesEnum) {
      case PredictionMarketTypesEnum.LMSR:
        return this.calculateLmsrPurchasableTokens(
          market,
          outcomeIndex,
          paymentAmount,
        );
      case PredictionMarketTypesEnum.FPMM:
        return this.calculateFpmmPurchasableTokens(
          market,
          outcomeIndex,
          paymentAmount,
        );
    }

    throw new NotImplementedException(
      'This feature is not implemented for this type of market!',
    );
  }

  async calculateLmsrPurchasableTokens(
    market: PredictionMarket,
    outcomeIndex: number,
    payment: number,
    cutPrecision = 2, // in digits.
  ): Promise<{ payment: number; amount: number }> {
    let actualPayment = payment;
    if (MarketEconomicConstants.TRADE_SLIPPAGE) {
      actualPayment -= actualPayment * MarketEconomicConstants.TRADE_SLIPPAGE;
    }
    if (market.fee) {
      if (payment >= 0) {
        actualPayment /= 1 + market.fee;
      } else {
        actualPayment = payment = payment / (1 - market.fee);
      }
    }
    const marketLiquidity =
      await this.predictionMarketContractsService.getMarketFunding(market);
    const b = marketLiquidity / Math.log(market.numberOfOutcomes);
    const exp = (val: number) => Math.exp(val / b);

    const currentShares = market.outcomeTokens.map((t) => t.amountInvested);
    const sumExpQ = currentShares.reduce((sum, q) => sum + exp(q), 0);
    const currentCost = b * Math.log(sumExpQ);

    const newCost = currentCost + actualPayment;
    const sumExpOthers = sumExpQ - exp(currentShares[outcomeIndex]);
    const newExpQi = Math.exp(newCost / b) - sumExpOthers;

    const deltaQi = b * Math.log(newExpQi) - currentShares[outcomeIndex];

    if (cutPrecision) {
      return { payment, amount: approximate(deltaQi, 'floor', cutPrecision) };
    }
    return { payment, amount: deltaQi };
  }

  async calculateFpmmPurchasableTokens(
    market: PredictionMarket,
    outcomeIndex: number,
    paymentAmount: number,
  ) {
    // TODO: Add fee effect
    const outcomePrice = await this.getSingleOutcomePrice(market, outcomeIndex);
    return {
      payment: paymentAmount,
      amount:
        paymentAmount /
        Math.min(outcomePrice + MarketEconomicConstants.TRADE_SLIPPAGE, 1.0),
    };
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
      id: token.id,
      outcome: token.title,
      index: token.tokenIndex,
      balance: balances[i],
      token,
    }));
  }

  async getMarketCollateralBalance(marketId: number) {
    const market = await this.getMarket(marketId, 'chain');
    return this.blockchainWalletService.getMarketCollateralBalance(market);
  }

  async getMarketEquivalentCollateralBalance(marketId: number): Promise<number>;
  async getMarketEquivalentCollateralBalance(
    market: PredictionMarket,
  ): Promise<number>;

  async getMarketEquivalentCollateralBalance(
    marketIdentity: number | PredictionMarket,
  ) {
    try {
      const market =
        typeof marketIdentity === 'number'
          ? await this.getMarket(marketIdentity, 'ammFactory', 'outcomeTokens')
          : marketIdentity;
      const balancesOrdered = await Promise.all(
        market.outcomeTokens.map((token) =>
          this.predictionMarketContractsService.getMarketConditionalTokenBalance(
            market,
            token.tokenIndex,
          ),
        ),
      );

      return (
        await this.predictionMarketContractsService.getBatchOutcomePrices(
          market,
          balancesOrdered.map((x) => +x.toFixed()),
        )
      ).toNumber();
    } catch (ex) {
      this.loggerService.error(
        `Failed calculating total oracle pool for market`,
        ex as Error,
        { data: { market: marketIdentity } },
      );
    }
    return 0;
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
      id: token.id,
      outcome: token.title,
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
    return (
      await this.blockchainWalletService.getBalance(
        userId,
        market.collateralToken,
        market.chainId,
      )
    )?.balance;
  }

  getTradeModeCoefficient(mode: PredictionMarketTradeModesEnum) {
    return mode === PredictionMarketTradeModesEnum.SELL ? -1 : 1;
  }

  async getAllOutcomesPrices(marketId: number, amount: number = 1) {
    const market = await this.getMarket(
      marketId,
      'ammFactory',
      'outcomeTokens',
    );
    return Promise.all(
      (
        await this.predictionMarketContractsService.getMarketAllOutcomePrices(
          market,
          amount,
        )
      ).map(async (outcome) => ({
        ...outcome,
        participants: await this.getNumberOfParticipants(outcome.id, 'outcome'),
      })),
    );
  }

  async getSingleOutcomePrice(
    marketId: number,
    outcomeIndex: number,
    amount?: number,
  ): Promise<number>;
  async getSingleOutcomePrice(
    market: PredictionMarket,
    outcomeIndex: number,
    amount?: number,
  ): Promise<number>;

  async getSingleOutcomePrice(
    marketIdentifier: number | PredictionMarket,
    outcomeIndex: number,
    amount: number = 1,
  ) {
    const market =
      typeof marketIdentifier === 'number'
        ? await this.getMarket(marketIdentifier, 'outcomeTokens')
        : marketIdentifier;
    if (!market.isOpen) {
      return market.outcomeTokens?.find(
        (outcome) => outcome.tokenIndex === outcomeIndex,
      )?.truenessRatio;
    }
    return (
      await this.predictionMarketContractsService.getMarketOutcomePrice(
        market,
        outcomeIndex,
        amount,
      )
    ).toNumber();
  }

  async getAllOutcomesMarginalPrices(marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    const prices = await Promise.all(
      market.outcomeTokens.map((token) =>
        this.predictionMarketContractsService.getOutcomeTokenMarginalPrices(
          market,
          token.tokenIndex,
        ),
      ),
    );
    return market.outcomeTokens.map((token, i) => ({
      id: token.id,
      outcome: token.title,
      index: token.tokenIndex,
      price: prices[i],
      token,
    }));
  }

  async getSingleOutcomeMarginalPrice(marketId: number, outcomeIndex: number) {
    const market = await this.getMarket(marketId);
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
        closedAt: IsNull(),
        ...(onlyPassedDue
          ? { shouldResolveAt: LessThanOrEqual(new Date()) }
          : {}),
      },
      ...(relations?.length ? { relations } : {}),
      ...(relations.includes('outcomeTokens')
        ? {
            order: {
              outcomeTokens: {
                tokenIndex: 'ASC',
              },
            },
          }
        : {}),
    });
  }

  async informUsersAboutSoonClosingMarkets(hoursRemaining: number) {
    const millisecondsRemaining = hoursRemaining * 3600000;
    const edgeDateStartMS = Date.now() + millisecondsRemaining;
    const marketsSoonClosing = await this.predictionMarketRepository.find({
      where: {
        closedAt: IsNull(),
        shouldResolveAt: Between(
          new Date(edgeDateStartMS),
          new Date(
            edgeDateStartMS +
              Math.min(
                PredictionMarketService.marketsCheckoutIntervalInMinutes *
                  60000,
                millisecondsRemaining,
              ), // This is for preventing markets processor to rapidly sending 'Market soon closes' notification in every interval in remaining hour(s);
          ),
        ),
      },
      relations: ['outcomeTokens'],
    });

    return Promise.all(
      marketsSoonClosing.map((market) =>
        this.webPushNotificationService.pushCheckoutPredictionMarketToSubscribers(
          market,
          { predictionMarketClosingSoon: true },
          `⚠️ Market Will Close In Nearly ${hoursRemaining} Hour${
            hoursRemaining > 1 ? 's' : ''
          }`,
        ),
      ),
    );
  }

  async closeMarket(market: PredictionMarket) {
    await this.predictionMarketContractsService.closeMarket(market);
    market.closedAt = new Date();
    try {
      await this.cacheService.del(`AMM.${market.id}`);
    } catch {}
    return this.predictionMarketRepository.save(market);
  }

  async finalizeMarket(market: PredictionMarket) {
    await this.closeMarket(market);

    if (!market.oracle) {
      try {
        market.oracle = await this.getOracle(market.oracleId, {
          shouldThrow: true,
        });
      } catch (ex) {
        this.loggerService.error(
          `Failed loading Market#${market.id} oracle data to complete market finalization!`,
          ex as Error,
          { data: { market, oracleId: market.oracleId } },
        );
        return;
      }
    }

    switch (market.oracle.type as OracleTypesEnum) {
      case OracleTypesEnum.CENTRALIZED:
        if (market.oracle.account?.userId != null) {
          try {
            const oracleUser = await this.userService.findOne(
              market.oracle.account.userId,
              true,
            );
            this.webPushNotificationService.pushPredictionMarketResolveTime(
              oracleUser,
              market,
            );
          } catch (ex) {
            this.loggerService.error(
              `Failed notifying centralized Oracle \`${market.oracle.name}\` to start resolving market#${market.id}.`,
              ex as Error,
              { data: { market, oracleId: market.oracleId } },
            );
          }
        }
        break;
      case OracleTypesEnum.DECENTRALIZED:
        // TODO: Decentralized oracle implementation ...
        break;
    }
  }

  async changeMarketLiquidity(
    user: User,
    marketId: number,
    changeAmount: number,
  ) {
    const market = await this.getMarket(marketId);
    if (user.id !== market.creatorId) {
      throw new ForbiddenException(
        'Not allowed! Only creator can change liquidity!',
      );
    }
    if (market.closedAt) {
      throw new BadRequestException('Market is closed!');
    }

    return this.predictionMarketContractsService.changeMarketLiquidity(
      market,
      changeAmount,
    );
  }

  async forceCloseMarket(performer: User, marketId: number) {
    const market = await this.getMarket(marketId);
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
    force: boolean = false,
  ) {
    const market = await this.getMarket(
      marketId,
      'chain',
      'outcomeTokens',
      'oracle',
    );
    if (market.oracle.type !== OracleTypesEnum.CENTRALIZED.toString())
      throw new MethodNotAllowedException(
        'This action is only allowed on markets with centralized oracles.',
      );
    if (!force) {
      try {
        if (
          market.oracle.account.userId !== user.id ||
          market.oracle.account.address !==
            (
              await this.blockchainWalletService.getWallet(user.id, {
                throwIfNotFound: true,
              })
            )?.address
        )
          throw new ForbiddenException();
      } catch (ex) {
        // since blockchainWalletService may throw NotFound exception, this way the error message will still be related to the request.
        throw new ForbiddenException(
          "You're not allowed to do this since you're not this market's oracle.",
        );
      }
    }
    if (market.isOpen) {
      if (market.creatorId !== user.id) {
        throw new ForbiddenException(
          'Only market creator can force close the market!',
        );
      }
      if (!force) {
        throw new BadRequestException(
          'Market is not closed yet! This action is only available after market closes.',
        );
      }
      market.ammFactory =
        await this.predictionMarketContractsService.getMarketMakerFactoryById(
          market.ammFactoryId,
        );
      await this.closeMarket(market);
    }

    if (!(marketAnswer instanceof Array)) {
      marketAnswer = Array(market.numberOfOutcomes)
        .fill(0)
        .map((_, i) => (i === marketAnswer ? 1 : 0));
    }

    const result = await this.predictionMarketContractsService.resolveMarket(
      market,
      marketAnswer,
    );

    return result;
  }

  async updateMarketParticipations(
    market: PredictionMarket,
    {
      tokenAmounts,
      trader: traderAddress,
      marketFee,
      cost,
    }: PredictionMarketTradeDataType,
  ) {
    if (tokenAmounts.length > market.outcomeTokens.length)
      throw new Error(
        "Invalid event log decoding, trade data doesn't match market info.",
      );
    const traderWallet = await this.blockchainWalletService.findByAddress(
      traderAddress,
      {
        throwIfNotFound: false,
        relations: ['user'],
      },
    );
    const participations: PredictionMarketParticipation[] = [];

    const [actualCost, actualMarketFee] = (
      await Promise.all([
        this.blockchainHelperService.toEthers(cost, market.collateralToken),
        this.blockchainHelperService.toEthers(
          marketFee,
          market.collateralToken,
        ),
      ])
    ).map((bigNumber) => bigNumber.toNumber());

    for (let i = 0; i < tokenAmounts.length; i++) {
      if (!tokenAmounts[i]) {
        continue;
      }
      const actualAmount = (
        await this.blockchainHelperService.toEthers(
          tokenAmounts[i],
          market.collateralToken,
        )
      ).toNumber();
      market.outcomeTokens[i].amountInvested += actualAmount;

      participations.push(
        this.predictionMarketParticipationRepository.create({
          user: traderWallet?.user,
          market,
          amount: Math.abs(actualAmount),
          paymentToken: market.collateralToken,
          paymentAmount: Math.abs(actualCost),
          mode:
            actualAmount > 0
              ? PredictionMarketParticipationModesEnum.BUY
              : PredictionMarketParticipationModesEnum.SELL,
          marketFee: actualMarketFee,
          outcome: market.outcomeTokens[i],
        }),
      ); // NOTICE: Although this code processes multiple token purchase too; But we only allow single outcome purchases at once; Which is ok for now.
      // But in case multiple-outcome purchase [at once] is allowed, Then the payment value must be divided;
      // otherwise the payment sum in PMParticipation table will be invalid; It has an important challenge though: since the outcome price is changed.
    }

    await Promise.all([
      this.conditionalTokenRepository.save(market.outcomeTokens),
      this.predictionMarketRepository.save(market),
      this.predictionMarketParticipationRepository.save(participations),
    ]);
    this.cacheOngoingMarketPrices(market);
    return participations;
  }

  async cacheOngoingMarketPrices(market: PredictionMarket) {
    const priceData =
      await this.predictionMarketContractsService.getMarketAllOutcomePrices(
        market,
      );
    let sumOfPrices = 0;
    for (const outcomePriceInfo of priceData) {
      sumOfPrices += outcomePriceInfo.price;
    }
    await this.cacheService.set(
      `AMM.${market.id}`,
      {
        each: priceData.map((data) => ({
          id: data.id,
          index: data.index,
          price: data.price,
        })),
        sum: sumOfPrices,
      } as AmmMarketPriceCacheType,
      21400000,
    );
  }

  async getMarketOutcomeState(
    market: PredictionMarket | PredictionMarketEntityWithParticipantsCount,
    {
      unwrapTokenField = true,
      appendParticipantsData = false,
    }: { unwrapTokenField?: boolean; appendParticipantsData?: boolean } = {},
  ): Promise<
    (
      | OutcomeTokenParticipationInfo
      | OutcomeStatistics
      | OutcomeStatisticsWithParticipants
    )[]
  > {
    const cache = (await this.cacheService.get(
      `AMM.${market.id}`,
    )) as AmmMarketPriceCacheType;

    const priceData = cache?.each?.length
      ? cache.each.map((data) => ({
          ...data,
          outcome: market.outcomeTokens[data.index].predictionOutcome.title,
          token: market.outcomeTokens[data.index],
        }))
      : await this.predictionMarketContractsService.getMarketAllOutcomePrices(
          market,
        );
    let sumOfPrices = cache?.sum ?? 0;
    if (!sumOfPrices) {
      for (const outcomePriceInfo of priceData) {
        sumOfPrices += outcomePriceInfo.price;
      }
    }
    const extra = appendParticipantsData
      ? await Promise.all(
          priceData.map(async (outcome) => ({
            participants: await this.getNumberOfParticipants(
              outcome.id,
              'outcome',
            ),
          })),
        )
      : [];
    if (!unwrapTokenField) {
      return priceData.map((outcome, idx) => ({
        ...outcome,
        participationPossibility: (outcome.price / sumOfPrices) * 100.0,
        ...(extra[idx] || {}),
      }));
    }
    return priceData.map(({ token, ...outcome }, idx) => ({
      ...outcome,
      participationPossibility: (outcome.price / sumOfPrices) * 100.0,
      investment: token.amountInvested,
      collectionId: token.collectionId,
      ...(market.isResolved ? { truenessRatio: token.truenessRatio } : {}),
      icon: token.predictionOutcome.icon,
      ...(extra[idx] || {}),
    }));
  }

  async getMarketOutcomesPossibility(
    marketId: number,
    basis: OutcomePossibilityBasisEnum,
  ) {
    let market: PredictionMarket;
    switch (basis) {
      case OutcomePossibilityBasisEnum.INVESTMENT:
        market = await this.getMarket(marketId, 'outcomeTokens');
        const totalInvestment = market.totalInvestment;
        return market.outcomeTokens.map((token) => ({
          id: token.id,
          outcome: token.title,
          index: token.tokenIndex,
          participationPossibility:
            (100 * token.amountInvested) / totalInvestment,
          token,
        }));
      case OutcomePossibilityBasisEnum.PRICE:
        market = await this.getMarket(marketId, 'outcomeTokens');
        return this.getMarketOutcomeState(market, { unwrapTokenField: false }); // Default possibility is based on outcome price.
      case OutcomePossibilityBasisEnum.LIQUIDITY:
        const liquidities = await this.getMarketLiquidity(marketId);
        let sum = new BigNumber(0);
        for (const outcome of liquidities) {
          sum = sum.plus(outcome.balance);
        }
        return liquidities.map((outcome) => ({
          ...outcome,
          participationPossibility:
            100 * (1 - outcome.balance.div(sum).toNumber()),
        }));
      case OutcomePossibilityBasisEnum.COLLATERAL:
        market = await this.getMarket(marketId, 'outcomeTokens');
        let collateralPool: number = 0;
        const perOutcomeCollateral = await Promise.all(
          market.outcomeTokens.map(async (outcome) => {
            const collateralPutOnOutcome =
              await this.getMarketTotalCollateralPool(market.id, {
                outcomeId: outcome.id,
              });
            collateralPool += collateralPutOnOutcome;
            return collateralPutOnOutcome;
          }),
        );
        return market.outcomeTokens.map((token, idx) => ({
          id: token.id,
          outcome: token.title,
          index: token.tokenIndex,
          token,
          participationPossibility:
            (100 * perOutcomeCollateral[idx]) / collateralPool,
        }));
    }
  }

  async setMarketResolutionData(
    resolutionData: PredictionMarketResolutionDataType,
  ) {
    const market = await this.findByQuestionId(resolutionData.questionId, {
      conditionId: resolutionData.conditionId,
      relations: ['outcomeTokens', 'ammFactory'],
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
          outcomes: market.outcomeTokens,
          resolutionData,
        },
      },
    });

    try {
      if (!(await this.predictionMarketContractsService.withdrawFees(market))) {
        if (+market.fee > 0) {
          this.loggerService.debug(
            `Market#${market.id} successfully closed and resolved, but there were no fees to collect.`,
            {
              data: {
                market: {
                  id: market.id,
                  question: market.question,
                },
              },
            },
          );
        }
      }
    } catch (ex) {
      this.loggerService.error(
        `Fee collection after market resolution failed!`,
        ex,
        {
          data: {
            market: {
              id: market.id,
              question: market.question,
            },
          },
        },
      );
    }
    this.notifyUsersInterestedInMarketResolution(market, resolutionData).catch(
      // start sending notifications in background
      (ex) =>
        this.loggerService.error(
          `General error happened when trying to globally inform interested users (participants/winners) about market#${market.id} resolution result.`,
          ex as Error,
          {
            data: {
              marketId: market.id,
              resolutionData,
            },
          },
        ),
    );
  }

  async notifyUsersInterestedInMarketResolution(
    market: PredictionMarket,
    resolutionData: PredictionMarketResolutionDataType,
  ) {
    const winnerOutcomes = market.outcomeTokens.filter(
      (outcome) => outcome.truenessRatio,
    );

    let truenessRatioSum = 0;
    const [participants, ...winners] = await Promise.all([
      this.findParticipants(market.id, 'market'),
      ...winnerOutcomes.map((tk) => {
        truenessRatioSum += tk.truenessRatio;
        return this.findParticipants(tk.id, 'outcome');
      }),
    ]);

    this.webPushNotificationService
      .pushPredictionMarketIsResolvedToParticipants(market, participants)
      .catch((ex) =>
        this.loggerService.error(
          `Panic at web push notification for market resolution [to participants]`,
          ex as Error,
          {
            data: {
              marketId: market.id,
              resolutionData,
              participants: participants?.length,
            },
          },
        ),
      );

    for (let i = 0; i < winnerOutcomes.length; i++) {
      Promise.all(
        winners[i]
          .filter(
            (user) =>
              user?.notificationSettings?.webPushSubscription &&
              user.notificationSettings.wonPredictionMarketBet,
          )
          .map(async (user) => {
            const balance = await this.getConditionalTokenBalance(
              user,
              market.id,
              winnerOutcomes[i].tokenIndex,
            );
            return this.webPushNotificationService.pushUserHasWonABet(
              market,
              user,
              winnerOutcomes[i],
              balance
                .multipliedBy(winnerOutcomes[i].truenessRatio)
                .div(truenessRatioSum)
                .toNumber(),
              true,
            );
          }),
      );
    }
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

  async collectMarketFees(user: User, marketId: number) {
    const market = await this.getMarket(marketId, 'ammFactory');
    if (user.id !== market.creatorId) {
      throw new ForbiddenException('Access denied!');
    }
    try {
      const tx =
        await this.predictionMarketContractsService.withdrawFees(market);
      return {
        result: tx ? 'OK' : 'Nothing to collect!',
        feePercent: (market.fee ?? 0) * 100.0,
        tx,
      };
    } catch (ex) {
      this.loggerService.error(
        `User#${user.id} [${user.username}] requested collecting fee from Market#${market.id} but operation failed:`,
        ex,
        {
          data: {
            market: {
              id: market.id,
              question: market.question,
            },
          },
        },
      );
      throw new MethodNotAllowedException(
        'Can not collect market fees because: ' +
          truncateString((ex as Error).message),
      );
    }
  }

  async findUserTrades(
    userId: number,
    {
      marketId = null,
      sort = null,
      descending = false,
      mode = null,
      result = null,
      indexSet = null,
      outcome = null,
      skip = null,
      take = null,
    }: TradeHistoryOptionsDto & { marketId?: number } = {},
    relations?: string[],
  ) {
    const sortOptionToFieldNameMap =
      {
        [PredictionMarketParticipationSortByOptionsEnum.DATE]: 'createdAt',
        [PredictionMarketParticipationSortByOptionsEnum.AMOUNT]: 'amount',
        [PredictionMarketParticipationSortByOptionsEnum.PAYMENT]:
          'paymentAmount',
        [PredictionMarketParticipationSortByOptionsEnum.MARKET]: 'marketId',
      }[sort] || 'createdAt';

    const outcomeConditions: FindOptionsWhere<ConditionalToken> =
      indexSet != null ? { tokenIndex: indexSet } : {};
    if (outcome?.length) {
      outcomeConditions.predictionOutcome = { title: ILike(outcome) };
    }

    let trades = await this.predictionMarketParticipationRepository.find({
      where: {
        userId,
        ...(marketId ? { marketId } : {}),
        ...(mode ? { mode } : {}),
        ...(Object.values(outcomeConditions)?.length
          ? { outcome: outcomeConditions }
          : {}),
      },
      order: { [sortOptionToFieldNameMap]: descending ? 'DESC' : 'ASC' },
      ...(relations?.length ? { relations } : {}),
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
    });

    if (result) {
      // since Participation.result is a getter func, not a database column:
      trades = trades.filter((trade) => trade.result === result.toString());
    }
    return Promise.all(
      trades.map(async (trade) => ({
        ...trade,
        outcome: await this.syncPredictionOutcomeIconUrl(trade.outcome),
        result: trade.result,
      })),
    );
  }

  async getUserTotalTrades(
    userId: number,
    {
      marketId = null,
      sort = null,
      descending = false,
      mode = null,
      indexSet = null,
      outcome = null,
      skip = undefined,
      take = undefined,
      resolved,
    }: TotalTradeOptionsDto & { marketId?: number; resolved?: boolean } = {},
  ): Promise<TotalPerOutcomeTradeStatisticsDto[]> {
    const sortBy =
      {
        [PredictionMarketParticipationSortByOptionsEnum.DATE]:
          'outcome_created_at',
        [PredictionMarketParticipationSortByOptionsEnum.AMOUNT]: 'total',
        [PredictionMarketParticipationSortByOptionsEnum.PAYMENT]:
          'total_payments',
        [PredictionMarketParticipationSortByOptionsEnum.MARKET]:
          'outcome_market_id',
      }[sort] || 'outcome_created_at';

    const queryBuilder = this.predictionMarketParticipationRepository
      .createQueryBuilder('pm_participation')
      .select('pm_participation.outcome_id', 'outcomeId')
      .innerJoinAndSelect('pm_participation.outcome', 'outcome')
      .innerJoinAndSelect('outcome.predictionOutcome', 'predictionOutcome')
      .innerJoinAndSelect('pm_participation.paymentToken', 'paymentToken')
      .where('pm_participation.user_id = :userId', { userId })
      .orderBy(sortBy, descending ? 'DESC' : 'ASC')
      .groupBy('pm_participation.outcome_id')
      .addGroupBy('outcome.id')
      .addGroupBy('predictionOutcome.id')
      .addGroupBy('paymentToken.id');

    if (marketId) {
      queryBuilder.andWhere('pm_participation.market_id = :marketId', {
        marketId,
      });
    }
    if (!mode) {
      queryBuilder
        .addSelect(
          `SUM(
            CASE 
              WHEN pm_participation.mode = 'sell' THEN -pm_participation.amount
              ELSE pm_participation.amount
            END
          )`,
          'total',
        )
        .addSelect(
          `SUM(
              CASE 
                WHEN pm_participation.mode = 'sell' THEN -pm_participation.payment_amount
                ELSE pm_participation.payment_amount
              END
            )`,
          'total_payments',
        )
        .andWhere('pm_participation.mode IN (:...modes)', {
          modes: Object.values(PredictionMarketTradeModesEnum),
        });
    } else {
      queryBuilder
        .addSelect('SUM(pm_participation.amount)', 'total')
        .addSelect('SUM(pm_participation.payment_amount)', 'total_payments')
        .andWhere('pm_participation.mode = :mode', {
          mode: mode.toString(),
        });
    }
    if (indexSet != null) {
      queryBuilder.andWhere('outcome.token_index = :indexSet', { indexSet });
    }

    if (outcome?.length) {
      queryBuilder.andWhere('predictionOutcome.title ILIKE :outcomeTitle', {
        outcomeTitle: outcome,
      });
    }
    if (resolved) {
      queryBuilder.andWhere('outcome.trueness_ratio IS NOT NULL');
    }

    if (take != null) {
      queryBuilder.limit(take);
    }

    if (skip != null) {
      queryBuilder.offset(skip);
    }

    const data = await queryBuilder.getRawMany();

    if (!data?.length) {
      return data;
    }

    return Promise.all(
      data.map(async (participation) => ({
        outcomeId: +participation.outcome_id,
        createdAt: new Date(participation.outcome_created_at),
        marketId: +participation.outcome_market_id,
        collectionId: participation.outcome_collection_id,
        tokenIndex: +participation.outcome_token_index,
        amountInvested: +participation.outcome_amount_invested,
        truenessRatio: +participation.outcome_trueness_ratio,
        title: participation.predictionOutcome_title,
        icon: participation.predictionOutcome_icon
          ? await this.minioService.getOutcomeIconUrl(
              participation.predictionOutcome_icon,
            )
          : null,
        description: participation.outcome_description,
        paymentToken: {
          id: participation.paymentToken_id,
          name: participation.paymentToken_name,
          address: participation.paymentToken_address,
          symbol: participation.paymentToken_symbol,
          decimals: participation.paymentToken_decimals,
        },
        paymentChainId: +participation.paymentToken_chain_id,
        totalAmount: +participation.total,
        totalPayments: +participation.total_payments,
      })),
    );
  }

  async getUserParticipationStatistics(userId: number) {
    const [result, numberOfCreatedMarkets, totalOutcomes, popularTopicId] =
      await Promise.all([
        this.predictionMarketParticipationRepository
          .createQueryBuilder('pmp')
          .select([
            `COUNT(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN 1 END) AS purchases`,
            `COUNT(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN 1 END) AS sells`,
            'COUNT(DISTINCT pmp.outcome_id) AS outcomes_traded',
            `COUNT(DISTINCT CASE WHEN mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.outcome_id END) AS outcomes_purchased`,
            `COUNT(DISTINCT CASE WHEN mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.outcome_id END) AS outcomes_sold`,
            `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.amount ELSE 0 END) AS total_purchase_amount`,
            `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.amount ELSE 0 END) AS total_sell_amount`,
            `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.payment_amount ELSE 0 END) AS total_payments`,
            `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.payment_amount ELSE 0 END) AS total_payouts`,
            `COUNT(DISTINCT pmp.market_id) AS participated_markets`,
            'COUNT(DISTINCT CASE WHEN market.closed_at IS NOT NULL AND market.resolved_at IS NULL THEN pmp.outcome_id END) AS outcomes_to_be_resolved',
            `COUNT(DISTINCT CASE WHEN market.resolved_at IS NOT NULL THEN pmp.market_id END) AS participated_markets_resolved`,
            `COUNT(DISTINCT CASE WHEN market.closed_at IS NOT NULL THEN pmp.market_id END) AS participated_markets_closed`,
          ])
          .leftJoin('pmp.market', 'market')
          .where('user_id = :userId', { userId })
          .getRawOne(),
        this.predictionMarketRepository.countBy({ creatorId: userId }),
        this.getUserTotalTrades(userId),
        this.getPopularCategoryId(userId),
      ]);

    let numberOfWins = 0,
      totalRewards = 0;

    const actualTotalOutcomes = totalOutcomes.filter(
      (outcome) => outcome.totalAmount > 0,
    );

    for (const outcome of actualTotalOutcomes) {
      if (outcome.truenessRatio) {
        numberOfWins++;
        totalRewards += outcome.totalAmount * outcome.truenessRatio; // TODO: Formula is correct, but it would be better to look for better approach.
      }
    }

    return {
      numberOfPurchases: +result.purchases,
      numberOfSells: +result.sells,
      numberOfTrades: +result.purchases + +result.sells,
      totalPurchases: +result.total_purchase_amount,
      totalSells: +result.total_sell_amount,
      totalCollateralPayments: +result.total_payments,
      totalCollateralPayouts: +result.total_payouts,
      totalPayouts: 0, // TODO: Sum of all user withdrawals (Company real money payouts to user)
      numberOfOutcomesTraded: +result.outcomes_traded,
      numberOfOutcomesPurchased: +result.outcomes_purchased,
      numberOfOutcomesSold: +result.outcomes_sold,
      numberOfTradedOutcomesWaitingToBeResolved:
        +result.outcomes_to_be_resolved,
      numberOfParticipatedMarkets: +result.participated_markets,
      numberOfParticipatedMarketsClosed: +result.participated_markets_closed,
      numberOfParticipatedMarketsResolved:
        +result.participated_markets_resolved,
      numberOfParticipatedMarketsWaitingToBeResolved:
        +result.participated_markets_closed -
        +result.participated_markets_resolved,
      numberOfCreatedMarkets,
      wonPredicts: numberOfWins,
      totalRewards: totalRewards,
      currentShares: actualTotalOutcomes.length, // TODO: For now Number of outcomes user have is interpreted as CurrentShare; This should be revised after Its specified precisely.
      popularTopicId,
    };
  }

  async getGeneralParticipationStatistics() {
    const [participations, marketStats, popularTopicId] = await Promise.all([
      this.predictionMarketParticipationRepository
        .createQueryBuilder('pmp')
        .select([
          `COUNT(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN 1 END) AS purchases`,
          `COUNT(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN 1 END) AS sells`,
          'COUNT(DISTINCT pmp.user_id) AS all_players',
          'COUNT(DISTINCT pmp.outcome_id) AS outcomes_traded',
          `COUNT(DISTINCT CASE WHEN mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.outcome_id END) AS outcomes_purchased`,
          `COUNT(DISTINCT CASE WHEN mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.outcome_id END) AS outcomes_sold`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.amount ELSE 0 END) AS total_purchase_amount`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.amount ELSE 0 END) AS total_sell_amount`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' THEN pmp.payment_amount ELSE 0 END) AS total_payments`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' THEN pmp.payment_amount ELSE 0 END) AS total_collateral_payouts`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.BUY}' AND pmp.created_at >= NOW() - INTERVAL '24 HOURS' THEN pmp.payment_amount ELSE 0 END) AS total_purchase_amount_in_24h`,
          `SUM(CASE WHEN pmp.mode = '${PredictionMarketParticipationModesEnum.SELL}' AND pmp.created_at >= NOW() - INTERVAL '24 HOURS' THEN pmp.payment_amount ELSE 0 END) AS total_sell_amount_in_24h`,
        ])
        .leftJoin('pmp.market', 'market')
        .getRawOne(),
      this.predictionMarketRepository
        .createQueryBuilder('prediction_market')
        .select([
          'COUNT(*) AS markets',
          'COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) AS active_markets',
          'COUNT(CASE WHEN closed_at IS NOT NULL THEN 1 END) AS closed_markets',
          'SUM(CASE WHEN resolved_at IS NULL THEN num_of_outcomes END) AS active_outcomes',
          'SUM(num_of_outcomes) AS outcomes',
        ])
        .getRawOne(),
      this.getPopularCategoryId(),
    ]);

    const numberOfResolvedMarkets =
      +marketStats.markets - +marketStats.active_markets;

    const activePlayers = await this.userService.getUsersCount();

    const totalPurchases = +participations.total_purchase_amount,
      totalSells = +participations.total_sell_amount,
      totalCollateralPayments = +participations.total_payments,
      totalCollateralPayouts = +participations.total_collateral_payouts,
      collateralPaymentsIn24h = +participations.total_purchase_amount_in_24h,
      collateralPayoutsIn24h = +participations.total_sell_amount_in_24h;

    // FIXME: totalCollateralPayouts is the sum of incomes gained from selling tokens; There must be a field that counts redeem amounts too.
    return {
      // Outcome Tokens:
      numberOfPurchases: +participations.purchases,
      numberOfSells: +participations.sells,
      numberOfTrades: +participations.purchases + +participations.sells,
      totalPurchases,
      totalSells,
      totalOutcomesTransferred: totalPurchases + totalSells,
      // Collateral Tokens:
      totalCollateralPayments,
      totalCollateralPayouts,
      totalMarketVolume: totalCollateralPayments + totalCollateralPayouts,
      collateralPaymentsIn24h,
      collateralPayoutsIn24h,
      marketVolumeIn24h: collateralPaymentsIn24h + collateralPayoutsIn24h,
      totalOraclePool: totalCollateralPayments - totalCollateralPayouts,
      totalPayouts: 0, // TODO: Must update after implementation of withdraw section.
      numberOfActivePlayers: activePlayers,
      numberOfOutcomesTraded: +participations.outcomes_traded,
      numberOfOutcomesPurchased: +participations.outcomes_purchased,
      numberOfOutcomesSold: +participations.outcomes_sold,
      numberOfMarkets: +marketStats.markets,
      numberOfActiveMarkets: +marketStats.active_markets,
      numberOfResolvedMarkets,
      numberOfClosedMarkets: +marketStats.closed_markets,
      numberOfMarketsWaitingToBeResolved:
        +marketStats.closed_markets - numberOfResolvedMarkets,
      numberOfOutcomes: +marketStats.outcomes,
      numberOfActiveOutcomes: +marketStats.active_outcomes,
      numberOfResolvedOutcomes:
        +marketStats.outcomes - +marketStats.active_outcomes,
      popularTopicId,
    };
  }

  async getPopularCategoryId(userId?: number) {
    if (!userId) {
      return 2;
    }
    const categoryCount = await this.marketCategoryRepository.count();
    return (userId ** (userId + 1) % categoryCount) + 1; // A simple temp formula to generate a known and independent categoryId for each user.

    // TODO: Must be updated after deciding Popular Category algorithm.
  }

  async syncPredictionMarketImageUrl(
    market: PredictionMarket | BasePredictionMarket,
  ) {
    if (market.image) {
      market.image = await this.minioService.getPredictionMarketImageUrl(
        market.image,
      );
    }
  }

  async syncPredictionOutcomeIconUrl(
    outcome: ConditionalToken | BaseConditionalToken,
  ) {
    if (outcome?.predictionOutcome?.icon?.length) {
      outcome.predictionOutcome.icon =
        await this.minioService.getOutcomeIconUrl(
          outcome.predictionOutcome.icon,
        );
    }

    return outcome;
  }

  async syncPredictionMarketOutcomeIconsUrls(
    market: PredictionMarket | BasePredictionMarketExtraDto,
  ) {
    if (market.outcomeTokens?.length) {
      market.outcomeTokens = await Promise.all(
        market.outcomeTokens.map(
          (outcome: BaseConditionalToken | ConditionalToken) =>
            this.syncPredictionOutcomeIconUrl(outcome),
        ),
      );
    }
  }
  /**
   * Prediction markets may have images, or outcome icons; This method should be called before returning market data,
   *  to the client to put the actual file urls in PredictionMarket instance(s).
   */
  async syncMinioUrls<
    T = PredictionMarket | BasePredictionMarket | BasePredictionMarketExtraDto,
  >(
    market:
      | PredictionMarket
      | BasePredictionMarket
      | BasePredictionMarketExtraDto,
    {
      loadCategoryIcon = true,
    }: { loadCategoryIcon?: boolean; loadCreatorAvatar?: boolean } = {},
  ): Promise<T> {
    await Promise.all([
      this.syncPredictionMarketImageUrl(market),
      this.syncPredictionMarketOutcomeIconsUrls(market),
      market.category != null && loadCategoryIcon
        ? this.syncMarketCategoryIconUrl(market.category)
        : null,
    ]);
    return market as T;
  }

  async syncMarketCategoryIconUrl(category?: MarketCategory) {
    if (category?.icon) {
      category.icon = await this.minioService.getMarketCategoryIconUrl(
        category.icon,
      );
    }
    return category;
  }

  async recursiveSyncMarketCategoryIconUrl(
    category: MarketCategory,
    subCategoriesOnly: boolean = false,
  ) {
    const tasks = [];
    if (!subCategoriesOnly) {
      let cursor = category;
      while (cursor) {
        tasks.push(this.syncMarketCategoryIconUrl(cursor));
        cursor = cursor.parent;
      }
    }
    if (!category?.subCategories?.length) {
      return category;
    }

    for (const subCategory of category.subCategories) {
      tasks.push(this.syncMarketCategoryIconUrl(subCategory));

      if (subCategory?.subCategories?.length) {
        tasks.push(this.recursiveSyncMarketCategoryIconUrl(subCategory, true));
      }
    }
    await Promise.all(tasks);
    return category;
  }

  async updateRedeemHistory(
    eventData: PayoutRedemptionEventDataType,
    chainId: number,
  ) {
    const [market, redeemerWallet, token] = await Promise.all([
      this.findMarketByCondition(eventData.conditionId, { shouldThrow: true }),
      this.blockchainWalletService.findByAddress(eventData.redeemer, {
        throwIfNotFound: false,
      }),
      this.blockchainHelperService.findCryptocurrencyTokenByAddress(
        eventData.collateralToken,
        chainId,
      ),
    ]);

    let newRedeemHistory = this.redeemHistoryRepository.create({
      redeemerId: redeemerWallet?.userId != null ? redeemerWallet.userId : null, // RedeemHistory needs to collect all redeems, event by those not a user here;
      // Since it affects the total amount redeemed from a market
      market,
      token,
      conditionId: eventData.conditionId,
      parentCollectionId: eventData.parentCollectionId,
      indexSets: eventData.indexSets,
      payout: (
        await this.blockchainHelperService.toEthers(
          eventData.payout,
          market.collateralToken,
        )
      ).toNumber(),
    });

    [newRedeemHistory] = await Promise.all([
      newRedeemHistory.payout > 0
        ? this.redeemHistoryRepository.save(newRedeemHistory)
        : null,
      redeemerWallet?.userId != null
        ? this.predictionMarketParticipationRepository.update(
            { marketId: market.id, userId: redeemerWallet.userId },
            { isMonetized: true },
          )
        : null,
    ]);
    return newRedeemHistory;
  }

  async userCanClaimFromMarket(userId: number, market: PredictionMarket) {
    return (
      (
        await Promise.all(
          market.outcomeTokens
            .filter((outcome) => outcome.truenessRatio)
            .map(
              async (outcome) =>
                await this.predictionMarketContractsService.getUserConditionalTokenBalance(
                  userId,
                  market,
                  outcome.tokenIndex,
                ),
            ),
        )
      ).findIndex((balance) => balance.gt(0)) !== -1
    );
  }

  async setMarketViewResultStatusAsSeen(userId: number, marketId: number) {
    const market = await this.getMarket(marketId, 'outcomeTokens');
    if (!market.isResolved) {
      throw new ConflictException('Only resolved markets results can be seen!');
    }

    if (
      !(await this.predictionMarketParticipationRepository.findOneBy({
        userId,
        marketId,
      }))
    ) {
      throw new BadRequestException(
        "You've made no participation in this market so far!",
      );
    }

    if (await this.userCanClaimFromMarket(userId, market)) {
      throw new ConflictException(
        'You seem to have something to claim in this market!',
      );
    }

    await this.predictionMarketParticipationRepository.update(
      { marketId: market.id, userId },
      { isMonetized: true },
    );
  }

  getMarketCumulativeCollateralPool(
    marketId: number,
    {
      tokenId = null,
      outcomeId = null,
    }: { tokenId?: number; outcomeId?: number } = {},
  ): Promise<number> {
    // Sum only incoming collaterals in market
    return this.predictionMarketParticipationRepository.sum('paymentAmount', {
      marketId,
      ...(tokenId != null ? { paymentTokenId: tokenId } : {}),
      ...(outcomeId != null ? { outcomeId } : {}),
      mode: PredictionMarketParticipationModesEnum.BUY.toString(),
    });
  }

  async getMarketTotalCollateralPool(
    marketId: number,
    {
      tokenId = null,
      outcomeId = null,
    }: { tokenId?: number; outcomeId?: number } = {},
  ): Promise<number> {
    return this.predictionMarketParticipationRepository
      .createQueryBuilder('pmp')
      .select(
        `SUM(
          CASE 
            WHEN pmp.mode = :buyMode THEN pmp.payment_amount
            WHEN pmp.mode = :sellMode THEN -pmp.payment_amount
            ELSE 0
          END
        )`,
        'totalOraclePool',
      )
      .where('pmp.marketId = :marketId', { marketId })
      .andWhere(outcomeId !== null ? 'pmp.outcome_id = :outcomeId' : 'TRUE', {
        outcomeId,
      })
      .andWhere(tokenId !== null ? 'pmp.payment_token_id = :tokenId' : 'TRUE', {
        tokenId,
      })
      .setParameters({
        buyMode: PredictionMarketParticipationModesEnum.BUY.toString(),
        sellMode: PredictionMarketParticipationModesEnum.SELL.toString(),
      })
      .getRawOne()
      .then((result) => result.totalOraclePool ?? 0); // Return 0 if null
  }

  getUserRedeemReceipt(
    userId: number,
    marketId: number,
    tokenId: number = null,
  ) {
    return this.redeemHistoryRepository.findOne({
      where: {
        redeemerId: userId,
        marketId,
        ...(tokenId != null ? { tokenId } : {}),
      },
    });
  }

  async findUserMarkets(
    userId: number,
    {
      sort = null,
      redeemed = false,
      descending = false,
      take = null,
      skip = null,
    }: GetUserMarketsDto,
  ) {
    const sortBy = {
      [PredictionMarketParticipationSortByOptionsEnum.DATE]:
        'market_created_at',
      [PredictionMarketParticipationSortByOptionsEnum.AMOUNT]: 'total_amounts',
      [PredictionMarketParticipationSortByOptionsEnum.PAYMENT]:
        'total_payments',
      [PredictionMarketParticipationSortByOptionsEnum.MARKET]:
        'market_market_id',
    }[sort || PredictionMarketParticipationSortByOptionsEnum.DATE];

    const query = this.predictionMarketParticipationRepository
      .createQueryBuilder('participation')
      .select('participation.marketId', 'marketId')
      .innerJoinAndSelect('participation.market', 'market')
      .addSelect(
        `SUM(
          CASE 
            WHEN participation.mode = 'sell' THEN -participation.amount
            ELSE participation.amount
          END
        )`,
        'total_amounts',
      )
      .addSelect(
        `SUM(
            CASE 
              WHEN participation.mode = 'sell' THEN -participation.payment_amount
              ELSE participation.payment_amount
            END
          )`,
        'total_payments',
      )
      .where(
        'participation.userId = :userId AND participation.is_monetized = :redeemed',
        { userId, redeemed },
      )
      .orderBy(sortBy, descending ? 'DESC' : 'ASC')
      .groupBy('participation.marketId')
      .addGroupBy('market.id');

    if (take != null) {
      query.limit(take);
    }
    if (skip != null) {
      query.offset(skip);
    }

    return Promise.all(
      (await query.getRawMany()).map(async (participation) => {
        const [image, participants, oraclePool, redeemResult] =
          await Promise.all([
            participation.market_image
              ? await this.minioService.getPredictionMarketImageUrl(
                  participation.market_image,
                )
              : null,
            this.getNumberOfParticipants(participation.marketId, 'market'),
            this.getMarketTotalCollateralPool(participation.marketId, {
              tokenId: participation.market_collateral_token_id,
            }),
            redeemed
              ? this.getUserRedeemReceipt(
                  userId,
                  participation.marketId,
                  participation.market_collateral_token_id,
                )
              : null,
          ]);

        const market = {
          id: participation.marketId,
          createdAt: participation.market_created_at,
          updatedAt: participation.market_updated_at,
          type: participation.market_type as PredictionMarketTypesEnum,
          creatorId: participation.market_creator_id,
          oracleId: participation.market_oracle_id,
          chainId: participation.market_chain_id,
          categoryId: participation.market_category_id,
          question: participation.market_question,
          subject: participation.market_subject,
          shouldStartAt: participation.market_should_start_at,
          shouldResolveAt: participation.market_should_resolve_at,
          initialLiquidity: +participation.market_initial_liquidity,
          collateralTokenId: participation.market_collateral_token_id,
          ammFactoryId: participation.market_amm_factory_id,
          numberOfOutcomes: participation.market_num_of_outcomes,
          image,
          reference: participation.market_reference,
          description: participation.market_description,
          conditionId: participation.market_condition_id,
          address: participation.market_address,
          formattedQuestion: participation.market_formatted_question,
          questionId: participation.market_question_id,
          startedAt: participation.market_started_at,
          closedAt: participation.market_closed_at,
          resolvedAt: participation.market_resolved_at,
          prepareConditionTxHash:
            participation.market_prepare_condition_tx_hash,
          createMarketTxHash: participation.market_create_market_tx_hash,
          participants,
          myTotalAmountsTransferred: participation.total_amounts,
          myTotalCollateralTransferred: participation.total_payments,
          oraclePool,
          redeemResult,
          isReserved: false,
        };
        market['status'] = PredictionMarket.getStatus(market);
        return market;
      }),
    );
  }

  @Cron(
    `0 */${PredictionMarketService.marketsCheckoutIntervalInMinutes} * * * *`,
  )
  async processPredictionMarkets() {
    const shouldBeResolvedMarkets = await this.findOngoingMarkets(true);

    for (const market of shouldBeResolvedMarkets) {
      // Instead of Promise.all-ing, Decided to process each market one-by-one to prevent any blockchain-side problem; Since in my tests batching contract calls is not a such good idea.
      try {
        await this.finalizeMarket(market);
        this.loggerService.debug(`Market#${market.id} successfully resolved.`);
      } catch (ex) {
        this.loggerService.error(
          `Failed closing/resolving Market#${market.id}`,
          ex as Error,
          { data: market },
        );
      }
    }

    const reservedMarkets = await this.findReservedPredictionMarkets(
      {
        willStartBefore: new Date(),
      },
      'oracle',
      'ammFactory',
    );

    for (const marketAndOutcomes of reservedMarkets) {
      try {
        const { outcomeTokens, ...market } = marketAndOutcomes; // This is crucial to separate outcomeTokens from market data,
        // o.w its passing these reserved outcomeTokens directly to this.predictionMarketRepository.create, fucking up with the conditional_token rows with same market_id!
        const startedMarket = await this.deployMarket(
          market as BasePredictionMarket,
          outcomeTokens,
        );
        this.loggerService.debug(
          `ReservedMarket#${market.id} successfully deployed & started; Started market is Market#${startedMarket.id}`,
        );
      } catch (ex) {
        this.loggerService.error(
          'Failed starting a reserved market:',
          ex as Error,
          { data: marketAndOutcomes },
        );
      }
    }

    this.informUsersAboutSoonClosingMarkets(
      PredictionMarketService.hoursRemainingToMarketClosureReminder,
    ).catch((ex) =>
      this.loggerService.error(
        'Informing users about soon closing markets process failed running',
        ex as Error,
      ),
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async periodicUpdateOngoingMarketPriceCaches() {
    try {
      const markets = await this.findOngoingMarkets(false, 'outcomeTokens');
      for (const market of markets) {
        this.cacheOngoingMarketPrices(market);
      }
      this.loggerService.debug(
        'Periodic AMM price caching processor successfully started working...',
      );
    } catch (ex) {
      this.loggerService.error(
        `Periodic AMM price caching processor failed this time.`,
        ex as Error,
      );
    }
  }
}
