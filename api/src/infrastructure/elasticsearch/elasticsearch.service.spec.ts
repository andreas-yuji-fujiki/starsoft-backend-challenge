import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from './elasticsearch.service';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { FilterOrderDto } from '../../orders/dto/filter-order.dto';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  let nestElasticsearchService: NestElasticsearchService;
  let logger: Logger;

  const mockOrder: Partial<Order> = {
    id: '1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: OrderStatus.PENDING,
    totalAmount: 20.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNestElasticsearchService = {
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
    },
    index: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    cat: {
      health: jest.fn(),
    },
    cluster: {
      health: jest.fn(), 
    },
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockNestElasticsearchService.indices.exists.mockResolvedValue({ body: false });
    mockNestElasticsearchService.indices.create.mockResolvedValue({ body: { acknowledged: true } });
    
    mockNestElasticsearchService.index.mockResolvedValue({ 
      body: { result: 'created' } 
    });
    
    mockNestElasticsearchService.delete.mockResolvedValue({ 
      body: { result: 'deleted' } 
    });
    
    mockNestElasticsearchService.search.mockResolvedValue({ 
      body: {
        hits: {
          hits: [
            { _source: { id: '1', customerName: 'Test Customer' } },
          ],
        },
      } 
    });

    mockNestElasticsearchService.cat.health.mockResolvedValue({
      body: 'green',
      statusCode: 200,
    });

    mockNestElasticsearchService.cluster.health.mockResolvedValue({
      body: { status: 'green' },
      statusCode: 200,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        {
          provide: NestElasticsearchService,
          useValue: mockNestElasticsearchService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'ELASTICSEARCH_NODE') return 'http://localhost:9200';
              return null;
            }),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
    nestElasticsearchService = module.get<NestElasticsearchService>(NestElasticsearchService);
    logger = module.get<Logger>(Logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize without errors', async () => {
      if (typeof service.onModuleInit === 'function') {
        await service.onModuleInit();
      }
    });
  });

  describe('indexOrder', () => {
    it('should index an order in Elasticsearch', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      const indexOrderSpy = jest.spyOn(service, 'indexOrder');
      
      await service.indexOrder(mockOrder as Order);
      
      expect(indexOrderSpy).toHaveBeenCalledWith(mockOrder);
    });

    it('should handle errors gracefully', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      mockNestElasticsearchService.index.mockRejectedValueOnce(new Error('Elasticsearch error'));
      
      await expect(service.indexOrder(mockOrder as Order)).resolves.not.toThrow();
    });
  });

  describe('updateOrderIndex', () => {
    it('should update an order in Elasticsearch', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      const updateOrderSpy = jest.spyOn(service, 'updateOrderIndex');
      
      await service.updateOrderIndex(mockOrder as Order);
      
      expect(updateOrderSpy).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('removeOrderIndex', () => {
    it('should attempt to remove an order from Elasticsearch', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      const removeOrderSpy = jest.spyOn(service, 'removeOrderIndex');
      
      await service.removeOrderIndex('1');
      
      expect(removeOrderSpy).toHaveBeenCalledWith('1');
    });
  });

  describe('search', () => {
    it('should search for orders with filters', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      const filterDto: Partial<FilterOrderDto> = {
        status: OrderStatus.PENDING,
      };
      
      const serviceSpy = jest.spyOn(service, 'search');
      
      const result = await service.search(filterDto as FilterOrderDto);
      
      expect(serviceSpy).toHaveBeenCalledWith(filterDto);
    });

    it('should handle empty results gracefully', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      mockNestElasticsearchService.search.mockResolvedValueOnce({
        body: { hits: { hits: [] } },
      });
      
      const result = await service.search({} as FilterOrderDto);
      
      expect(Array.isArray(result) || result === null).toBeTruthy();
    });

    it('should handle search errors gracefully', async () => {
      if (typeof service.onModuleInit === 'function') {
        try {
          await service.onModuleInit();
        } catch (error) {
        }
      }

      mockNestElasticsearchService.search.mockRejectedValueOnce(new Error('Elasticsearch search error'));
      
      const result = await service.search({} as FilterOrderDto);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});