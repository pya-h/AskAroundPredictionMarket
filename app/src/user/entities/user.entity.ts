import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  AfterInsert,
  AfterUpdate,
  DeleteDateColumn,
  AfterRemove,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;

  @Exclude()
  @Column()
  password: string;

  @AfterInsert()
  logAfterInsert() {
    console.log('This User object has been INSERTED: ', this);
  }

  @AfterUpdate()
  logAfterUpdate() {
    console.log('This User object has been UPDATED: ', this);
  }

  @AfterRemove()
  logAfterRemove() {
    console.log('This User object has been REMOVED: ', this);
  }

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    default: null,
  })
  deletedAt: Date;
  
}
