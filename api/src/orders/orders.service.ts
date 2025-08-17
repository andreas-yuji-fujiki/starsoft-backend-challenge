import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { KafkaProducerService } from '../infrastructure/kafka/kafka-producer.service';
import { ElasticsearchService } from '../infrastructure/elasticsearch/elasticsearch.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Criando novo pedido para cliente: ${createOrderDto.customerName}`);

    const order = await this.ordersRepository.create(createOrderDto);
    
    try {
      await this.kafkaProducerService.publish('order_created', {
        key: order.id, 
        value: JSON.stringify({
          orderId: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount,
          status: order.status,
          items: order.items,
          createdAt: order.createdAt,
        })
      });
      
      this.logger.log(`Evento order_created publicado para o pedido ${order.id}`);
    } catch (error) {
      this.logger.error(`Erro ao publicar evento no Kafka para o pedido ${order.id}: ${error.message}`, error.stack);
    }
    
    try {
      await this.elasticsearchService.indexOrder(order);
      this.logger.log(`Pedido ${order.id} indexado no Elasticsearch`);
    } catch (error) {
      this.logger.error(`Erro ao indexar pedido ${order.id} no Elasticsearch: ${error.message}`, error.stack);
    }

    return order;
  }

  async findAll(): Promise<Order[]> {
    this.logger.log('Buscando todos os pedidos');
    return this.ordersRepository.findAll();
  }

  async findById(id: string): Promise<Order> {
    this.logger.log(`Buscando pedido por ID: ${id}`);
    const order = await this.ordersRepository.findById(id);
    
    if (!order) {
      this.logger.warn(`Pedido com ID ${id} não encontrado`);
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }
    
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    this.logger.log(`Atualizando pedido ${id}`);
    
    const existingOrder = await this.findById(id);
    
    const updatedOrder = await this.ordersRepository.update(id, updateOrderDto);
    
    if (!updatedOrder) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }
    
    try {
      if (updateOrderDto.status && updateOrderDto.status !== existingOrder.status) {
        await this.kafkaProducerService.publish('order_status_updated', {
          key: updatedOrder.id, 
          value: JSON.stringify({
            orderId: updatedOrder.id,
            previousStatus: existingOrder.status,
            currentStatus: updatedOrder.status,
            updatedAt: updatedOrder.updatedAt,
          })
        });
        
        this.logger.log(`Evento order_status_updated publicado para o pedido ${id}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao publicar evento de atualização no Kafka para o pedido ${id}: ${error.message}`, error.stack);
    }
    
    try {
      await this.elasticsearchService.updateOrderIndex(updatedOrder);
      this.logger.log(`Pedido ${id} atualizado no Elasticsearch`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar pedido ${id} no Elasticsearch: ${error.message}`, error.stack);
    }
    
    return updatedOrder;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removendo pedido ${id}`);
    
    await this.findById(id);
    
    const deleted = await this.ordersRepository.remove(id);
    
    if (!deleted) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }
    
    try {
      await this.elasticsearchService.removeOrderIndex(id);
      this.logger.log(`Pedido ${id} removido do Elasticsearch`);
    } catch (error) {
      this.logger.error(`Erro ao remover pedido ${id} do Elasticsearch: ${error.message}`, error.stack);
    }
    
    try {
      await this.kafkaProducerService.publish('order_deleted', {
        key: id,
        value: JSON.stringify({
          orderId: id,
          deletedAt: new Date().toISOString()
        })
      });
      this.logger.log(`Evento order_deleted publicado para o pedido ${id}`);
    } catch (error) {
      this.logger.error(`Erro ao publicar evento de remoção no Kafka para o pedido ${id}: ${error.message}`, error.stack);
    }
  }

  async search(filterDto: FilterOrderDto): Promise<Order[]> {
    this.logger.log(`Buscando pedidos com filtros: ${JSON.stringify(filterDto)}`);
    
    try {
      const elasticResults = await this.elasticsearchService.search(filterDto);
      
      if (elasticResults && elasticResults.length > 0) {
        this.logger.log(`${elasticResults.length} pedidos encontrados no Elasticsearch`);
        return elasticResults;
      }
      this.logger.log('Nenhum resultado encontrado no Elasticsearch, usando busca no banco de dados');
    } catch (error) {
      this.logger.warn(`Busca no Elasticsearch falhou, usando busca no banco de dados: ${error.message}`);
    }

    this.logger.log('Buscando no banco de dados relacional');
    console.log('Buscando no banco de dados relacional');
    return this.ordersRepository.filter(filterDto);
  }
}