import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';

export enum CredentialAccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

@Entity('shared_credentials')
export class SharedCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  credentialId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: CredentialAccessLevel,
    default: CredentialAccessLevel.READ
  })
  accessLevel: CredentialAccessLevel;

  @ManyToOne(() => User, user => user.sharedCredentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}