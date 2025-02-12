export type PayoutRedemptionEventDataType = {
  redeemer: string;
  collateralToken: string;
  parentCollectionId: string;
  conditionId: string;
  indexSets: Array<number>;
  payout: bigint;
};
