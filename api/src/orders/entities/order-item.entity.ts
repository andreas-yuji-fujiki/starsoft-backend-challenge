import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({
    description: 'ID único do item do pedido',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID do produto',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @Column({ nullable: false })
  productId: string;

  @ApiProperty({
    description: 'Nome do produto',
    example: 'iPhone 13 Pro'
  })
  @Column({ nullable: false })
  productName: string;

  @ApiProperty({
    description: 'Preço unitário do produto',
    example: 999.99
  })
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @ApiProperty({
    description: 'Quantidade do produto',
    example: 1
  })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({
    description: 'Subtotal do item (preço unitário * quantidade)',
    example: 999.99
  })
  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    description: 'ID do pedido ao qual o item pertence',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @Column()
  orderId: string;

  @ApiProperty({
    description: 'Data de criação do item',
    example: '2025-05-11T12:00:00.000Z'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do item',
    example: '2025-05-11T12:00:00.000Z'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}