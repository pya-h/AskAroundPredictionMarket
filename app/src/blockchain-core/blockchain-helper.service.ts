import BigNumber from 'bignumber.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  NotImplementedException,
  OnModuleInit,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chain } from './entities/chain.entity';
import { UserConstants } from '../core/constants/constants';
import { User } from '../user/entities/user.entity';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { ContractIdentifiersType } from './types/contract-identifier.type';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { ContractRunnerType } from './types/common.types';
import { EthereumAccount } from './types/ethereum-account.class';
import { BlockchainTransactionLog } from './entities/transaction-log.entity';
import { BlockchainTransactionStatusEnum } from './enums/transaction-status.enum';
import { BlockchainTransactionTypeEnum } from './enums/transaction-type.enum';
import { PredictionMarketTypesEnum } from '../prediction-market-contracts/enums/market-types.enum';
import { LmsrMarketMakerContractData } from '../prediction-market-contracts/abis/lmsr-market.abi';
import { FixedProductMarketMakerContractData } from '../prediction-market-contracts/abis/fp-market.abi';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class BlockchainHelperService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private operator: EthereumAccount;
  private faucetOptions: {
    requestTimes: Record<number, number>;
    unitAmount: number;
    perRequestDelay: number;
  } = { requestTimes: {}, unitAmount: 10, perRequestDelay: 60000 };

  constructor(
    @InjectRepository(CryptocurrencyToken)
    private readonly cryptocurrencyTokenRepository: Repository<CryptocurrencyToken>,
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    @InjectRepository(BlockchainTransactionLog)
    private readonly bTxLogRepository: Repository<BlockchainTransactionLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async onModuleInit() {
    const defaultChainID = +this.configService.getOrThrow<number>(
      'blockchain.defaultChainID',
    );
    const net = await this.getChain(defaultChainID);
    this.provider = new ethers.JsonRpcProvider(net.rpcUrl);
    const wallet = await this.getOperatorWallet();
    this.operator = new EthereumAccount(wallet, this.provider);
  }

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  get operatorAccount() {
    return this.operator;
  }

  get operatorEthersWallet() {
    return this.operator.ethers;
  }

  get operatorId() {
    return this.operator.wallet.userId;
  }

  get rpcProvider() {
    return this.provider;
  }

  updateChainData(chainId: number, data: Partial<Chain>) {
    return this.chainRepository.update({ id: chainId }, { ...data });
  }

  getPrimaryAddresses(num: number, specificLength: number = 64) {
    return `0x${'0'.repeat(specificLength - num.toString().length)}${num}`;
  }

  getCryptocurrencyToken(token: CryptoTokenEnum, chainId: number) {
    return this.cryptocurrencyTokenRepository.findOneBy({
      chainId,
      symbol: token.toString(),
    });
  }

  getCryptocurrencyTokenById(id: number) {
    return this.cryptocurrencyTokenRepository.findOneBy({
      id,
    });
  }

  findCryptocurrencyTokenByAddress(address: string, chainId: number) {
    return this.cryptocurrencyTokenRepository.findOneBy({
      chainId,
      address,
    });
  }

  async getCurrentChainId() {
    return Number((await this.provider.getNetwork()).chainId);
  }

  async toWei(amount: number | bigint, token: CryptocurrencyToken) {
    return new BigNumber(amount.toString()).multipliedBy(
      10 ** (await this.getCryptoTokenDecimals(token)),
    );
  }

  async toEthers(
    amount: bigint | number | BigNumber,
    token?: CryptocurrencyToken,
  ) {
    if (!token) {
      return new BigNumber(ethers.formatEther(amount.toString()));
    }
    return (
      amount instanceof BigNumber ? amount : new BigNumber(amount?.toString())
    ).div(10 ** (await this.getCryptoTokenDecimals(token)));
  }

  weiToEthers(amount: bigint | number) {
    return new BigNumber(amount.toString()).div(1e18);
  }

  async getCryptoTokenDecimals(token: CryptocurrencyToken) {
    if (!token.decimals) await this.syncCryptoTokenDecimalValue(token);
    return token.decimals;
  }

  async syncCryptoTokenDecimalValue(token: CryptocurrencyToken) {
    const chain = await this.getChain(token.chainId);
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const contract = new ethers.Contract(token.address, token.abi, provider);
    token.decimals = Number(await contract.decimals());
    return this.cryptocurrencyTokenRepository.save(token);
  }

  async getChain(chainId: number, throwIfNotFound: boolean = false) {
    const chain = await this.chainRepository.findOneBy({ id: chainId });
    if (throwIfNotFound && !chain) {
      throw new NotImplementedException(
        "Currently we don't support this chain!",
      );
    }
    return chain;
  }

  findChains() {
    return this.chainRepository.find();
  }

  async getOperatorWallet() {
    const admin = await this.userRepository.findOneBy({
      username: UserConstants.ADMIN_USERNAME,
    });
    return this.blockchainWalletRepository.findOneBy({
      userId: admin.id,
    });
  }

  getContractHandler(
    { address, abi }: ContractIdentifiersType,
    specificRunner?: ContractRunnerType,
  ) {
    return new ethers.Contract(
      address,
      abi,
      specificRunner || this.operatorEthersWallet,
    );
  }

  getAmmContractHandler(
    market: PredictionMarket,
    specificRunner?: ContractRunnerType,
  ) {
    switch (market.type as PredictionMarketTypesEnum) {
      case PredictionMarketTypesEnum.LMSR:
        return new ethers.Contract(
          market.address,
          LmsrMarketMakerContractData.abi,
          specificRunner || this.operatorEthersWallet,
        );
      case PredictionMarketTypesEnum.FPMM:
        return new ethers.Contract(
          market.address,
          FixedProductMarketMakerContractData.abi,
          specificRunner || this.operatorEthersWallet,
        );
      default:
        throw new NotImplementedException(
          `${market.type} markets are not supported right now!`,
        );
    }
  }

  getWalletHandler(
    wallet: BlockchainWallet,
    specificProvider?: ethers.JsonRpcProvider,
  ) {
    return new ethers.Wallet(
      wallet.privateKey,
      specificProvider || this.provider,
    );
  }

  getEthereumAccount(wallet: BlockchainWallet, chain?: Chain) {
    if (!chain) {
      return new EthereumAccount(wallet, this.provider);
    }
    return new EthereumAccount(
      wallet,
      new ethers.JsonRpcProvider(chain.rpcUrl),
    );
  }

  async transfer(
    from: BlockchainWallet,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    tokenSymbol?: CryptoTokenEnum,
  ): Promise<{
    receipt: ethers.TransactionReceipt;
    amountInWei: bigint;
    token?: CryptocurrencyToken;
    chain: Chain;
  }>;

  async transfer(
    from: EthereumAccount,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    tokenSymbol?: CryptoTokenEnum,
  ): Promise<{
    receipt: ethers.TransactionReceipt;
    amountInWei: bigint;
    token?: CryptocurrencyToken;
    chain: Chain;
  }>;

  async transfer(
    from: BlockchainWallet,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    token?: CryptocurrencyToken,
  ): Promise<{
    receipt: ethers.TransactionReceipt;
    amountInWei: bigint;
    token?: CryptocurrencyToken;
    chain: Chain;
  }>;

  async transfer(
    from: EthereumAccount,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    token?: CryptocurrencyToken,
  ): Promise<{
    receipt: ethers.TransactionReceipt;
    amountInWei: bigint;
    token?: CryptocurrencyToken;
    chain: Chain;
  }>;

  async transfer(
    from: BlockchainWallet | EthereumAccount,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    tokenOrSymbol: CryptoTokenEnum | CryptocurrencyToken = null,
  ): Promise<{
    receipt: ethers.TransactionReceipt;
    amountInWei: bigint;
    token?: CryptocurrencyToken;
    chain: Chain;
  }> {
    const fromAccount =
      from instanceof BlockchainWallet
        ? this.getEthereumAccount(from, chain)
        : from;
    if (
      !tokenOrSymbol ||
      (tokenOrSymbol instanceof CryptocurrencyToken
        ? tokenOrSymbol.symbol
        : tokenOrSymbol
      ).toString() === chain.nativeToken
    ) {
      const amountInWei = ethers.parseEther(amount.toString());
      const tx = await fromAccount.ethers.sendTransaction({
        to: to.address,
        value: amountInWei,
      });
      return { receipt: await tx.wait(), amountInWei, chain };
    }

    const token =
      tokenOrSymbol instanceof CryptocurrencyToken
        ? tokenOrSymbol
        : await this.getCryptocurrencyToken(tokenOrSymbol, chain.id);
    const amountInWei = BigInt((await this.toWei(amount, token)).toFixed());
    return {
      token,
      amountInWei,
      chain,
      receipt: await this.call<ethers.TransactionReceipt>(
        { address: token.address, abi: token.abi },
        { name: 'transfer', runner: fromAccount },
        to.address,
        amountInWei,
      ),
    };
  }

  async faucetDonateNativeTokens(
    destination: BlockchainWallet,
    chain: Chain,
    gain: number = null,
  ) {
    if (
      this.faucetOptions.requestTimes?.[destination.userId] >
      Date.now() - this.faucetOptions.perRequestDelay
    )
      throw new ForbiddenException(
        `You can request for native tokens after ${
          ((this.faucetOptions.requestTimes[destination.userId] +
            this.faucetOptions.perRequestDelay -
            Date.now()) /
            1000) |
          0
        } seconds.`,
      );
    const finalAmount = this.faucetOptions.unitAmount * (gain || 1);
    const { token, receipt, amountInWei } = await this.transferNativeTokensTo(
      destination,
      finalAmount,
      chain,
      false,
    );

    return {
      amount: finalAmount,
      amountInWei,
      token,
      receipt,
    };
  }

  updateUserFaucetRequestTime(userId: number) {
    this.faucetOptions.requestTimes[userId] = Date.now();
  }

  async transferNativeTokensTo(
    destination: BlockchainWallet,
    amount: number,
    chain: Chain,
    createTransactionLog: boolean = true,
  ) {
    const { receipt, amountInWei } = await this.transfer(
      this.operator.wallet,
      destination,
      amount,
      chain,
    );

    if (createTransactionLog) {
      await this.addNewTransactionLog(
        destination.userId,
        await this.getCryptocurrencyToken(
          chain.nativeToken as CryptoTokenEnum,
          chain.id,
        ),
        BlockchainTransactionTypeEnum.TRANSFER,
        receipt,
        {
          actualAmount: amount,
          status: BlockchainTransactionStatusEnum.SUCCESSFUL,
          remarks: {
            description: `Receiving ${chain.nativeToken} from OmenArena`,
          },
        },
      );
    }
    return {
      token: chain.nativeToken,
      receipt,
      amountInWei,
    };
  }

  isANonceError(err: Error) {
    return (
      // TODO: Checkout if there's a check-by-type approach ...
      err.message.includes('correct nonce') ||
      err.message.includes('transaction underpriced')
    );
  }

  async call<T = ethers.TransactionReceipt | ethers.TransactionResponse>(
    contractData: ContractIdentifiersType,
    func: {
      name: string;
      isView?: boolean;
      runner?: EthereumAccount;
      dontWait?: boolean; // Using this will increase speed but its risky a little;
      // When an account has a Failed tx (due to any reason), when trying its next valid tx, this will cause nonce mismatch error.
      preventNonceMismatchRetry?: boolean;
    },
    ...args: ethers.ContractMethodArgs<unknown[]>
  ): Promise<T>;

  async call<T = ethers.TransactionReceipt | ethers.TransactionResponse>(
    contract: ethers.Contract,
    func: {
      name: string;
      isView?: boolean;
      runner?: EthereumAccount;
      dontWait?: boolean;
      preventNonceMismatchRetry?: boolean;
    },
    ...args: ethers.ContractMethodArgs<unknown[]>
  ): Promise<T>;

  async call<T = ethers.TransactionReceipt | ethers.TransactionResponse>(
    contractData: ethers.Contract | ContractIdentifiersType,
    func: {
      name: string;
      isView?: boolean;
      runner?: EthereumAccount;
      dontWait?: boolean;
      preventNonceMismatchRetry?: boolean;
    },
    ...args: ethers.ContractMethodArgs<unknown[]>
  ): Promise<T> {
    const contract =
      contractData instanceof ethers.Contract
        ? contractData
        : new ethers.Contract(
            contractData.address,
            contractData.abi,
            func.runner?.ethers || this.operatorEthersWallet,
          );

    if (func.isView) {
      try {
        return (await contract[func.name](...args)) as T;
      } catch (ex) {
        this.loggerService.error(`Failed calling a view (${func.name}):`, ex);
        return null;
      }
    }

    try {
      if (func.runner && func.runner.address !== this.operator.address) {
        const [gas, feeData, userExactNativeTokenBalance] = await Promise.all([
          contract[func.name].estimateGas(...args),
          this.provider.getFeeData(),
          this.provider.getBalance(func.runner.address),
        ]);

        const estimatedGas = new BigNumber(
          (gas * feeData.maxFeePerGas).toString(),
        );

        const userAvailableNativeTokenBalance =
          userExactNativeTokenBalance -
          BigInt((func?.name === 'deposit' && args[0]?.['value']) || 0);

        const walletGasRefillMultiplier = +(
          this.configService.get<number>(
            'blockchain.walletGasRefillMultiplier',
          ) ?? 20
        );
        if (
          estimatedGas.gte(userAvailableNativeTokenBalance.toString()) &&
          walletGasRefillMultiplier // set walletGasRefillMultiplier to zero, to disable gas provision process
        ) {
          const gasChargeAmount = estimatedGas.multipliedBy(
            walletGasRefillMultiplier,
          );

          try {
            const gasProvideTx = await this.operator.ethers.sendTransaction({
              to: func.runner.address,
              value: BigInt(gasChargeAmount.toFixed()),
            });
            if (!func.dontWait) {
              const log = await gasProvideTx.wait();
              this.loggerService.debug(
                `Operator donated gas to user#${func.runner.ownerId}`,
                {
                  data: {
                    targetId: func.runner,
                    onFunction: func.name,
                    tx: gasProvideTx.toJSON(),
                    log: log.toJSON(),
                  },
                },
              );
            } else {
              this.loggerService.debug(
                `Operator donated gas to user#${func.runner.ownerId}`,
                {
                  data: {
                    targetId: func.runner,
                    onFunction: func.name,
                    tx: gasProvideTx.toJSON(),
                  },
                },
              );
            }
          } catch (ex) {
            const operatorBalance = (
              await this.provider.getBalance(this.operator.address)
            ).toString();

            this.loggerService.error(
              `Operator failed to charge User#${func.runner.ownerId}'s [BlockchainWallet#${func.runner.id}] gas tank; Checkout operator balance...`,
              ex as Error,
              {
                data: {
                  operatorBalance,
                  estimatedGas: estimatedGas.toFixed(),
                  ...func.runner,
                },
              },
            );

            if (gasChargeAmount.gte(operatorBalance)) {
              // TODO: Inform the admin (or whatever) with fastest mean [discuss this.]
              throw new BadRequestException(
                'Server is not ready to complete your request... Please try again some time later.',
              );
            }
            throw new InternalServerErrorException(
              'Unexpected error happened while trying to complete your request!',
            );
          }
        }
      }

      const tx: ethers.TransactionResponse = await contract[func.name](...args);
      if (func.dontWait) {
        return tx as T;
      }
      return (await tx.wait()) as T;
    } catch (ex) {
      if (func.preventNonceMismatchRetry || !this.isANonceError(ex as Error)) {
        throw ex;
      }
      return this.call<T>(
        contract,
        { ...func, preventNonceMismatchRetry: true },
        ...args,
      );
    }
  }

  async getEventLogFromReceipt(
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
      throw error;
    }
  }

  async convertNativeTokenToOther(
    owner: BlockchainWallet,
    chain: Chain,
    targetTokenSymbol: CryptoTokenEnum,
    {
      amount = null,
      amountInWei = null,
    }: { amountInWei?: bigint | BigNumber; amount?: number },
  ) {
    const ownerEthAccount = this.getEthereumAccount(owner, chain);
    const targetToken = await this.getCryptocurrencyToken(
      targetTokenSymbol,
      chain.id,
    );
    if (!amountInWei) {
      if (!amount) {
        throw new BadRequestException(
          `Amount of conversion to ${targetTokenSymbol} not specified!`,
        );
      }
      amountInWei = await this.toWei(amount, targetToken);
    }
    const targetTokenContract = this.getContractHandler(
      targetToken,
      ownerEthAccount.ethers,
    );
    return {
      token: targetToken,
      amount,
      receipt: await this.call<ethers.TransactionReceipt>(
        targetTokenContract,
        { name: 'deposit', runner: ownerEthAccount },
        {
          value: amountInWei.toString(),
        },
      ),
    };
  }

  async addNewTransactionLog(
    userId: number,
    token: number | CryptocurrencyToken | null,
    txType: BlockchainTransactionTypeEnum,
    data: ethers.TransactionReceipt | ethers.Log,
    {
      actualAmount = null,
      status = BlockchainTransactionStatusEnum.SUCCESSFUL,
      remarks = null,
      reverseParties = false,
    }: {
      actualAmount?: number;
      status?: BlockchainTransactionStatusEnum;
      remarks?: Record<string, unknown>;
      reverseParties?: boolean; // useful in some cases, which the obtained transaction is related to operation request, not the transfer tx itself.
    } = {},
  ) {
    const { from, to, hash, blockHash, blockNumber, value } =
      await data.getTransaction();

    return this.bTxLogRepository.save(
      this.bTxLogRepository.create({
        userId,
        ...(!reverseParties ? { from, to } : { from: to, to: from }),
        hash,
        blockHash,
        blockNumber: BigInt(blockNumber),
        tokenId: token instanceof CryptocurrencyToken ? token.id : token,
        amount:
          actualAmount ??
          (
            await this.toEthers(
              value,
              typeof token === 'number'
                ? await this.getCryptocurrencyTokenById(token)
                : token,
            )
          ).toNumber(),
        status:
          status?.toString() ?? BlockchainTransactionStatusEnum.SUCCESSFUL,
        type: txType.toString(),
        remarks,
      }),
    );
  }
}
