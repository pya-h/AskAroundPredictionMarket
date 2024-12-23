import { ethers } from 'ethers';

const resolveEventAbi = [
  'bytes32 conditionId',
  'address oracle',
  'bytes32 questionId',
  'uint256 outcomeSlotCount',
  'uint256[] payoutNumerators',
];

export const resolutionEventData = {
  signature: ethers.id(
    `ConditionResolution(${resolveEventAbi
      .map((item: string) => item.split(/ /g)[0])
      .join(',')})`,
  ),
  abi: resolveEventAbi,
  arguments: resolveEventAbi.map((item: string) => item.split(/ /g)[1]),
};
