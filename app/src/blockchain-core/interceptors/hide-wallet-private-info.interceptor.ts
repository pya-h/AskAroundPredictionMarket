import { ExcludePrivateInfo } from 'src/core/interceptors/exclude-private-info.interceptor';
import { BlockchainWallet } from '../entities/blockchain-wallet.entity';
import { BlockchainWalletPublicDataDto } from '../dtos/response/blockchain-wallet-public-data.dto';

/**
 * Notice: Don't overdo using NoPersonalUserDataInterceptor to filter BlockchainWallet.user data, this one will take care of that.
 */
export const HideBlockchainWalletsPrivateData = (...parentFields: string[]) =>
  ExcludePrivateInfo(
    BlockchainWallet,
    BlockchainWalletPublicDataDto,
    parentFields,
  );
