import { ethers } from 'ethers';

const payoutRedemptionEventAbi = [
  'address redeemer',
  'address collateralToken',
  'bytes32 parentCollectionId',
  'bytes32 conditionId',
  'uint256[] indexSets',
  'uint256 payout',
];

export const payoutRedemptionEventData = {
  signature: ethers.id(
    `PayoutRedemption(${payoutRedemptionEventAbi
      .map((item: string) => item.split(/ /g)[0])
      .join(',')})`,
  ),
  abi: payoutRedemptionEventAbi,
  arguments: payoutRedemptionEventAbi.map(
    (item: string) => item.split(/ /g)[1],
  ),
};
