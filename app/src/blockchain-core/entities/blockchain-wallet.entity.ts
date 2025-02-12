import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { User } from '../../user/entities/user.entity';
import * as crypto from 'crypto-js';
import { ApiProperty } from '@nestjs/swagger';
import { ConfigService } from 'src/config/config.service';

const configService = new ConfigService();

@Entity('blockchain_wallet')
export class BlockchainWallet extends BaseEntity {
  @ApiProperty({
    description: 'Blockchain wallet address',
    example: '0x' + '0'.repeat(64),
  })
  @Column({ name: 'address', type: 'varchar', length: 256 })
  address: string;

  @Column()
  secret: string;

  @ApiProperty({
    description: 'The id of the wallet owner',
  })
  @Column({ name: 'user_id', type: 'integer', unique: true, nullable: false })
  userId: number;

  @OneToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  static getEncryptionKey() {
    const encKey = configService.getOrThrow<string>('SECRET_ENCRYPTION_KEY');
    if (!encKey.trim().length)
      throw new Error(
        'SECRET_ENCRYPTION_KEY is crucial for blockchain wallet management.',
      );
    return encKey;
  }

  static encryptPrivateKey(privateKey: string) {
    return crypto.AES.encrypt(
      privateKey,
      BlockchainWallet.getEncryptionKey(),
    ).toString();
  }

  get privateKey() {
    const secretAsBytes = crypto.AES.decrypt(
      this.secret,
      BlockchainWallet.getEncryptionKey(),
    );
    return secretAsBytes.toString(crypto.enc.Utf8);
  }

  set privateKey(privateKey: string) {
    // Notice: use this setter for auto-encrypting a wallet private key, or use encryptPrivateKey method manually.
    this.secret = BlockchainWallet.encryptPrivateKey(privateKey);
  }
}
