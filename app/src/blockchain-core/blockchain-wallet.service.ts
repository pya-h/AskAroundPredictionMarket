import {
  BadRequestException,
  ConflictException,
  Injectable,
  LoggerService,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import {
  Between,
  FindOptionsOrder,
  ILike,
  In,
  JsonContains,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { ethers } from 'ethers';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import BigNumber from 'bignumber.js';
import { BlockchainHelperService } from './blockchain-helper.service';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { Chain } from './entities/chain.entity';
import { User } from '../user/entities/user.entity';
import { WebPushNotificationService } from '../notification/web-push-notification.service';
import { BlockchainTransactionLog } from './entities/transaction-log.entity';
import { BlockchainTransactionSortOptionsEnum } from './enums/transaction-sort-options.enum';
import { GetBlockchainTransactionHistoryOptionsDto } from './dtos/get-transaction-history-options.dto';
import { BlockchainTransactionTypeEnum } from './enums/transaction-type.enum';
import { BlockchainTransactionStatusEnum } from './enums/transaction-status.enum';
import { PredictionMarketParticipation } from '../prediction-market/entities/participation.entity';

@Injectable()
export class BlockchainWalletService {
  constructor(
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    private readonly blockchainHelperService: BlockchainHelperService,
    private readonly webPushNotificationService: WebPushNotificationService,
    private readonly loggerService: LoggerService,
    @InjectRepository(BlockchainTransactionLog)
    private readonly bTxLogRepository: Repository<BlockchainTransactionLog>,
    @InjectRepository(PredictionMarketParticipation)
    private readonly predictionMarketParticipationRepository: Repository<PredictionMarketParticipation>,
  ) {}

  async alreadyOwnsWallet(userId: number) {
    return Boolean(await this.blockchainWalletRepository.findOneBy({ userId }));
  }

  async isChainSupported(id: number) {
    return Boolean(await this.blockchainHelperService.getChain(id));
  }

  async manuallyConnectWallet(
    ownerId: number,
    address: string,
    privateKey: string,
    byForce: boolean = false,
  ) {
    try {
      const wallet = await this.getWallet(ownerId, { throwIfNotFound: true });
      if (!byForce) {
        // The reason for adding a byForce flag, is to prevent admin from changing a user's current wallet data by mistake.
        throw new ConflictException(
          'This user already has a blockchain wallet.',
        );
      }
      wallet.address = address;
      wallet.privateKey = privateKey;
      return this.blockchainWalletRepository.save(wallet);
    } catch (ex) {
      if (!(ex instanceof NotFoundException)) throw ex;
    }

    if (
      (await this.blockchainWalletRepository.findOneBy({
        secret: privateKey,
      })) ||
      (await this.blockchainWalletRepository.findOneBy({
        address,
      }))
    )
      throw new ConflictException('Wallet in use!');

    return this.blockchainWalletRepository.save(
      this.blockchainWalletRepository.create({
        address,
        secret: BlockchainWallet.encryptPrivateKey(privateKey),
        userId: ownerId,
      }),
    );
  }

  async createWallet(userId: number) {
    if (await this.alreadyOwnsWallet(userId))
      throw new ConflictException('This user already has a blockchain wallet.');
    const ethersWallet = ethers.Wallet.createRandom();

    const wallet = this.blockchainWalletRepository.create({
      address: ethersWallet.address,
      userId,
      secret: 'notNull',
    });
    wallet.privateKey = ethersWallet.privateKey;
    return this.blockchainWalletRepository.save(wallet);
  }

  async getWallet(
    userId: number,
    {
      throwIfNotFound = false,
      relations = null,
    }: { throwIfNotFound?: boolean; relations?: string[] } = {},
  ) {
    const wallet = await this.blockchainWalletRepository.findOne({
      where: { userId },
      ...(relations ? { relations } : {}),
    });
    if (!wallet) {
      if (throwIfNotFound)
        throw new NotFoundException(
          'User does not have any blockchain wallet yet!',
        );
      return this.createWallet(userId);
    }
    return wallet;
  }

  async findByAddress(
    address: string,
    {
      throwIfNotFound = false,
      relations = null,
    }: { throwIfNotFound?: boolean; relations?: string[] } = {},
  ) {
    const wallet = await this.blockchainWalletRepository.findOne({
      where: { address: ILike(address) },
      ...(relations?.length ? { relations } : {}),
    });
    if (!wallet && throwIfNotFound) {
      throw new NotFoundException('No wallet found with this address!');
    }
    return wallet;
  }

  async getBalance(
    userId: number,
    tokenSymbol: CryptoTokenEnum,
    chainId: number,
    provider?: ethers.JsonRpcProvider,
  ): Promise<{ balance: BigNumber; chain: Chain }>;

  async getBalance(
    userId: number,
    token: CryptocurrencyToken,
    chainId: number,
    provider?: ethers.JsonRpcProvider,
  ): Promise<{ balance: BigNumber; chain: Chain }>;

  async getBalance(
    userId: number,
    tokenSymbol: CryptoTokenEnum,
    chain: Chain,
    provider?: ethers.JsonRpcProvider,
  ): Promise<{ balance: BigNumber; chain: Chain }>;

  async getBalance(
    userId: number,
    token: CryptocurrencyToken,
    chain: Chain,
    provider?: ethers.JsonRpcProvider,
  ): Promise<{ balance: BigNumber; chain: Chain }>;

  async getBalance(
    userId: number,
    tokenOrSymbol: CryptoTokenEnum | CryptocurrencyToken,
    chainOrId: number | Chain,
    provider?: ethers.JsonRpcProvider,
  ): Promise<{ balance: BigNumber; chain: Chain }> {
    const wallet = await this.getWallet(userId);
    const chain =
      typeof chainOrId === 'number'
        ? await this.blockchainHelperService.getChain(chainOrId, true)
        : chainOrId;

    if (!provider) {
      provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    }

    if (tokenOrSymbol.toString() === chain.nativeToken) {
      const nativeTokenBalance = await provider.getBalance(wallet.address);
      return {
        chain,
        balance: new BigNumber(ethers.formatEther(nativeTokenBalance)),
      };
    }

    const token =
      tokenOrSymbol instanceof CryptocurrencyToken
        ? tokenOrSymbol
        : await this.blockchainHelperService.getCryptocurrencyToken(
            tokenOrSymbol,
            chain.id,
          );
    if (!token?.address || !token.abi)
      throw new NotImplementedException(
        'Seems that we are not completely supporting this token; Contact out support for more information.',
      );

    const tokenContract = this.blockchainHelperService.getContractHandler(
      token,
      this.blockchainHelperService.getWalletHandler(wallet, provider),
    );
    const balanceInWei = await tokenContract.balanceOf(wallet.address);
    return {
      chain,
      balance: await this.blockchainHelperService.toEthers(balanceInWei, token),
    };
  }

  async getMarketCollateralBalance(
    market: PredictionMarket,
  ): Promise<BigNumber> {
    if (!market.collateralToken?.address || !market.collateralToken.abi)
      throw new NotImplementedException(
        'Seems that we are not completely supporting this token; Contact out support for more information.',
      );

    const tokenContract = this.blockchainHelperService.getContractHandler(
      market.collateralToken,
      (await this.blockchainHelperService.getCurrentChainId())
        ? this.blockchainHelperService.rpcProvider
        : new ethers.JsonRpcProvider(market.chain.rpcUrl),
    );
    const balanceInWei = await tokenContract.balanceOf(market.address);
    return this.blockchainHelperService.toEthers(
      balanceInWei,
      market.collateralToken,
    );
  }

  get defaultCryptoToken() {
    return CryptoTokenEnum.WETH9; // TODO: Modify this after deploying Oracle token.
  }

  async getFreeDefaultToken(user: User, chainId: number) {
    const chain = await this.blockchainHelperService.getChain(chainId);
    if (!chain)
      throw new NotImplementedException(
        "OmenArena doesn't support this chain yet.",
      );
    const wallet = await this.getWallet(user.id);
    const nativeTransferResult =
      await this.blockchainHelperService.faucetDonateNativeTokens(
        wallet,
        chain,
        10,
      );
    const { token, receipt, amount } =
      await this.blockchainHelperService.convertNativeTokenToOther(
        wallet,
        chain,
        this.defaultCryptoToken,
        {
          amountInWei: nativeTransferResult.amountInWei,
          amount: nativeTransferResult.amount,
        },
      );

    await this.blockchainHelperService.addNewTransactionLog(
      user.id,
      token,
      BlockchainTransactionTypeEnum.FAUCET,
      receipt,
      {
        actualAmount: amount,
        remarks: {
          exchangeInfo: {
            chainId,
            amount: nativeTransferResult.amount,
            token: nativeTransferResult.token,
            txHash: nativeTransferResult.receipt.hash,
          },
          description: `Receive faucet ${token.alias}s from OmenArena`,
        },
      },
    );

    this.blockchainHelperService.addNewTransactionLog(
      this.blockchainHelperService.operatorId,
      token,
      BlockchainTransactionTypeEnum.TRANSFER,
      nativeTransferResult.receipt,
      {
        actualAmount: nativeTransferResult.amount,
        remarks: {
          note: `${chain.nativeToken} transferred, then converted to ${token.alias}.`,
          description: `Transfer faucet ${token.alias}s to user#${user.id} [${user.username}]`,
        },
      },
    );

    this.webPushNotificationService.pushBlockchainWalletDepositSuccessful(
      user,
      nativeTransferResult.amount,
      token,
      chain,
    );
    this.blockchainHelperService.updateUserFaucetRequestTime(user.id);

    return {
      amount,
      receipt,
      token: token.alias,
      amountInWei: nativeTransferResult.amountInWei.toString(),
      ...(await this.getBalance(user.id, token, chain)),
    };
  }

  async chargeUserWallet(userId: number, amount: number, chainId: number) {
    const { token, receipt, amountInWei, chain } =
      await this.transferFromOperator(
        userId,
        this.defaultCryptoToken,
        amount,
        chainId,
      );

    this.webPushNotificationService.pushBlockchainWalletDepositSuccessful(
      userId,
      amount,
      token,
      chain,
    );
    return {
      token,
      receipt,
      amountInWei: amountInWei.toString(),
      chain,
      ...(await this.getBalance(userId, token, chain)),
    };
  }

  async transferFromOperator(
    targetId: number,
    tokenSymbol: CryptoTokenEnum,
    amount: number,
    chainId: number | null = null,
    txMeta: {
      type?: BlockchainTransactionTypeEnum;
      description?: string;
      extra?: Record<string, unknown>;
      operatorTxDescription?: string;
    } = {}, // default tx is deposit
  ) {
    if (targetId === this.blockchainHelperService.operatorId) {
      throw new BadRequestException(
        'Operator can not transfer token to itself!',
      );
    }
    if (chainId == null) {
      chainId = await this.blockchainHelperService.getCurrentChainId();
    }

    if (tokenSymbol === CryptoTokenEnum.ORACLE) {
      tokenSymbol = CryptoTokenEnum.WETH9; // FIXME: OracleToken temp
    }

    const token = await this.blockchainHelperService.getCryptocurrencyToken(
      tokenSymbol,
      chainId,
    );
    const [{ balance, chain }, targetWallet] = await Promise.all([
      this.getBalance(this.blockchainHelperService.operatorId, token, chainId),
      this.getWallet(targetId, { throwIfNotFound: false }),
    ]);
    if (balance.lte(amount)) {
      try {
        if (tokenSymbol.toString() === chain.nativeToken) {
          throw new Error(
            `Chain#${chain.id}-${chain.name}'s Native token:${tokenSymbol} is running low on operator.`,
          );
        }

        await this.convertNativeTokenToOther(
          this.blockchainHelperService.operatorId,
          chainId,
          tokenSymbol,
          balance.minus(amount).multipliedBy(-5).toNumber(),
        );
      } catch (ex) {
        this.loggerService.error(
          'It seems Operator is running low on some tokens; Do a refill...',
          ex as Error,
          { data: { tokens: [chain.nativeToken, token.symbol] } },
        );
        throw new ServiceUnavailableException(
          "It seems that we're enable to complete this request right now; Maybe retry it sometime later?",
        );
      }
    }

    const result = await this.blockchainHelperService.transfer(
      this.blockchainHelperService.operatorAccount,
      targetWallet,
      amount,
      chain,
      token,
    );

    await this.blockchainHelperService.addNewTransactionLog(
      targetId,
      token,
      txMeta?.type ?? BlockchainTransactionTypeEnum.DEPOSIT,
      result.receipt,
      {
        actualAmount: amount,
        remarks: {
          description:
            txMeta?.description ||
            `Charge user#${targetId}'s account with ${token.alias} by OmenArena`,
          ...(txMeta?.extra ?? {}),
        },
      },
    );

    this.blockchainHelperService.addNewTransactionLog(
      // Not awaiting is intentional, to prevent operation slowing down
      this.blockchainHelperService.operatorId,
      token,
      BlockchainTransactionTypeEnum.TRANSFER,
      result.receipt,
      {
        actualAmount: amount,
        remarks: {
          description:
            txMeta?.operatorTxDescription ||
            `Charge-Transfer ${token.alias}s to user#${targetId}`,
        },
      },
    );

    return result;
  }

  async getEthereumAccount(userId: number, chain?: Chain) {
    const wallet = await this.getWallet(userId);
    return this.blockchainHelperService.getEthereumAccount(wallet, chain);
  }

  async convertNativeTokenToOther(
    userId: number,
    chainId: number,
    tokenSymbol: CryptoTokenEnum,
    amount: number,
  ) {
    const [wallet, chain] = await Promise.all([
      this.getWallet(userId, { throwIfNotFound: true }),
      this.blockchainHelperService.getChain(chainId),
    ]);
    if (!chain) {
      throw new NotImplementedException('This chain is not supported yet!');
    }
    const result = await this.blockchainHelperService.convertNativeTokenToOther(
      wallet,
      chain,
      tokenSymbol,
      { amount },
    );
    this.webPushNotificationService.pushBlockchainWalletDepositSuccessful(
      userId,
      amount,
      result.token,
      chain,
    );
    return result;
  }

  async getUserTransactions(
    userId: number,
    {
      relations = null,
      take = null,
      skip = null,
      token = null,
      chain = null,
      minAmount = null,
      maxAmount = null,
      status = null,
      type = null,
      block = null,
      marketId = null,
      sort = null,
      descending = false,
    }: GetBlockchainTransactionHistoryOptionsDto & {
      relations?: string[];
    } = {},
  ) {
    const orderOptions: FindOptionsOrder<BlockchainTransactionLog> = {};
    switch (sort) {
      case BlockchainTransactionSortOptionsEnum.BLOCK:
        orderOptions.blockNumber = descending ? 'DESC' : 'ASC';
        break;
      case BlockchainTransactionSortOptionsEnum.DATE:
        orderOptions.createdAt = descending ? 'DESC' : 'ASC';
        break;
      case BlockchainTransactionSortOptionsEnum.TOKEN:
        orderOptions.token = { symbol: descending ? 'DESC' : 'ASC' };
        break;
      case BlockchainTransactionSortOptionsEnum.CHAIN:
        orderOptions.token = { chainId: descending ? 'DESC' : 'ASC' };
        break;
      case BlockchainTransactionSortOptionsEnum.AMOUNT:
      case BlockchainTransactionSortOptionsEnum.TYPE:
      case BlockchainTransactionSortOptionsEnum.STATUS:
      case BlockchainTransactionSortOptionsEnum.HASH:
      case BlockchainTransactionSortOptionsEnum.TOKEN_ID:
        orderOptions[sort] = descending ? 'DESC' : 'ASC';
        break;
      default:
        orderOptions.id = descending ? 'DESC' : 'ASC';
        break;
    }
    return this.bTxLogRepository.find({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(block ? { blockNumber: BigInt(block) } : {}),
        ...(token || chain
          ? {
              token: {
                ...(token ? { symbol: token } : {}),
                ...(chain ? { chainId: chain } : {}),
              },
            }
          : {}),
        ...(minAmount != null
          ? {
              amount:
                maxAmount != null
                  ? Between(minAmount, maxAmount)
                  : MoreThan(minAmount),
            }
          : maxAmount != null
            ? { amount: LessThan(maxAmount) }
            : {}),
        ...(marketId ? { remarks: JsonContains({ marketId }) } : {}),
      },
      ...(relations ? { relations } : {}),
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
      order: orderOptions,
    });
  }

  get spendingTransactionTypes() {
    return [
      BlockchainTransactionTypeEnum.TRADE_BUY,
      BlockchainTransactionTypeEnum.TRANSFER,
    ];
  }

  async getTokenSpentBy(
    targetId: number | number[],
    token: CryptoTokenEnum,
    period: { from: Date; until: Date },
    spendCriteria: 'payment' | 'fee' = 'payment',
  ): Promise<number> {
    if (token === CryptoTokenEnum.ORACLE) {
      token = CryptoTokenEnum.WETH9; // LATER: OracleToken temp
    }
    switch (spendCriteria) {
      case 'fee': {
        let targetCondition = '$1';
        if (targetId instanceof Array) {
          if (targetId.length > 1) {
            targetCondition = 'ANY($1)';
          } else {
            targetId = targetId[0];
          }
        }
        const result = await this.predictionMarketParticipationRepository.query(
          `SELECT COALESCE(SUM(pmp.market_fee), 0) AS fees FROM prediction_market_participation pmp 
              JOIN cryptocurrency_token token ON pmp.payment_token_id = token.id
              WHERE pmp.user_id = ${targetCondition} AND token.symbol = $2 
              AND pmp.created_at > $3 AND pmp.created_at <= $4`,
          [targetId, token, period.from, period.until],
        );
        return +(result[0]?.fees || 0);
      }
      default: {
        let wallets: string | string[] = (
          await this.blockchainWalletRepository.find({
            where: {
              userId:
                targetId instanceof Array
                  ? targetId.length > 1
                    ? In(targetId)
                    : targetId[0]
                  : targetId,
            },
            select: ['address'],
          })
        ).map((w) => w.address);
        let targetCondition = '$1';
        if (wallets instanceof Array) {
          if (wallets.length > 1) {
            targetCondition = 'ANY($1)'; // Trying to not use ANY in any way possible, since it slows than the query.
          } else {
            wallets = wallets[0];
          }
        }
        const result = await this.bTxLogRepository.query(
          `SELECT COALESCE(SUM(t.amount), 0) AS amount FROM blockchain_transaction_log t 
          JOIN cryptocurrency_token token ON t.token_id = token.id
          WHERE t.from = ${targetCondition} AND token.symbol = $2 AND t.type = ANY($3) AND t.status = $4 AND t.created_at > $5 AND t.created_at <= $6`,
          [
            wallets,
            token,
            this.spendingTransactionTypes,
            BlockchainTransactionStatusEnum.SUCCESSFUL,
            period.from,
            period.until,
          ],
        );
        return +(result[0]?.amount || 0);
      }
    }
  }
}
