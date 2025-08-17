import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @ApiProperty({
    description: 'ID único do pedido',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Nome do cliente',
    example: 'João Silva'
  })
  @Column({ nullable: false })
  customerName: string;

  @ApiProperty({
    description: 'Email do cliente',
    example: 'joao.silva@exemplo.com'
  })
  @Column({ nullable: false })
  customerEmail: string;

  @ApiProperty({
    description: 'Telefone do cliente',
    example: '+5511999999999',
    required: false
  })
  @Column({ nullable: true })
  customerPhone: string;

  @ApiProperty({
    description: 'Status do pedido',
    enum: OrderStatus,
    example: OrderStatus.PENDING
  })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Valor total do pedido',
    example: 1299.99
  })
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @ApiProperty({
    description: 'Itens do pedido',
    type: [OrderItem]
  })
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @ApiProperty({
    description: 'Endereço de entrega',
    example: 'Rua Exemplo, 123 - São Paulo/SP',
    required: false
  })
  @Column({ nullable: true })
  shippingAddress: string;

  @ApiProperty({
    description: 'Observações do pedido',
    example: 'Entregar na portaria',
    required: false
  })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({
    description: 'Data de criação do pedido',
    example: '2025-05-11T12:00:00.000Z'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do pedido',
    example: '2025-05-11T12:00:00.000Z'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}