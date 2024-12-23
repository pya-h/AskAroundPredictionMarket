import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { User } from '../../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto-js';

const configService = new ConfigService();

@Entity('blockchain_wallet')
export class BlockchainWallet extends BaseEntity {
  @Column({ name: 'address', type: 'varchar', length: 256 })
  address: string;

  @Column()
  secret: string;

  @Column({ name: 'user_id', type: 'integer', unique: true, nullable: false })
  userId: number;

  @OneToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  static getEncryptionKey() {
    return configService.getOrThrow<string>('SECRET_ENCRYPTION_KEY');
  }

  static encryptPrivateKey(privateKey: string) {
    return crypto.AES.encrypt(
      privateKey,
      BlockchainWallet.getEncryptionKey(),
    ).toString();
  } // For AFD: Pleas check this out; I implemented the encryption/decryption part this way, so that no other class or service needs to get involve with private key encryption/decryption mechanism.
  // And also implemented a static method, in case someone needs this encryption some where else.
  // But I still have a feeling that someone could get confused (for example they may directly assign the 'secret' field and fuck everything up). what do you think?
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
