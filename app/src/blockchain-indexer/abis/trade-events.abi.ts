import { ethers } from 'ethers';

const tradeEventSignatures = {
  FPMMSell: ethers.id('FPMMSell(address,uint256,uint256,uint256,uint256)'),
  FPMMBuy: ethers.id('FPMMBuy(address,uint256,uint256,uint256,uint256)'),
  AMMOutcomeTokenTrade: ethers.id(
    'AMMOutcomeTokenTrade(address,int256[],int256,uint256)',
  ),
};

const eventAbiMap = {
  [tradeEventSignatures.FPMMSell]: [
    'address seller',
    'uint256 returnAmount',
    'uint256 feeAmount',
    'uint256 outcomeIndex',
    'uint256 outcomeTokensSold',
  ],
  [tradeEventSignatures.FPMMBuy]: [
    'address buyer',
    'uint256 investmentAmount',
    'uint256 feeAmount',
    'uint256 outcomeIndex',
    'uint256 outcomeTokensBought',
  ],
  [tradeEventSignatures.AMMOutcomeTokenTrade]: [
    'address transactor',
    'int256[] outcomeTokenAmounts',
    'int256 outcomeTokenNetCost',
    'uint256 marketFees',
  ],
};

const eventArgumentNames = {
  [tradeEventSignatures.FPMMSell]: [
    'seller',
    'returnAmount',
    'feeAmount',
    'outcomeIndex',
    'outcomeTokensSold',
  ],
  [tradeEventSignatures.FPMMBuy]: [
    'buyer',
    'investmentAmount',
    'feeAmount',
    'outcomeIndex',
    'outcomeTokensBought',
  ],
  [tradeEventSignatures.AMMOutcomeTokenTrade]: [
    'transactor',
    'outcomeTokenAmounts',
    'outcomeTokenNetCost',
    'marketFees',
  ],
};

const eventValueCoefficients = {
  [tradeEventSignatures.FPMMSell]: -1n,
  [tradeEventSignatures.FPMMBuy]: 1n,
  [tradeEventSignatures.AMMOutcomeTokenTrade]: 1n,
};

export const tradeEventsData = {
  signatures: tradeEventSignatures,
  abiMap: eventAbiMap,
  arguments: eventArgumentNames,
  valueCoefficients: eventValueCoefficients,
};
