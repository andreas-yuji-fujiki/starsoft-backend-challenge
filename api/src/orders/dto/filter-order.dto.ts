import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class FilterOrderDto {
  @ApiProperty({ 
    description: 'ID do pedido',
    example: '8f7b5db5-8d69-4a6d-81e5-51f33d0e30b0',
    required: false 
  })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ 
    description: 'Status do pedido',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    required: false 
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ 
    description: 'Data inicial para filtro',
    example: '2025-01-01T00:00:00.000Z',
    required: false 
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ 
    description: 'Data final para filtro',
    example: '2025-05-01T00:00:00.000Z',
    required: false 
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ 
    description: 'Item contido no pedido (nome ou ID do produto)',
    example: 'iPhone',
    required: false 
  })
  @IsString()
  @IsOptional()
  item?: string;

  @ApiProperty({ 
    description: 'Termo de busca (pesquisa por cliente, endereço, notas, etc)',
    example: 'João Silva',
    required: false 
  })
  @IsString()
  @IsOptional()
  query?: string;
}