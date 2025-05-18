import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class UserNotificationSettings {
  @ApiProperty({ type: 'number' })
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether user is willing to receive notification; If this option is disabled all notification settings will be overridden',
    default: true,
  })
  @Column({ name: 'web_push_subscription', default: true })
  webPushSubscription: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether user is willing to receive notification when a blockchain wallet deposit is successful.',
    default: true,
  })
  @Column({ name: 'new_wallet_deposit', default: true })
  newBlockchainWalletDeposit: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether user is willing to receive notification when a new market is available.',
    default: true,
  })
  @Column({ name: 'new_market', default: true })
  newPredictionMarket: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive notification when a market will soon close, to notify them to participate or change decision.',
    default: true,
  })
  @Column({ name: 'market_closing_soon', default: true })
  predictionMarketClosingSoon: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive notification when one of their participated markets results are ready.',
    default: true,
  })
  @Column({ name: 'market_resolved', default: true })
  predictionMarketResolved: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive notification when they have won a market bet.',
    default: true,
  })
  @Column({ name: 'won_market_bet', default: true })
  wonPredictionMarketBet: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive news notification; works only if news is not force sent.',
    default: true,
  })
  @Column({ name: 'instant_news', default: true })
  instantNews: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether user is willing to receive emails alongside each notification.',
    default: false,
  })
  @Column({ name: 'receive_email_notification', default: false })
  receiveEmailNotification: boolean;
}
