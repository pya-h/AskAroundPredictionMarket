import { Column, Entity, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { ApiProperty } from '@nestjs/swagger';
import { PredictionMarketStatusEnum } from '../enums/market-status.enum';
import { BasePredictionMarket } from './bases/base-market.entity';
import { approximate } from '../../core/utils/calculus';

@Entity('prediction_market')
export class PredictionMarket extends BasePredictionMarket {
  @ApiProperty({
    type: 'string',
    example:
      '0x9355a7ec078d2451ee9584a25069dafa72cb184ae93c0f22cab73e13ac50300d',
  })
  @Column({ name: 'condition_id' })
  conditionId: string;

  @ApiProperty({
    type: 'string',
    example: '0x8EfE59F7e2ACEC5Ccc1ebB6b5126d6407b7C33Bf',
  })
  @Column({ name: 'address' })
  address: string;

  @ApiProperty({
    type: 'string',
    example: '1736686063403-Will it rain tomorrow?',
    description:
      'This is the actual question which will be hashed, then provided to contract, to make sure it does not conflict with other question texts.',
  })
  @Column({
    name: 'formatted_question',
    unique: true,
    type: 'varchar',
    length: 1100,
  })
  formattedQuestion: string;

  @ApiProperty({
    type: 'string',
    example:
      '0x27c7e8a174c1eae60035d002443c16a702a9b413206035b67def07548ab5aa0d',
    description:
      'Hashed formattedQuestion, The identifier of this Condition on the blockchain',
  })
  @Column({ name: 'question_id' })
  questionId: string;

  @ApiProperty({
    type: Date,
    description: 'The actual date market has been started.',
  })
  @Column({
    name: 'started_at',
    nullable: true,
    default: null,
  })
  startedAt: Date;

  @ApiProperty({
    type: Date,
    description: 'The exact date when market is closed on blockchain.',
  })
  @Column({ name: 'closed_at', nullable: true, default: null })
  closedAt: Date;

  @ApiProperty({
    type: Date,
    description:
      'The date which Oracle completed the resolution process and specified Outcomes trueness ratios.',
  })
  @Column({ name: 'resolved_at', nullable: true, default: null })
  resolvedAt: Date;

  @ApiProperty({
    type: 'string',
    example:
      '0xb2919b62ba9579281e2d42eac029e4f76bec1a7a9c5b7e29c29b45ef0c9ab0e9',
    description: "Hash of the transaction which has created market's outcomes.",
  })
  @Column({ name: 'prepare_condition_tx_hash' })
  prepareConditionTxHash: string;

  @ApiProperty({
    type: 'string',
    example:
      '0xb2919b62ba9579281e2d42eac029e4f76bec1a7a9c5b7e29c29b45ef0c9ab0e9',
    description: 'Hash of the transaction which has created the market itself.',
  })
  @Column({ name: 'create_market_tx_hash' })
  createMarketTxHash: string;

  @ApiProperty({
    type: ConditionalToken,
    isArray: true,
    description: "List of market's all outcomes & sub-outcomes.",
  })
  @OneToMany(() => ConditionalToken, (outcomeToken) => outcomeToken.market)
  outcomeTokens: ConditionalToken[];

  get truenessRatioSum() {
    let sumOfRatios = 0;
    for (const outcome of this.outcomeTokens) {
      sumOfRatios += outcome.truenessRatio;
    }
    return sumOfRatios;
  }

  get truenessRatioPercentages() {
    if (!this.outcomeTokens?.length || !this.isResolved) {
      return [];
    }
    const { truenessRatioSum } = this;
    return this.outcomeTokens.map((outcome) =>
      approximate((100 * outcome.truenessRatio) / truenessRatioSum, 'round'),
    );
  }

  get isOpen() {
    return !this.closedAt;
  }

  get isResolved() {
    return Boolean(this.resolvedAt);
  }

  static getStatus(market: PredictionMarket | Record<string, unknown>) {
    if (!market.startedAt) {
      return PredictionMarketStatusEnum.WAITING;
    }
    if (!market.closedAt) {
      return PredictionMarketStatusEnum.ONGOING;
    }
    if (!market.resolvedAt) {
      return PredictionMarketStatusEnum.CLOSED;
    }
    return PredictionMarketStatusEnum.RESOLVED;
  }

  get status(): PredictionMarketStatusEnum {
    return PredictionMarket.getStatus(this);
  }

  get totalInvestment(): number {
    let totalInvestment = 0;
    this.outcomeTokens.forEach((token) => {
      totalInvestment += token.amountInvested;
    });
    return totalInvestment;
  }

  toString({
    includeDescription = false,
    asHtml = false,
    useIcons = false,
  }: {
    includeDescription?: boolean;
    asHtml?: boolean;
    useIcons?: boolean;
  } = {}): string {
    const nextLine = !asHtml ? '\n' : '<br>',
      indentation = !asHtml ? '    ' : '&nbsp;&nbsp;&nbsp;&nbsp;';

    const getOutcomeIcon = (outcome: ConditionalToken) =>
      ['❌', '✅'][outcome.truenessRatio] ?? '👁‍🗨';
    const outcomes = this.outcomeTokens
      ?.map(
        (outcome, index) =>
          `${indentation}${useIcons ? getOutcomeIcon(outcome) : ''} ${
            outcome.title
          }` +
          (outcome.truenessRatio > 0 && outcome.truenessRatio < 1
            ? `: ${this.truenessRatioPercentages[index] ?? '-'} %`
            : ''),
      )
      .join(nextLine);

    return (
      `${this.question}${nextLine}${outcomes}` +
      (includeDescription && this.description?.length
        ? `${nextLine}${nextLine}${indentation}${useIcons ? '🔘' : ''} ${
            this.description
          }`
        : '')
    );
  }
}
