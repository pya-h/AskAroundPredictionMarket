import BigNumber from 'bignumber.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  LoggerService,
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
import { ConfigService } from '../config/config.service';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async onModuleInit() {
    const defaultChainID =
      +this.configService.getOrThrow<number>('NET_CHAIN_ID');
    const net = await this.getChain(defaultChainID);
    this.provider = new ethers.JsonRpcProvider(net.rpcUrl);
    const wallet = await this.getOperatorWallet();
    this.operator = new EthereumAccount(wallet, this.provider);
  }

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  get operatorAccount() {
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
    token: CryptocurrencyToken,
  ) {
    return (
      amount instanceof BigNumber ? amount : new BigNumber(amount.toString())
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

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
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
      specificRunner || this.operatorAccount,
    );
  }

  getAmmContractHandler(
    market: PredictionMarket,
    specificRunner?: ContractRunnerType,
  ) {
    return new ethers.Contract(
      market.address,
      market.ammFactory.marketMakerABI,
      specificRunner || this.operatorAccount,
    );
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
  ): Promise<{ receipt: ethers.TransactionReceipt; amountInWei: bigint }>;

  async transfer(
    from: EthereumAccount,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    tokenSymbol?: CryptoTokenEnum,
  ): Promise<{ receipt: ethers.TransactionReceipt; amountInWei: bigint }>;

  async transfer(
    from: BlockchainWallet | EthereumAccount,
    to: BlockchainWallet,
    amount: number | bigint,
    chain: Chain,
    tokenSymbol: CryptoTokenEnum = null,
  ): Promise<{ receipt: ethers.TransactionReceipt; amountInWei: bigint }> {
    const fromAccount =
      from instanceof BlockchainWallet
        ? this.getEthereumAccount(from, chain)
        : from;
    if (!tokenSymbol || tokenSymbol.toString() === chain.nativeToken) {
      const amountInWei = ethers.parseEther(amount.toString());
      const tx = await fromAccount.ethers.sendTransaction({
        to: to.address,
        value: amountInWei,
      });
      return { receipt: await tx.wait(), amountInWei };
    }

    const token = await this.getCryptocurrencyToken(tokenSymbol, chain.id);
    const amountInWei = BigInt((await this.toWei(amount, token)).toFixed());
    return {
      amountInWei,
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
    );

    this.faucetOptions.requestTimes[destination.userId] = Date.now();

    return {
      amount: finalAmount,
      amountInWei,
      token,
      receipt,
    };
  }

  async transferNativeTokensTo(
    destination: BlockchainWallet,
    amount: number,
    chain: Chain,
  ) {
    const { receipt, amountInWei } = await this.transfer(
      this.operator.wallet,
      destination,
      amount,
      chain,
    );
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
            func.runner?.ethers || this.operatorAccount,
          );
    try {
      if (func.isView) {
        return (await contract[func.name](...args)) as T;
      }

      if (func.runner && func.runner.address !== this.operator.address) {
        const estimatedGas = new BigNumber(
          (await contract[func.name].estimateGas(...args)).toString(),
        )
          .multipliedBy(1.2)
          .decimalPlaces(0, 1); // 120 % estimated value for assurance

        const userNativeTokenBalance = await this.provider.getBalance(
          func.runner.address,
        );

        if (estimatedGas.gte(userNativeTokenBalance.toString())) {
          const gasChargeAmount = estimatedGas.multipliedBy(
            this.configService.get<number>(
              'NET_WALLET_GAS_REFILL_MULTIPLIER',
            ) || 20,
          );

          try {
            const gasProvideTx = await this.operator.ethers.sendTransaction({
              to: func.runner.address,
              value: BigInt(estimatedGas.toFixed()),
              nonce: await func.runner.ethers.getNonce(),
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
      receipt: await this.call<ethers.TransactionReceipt>(
        targetTokenContract,
        { name: 'deposit', runner: ownerEthAccount },
        {
          value: amountInWei.toString(),
        },
      ),
    };
  }
}
