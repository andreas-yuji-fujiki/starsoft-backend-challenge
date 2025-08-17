import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { KafkaProducerService } from '../infrastructure/kafka/kafka-producer.service';
import { ElasticsearchService } from '../infrastructure/elasticsearch/elasticsearch.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { NotFoundException } from '@nestjs/common';

const mockOrderItem: any = {
  id: '1',
  productId: 'p1', 
  productName: 'Product 1', 
  quantity: 2, 
  unitPrice: 10.0,
  subtotal: 20.0,
  orderId: '1'
};

const mockOrder: Partial<Order> = {
  id: '1',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  status: OrderStatus.PENDING,
  items: [mockOrderItem],
  totalAmount: 20.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateOrderItemDto: any = {
  productId: 'p1', 
  productName: 'Product 1', 
  quantity: 2, 
  unitPrice: 10.0,
  subtotal: 20.0
};

const mockCreateOrderDto: Partial<CreateOrderDto> = {
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  items: [mockCreateOrderItemDto],
};

const mockUpdateOrderDto: Partial<UpdateOrderDto> = {
  status:  OrderStatus.SHIPPED, 
};

const mockFilterOrderDto: Partial<FilterOrderDto> = {
  status:  OrderStatus.PENDING,
};

const mockOrdersRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  filter: jest.fn(),
};

const mockKafkaProducerService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockElasticsearchService = {
  indexOrder: jest.fn().mockResolvedValue(undefined),
  updateOrderIndex: jest.fn().mockResolvedValue(undefined),
  removeOrderIndex: jest.fn().mockResolvedValue(undefined),
  search: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: OrdersRepository;
  let kafkaService: KafkaProducerService;
  let elasticsearchService: ElasticsearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: mockOrdersRepository,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducerService,
        },
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repository = module.get<OrdersRepository>(OrdersRepository);
    kafkaService = module.get<KafkaProducerService>(KafkaProducerService);
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order and publish events', async () => {
      mockOrdersRepository.create.mockResolvedValue(mockOrder);
      
      const result = await service.create(mockCreateOrderDto as CreateOrderDto);
      
      expect(repository.create).toHaveBeenCalledWith(mockCreateOrderDto);
      expect(kafkaService.publish).toHaveBeenCalled();
      expect(elasticsearchService.indexOrder).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });

    it('should continue processing if Kafka publish fails', async () => {
      mockOrdersRepository.create.mockResolvedValue(mockOrder);
      mockKafkaProducerService.publish.mockRejectedValue(new Error('Kafka error'));
      
      const result = await service.create(mockCreateOrderDto as CreateOrderDto);
      
      expect(repository.create).toHaveBeenCalledWith(mockCreateOrderDto);
      expect(kafkaService.publish).toHaveBeenCalled();
      expect(elasticsearchService.indexOrder).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });

    it('should continue processing if Elasticsearch indexing fails', async () => {
      mockOrdersRepository.create.mockResolvedValue(mockOrder);
      mockElasticsearchService.indexOrder.mockRejectedValue(new Error('Elasticsearch error'));
      
      const result = await service.create(mockCreateOrderDto as CreateOrderDto);
      
      expect(repository.create).toHaveBeenCalledWith(mockCreateOrderDto);
      expect(kafkaService.publish).toHaveBeenCalled();
      expect(elasticsearchService.indexOrder).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      mockOrdersRepository.findAll.mockResolvedValue([mockOrder]);
      
      const result = await service.findAll();
      
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('findById', () => {
    it('should return a single order by ID', async () => {
      mockOrdersRepository.findById.mockResolvedValue(mockOrder);
      
      const result = await service.findById(mockOrder.id);
      
      expect(repository.findById).toHaveBeenCalledWith(mockOrder.id);
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);
      
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('update', () => {
    it('should update an order and publish events when status changes', async () => {
      const existingOrder = { ...mockOrder };
      const updatedOrder = { 
        ...mockOrder, 
        status: 'SHIPPED',
        updatedAt: new Date() 
      };
      mockOrdersRepository.findById.mockResolvedValue(existingOrder);
      mockOrdersRepository.update.mockResolvedValue(updatedOrder);
      
      const result = await service.update(mockOrder.id, mockUpdateOrderDto as UpdateOrderDto);
      
      expect(repository.findById).toHaveBeenCalledWith(mockOrder.id);
      expect(repository.update).toHaveBeenCalledWith(mockOrder.id, mockUpdateOrderDto);
      expect(kafkaService.publish).toHaveBeenCalled();
      expect(elasticsearchService.updateOrderIndex).toHaveBeenCalledWith(updatedOrder);
      expect(result).toEqual(updatedOrder);
    });

    it('should not publish events when status does not change', async () => {
      const existingOrder = { ...mockOrder };
      const updateDto = { customerName: 'Jane Doe' };
      const updatedOrder = { 
        ...mockOrder, 
        customerName: 'Jane Doe', 
        updatedAt: new Date() 
      };
      
      mockOrdersRepository.findById.mockResolvedValue(existingOrder);
      mockOrdersRepository.update.mockResolvedValue(updatedOrder);
      
      const result = await service.update(mockOrder.id, updateDto as any);
      
      expect(repository.findById).toHaveBeenCalledWith(mockOrder.id);
      expect(repository.update).toHaveBeenCalledWith(mockOrder.id, updateDto);
      expect(kafkaService.publish).not.toHaveBeenCalled();
      expect(elasticsearchService.updateOrderIndex).toHaveBeenCalledWith(updatedOrder);
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('search', () => {
    it('should search orders from Elasticsearch', async () => {
      mockElasticsearchService.search.mockResolvedValue([mockOrder]);
      
      const result = await service.search(mockFilterOrderDto as FilterOrderDto);
      
      expect(elasticsearchService.search).toHaveBeenCalledWith(mockFilterOrderDto);
      expect(repository.filter).not.toHaveBeenCalled();
      expect(result).toEqual([mockOrder]);
    });

    it('should fallback to repository search when Elasticsearch returns no results', async () => {
      mockElasticsearchService.search.mockResolvedValue([]);
      mockOrdersRepository.filter.mockResolvedValue([mockOrder]);
      
      const result = await service.search(mockFilterOrderDto as FilterOrderDto);
      
      expect(elasticsearchService.search).toHaveBeenCalledWith(mockFilterOrderDto);
      expect(repository.filter).toHaveBeenCalledWith(mockFilterOrderDto);
      expect(result).toEqual([mockOrder]);
    });
  });
});