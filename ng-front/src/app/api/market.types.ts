export type ConditionalTokenType = {
  marketId: number;
  market?: Record<string, any>;
  collectionId: string;
  tokenIndex: number;
  predictionOutcomeId: number;
  predictionOutcome?: Record<string, any>;
  price?: number;
  amountInvested: number;
};

export type MarketInfoType = {
  outcome: string;
  index: number;
  token: ConditionalTokenType;
};

export type MarketPriceInfoType = MarketInfoType & { price: number };

export type MarketBalanceInfoType = MarketInfoType & { balance: number | string | bigint };

export type MarketParticipationInfoType = MarketInfoType & { participationPossibility: number };
