import {
  Injectable,
  NotImplementedException,
  OnModuleInit,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { Chain } from '../blockchain-core/entities/chain.entity';
import { LoggerService } from '../logger/logger.service';
import { tradeEventsData } from './abis/trade-events.abi';
import { PredictionMarketService } from '../prediction-market/prediction-market.service';
import { PredictionMarket } from '../prediction-market/entities/market.entity';
import { PredictionMarketTypesEnum } from '../prediction-market-contracts/enums/market-types.enum';
import {
  PredictionMarketTradeDataType,
  tradeDataToJSON,
} from './types/trade-data.type';
import { resolutionEventData } from './abis/resolution-event.abi';
import { ConditionTokenContractData } from '../prediction-market-contracts/abis/ctf.abi';
import { PredictionMarketResolutionDataType } from './types/resolution-data.type';
import { BlockchainHelperService } from '../blockchain-core/blockchain-helper.service';
import { WebSocket } from 'ws';
import { payoutRedemptionEventData } from './abis/payout-redemption-event.abi';
import { PayoutRedemptionEventDataType } from './types/payout-redemption-data.copy';
import { BlockchainTransactionTypeEnum } from 'src/blockchain-core/enums/transaction-type.enum';
import { toCapitalCase } from 'src/core/utils/strings';

type NetworkDataType = {
  provider: ethers.JsonRpcProvider;
  chain: Chain;
};

@Injectable()
export class BlockchainIndexerService implements OnModuleInit {
  private networks: Record<number, NetworkDataType> = {};
  private websocketNetworks: Record<
    number,
    { connection: WebSocket; provider: ethers.WebSocketProvider }
  > = {};

  private ongoingTimeouts: NodeJS.Timeout[] = [];

  constructor(
    private readonly loggerService: LoggerService,
    private readonly predictionMarketService: PredictionMarketService,
    private readonly blockchainHelperService: BlockchainHelperService,
  ) {}

  async onModuleInit() {
    try {
      await Promise.all(
        (await this.blockchainHelperService.findChains()).map(
          async (chain: Chain) => {
            this.networks[chain.id] = this.newHttpProvider(chain);
            await this.setupWebSocketListener(this.networks[chain.id]);
          },
        ),
      );
    } catch (ex) {
      this.loggerService.error(
        'Failed to initialize blockchain indexer',
        ex as Error,
      );
    }
  }

  async restartIndexer() {
    for (const timeout of this.ongoingTimeouts) clearTimeout(timeout);

    await this.releaseNetworkInstances();
    await this.onModuleInit();
  }

  newHttpProvider(chain: Chain) {
    return {
      chain,
      provider: new ethers.JsonRpcProvider(chain.rpcUrl),
    };
  }

  schedule(f: CallableFunction, due: number) {
    // This is for keeping timeout ids, so when admin tries to restart indexer, server could remove all ongoing timeouts, o.w. it may cause crashes.
    const timeout = setTimeout(async () => {
      await f();
      const idx = this.ongoingTimeouts.findIndex((id) => id == timeout);
      if (idx !== -1) this.ongoingTimeouts.splice(idx, 1);
    }, due * 1000);
    this.ongoingTimeouts.push(timeout);
  }

  prepareToRetryRpcConnection(
    network: NetworkDataType,
    message: string,
    { timeout = 10, err = null }: { timeout?: number; err?: Error } = {},
  ) {
    if (!network?.chain) return;
    this.loggerService.error(
      `Chain#${network.chain.id}[${network.chain.name}]: ${message}; retry in 10 seconds ...`,
      err as Error,
    );
    this.schedule(() => this.setupWebSocketListener(network), timeout);
  }

  async releaseWebsocketProvider(chainId: number | string) {
    if (this.websocketNetworks?.[chainId]?.provider) {
      await this.websocketNetworks[chainId].provider.destroy();
      await this.websocketNetworks[chainId].provider.removeAllListeners();
      this.websocketNetworks[chainId].provider = null;
    }

    if (this.websocketNetworks?.[chainId]?.connection) {
      this.websocketNetworks[chainId].connection.close();
      this.websocketNetworks[chainId].connection.removeEventListener(
        'close',
        () => {},
      );
      this.websocketNetworks[chainId].connection.removeEventListener(
        'message',
        () => {},
      );
      this.websocketNetworks[chainId].connection.removeEventListener(
        'error',
        () => {},
      );
    }
    this.websocketNetworks[chainId] = null;
  }

  async releaseNetworkInstances() {
    await Promise.all(
      Object.keys(this.networks).map(async (chainId: string) => {
        await Promise.all([
          this.networks[chainId].provider.removeAllListeners(),
          this.releaseWebsocketProvider(chainId),
        ]);
        this.networks[chainId].provider.destroy();
        this.networks[chainId].provider = null;
        this.networks[chainId].chain = null;
      }),
    );
    this.networks = {};
  }

  async setupWebSocketListener(network: NetworkDataType) {
    await Promise.all([
      this.releaseWebsocketProvider(network.chain.id),
      this.checkoutChainLogs(network.chain.id),
    ]); // Ensures all logs before this are processed [on server restart or websocket disconnection.],
    // and also all previous websocket connection and listeners are released, to prevent multiple listeners remain open

    try {
      const websocket: WebSocket = new WebSocket(network.chain.webSocketRpcUrl);

      const provider = new ethers.WebSocketProvider(websocket);
      this.websocketNetworks[network.chain.id] = {
        connection: websocket,
        provider,
      };

      websocket.addEventListener('open', () =>
        this.loggerService.debug(
          `Chain#${network.chain.id}: Listeners and Indexer all successfully set up.`,
        ),
      );

      provider.on(
        {
          topics: [Object.values(tradeEventsData.signatures)],
        },
        async (log: ethers.Log) => {
          try {
            await this.processTradeEventLog(provider, log);
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

      provider.on(
        {
          topics: [[resolutionEventData.signature]],
        },
        async (log: ethers.Log) => {
          try {
            await this.processGeneralEvent(provider, log, 'resolve');
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

      provider.on(
        {
          topics: [[payoutRedemptionEventData.signature]],
        },
        async (log: ethers.Log) => {
          try {
            await this.processGeneralEvent(
              provider,
              log,
              'redeem',
              network.chain.id,
            );
            await this.updateChainBlockOffset(
              network.chain,
              BigInt(log.blockNumber + 1),
            );
          } catch (error) {
            this.loggerService.error(
              'Failed to process WebSocket event log',
              error,
              {
                data: { eventType: 'redeem', log },
              },
            );
          }
        },
      );

      websocket.addEventListener('close', async () => {
        this.prepareToRetryRpcConnection(
          network,
          `Listener webSocket disconnected from blockchain`,
        );
      });

      websocket.on('error', () => {});
    } catch (err) {
      this.prepareToRetryRpcConnection(
        network,
        'Failed to setup blockchain listeners or indexer',
        { err },
      );
    }
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

  updateChainBlockOffset(chain: Chain, blockNumber: bigint) {
    chain.blockProcessOffset = blockNumber;
    return this.blockchainHelperService.updateChainData(chain.id, {
      blockProcessOffset: blockNumber,
    });
  }

  async checkoutChainLogs(chainId: number) {
    this.loggerService.debug('HttpIndexer is checking out on blockchain...');
    const network = this.networks[chainId];
    let latestBlockNumber: bigint;
    try {
      latestBlockNumber = BigInt(await network.provider.getBlockNumber());
    } catch (ex) {
      this.loggerService.error(
        `Chain#${chainId}: HttpIndexer failed, JsonRpcProvider seems disconnected.`,
        ex as Error,
        {
          data: {
            fetchedLatestBlock: latestBlockNumber?.toString(),
            lastProcessedBlock: network?.chain?.blockProcessOffset?.toString(),
            chainId,
            rpc: network.chain.rpcUrl,
          },
        },
      );
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
          ).map((log) =>
            this.processGeneralEvent(network.provider, log, 'resolve'),
          ),
        );

        await Promise.all(
          (
            await network.provider.getLogs({
              fromBlock,
              toBlock,
              topics: [[payoutRedemptionEventData.signature]],
            })
          ).map((log) =>
            this.processGeneralEvent(
              network.provider,
              log,
              'redeem',
              network.chain.id,
            ),
          ),
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
          marketFee: log.args.marketFees,
          cost: log.args.outcomeTokenNetCost,
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
          marketFee: log.args[argumentNames[2]],
          cost: 0n, // FIXME: FPMM contract does not return cost like LMSR;
          // You must find a way to calculate that (considering that trade has happened and token price has changed)
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
    let decodedLog: PredictionMarketTradeDataType | null = null;
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
      const marketMakerContract =
        this.blockchainHelperService.getAmmContractHandler(market, provider);
      decodedLog = this.extractTradeDataFromEventLog(
        market,
        marketMakerContract.interface.parseLog(log),
      );

      this.loggerService.debug(`A Trade has happened on market#${market.id}.`, {
        data: {
          market: {
            id: market.id,
            question: market.question,
            decodedLog: tradeDataToJSON(decodedLog),
            log: log.toJSON(),
          },
        },
      });

      const participationsInfo =
        await this.predictionMarketService.updateMarketParticipations(
          market,
          decodedLog,
        );
      if (participationsInfo?.length) {
        await this.blockchainHelperService.addNewTransactionLog(
          participationsInfo[0].userId,
          participationsInfo[0].paymentToken ??
            participationsInfo[0].paymentTokenId,
          participationsInfo[0].transactionType,
          log,
          {
            actualAmount: participationsInfo[0].paymentAmount,
            remarks: {
              exchangeInfo: participationsInfo.map((pi) => ({
                participationId: pi.id,
                amount: pi.amount,
                token: pi.outcome.title,
                fee: pi.marketFee,
              })),
              marketId: market.id,
              description: `${toCapitalCase(participationsInfo[0].mode)} '${
                participationsInfo[0].outcome.title
              }' outcome at '${market.question}'`,
            },
          },
        );
      }
    } catch (ex) {
      this.loggerService.error('Failed processing trade log', ex as Error, {
        data: {
          log,
          ...(decodedLog ? { decodedLog: tradeDataToJSON(decodedLog) } : {}),
        },
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

  extractPayoutRedemptionDataFromEventLog(
    log: ethers.LogDescription,
  ): PayoutRedemptionEventDataType {
    return {
      redeemer: log.args[payoutRedemptionEventData.arguments[0]] as string,
      collateralToken: log.args[
        payoutRedemptionEventData.arguments[1]
      ] as string,
      parentCollectionId: log.args[
        payoutRedemptionEventData.arguments[2]
      ] as string,
      conditionId: log.args[payoutRedemptionEventData.arguments[3]] as string,
      indexSets: log.args[
        payoutRedemptionEventData.arguments[4]
      ] as Array<number>,
      payout: BigInt(log.args[payoutRedemptionEventData.arguments[5]]),
    };
  }

  async processGeneralEvent(
    provider: ethers.JsonRpcProvider | ethers.WebSocketProvider,
    log: ethers.Log,
    eventType: 'redeem' | 'resolve' = 'resolve',
    chainId: number = null,
  ) {
    let decodedLog: ethers.LogDescription;
    try {
      const conditionalTokenContract =
        this.blockchainHelperService.getContractHandler(
          { address: log.address, abi: ConditionTokenContractData.abi },
          provider,
        );
      decodedLog = conditionalTokenContract.interface.parseLog(log);
      switch (eventType) {
        case 'redeem':
          const redeemData =
            await this.predictionMarketService.updateRedeemHistory(
              this.extractPayoutRedemptionDataFromEventLog(decodedLog),
              chainId,
            );

          await this.blockchainHelperService.addNewTransactionLog(
            redeemData.redeemerId,
            redeemData.token ?? redeemData.tokenId,
            BlockchainTransactionTypeEnum.REDEEM,
            log,
            {
              actualAmount: redeemData.payout,
              remarks: {
                marketId: redeemData.marketId,
                redeemHistoryId: redeemData.id,
                description: `Redeem rewards from '${
                  redeemData.market?.question || 'Market#' + redeemData.marketId
                }'`,
              },
            },
          );
          break;
        case 'resolve':
          await this.predictionMarketService.setMarketResolutionData(
            this.extractResolutionDataFromEventLog(decodedLog),
          );
          break;
      }
    } catch (ex) {
      this.loggerService.error(
        `Processing market ${eventType} event log failed!`,
        ex as Error,
        { data: { log, decodedLog, eventType } },
      );
    }
  }

  async processNetworks() {
    await Promise.all(
      Object.keys(this.networks).map((chainId: string) =>
        this.checkoutChainLogs(+chainId),
      ),
    );
  }
}
