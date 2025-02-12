import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { ethers } from 'ethers';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import BigNumber from 'bignumber.js';
import { BlockchainHelperService } from './blockchain-helper.service';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { Chain } from './entities/chain.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BlockchainWalletService {
  constructor(
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    private readonly blockchainHelperService: BlockchainHelperService,
  ) {}

  async alreadyOwnsWallet(userId: number) {
    return Boolean(await this.blockchainWalletRepository.findOneBy({ userId }));
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
    const wallet = await this.getWallet(userId);
    const chain = await this.blockchainHelperService.getChain(chainId);

    if (!provider) {
      provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    }

    if (tokenOrSymbol.toString() === chain.nativeToken) {
      const nativeTokenBalance = await provider.getBalance(wallet.address);
      return new BigNumber(ethers.formatEther(nativeTokenBalance));
    }

    const token =
      tokenOrSymbol instanceof CryptocurrencyToken
        ? tokenOrSymbol
        : await this.blockchainHelperService.getCryptocurrencyToken(
            tokenOrSymbol,
            chainId,
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
    return this.blockchainHelperService.toEthers(balanceInWei, token);
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
      );
    const { token } =
      await this.blockchainHelperService.convertNativeTokenToOther(
        wallet,
        chain,
        this.defaultCryptoToken,
        { amountInWei: nativeTransferResult.amountInWei },
      );

    return {
      ...nativeTransferResult,
      amountInWei: nativeTransferResult.amountInWei.toString(),
      chain,
      balance: await this.getBalance(user.id, token, chainId),
    };
  }

  async chargeUserWallet(userId: number, amount: number, chainId: number) {
    const chain = await this.blockchainHelperService.getChain(chainId);
    if (!chain)
      throw new NotImplementedException(
        "OmenArena doesn't support this chain yet.",
      );
    const wallet = await this.getWallet(userId);
    const nativeTransferResult =
      await this.blockchainHelperService.transferNativeTokensTo(
        wallet,
        amount,
        chain,
      );
    const { token } =
      await this.blockchainHelperService.convertNativeTokenToOther(
        wallet,
        chain,
        this.defaultCryptoToken,
        { amountInWei: nativeTransferResult.amountInWei },
      );
    return {
      ...nativeTransferResult,
      amountInWei: nativeTransferResult.amountInWei.toString(),
      chain,
      balance: await this.getBalance(userId, token, chainId),
    };
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
    return this.blockchainHelperService.convertNativeTokenToOther(
      wallet,
      chain,
      tokenSymbol,
      { amount },
    );
  }
}
