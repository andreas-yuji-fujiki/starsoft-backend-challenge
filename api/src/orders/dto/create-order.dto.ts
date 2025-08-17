import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNumber, 
  Min, 
  IsPositive
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ 
    description: 'ID do produto',
    example: '8f7b5db5-8d69-4a6d-81e5-51f33d0e30b0' 
  })
  @IsString()
  productId: string;

  @ApiProperty({ 
    description: 'Nome do produto',
    example: 'iPhone 13 Pro' 
  })
  @IsString()
  productName: string;

  @ApiProperty({ 
    description: 'Preço unitário do produto',
    example: 999.99 
  })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ 
    description: 'Quantidade do produto',
    example: 1 
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ 
    description: 'Subtotal do item (preço unitário * quantidade)',
    example: 999.99 
  })
  @IsNumber()
  @IsPositive()
  subtotal: number;
}

export class CreateOrderDto {
  @ApiProperty({ 
    description: 'Nome do cliente',
    example: 'João Silva' 
  })
  @IsString()
  customerName: string;

  @ApiProperty({ 
    description: 'Email do cliente',
    example: 'joao.silva@exemplo.com' 
  })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ 
    description: 'Telefone do cliente',
    example: '+5511999999999',
    required: false 
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({ 
    description: 'Itens do pedido',
    type: [CreateOrderItemDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

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