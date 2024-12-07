import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { Chain } from './entities/chain.entity';
import { LoggerService } from '../logger/logger.service';
import { BlockchainService } from './blockchain.service';

type NetworkDataType = {
  provider: ethers.JsonRpcProvider;
  chain: Chain;
  lastProcessedBlockNumber?: bigint;
};

@Injectable()
export class BlockchainIndexerService {
  networks: Record<number, NetworkDataType> = {};

  constructor(
    private readonly loggerService: LoggerService,
    private readonly blockchainService: BlockchainService,
  ) {
    this.loadNetworks().catch((err) =>
      this.loggerService.error(
        'Failed to initialize blockchain indexer',
        err as Error,
      ),
    );
  }

  async loadNetworks() {
    (await this.blockchainService.findChains()).forEach((chain: Chain) => {
      this.networks[chain.id] = {
        chain,
        provider: new ethers.JsonRpcProvider(chain.rpcUrl),
        lastProcessedBlockNumber:
          this.networks?.[chain.id]?.lastProcessedBlockNumber ?? null,
      };
    });
  }

  async getBlocksTransactions(
    provider: ethers.JsonRpcProvider,
    blockNumber: number | bigint,
  ) {
    const block = await provider.getBlock(blockNumber);

    return {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.timestamp,
      // or other block data
      transactions: await Promise.all(
        block.transactions.map(async (txHash) => {
          const { hash, from, to, value, ...extra } =
            await provider.getTransaction(txHash);
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

  async getLatestBlock(chainId: number) {
    const network = this.networks[chainId];
    if (!network) throw new Error('Chain not supported right now.');
    const latestBlockNumber = await network.provider.getBlockNumber();
    return this.getBlocksTransactions(network.provider, latestBlockNumber);
  }

  //   @Cron(CronExpressions.EVERY_HOUR)
  async reloadNetworksHourly() {
    await this.loadNetworks();
  }

  async checkoutChain(chainId: number) {
    const network = this.networks[chainId];
    const latestBlockNumber = BigInt(await network.provider.getBlockNumber());
    try {
      for (
        network.lastProcessedBlockNumber =
          network.lastProcessedBlockNumber || latestBlockNumber;
        network.lastProcessedBlockNumber <= latestBlockNumber;
        network.lastProcessedBlockNumber++
      ) {
        const _transactions = await this.getBlocksTransactions(
          network.provider,
          network.lastProcessedBlockNumber,
        );
        // TODO: Process block & transactions
      }
    } catch (err) {
      this.loggerService.error(
        `Processing chain:${chainId} panicked at block#${network.lastProcessedBlockNumber}; next check will start from there.`,
        err,
        {
          data: {
            chainId,
            blockNumber: network.lastProcessedBlockNumber,
          },
        },
      );
    }
    await this.blockchainService.updateChainData(chainId, {
      lastProcessedBlock: network.lastProcessedBlockNumber,
    });
  }

  //   @Cron(CronExpressions.EVERY_MINUTE)
  async processNetworks() {
    await Promise.all(
      Object.keys(this.networks).map((chainId: string) =>
        this.checkoutChain(+chainId),
      ),
    );
  }
}
