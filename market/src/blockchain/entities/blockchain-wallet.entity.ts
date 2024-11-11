import { Column } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';

export class BlockchainWallet extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ name: 'public_key', type: 'varchar', length: 128 })
  publicKey: string;

  @Column()
  secret: string; // TODO: private key (does it need encryption?)

  @Column({ name: 'user_id', type: 'integer', unique: true, nullable: false })
  userId: number;

  // @OneToOne(() => User)
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  getPrivateKey() {
    return this.secret; // TODO: If the secret is encrypted, decrypt it here.
  }
}
