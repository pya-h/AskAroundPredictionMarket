import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserConstants } from '../core/constants/constants';
import { User } from '../user/entities/user.entity';
import { CryptoTokenEnum } from '../prediction-market-contracts/enums/crypto-token.enum';
import { ethers } from 'ethers';
import { Chain } from './entities/chain.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import BigNumber from 'bignumber.js';

@Injectable()
export class BlockchainWalletService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
    @InjectRepository(CryptocurrencyToken)
    private readonly cryptocurrencyTokenRepository: Repository<CryptocurrencyToken>,
  ) {}

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
  }

  findChains() {
    return this.chainRepository.find();
  }

  updateChainData(chainId: number, data: Partial<Chain>) {
    return this.chainRepository.update({ id: chainId }, { ...data });
  }

  async etherToWei(amount: number | bigint, token: CryptocurrencyToken) {
    return new BigNumber(amount.toString()).multipliedBy(
      10 ** (await this.getCryptoTokenDecimals(token)),
    );
  }

  async weiToEthers(amount: bigint | number, token: CryptocurrencyToken) {
    return new BigNumber(amount.toString()).div(
      10 ** (await this.getCryptoTokenDecimals(token)),
    );
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

  getPrimaryAddresses(num: number, specificLength: number = 64) {
    return `0x${'0'.repeat(specificLength - num.toString().length)}${num}`;
  }

  getCryptocurrencyToken(token: CryptoTokenEnum, chainId: number) {
    return this.cryptocurrencyTokenRepository.findOneBy({
      chainId,
      symbol: token.toString(),
    });
  }

  async getOperatorWallet() {
    const admin = await this.userRepository.findOneBy({
      username: UserConstants.ADMIN_USERNAME,
    });
    return this.blockchainWalletRepository.findOneBy({
      userId: admin.id,
    });
  }

  async alreadyOwnsWallet(userId: number) {
    return Boolean(await this.blockchainWalletRepository.findOneBy({ userId }));
  }

  async manuallyConnectWallet(
    ownerId: number,
    address: string,
    privateKey: string,
  ) {
    if (await this.alreadyOwnsWallet(ownerId))
      throw new ConflictException('This user already has a blockchain wallet.');

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

  async getWallet(userId: number, throwIfNotFound: boolean = false) {
    const wallet = await this.blockchainWalletRepository.findOne({
      where: { userId },
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

  async getBalance(
    userId: number,
    tokenSymbol: CryptoTokenEnum,
    chainId: number,
    provider?: ethers.JsonRpcProvider,
  ): Promise<BigNumber>;

  async getBalance(
    userId: number,
    token: CryptocurrencyToken,
    chainId: number,
    provider?: ethers.JsonRpcProvider,
  ): Promise<BigNumber>;

  async getBalance(
    userId: number,
    tokenOrSymbol: CryptoTokenEnum | CryptocurrencyToken,
    chainId: number,
    provider?: ethers.JsonRpcProvider,
  ): Promise<BigNumber> {
    const wallet = await this.getWallet(userId, true);
    const token =
      tokenOrSymbol instanceof CryptocurrencyToken
        ? tokenOrSymbol
        : await this.getCryptocurrencyToken(tokenOrSymbol, chainId);
    if (!token?.address || !token.abi)
      throw new NotImplementedException(
        'Seems that we are not completely supporting this token; Contact out support for more information.',
      );
    if (!provider) {
      if (chainId == null)
        throw new BadRequestException('Chain Id must be specified.');
      const chain = await this.getChain(chainId);
      provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    }

    const userEtherAccount = new ethers.Wallet(wallet.privateKey, provider);
    const tokenContract = new ethers.Contract(
      token.address,
      token.abi,
      userEtherAccount,
    );
    const balanceInWei = await tokenContract.balanceOf(wallet.address);
    return this.weiToEthers(balanceInWei, token);
  }
}
