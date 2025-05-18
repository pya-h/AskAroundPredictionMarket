import { Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import * as admin from 'firebase-admin'; // Firebase Admin SDK
import { User } from '../user/entities/user.entity';
import { UserNotificationSettings } from '../user/entities/user-notification-settings.entity';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { ConditionalToken } from '../prediction-market/entities/conditional-token.entity';
import { CryptocurrencyToken } from '../blockchain-core/entities/cryptocurrency-token.entity';
import { Chain } from '../blockchain-core/entities/chain.entity';
import { InstantNewsNotificationDto } from './dto/instant-news-notification.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class WebPushNotificationService {
  private messaging: admin.messaging.Messaging;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserNotificationSettings)
    private readonly userNotificationSettingsRepository: Repository<UserNotificationSettings>,
  ) {
    try {
      if (!admin?.apps?.length) {
        // Check if already initialized
        admin.initializeApp({
          credential: admin.credential.cert({
            clientEmail: this.configService.getOrThrow<string>(
              'FIREBASE_CLIENT_EMAIL',
            ),
            projectId: this.configService.getOrThrow<string>(
              'FIREBASE_PROJECT_ID',
            ),
            privateKey: this.configService.getOrThrow<string>(
              'FIREBASE_PRIVATE_KEY',
            ),
          }),
        });
      }

      this.messaging = admin.messaging();
    } catch (ex) {
      this.loggerService.error(
        'Failed setting up Firebase WebPush notification service:',
        ex as Error,
      );
    }
  }

  async subscribe(user: User) {
    try {
      await this.userNotificationSettingsRepository.update(
        { userId: user.id },
        { webPushSubscription: true },
      );
    } catch (error) {
      this.loggerService.error(
        `Failed to update web push subscription setting for ${user.username}`,
        error,
      );
      return { success: false };
    }
    return { success: true };
  }

  getNotificationOwnerUserById(userId: number) {
    return this.userRepository.findOneByOrFail({ id: userId });
  }

  async push(
    userId: number,
    type: NotificationTypeEnum,
    title: string,
    body: string,
    data?: Record<string, string>,
    specificOptions?: {
      forceEmail?: boolean;
      emailBody?: string;
      notificationSettingsChecked?: boolean;
    },
  ): Promise<void>;
  async push(
    user: User,
    type: NotificationTypeEnum,
    title: string,
    body: string,
    data?: Record<string, string>,
    specificOptions?: {
      forceEmail?: boolean;
      emailBody?: string;
      notificationSettingsChecked?: boolean;
    },
  ): Promise<void>;
  async push(
    userIdent: User | number,
    type: NotificationTypeEnum,
    title: string,
    body: string,
    data?: Record<string, string>,
    {
      forceEmail = false,
      emailBody = null,
      notificationSettingsChecked = false,
    }: {
      forceEmail?: boolean;
      emailBody?: string;
      notificationSettingsChecked?: boolean;
    } = {},
  ) {
    const user =
      userIdent instanceof User
        ? userIdent
        : await this.getNotificationOwnerUserById(userIdent);
    if (
      !user?.notificationSettings?.webPushSubscription &&
      !notificationSettingsChecked
    ) {
      return;
    }
    const { link = null, icon = null, ...remarks } = data ?? {};
    try {
      const message = {
        token: user.fcmToken,
        notification: {
          title,
          body,
        },
        ...(data ? { data } : {}),
        webpush: {
          headers: {
            TTL: '86400', // 24h
          },
          fcm_options: {
            link,
          },
        },
      };
      await this.messaging.send(message);

      const notification = this.notificationRepository.create({
        body,
        time: new Date(),
        userId: user.id,
        title,
        type,
        icon,
        ...(Object.values(remarks ?? {})?.length ? { remarks } : {}),
      });
      await Promise.all([
        this.notificationRepository.save(notification),
        user.notificationSettings.receiveEmailNotification || forceEmail
          ? this.emailService.sendEmailNotification(
              user.email,
              title,
              emailBody || body,
            )
          : null,
      ]);
    } catch (error) {
      this.loggerService.error(
        `Failed to send Firebase web push notification to ${user.username}`,
        error,
      );
    }
  }

  async pushPredictionMarketResolveTime(
    oracleUser: User,
    market: PredictionMarket,
  ) {
    return this.push(
      oracleUser,
      NotificationTypeEnum.PREDICTION_MARKET_RESOLVE_TIME,
      `Market#${market.id} Is Waiting To Be Resolved!`,
      `Market \`${
        market.subject?.length ? market.subject : market.question
      }\` has been finished just now and needs resolving...`,
    );
  }

  async pushCheckoutPredictionMarketToSubscribers(
    market: PredictionMarket,
    subscriberProperties: FindOptionsWhere<UserNotificationSettings> = {},
    notificationTitle: string = 'New Prediction Market Available!',
  ) {
    const body = market.toString({
        asHtml: false,
        useIcons: true,
        includeDescription: true,
      }),
      remarks = {
        marketId: market.id.toString(),
        question: market.question,
        outcomes: market.outcomeTokens
          .map((token) => `'${token.title}'`)
          .join(', '),
      },
      emailBody = market.toString({
        asHtml: true,
        useIcons: true,
      });

    await Promise.all(
      (
        await this.userNotificationSettingsRepository.find({
          where: { webPushSubscription: true, ...subscriberProperties },
          relations: ['user'],
        })
      ).map(async ({ user }: UserNotificationSettings) => {
        try {
          return this.push(
            user,
            NotificationTypeEnum.PREDICTION_MARKET_NEW_AVAILABLE,
            notificationTitle,
            body,
            remarks,
            { emailBody, notificationSettingsChecked: true },
          );
        } catch (ex) {
          this.loggerService.error(
            `Failed sending New Prediction Market notification to User#${user.id}`,
            ex as Error,
            {
              data: {
                remarks,
                userId: user.id,
                username: user.username,
                fcmToken: user.fcmToken,
                email: user.email,
                notificationSetting: user.notificationSettings,
              },
            },
          );
        }
      }),
    );
  }

  async pushPredictionMarketIsResolvedToParticipants(
    market: PredictionMarket,
    participants: User[],
  ) {
    if (!participants?.length) {
      return;
    }
    const body = market.toString({
        asHtml: false,
        useIcons: true,
      }),
      remarks = {
        marketId: market.id.toString(),
        question: market.question,
        outcomes: market.outcomeTokens
          .map((token) => `'${token.title}'`)
          .join(', '),
      },
      emailBody = market.toString({
        asHtml: true,
        useIcons: true,
      });
    await Promise.all(
      participants.map((user: User) => {
        if (
          !user?.notificationSettings?.webPushSubscription ||
          !user.notificationSettings.predictionMarketResolved
        ) {
          return null;
        }
        try {
          return this.push(
            user,
            NotificationTypeEnum.PREDICTION_MARKET_IS_RESOLVED,
            `Prediction Market Result Is Ready Now!`,
            body,
            remarks,
            { emailBody },
          );
        } catch (ex) {
          this.loggerService.error(
            `Failed sending Prediction Market Is Resolved notification to participant User#${user.id}`,
            ex as Error,
            {
              data: {
                remarks,
                userId: user.id,
                username: user.username,
                fcmToken: user.fcmToken,
                email: user.email,
                notificationSetting: user.notificationSettings,
              },
            },
          );
        }
      }),
    );
  }

  async pushUserHasWonABet(
    market: PredictionMarket,
    user: User,
    outcome: ConditionalToken,
    prize: number | bigint,
    notificationSettingsChecked: boolean = false,
  ) {
    if (
      !prize ||
      (!notificationSettingsChecked &&
        (!user?.notificationSettings?.webPushSubscription ||
          !user.notificationSettings.wonPredictionMarketBet))
    ) {
      return null;
    }

    const remarks = {
      question: market.question,
      winnerOutcome: outcome.title,
      trueness: outcome.truenessRatio.toString(),
      prize: prize.toString(),
      marketId: market.id.toString(),
      winnerOutcomeIndex: outcome.tokenIndex.toString(),
    };
    const prizeTag = `${prize} ${market.collateralToken.alias}${
      prize > 1 ? 's' : ''
    }`;
    try {
      return this.push(
        user,
        NotificationTypeEnum.PREDICTION_MARKET_WON_BET,
        `✅ Congrats! You've won ${prizeTag}.`,
        `You've won ${prizeTag} by betting on '${outcome.title}' in '${market.question}'. You can collect your reward now.`,
        remarks,
      );
    } catch (ex) {
      this.loggerService.error(
        `Failed sending You-Won notification to Winner#${user.id}`,
        ex as Error,
        {
          data: {
            remarks,
            userId: user.id,
            username: user.username,
            fcmToken: user.fcmToken,
            email: user.email,
            notificationSetting: user.notificationSettings,
          },
        },
      );
    }
  }

  async pushBlockchainWalletDepositSuccessful(
    userId: number,
    amount: number | bigint,
    token: CryptocurrencyToken,
    chain: Chain,
  ): Promise<void>;
  async pushBlockchainWalletDepositSuccessful(
    user: User,
    amount: number | bigint,
    token: CryptocurrencyToken,
    chain: Chain,
  ): Promise<void>;
  async pushBlockchainWalletDepositSuccessful(
    ident: number | User,
    amount: number | bigint,
    token: CryptocurrencyToken,
    chain: Chain,
  ) {
    const user =
      ident instanceof User
        ? ident
        : await this.getNotificationOwnerUserById(ident);
    if (
      !user?.notificationSettings?.webPushSubscription ||
      !user.notificationSettings.newBlockchainWalletDeposit
    ) {
      return null;
    }

    const remarks = {
      amount: amount.toString(),
      tokenSymbol: token.symbol,
      tokenAlias: token.alias,
      chainId: chain.id.toString(),
      chain: chain.toString(),
    };
    const amountTag = `${amount} ${token.alias}${amount > 1 ? 's' : ''}`;
    try {
      return this.push(
        user,
        NotificationTypeEnum.BLOCKCHAIN_WALLET_NEW_DEPOSIT,
        `✅ Congrats! Successfully deposited ${amountTag}`,
        `${amountTag} have been successfully deposited on ${chain.toString()}; You can now use that to bet.`,
        remarks,
      );
    } catch (ex) {
      this.loggerService.error(
        `Failed sending Prediction Market Is Resolved notification to participant User#${user.id}`,
        ex as Error,
        {
          data: {
            remarks,
            userId: user.id,
            username: user.username,
            fcmToken: user.fcmToken,
            email: user.email,
            notificationSetting: user.notificationSettings,
          },
        },
      );
    }
  }

  async pushInstantNews(newsData: InstantNewsNotificationDto) {
    const targets = await this.userNotificationSettingsRepository.find({
      ...(!newsData.force
        ? { where: { webPushSubscription: true, instantNews: true } }
        : {}),
      relations: ['user'],
    });
    return Promise.all(
      targets.map(({ user }) =>
        this.push(
          user,
          NotificationTypeEnum.INSTANT_NEWS,
          newsData.title || `PredMark News`,
          newsData.content,
          newsData.data,
          {
            forceEmail: newsData.forceEmail,
            emailBody: newsData.emailBody || null,
            notificationSettingsChecked: true,
          },
        ),
      ),
    );
  }
}
