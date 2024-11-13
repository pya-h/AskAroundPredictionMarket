import { ethers } from 'ethers';

// Connect to the local Ganache provider
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

async function getBlockAndTransactions(blockNumber) {
    // Get block details
    const block = await provider.getBlock(blockNumber);
    console.log(`Block Number: ${block.number}`);
    console.log(`Block Hash: ${block.hash}`);
    console.log(`Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    
    // Get transactions in the block
    for (const txHash of block.transactions) {
        const transaction = await provider.getTransaction(txHash);
        console.log(`Transaction Hash: ${transaction.hash}`);
        console.log(`From: ${transaction.from}`);
        console.log(`To: ${transaction.to}`);
        console.log(`Value: ${ethers.formatEther(transaction.value)} ETH`);
        console.log('---');
    }
}

async function main() {
    const latestBlockNumber = await provider.getBlockNumber();
    console.log(`Latest Block Number: ${latestBlockNumber}`);

    // You can specify any block number or just use the latest one
    await getBlockAndTransactions(13n);
}

// Execute the main function
main().catch(console.error);