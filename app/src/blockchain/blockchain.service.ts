import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PredictionOutcome } from '../binary-prediction/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { ConditionTokenContractData } from './contracts/ctf.contracts';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { Oracle } from '../binary-prediction/entities/oracle.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { CryptoTokenEnum } from './enums/crypto-token.enum';

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerEthersWallet: ethers.Wallet;
  private conditionalTokensContract: ethers.Contract;

  toKeccakHash(data: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
  }

  constructor(
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    @InjectRepository(MarketMakerFactory)
    private readonly marketMakerFactoryRepository: Repository<MarketMakerFactory>,
    @InjectRepository(CryptocurrencyToken)
    private readonly cryptocurrencyTokenRepository: Repository<CryptocurrencyToken>,
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const localTestnet = await this.getChain(1337); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(localTestnet.rpcUrl);
    const wallet = await this.blockchainWalletRepository.findOneBy({
      userId: 0,
    }); // TODO: Modify this, and also add relations to user.
    this.managerEthersWallet = new ethers.Wallet(
      wallet.getPrivateKey(),
      this.provider,
    );

    this.conditionalTokensContract = new ethers.Contract(
      ConditionTokenContractData.address,
      ConditionTokenContractData.abi,
      this.managerEthersWallet,
    );
  }

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  async getCurrentChainId() {
    return Number((await this.provider.getNetwork()).chainId);
  }

  getPrimaryAddresses(num: number, specificLength: number = 64) {
    return `0x${'0'.repeat(specificLength - num.toString().length)}${num}`;
  }

  async getDefaultMarketMaker(chainId?: number) {
    return this.marketMakerFactoryRepository.findOne({
      where: {
        chainId: chainId || (await this.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async createMarket(
    marketMakerIdentifier: number | MarketMakerFactory,
    collateralTokenSymbol: CryptoTokenEnum,
    question: string,
    outcomes: PredictionOutcome[],
    initialLiquidityInEth: number,
    oracle: Oracle,
  ) {
    const currentChainId = await this.getCurrentChainId();

    const [marketMaker, collateralToken] = await Promise.all([
      marketMakerIdentifier instanceof MarketMakerFactory
        ? marketMakerIdentifier
        : this.marketMakerFactoryRepository.findOneBy({
            id: marketMakerIdentifier,
            chainId: currentChainId,
          }),
      this.cryptocurrencyTokenRepository.findOneBy({
        chainId: currentChainId, // TODO: Check this works fine?
        symbol: collateralTokenSymbol.toString(),
      }),
    ]);
    if (!marketMaker) {
      throw new NotFoundException("This kind of market maker doesn't exist!");
    }
    if (marketMaker.maxSupportedOutcomes < outcomes.length)
      throw new BadRequestException(
        `This AMM doesn't support more than ${marketMaker.maxSupportedOutcomes} outcomes.`,
      );

    if (!collateralToken?.abi?.length)
      // TODO: check this works fine, too
      throw new BadRequestException(
        'Unfortunately this cryptocurrency is not supported to be used as collateral token in this network.',
      );
    const marketMakerFactoryContract = new ethers.Contract(
        marketMaker.address,
        marketMaker.abi,
        this.managerEthersWallet,
      ),
      collateralTokenContract = new ethers.Contract(
        collateralToken.address,
        collateralToken.abi,
        this.managerEthersWallet,
      );
    const initialLiquidity = ethers.parseEther(
      initialLiquidityInEth.toString(),
    );
    const questionHash = this.toKeccakHash(question);
    const prepareConditionTx =
      await this.conditionalTokensContract.prepareCondition(
        oracle.address,
        questionHash,
        outcomes.length,
      );
    await prepareConditionTx.wait();
    console.log('Prepare condition finished, trx: ', prepareConditionTx);

    const conditionId = await this.conditionalTokensContract.getConditionId(
      oracle.address,
      questionHash,
      outcomes.length,
    );
    console.warn('Condition id = ', conditionId);

    const collateralDepositTx = await collateralTokenContract.deposit({
      value: initialLiquidity,
      nonce: await this.managerEthersWallet.getNonce(),
    });
    await collateralDepositTx.wait();
    console.log(
      'Collateral token deposit completed, trx:',
      collateralDepositTx,
    );

    const approveTx = await collateralTokenContract.approve(
      marketMaker.address,
      initialLiquidity,
    );
    await approveTx.wait();
    console.warn('Liquidity deposit completed and approved.');

    const lmsrFactoryTx =
      await marketMakerFactoryContract.createLMSRMarketMaker(
        ConditionTokenContractData.address,
        collateralToken.address,
        [conditionId], // TODO: Maybe write another method to create multiple markets at the same time?
        0,
        '0x0000000000000000000000000000000000000000',
        initialLiquidity,
        { from: this.managerEthersWallet.address },
      );

    await lmsrFactoryTx.wait();
    console.log('LMSR Market creation finished, trx: ', lmsrFactoryTx);

    return {
      conditionId,
      prepareConditionTxHash: prepareConditionTx.hash,
      createMarketTxHash: lmsrFactoryTx.hash,
      ammType: 'LMSR',
    };
  }

  outcomeIndexToIndexSet(outcomeIndices: number | number[]) {
    if (!(outcomeIndices instanceof Array)) {
      return parseInt((10 ** +outcomeIndices).toString(), 2);
    }
    let value = 0;
    for (const index of outcomeIndices) {
      value += parseInt((10 ** index).toString(), 2);
    }
    return value;
  }

  getCollectionId(
    conditionId: string,
    possibleOutcomeIndices: number | number[],
    parentCollectionId: string | null = null,
  ) {
    return this.conditionalTokensContract.getCollectionId(
      parentCollectionId || this.zeroAddress,
      conditionId,
      this.outcomeIndexToIndexSet(possibleOutcomeIndices),
    );
  }

  getOutcomeSlotsCount(conditionId: string) {
    return this.conditionalTokensContract.getOutcomeSlotCount(conditionId);
  }

  async validateMarketCreation(
    conditionId: string,
    marketOutcomesCount: number = 2,
  ) {
    return (
      (await this.getOutcomeSlotsCount(conditionId)) === marketOutcomesCount
    ); // As gnosis docs says, this is the proper way to validate the market creation operation, after calling prepareCondition.
  }

  async getPositionId(
    collateralToken: CryptocurrencyToken,
    collectionId: string,
  ) {
    return this.conditionalTokensContract.getPositionId(
      collateralToken.address,
      collectionId,
    );
  }

  async getBlocksTransactions(blockNumber: number) {
    const block = await this.provider.getBlock(blockNumber);

    return {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.timestamp,
      // or other block data
      transactions: await Promise.all(
        block.transactions.map(async (txHash) => {
          const { hash, from, to, value, ...extra } =
            await this.provider.getTransaction(txHash);
          return {
            hash,
            from,
            to,
            amount: ethers.formatEther(value),
            extra,
          };
        }),
      ),
    };
  }

  async getLatestBlock() {
    const latestBlockNumber = await this.provider.getBlockNumber();
    return this.getBlocksTransactions(latestBlockNumber);
  }
}
