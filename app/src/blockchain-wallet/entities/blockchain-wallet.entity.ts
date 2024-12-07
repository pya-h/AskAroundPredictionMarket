import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('blockchain_wallet')
export class BlockchainWallet extends BaseEntity {
  @Column({ name: 'address', type: 'varchar', length: 256 })
  address: string;

  @Column({ nullable: true }) // TODO: Later decide if this nullable must be removed or not
  secret: string; // TODO: private key (does it need encryption?)

  @Column({ name: 'user_id', type: 'integer', unique: true, nullable: false })
  userId: number;

  @OneToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  getPrivateKey() {
    return this.secret; // TODO: If the secret is encrypted, decrypt it here.
  }
}
