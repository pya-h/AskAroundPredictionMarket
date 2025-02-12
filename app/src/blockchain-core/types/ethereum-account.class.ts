import { ethers } from 'ethers';
import { BlockchainWallet } from '../entities/blockchain-wallet.entity';

export class EthereumAccount {
  private _ethers: ethers.Wallet;
  private _wallet: BlockchainWallet;
  private _provider: ethers.JsonRpcProvider;

  constructor(wallet: BlockchainWallet, provider: ethers.JsonRpcProvider) {
    this._provider = provider;
    this.wallet = wallet;
  }

  set wallet(w: BlockchainWallet) {
    this._wallet = w;
    this._ethers = new ethers.Wallet(w.privateKey, this._provider);
  }

  get wallet() {
    return this._wallet;
  }

  get ethers() {
    return this._ethers;
  }

  get address() {
    return this._wallet.address;
  }

  get id() {
    return this._wallet.id;
  }

  get ownerId() {
    return this._wallet.userId;
  }

  get provider() {
    return this._provider;
  }

  set provider(provider: ethers.JsonRpcProvider) {
    this._provider = provider;
    this._ethers = new ethers.Wallet(this._wallet.privateKey, provider);
  }
}
