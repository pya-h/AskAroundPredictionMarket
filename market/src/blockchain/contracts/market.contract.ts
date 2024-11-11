export const MarketMakerFactoryContract = {
  address: '0x123123121313',
  abi: [
    {
      inputs: [
        { internalType: 'address', name: '_collateralToken', type: 'address' },
        { internalType: 'uint256', name: '_initialFunding', type: 'uint256' },
        { internalType: 'string[]', name: '_outcomes', type: 'string[]' },
      ],
      name: 'createMarketMaker',
      outputs: [
        {
          internalType: 'address',
          name: 'marketMakerAddress',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
};

export const FixedProductMarketMakerContract = {
  address: '0x000000',
  abi: [
    {
      inputs: [
        { internalType: 'address', name: '_outcomeToken', type: 'address' },
        { internalType: 'uint256', name: '_amount', type: 'uint256' },
      ],
      name: 'buyOutcomeTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'address', name: '_outcomeToken', type: 'address' },
        { internalType: 'uint256', name: '_amount', type: 'uint256' },
      ],
      name: 'sellOutcomeTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
};
