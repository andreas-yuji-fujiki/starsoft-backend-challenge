import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { Order } from '../../orders/entities/order.entity';
import { FilterOrderDto } from '../../orders/dto/filter-order.dto';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly indexName = 'orders';
  private isConnected = false;

  constructor(private readonly elasticsearchService: NestElasticsearchService) {}

  async onModuleInit() {
    try {
      const health = await this.elasticsearchService.cluster.health();
      this.logger.log(`Elasticsearch status: ${health.body.status}`);
      this.isConnected = true;
      
      const indexExists = await this.indexExists();
      
      if (!indexExists) {
        await this.createIndex();
        this.logger.log(`Índice ${this.indexName} criado com sucesso`);
      } else {
        this.logger.log(`Índice ${this.indexName} já existe`);
      }
    } catch (error) {
      this.logger.error(`Falha ao inicializar Elasticsearch: ${error.message}`, error.stack);
      this.isConnected = false;
    }
  }

  private async indexExists(): Promise<boolean> {
    try {
      const { body } = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      });
      return !!body;
    } catch (error) {
      this.logger.error(`Erro ao verificar se o índice existe: ${error.message}`, error.stack);
      return false;
    }
  }

  private async createIndex(): Promise<void> {
    try {
      const settings = {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            customerName: { type: 'text', analyzer: 'standard' },
            customerEmail: { type: 'keyword' },
            customerPhone: { type: 'keyword' },
            status: { type: 'keyword' },
            totalAmount: { type: 'float' },
            shippingAddress: { type: 'text', analyzer: 'standard' },
            notes: { type: 'text', analyzer: 'standard' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            items: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                productId: { type: 'keyword' },
                productName: { type: 'text', analyzer: 'standard' },
                unitPrice: { type: 'float' },
                quantity: { type: 'integer' },
                subtotal: { type: 'float' },
              },
            },
          },
        },
      };

      await this.elasticsearchService.indices.create({
        index: this.indexName,
        body: settings,
      });
    } catch (error) {
      this.logger.error(`Erro ao criar o índice: ${error.message}`, error.stack);
      throw error;
    }
  }

  async indexOrder(order: Order): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Não foi possível indexar o pedido ${order.id}: Elasticsearch não está disponível`);
      return;
    }
    
    try {
      await this.elasticsearchService.index({
        index: this.indexName,
        id: order.id,
        body: order,
      });
      this.logger.debug(`Pedido ${order.id} indexado com sucesso`);
    } catch (error) {
      this.logger.error(`Falha ao indexar pedido ${order.id}: ${error.message}`, error.stack);
    }
  }

  async updateOrderIndex(order: Order): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Não foi possível atualizar o índice do pedido ${order.id}: Elasticsearch não está disponível`);
      return;
    }
    
    try {
      await this.elasticsearchService.update({
        index: this.indexName,
        id: order.id,
        body: {
          doc: order,
        },
      });
      this.logger.debug(`Índice do pedido ${order.id} atualizado com sucesso`);
    } catch (error) {
      this.logger.error(`Falha ao atualizar índice do pedido ${order.id}: ${error.message}`, error.stack);
      
      if (error.statusCode === 404) {
        await this.indexOrder(order);
      }
    }
  }

  async removeOrderIndex(id: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Não foi possível remover o índice do pedido ${id}: Elasticsearch não está disponível`);
      return;
    }
    
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id,
      });
      this.logger.debug(`Índice do pedido ${id} removido com sucesso`);
    } catch (error) {
      if (error.statusCode !== 404) {
        this.logger.error(`Falha ao remover índice do pedido ${id}: ${error.message}`, error.stack);
      }
    }
  }

  async search(filterDto: FilterOrderDto): Promise<Order[]> {
    if (!this.isConnected) {
      this.logger.warn(`Não foi possível realizar a busca: Elasticsearch não está disponível`);
      return [];
    }
    
    try {
      const searchParams: any = {
        index: this.indexName,
        body: {
          query: this.buildQuery(filterDto),
          sort: [{ createdAt: { order: 'desc' } }]
        }
      };

      const { body } = await this.elasticsearchService.search(searchParams);
      
      return body.hits.hits.map((hit: any) => {
        return {
          ...hit._source,
          score: hit._score
        } as Order;
      });
    } catch (error) {
      this.logger.error(`Falha ao buscar pedidos: ${error.message}`, error.stack);
      return [];
    }
  }

  private buildQuery(filterDto: FilterOrderDto): any {
    const must: any[] = [];

    if (filterDto.id) {
      must.push({ term: { id: filterDto.id } });
    }

    if (filterDto.status) {
      must.push({ term: { status: filterDto.status } });
    }

    if (filterDto.startDate || filterDto.endDate) {
      const range: any = { createdAt: {} };
      
      if (filterDto.startDate) {
        range.createdAt.gte = filterDto.startDate.toISOString();
      }
      
      if (filterDto.endDate) {
        range.createdAt.lte = filterDto.endDate.toISOString();
      }
      
      must.push({ range });
    }

    if (filterDto.item) {
      must.push({
        nested: {
          path: 'items',
          query: {
            bool: {
              should: [
                { match: { 'items.productName': filterDto.item } },
                { term: { 'items.productId': filterDto.item } },
              ],
            },
          },
        },
      });
    }

    if (filterDto.query) {
      must.push({
        multi_match: {
          query: filterDto.query,
          fields: ['customerName', 'customerEmail', 'shippingAddress', 'notes'],
        },
      });
    }

    return must.length > 0 ? { bool: { must } } : { match_all: {} };
  }
}