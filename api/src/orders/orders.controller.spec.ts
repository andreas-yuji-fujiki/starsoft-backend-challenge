import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { KafkaProducerService } from '../infrastructure/kafka/kafka-producer.service';
import { ElasticsearchService } from '../infrastructure/elasticsearch/elasticsearch.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

describe('OrdersController (Integration)', () => {
  let app: INestApplication;
  let ordersService: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    search: jest.fn(),
  };

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
    status: OrderStatus.SHIPPED,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: OrdersRepository,
          useValue: {},
        },
        {
          provide: KafkaProducerService,
          useValue: {},
        },
        {
          provide: ElasticsearchService,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    
    await app.init();
    
    ordersService = moduleFixture.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create a new order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const response = await supertest(app.getHttpServer())
        .post('/orders')
        .send(mockCreateOrderDto)
        .expect(201);

      expect(response.body).toEqual(expect.objectContaining({
        id: mockOrder.id,
        customerName: mockOrder.customerName,
      }));
      expect(ordersService.create).toHaveBeenCalled();
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = {
        items: [],
      };

      await supertest(app.getHttpServer())
        .post('/orders')
        .send(invalidDto)
        .expect(400);

      expect(ordersService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /orders', () => {
    it('should return all orders', async () => {
      mockOrdersService.findAll.mockResolvedValue([mockOrder]);

      const response = await supertest(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockOrder.id,
            customerName: mockOrder.customerName,
          })
        ])
      );
      expect(ordersService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /orders/:id', () => {
    it('should return a single order by ID', async () => {
      mockOrdersService.findById.mockResolvedValue(mockOrder);

      const response = await supertest(app.getHttpServer())
        .get('/orders/1')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: mockOrder.id,
          customerName: mockOrder.customerName,
        })
      );
      expect(ordersService.findById).toHaveBeenCalledWith('1');
    });

    it('should return 500 if order not found', async () => {
      mockOrdersService.findById.mockRejectedValue({
        response: { statusCode: 404 },
        status: 404,
      });

      await supertest(app.getHttpServer())
        .get('/orders/999')
        .expect(500);

      expect(ordersService.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('PATCH /orders/:id', () => {
    it('should update an order', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: 'SHIPPED',
        updatedAt: new Date(),
      };
      mockOrdersService.update.mockResolvedValue(updatedOrder);

      const response = await supertest(app.getHttpServer())
        .patch('/orders/1')
        .send(mockUpdateOrderDto)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: updatedOrder.id,
          status: updatedOrder.status,
        })
      );
      expect(ordersService.update).toHaveBeenCalledWith('1', expect.any(Object));
    });

    it('should return 500 if order not found for update', async () => {
      mockOrdersService.update.mockRejectedValue({
        response: { statusCode: 404 },
        status: 404,
      });

      await supertest(app.getHttpServer())
        .patch('/orders/999')
        .send(mockUpdateOrderDto)
        .expect(500);

      expect(ordersService.update).toHaveBeenCalledWith('999', expect.any(Object));
    });

    it('should return 400 if update validation fails', async () => {
      const invalidUpdateDto = {
        status: 123,
      };

      await supertest(app.getHttpServer())
        .patch('/orders/1')
        .send(invalidUpdateDto)
        .expect(400);

      expect(ordersService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /orders/:id', () => {
    it('should delete an order', async () => {
      mockOrdersService.remove.mockResolvedValue(undefined);

      await supertest(app.getHttpServer())
        .delete('/orders/1')
        .expect(200);

      expect(ordersService.remove).toHaveBeenCalledWith('1');
    });

    it('should return 500 if order not found for deletion', async () => {
      mockOrdersService.remove.mockRejectedValue({
        response: { statusCode: 404 },
        status: 404,
      });

      await supertest(app.getHttpServer())
        .delete('/orders/999')
        .expect(500);

      expect(ordersService.remove).toHaveBeenCalledWith('999');
    });
  });

  describe('GET /orders/search', () => {
    it('should search orders with filters', async () => {
      const filterDto: Partial<FilterOrderDto> = {
        status: OrderStatus.PENDING,
      };
      mockOrdersService.search.mockResolvedValue([mockOrder]);

      const response = await supertest(app.getHttpServer())
        .get('/orders/search')
        .query(filterDto)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockOrder.id,
            customerName: mockOrder.customerName,
          })
        ])
      );
      expect(ordersService.search).toHaveBeenCalled();
    });

    it('should return empty array if no matching orders found', async () => {
      const filterDto: Partial<FilterOrderDto> = {
        status: OrderStatus.CANCELLED,
      };
      mockOrdersService.search.mockResolvedValue([]);

      const response = await supertest(app.getHttpServer())
        .get('/orders/search')
        .query(filterDto)
        .expect(200);

      expect(response.body).toEqual([]);
      expect(ordersService.search).toHaveBeenCalled();
    });
  });
});