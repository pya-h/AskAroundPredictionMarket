export type PredictionMarketTradeDataType = {
  trader: string;
  tokenAmounts: bigint[];
  marketFee: bigint;
  cost: bigint;
};

export const tradeDataToJSON = ({
  trader,
  tokenAmounts,
  marketFee,
}: PredictionMarketTradeDataType) => ({
  trader,
  tokenAmounts: tokenAmounts.map((amount) => amount.toString()),
  marketFee: marketFee.toString(),
});
