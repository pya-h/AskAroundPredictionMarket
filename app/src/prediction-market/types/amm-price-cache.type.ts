export type AmmOutcomePriceCacheType = {
  id: number;
  index: number;
  price: number;
};

export type AmmMarketPriceCacheType = {
  each: AmmOutcomePriceCacheType[];
  sum: number;
};
