import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    const order = this.orderRepository.create({
      customerName: createOrderDto.customerName,
      customerEmail: createOrderDto.customerEmail,
      customerPhone: createOrderDto.customerPhone,
      shippingAddress: createOrderDto.shippingAddress,
      notes: createOrderDto.notes,
      totalAmount,
      items: createOrderDto.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    });

    return this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Order> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findById(id);
    
    if (!order) return null;

    if (updateOrderDto.status)  order.status = updateOrderDto.status;
    if (updateOrderDto.shippingAddress) order.shippingAddress = updateOrderDto.shippingAddress;
    if (updateOrderDto.notes) order.notes = updateOrderDto.notes;

    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.orderRepository.delete(id);
    return result.affected > 0;
  }

  async filter(filterDto: FilterOrderDto): Promise<Order[]> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    if (filterDto.id) queryBuilder.andWhere('order.id = :id', { id: filterDto.id });
    if (filterDto.status) queryBuilder.andWhere('order.status = :status', { status: filterDto.status });
    
    if (filterDto.startDate && filterDto.endDate) {
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filterDto.startDate,
        endDate: filterDto.endDate,
      });
    } else if (filterDto.startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', {
        startDate: filterDto.startDate,
      });
    } else if (filterDto.endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', {
        endDate: filterDto.endDate,
      });
    }

    if (filterDto.item) {
      queryBuilder.andWhere(
        '(items.productId LIKE :item OR items.productName LIKE :item)',
        { item: `%${filterDto.item}%` },
      );
    }

    if (filterDto.query) {
      queryBuilder.andWhere(
        '(order.customerName LIKE :query OR order.customerEmail LIKE :query OR order.shippingAddress LIKE :query OR order.notes LIKE :query)',
        { query: `%${filterDto.query}%` },
      );
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');
    
    return queryBuilder.getMany();
  }
}