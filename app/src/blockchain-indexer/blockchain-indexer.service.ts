import { Injectable, NotImplementedException } from '@nestjs/common';
import { ethers } from 'ethers';
import { Chain } from '../blockchain-wallet/entities/chain.entity';
import { LoggerService } from '../logger/logger.service';
import { PredictionMarketContractsService } from '../prediction-market-contracts/prediction-market-contracts.service';
import { tradeEventsData } from './abis/trade-events.abi';
import { PredictionMarketService } from '../prediction-market/prediction-market.service';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { PredictionMarketTypesEnum } from '../prediction-market-contracts/enums/market-types.enum';
import { PredictionMarketTradeDataType } from './types/trade-data.type';
import { resolutionEventData } from './abis/resolution-event.abi';
import { ConditionTokenContractData } from '../prediction-market-contracts/abis/ctf.abi';
import { PredictionMarketResolutionDataType } from './types/resolution-data.type';
import { BlockchainWalletService } from 'src/blockchain-wallet/blockchain-wallet.service';

type NetworkDataType = {
  provider: ethers.JsonRpcProvider;
  chain: Chain;
};

@Injectable()
export class BlockchainIndexerService {
  private networks: Record<number, NetworkDataType> = {};

  constructor(
    private readonly loggerService: LoggerService,
    private readonly predictionMarketContractsService: PredictionMarketContractsService,
    private readonly predictionMarketService: PredictionMarketService,
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {
    this.loadNetworks().catch((err) =>
      this.loggerService.error(
        'Failed to initialize blockchain indexer',
        err as Error,
      ),
    );
  }

  newHttpProvider(chain: Chain) {
    return {
      chain,
      provider: new ethers.JsonRpcProvider(chain.rpcUrl),
    };
  }

  async loadNetworks() {
    await Promise.all(
      (await this.blockchainWalletService.findChains()).map(
        async (chain: Chain) => {
          this.networks[chain.id] = this.newHttpProvider(chain);
          return this.setupWebSocketListener(this.networks[chain.id]);
        },
      ),
    );
  }

  async setupWebSocketListener(network: NetworkDataType) {
    await this.checkoutChainLogs(network.chain.id); // To ensures all logs before this are processed [on server restart or websocket disconnection.]

    const websocket = new WebSocket(network.chain.webSocketRpcUrl);
    const wsProvider = new ethers.WebSocketProvider(websocket);

    wsProvider.on(
      {
        topics: [Object.values(tradeEventsData.signatures)],
      },
      async (log: ethers.Log) => {
        try {
          await this.processTradeEventLog(wsProvider, log);
          await this.updateChainBlockOffset(
            network.chain,
            BigInt(log.blockNumber + 1),
          );
        } catch (error) {
          this.loggerService.error(
            'Failed to process WebSocket event log',
            error,
            {
              data: { eventType: 'trade', log },
            },
          );
        }
      },
    );

    wsProvider.on(
      {
        topics: [[resolutionEventData.signature]],
      },
      async (log: ethers.Log) => {
        try {
          await this.processResolveEvent(wsProvider, log);
          await this.updateChainBlockOffset(
            network.chain,
            BigInt(log.blockNumber + 1),
          );
        } catch (error) {
          this.loggerService.error(
            'Failed to process WebSocket event log',
            error,
            {
              data: { eventType: 'resolve', log },
            },
          );
        }
      },
    );

    websocket.addEventListener('close', async () => {
      this.loggerService.error(
        `WebSocket disconnected for chainId: ${network.chain.id}; scheduling reconnect...`,
      );
      setTimeout(() => this.setupWebSocketListener(network), 10000);
    });

    this.loggerService.debug(
      `WebSocket listener set up for chainId: ${network.chain.id}`,
    );
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

  updateChainBlockOffset(chain: Chain, blockNumber: bigint) {
    chain.blockProcessOffset = blockNumber;
    return this.blockchainWalletService.updateChainData(chain.id, {
      blockProcessOffset: blockNumber,
    });
  }

  async checkoutChainLogs(
    chainId: number,
    retryOnDisconnection: boolean = true,
  ) {
    this.loggerService.debug('Checking out blockchain ...');
    const network = this.networks[chainId];
    let latestBlockNumber: bigint;
    try {
      latestBlockNumber = BigInt(await network.provider.getBlockNumber());
    } catch (ex) {
      // Mostly means provider is disconnected:
      this.networks[chainId] = this.newHttpProvider(network.chain);
      if (retryOnDisconnection) await this.checkoutChainLogs(chainId, false);
      return;
    }

    const blockProcessRange = BigInt(network.chain.blockProcessRange || 50);
    let fromBlock = BigInt(
      network.chain.blockProcessOffset || latestBlockNumber,
    );
    try {
      for (
        let toBlock: bigint;
        fromBlock <= latestBlockNumber;
        fromBlock = toBlock + 1n
      ) {
        toBlock =
          fromBlock + blockProcessRange < latestBlockNumber
            ? fromBlock + blockProcessRange
            : latestBlockNumber;

        await Promise.all(
          (
            await network.provider.getLogs({
              fromBlock,
              toBlock,
              topics: [Object.values(tradeEventsData.signatures)],
            })
          ).map((log) => this.processTradeEventLog(network.provider, log)),
        );

        await Promise.all(
          (
            await network.provider.getLogs({
              fromBlock,
              toBlock,
              topics: [[resolutionEventData.signature]],
            })
          ).map((log) => this.processResolveEvent(network.provider, log)),
        );
      }
    } catch (err) {
      this.loggerService.error(
        `Processing chain:${chainId} panicked at block#${fromBlock}; next check will start from there.`,
        err,
        {
          data: {
            chainId,
            blockNumber: fromBlock,
          },
        },
      );
    }
    await this.updateChainBlockOffset(network.chain, fromBlock);
  }

  extractTradeDataFromEventLog(
    market: PredictionMarket,
    log: ethers.LogDescription,
  ): PredictionMarketTradeDataType {
    if (!log?.args)
      throw new Error('Invalid log arguments provided after decoding.');
    switch (market.type) {
      case PredictionMarketTypesEnum.LMSR.toString():
        return {
          trader: log.args.transactor,
          tokenAmounts: log.args.outcomeTokenAmounts,
          fee: log.args.marketFees,
        };
      case PredictionMarketTypesEnum.FPMM.toString():
        const argumentNames = tradeEventsData.arguments[log.name];
        if (!argumentNames)
          throw new Error('Invalid log arguments provided after decoding.');
        return {
          trader: log.args[argumentNames[0]],
          tokenAmounts: Array(market.numberOfOutcomes).map((_, index) =>
            index == log.args[argumentNames[3]]
              ? BigInt(log.args[argumentNames[4]]) *
                tradeEventsData.valueCoefficients[log.name]
              : 0n,
          ),
          fee: log.args[argumentNames[2]],
        };
    }
    throw new NotImplementedException(
      `${market.type} markets are not fully implemented yet.`,
    );
  }

  async processTradeEventLog(
    provider: ethers.JsonRpcProvider | ethers.WebSocketProvider,
    log: ethers.Log,
  ) {
    let decodedLog: ethers.LogDescription;
    try {
      const market = await this.predictionMarketService.getMarketByAddress(
        log.address,
        {
          shouldThrow: false,
          relations: ['ammFactory', 'outcomeTokens'],
          outcomeTokensOrder: {
            tokenIndex: 'ASC',
          },
        },
      );
      if (!market?.isOpen) return;
      const marketMakerContract = new ethers.Contract(
        market.address,
        market.ammFactory.marketMakerABI,
        provider,
      );
      decodedLog = marketMakerContract.interface.parseLog(log);

      this.loggerService.debug(`A Trade has happened on market#${market.id}.`, {
        data: {
          market: { id: market.id, question: market.question, log, decodedLog },
        },
      });
      await this.predictionMarketService.updateParticipationStatistics(
        market,
        this.extractTradeDataFromEventLog(market, decodedLog),
      );
    } catch (ex) {
      this.loggerService.error('Failed processing trade log', ex as Error, {
        data: { log, decodedLog },
      });
    }
  }

  extractResolutionDataFromEventLog(
    log: ethers.LogDescription,
  ): PredictionMarketResolutionDataType {
    return {
      conditionId: log.args[resolutionEventData.arguments[0]] as string,
      oracleAddress: log.args[resolutionEventData.arguments[1]] as string,
      questionId: log.args[resolutionEventData.arguments[2]] as string,
      outcomeSlotCount: Number(log.args[resolutionEventData.arguments[3]]),
      payoutNumerators: (
        log.args[resolutionEventData.arguments[4]] as Array<number | bigint>
      ).map((truenessRatio) => Number(truenessRatio)),
    };
  }

  async processResolveEvent(
    provider: ethers.JsonRpcProvider | ethers.WebSocketProvider,
    log: ethers.Log,
  ) {
    let decodedLog: ethers.LogDescription;
    try {
      const conditionalTokenContract = new ethers.Contract(
        log.address,
        ConditionTokenContractData.abi,
        provider,
      );
      decodedLog = conditionalTokenContract.interface.parseLog(log);
      await this.predictionMarketService.setMarketResolutionData(
        this.extractResolutionDataFromEventLog(decodedLog),
      );
    } catch (ex) {
      this.loggerService.error(
        'Finalizing market resolution failed!',
        ex as Error,
        { data: { log, decodedLog } },
      );
    }
  }

  // @Cron('*/20 * * * * *')
  async processNetworks() {
    await Promise.all(
      Object.keys(this.networks).map((chainId: string) =>
        this.checkoutChainLogs(+chainId),
      ),
    );
  }
}
