import { CryptocurrencyToken } from 'src/blockchain-core/entities/cryptocurrency-token.entity';
import { Oracle } from 'src/prediction-market/entities/oracle.entity';
import { MarketMakerFactory } from '../entities/market-maker-factory.entity';

export type CreateLMSRPredictionMarketBlockchainResult = {
  conditionId: string;
  question: string;
  questionId: string;
  marketMakerFactory: MarketMakerFactory;
  marketMakerAddress: string;
  oracle: Oracle;
  collateralToken: CryptocurrencyToken;
  liquidity: number;
  liquidityWei: number | bigint;
  prepareConditionTxHash: string;
  createMarketTxHash: string;
  chainId: number;
  startedAt: Date;
};
