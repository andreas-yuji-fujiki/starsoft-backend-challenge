import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @ApiProperty({ 
    description: 'Status do pedido',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING 
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ 
    description: 'Endereço de entrega',
    example: 'Rua Exemplo, 123 - São Paulo/SP',
    required: false 
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({ 
    description: 'Observações do pedido',
    example: 'Entregar na portaria',
    required: false 
  })
  @IsString()
  @IsOptional()
  notes?: string;
}