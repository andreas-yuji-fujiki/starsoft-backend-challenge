import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';

import { ClientKafka } from '@nestjs/microservices';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    private readonly elastic: ElasticsearchService,
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // subscribe to topics to ensure connection
    this.kafkaClient.subscribeToResponseOf('order_created');
    this.kafkaClient.subscribeToResponseOf('order_status_updated');
    await this.kafkaClient.connect();
  }

  async create(orderData: Partial<Order>): Promise<Order> {
    const order = this.ordersRepo.create(orderData);
    const savedOrder = await this.ordersRepo.save(order);

    // emit kafka event
    this.kafkaClient.emit('order_created', savedOrder);

    // index in elasticsearch
    await this.elastic.index({
      index: 'orders',
      id: savedOrder.id,
      document: savedOrder,
    });

    return savedOrder;
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepo.find();
  }

  async findOne(id: string): Promise<Order | null> {
    return this.ordersRepo.findOneBy({ id });
  }

  async update(id: string, updateData: Partial<Order>): Promise<Order | null> {
    await this.ordersRepo.update(id, updateData);

    const updatedOrder = await this.ordersRepo.findOneBy({ id });

    // emit kafka event if status changed
    if (updateData.status) {
      this.kafkaClient.emit('order_status_updated', { id, status: updateData.status });
    }

    // update index in elasticsearch
    await this.elastic.update({
      index: 'orders',
      id,
      doc: updateData,
    });

    return updatedOrder;
  }

  async remove(id: string): Promise<void> {
    await this.ordersRepo.delete(id);

    // remove from elasticsearch
    await this.elastic.delete({
      index: 'orders',
      id,
    });
  }

  // advanced search in elasticsearch
  async search(query: any): Promise<any> {
    return this.elastic.search({
      index: 'orders',
      query,
    });
  }
}
