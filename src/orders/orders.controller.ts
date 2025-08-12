import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() orderData: Partial<Order>): Promise<Order> {
    return this.ordersService.create(orderData);
  }

  @Get()
  findAll(): Promise<Order[]> {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Order | null> {
    return this.ordersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Order>): Promise<Order | null> {
    return this.ordersService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.ordersService.remove(id);
  }

  @Get('search')
  search(@Query() query: any): Promise<any> {
    return this.ordersService.search(query);
  }
}
