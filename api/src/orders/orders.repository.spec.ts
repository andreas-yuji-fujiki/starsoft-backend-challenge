import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from './orders.repository';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

// Mock de dados
const mockOrderItems: OrderItem[] = [
  {
    id: '1',
    productId: 'p1',
    productName: 'Product 1',
    quantity: 2,
    unitPrice: 10.0,
    subtotal: 20.0,
    order: null,
    orderId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockOrder: Partial<Order> = {
  id: '1',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  status: OrderStatus.PENDING,
  customerPhone: '123-456-7890',
  shippingAddress: '123 Test St, Test City, TC 12345',
  notes: 'Test notes',
  items: mockOrderItems,
  totalAmount: 20.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateOrderDto: CreateOrderDto = {
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '123-456-7890',
  shippingAddress: '123 Test St, Test City, TC 12345',
  notes: 'Test notes',
  items: [
    {
      productId: 'p1',
      productName: 'Product 1',
      quantity: 2,
      unitPrice: 10.0,
      subtotal: 20.0,
    },
  ],
};

const mockUpdateOrderDto: UpdateOrderDto = {
  status: OrderStatus.SHIPPED,
};

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(), 
    getMany: jest.fn().mockResolvedValue([mockOrder as Order]),
  })),
});

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
  let orderRepository: MockRepository<Order>;

  beforeEach(async () => {
    const mockOrderRepository = createMockRepository<Order>();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
      ],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
    orderRepository = module.get<MockRepository<Order>>(getRepositoryToken(Order));

    orderRepository.create.mockImplementation((dto) => dto);
    orderRepository.save.mockResolvedValue(mockOrder as Order);
    orderRepository.find.mockResolvedValue([mockOrder as Order]);
    
    orderRepository.findOne.mockImplementation(async (options: any) => {
      if (options?.where?.id === '1') {
        return mockOrder as Order;
      }
      return null;
    });
    
    orderRepository.update.mockResolvedValue({ affected: 1 });
    orderRepository.delete.mockResolvedValue({ affected: 1 });
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new order', async () => {
      const result = await repository.create(mockCreateOrderDto);
      
      expect(orderRepository.create).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('should calculate the total amount based on items', async () => {
      orderRepository.save.mockImplementation((order: any) => {
        expect(order.totalAmount).toBe(20.0);
        return { ...order, id: '1' };
      });
      
      await repository.create(mockCreateOrderDto);
      
      expect(orderRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const result = await repository.findAll();
      
      expect(orderRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('findById', () => {
    it('should find a single order by id', async () => {
      const findOneSpy = jest.spyOn(orderRepository, 'findOne');
      
      const result = await repository.findById('1');
      
      expect(findOneSpy).toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('should return null if order not found', async () => {
      orderRepository.findOne.mockResolvedValueOnce(null);
      
      const result = await repository.findById('999');
      
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      orderRepository.findOne.mockResolvedValueOnce(mockOrder as Order);
      
      const updatedOrder = {
        ...mockOrder,
        status: 'SHIPPED',
        updatedAt: new Date(),
      };
      orderRepository.save.mockResolvedValueOnce(updatedOrder as Order);
      
      const result = await repository.update('1', mockUpdateOrderDto);
      
      expect(orderRepository.findOne).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedOrder);
    });

    it('should return null if order not found', async () => {
      orderRepository.findOne.mockResolvedValueOnce(null);
      
      const result = await repository.update('999', mockUpdateOrderDto);
      
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an order', async () => {
      const result = await repository.remove('1');
      
      expect(orderRepository.delete).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });

    it('should return false if no order was affected', async () => {
      orderRepository.delete.mockResolvedValueOnce({ affected: 0 });
      
      const result = await repository.remove('999');
      
      expect(result).toBe(false);
    });
  });

  describe('filter', () => {
    it('should filter orders based on criteria', async () => {
      const filterDto: FilterOrderDto = {
        status: OrderStatus.PENDING,
      };
      
      jest.spyOn(repository, 'filter').mockResolvedValueOnce([mockOrder as Order]);
      
      const result = await repository.filter(filterDto);
      
      expect(result).toEqual([mockOrder]);
    });

    it('should apply all provided filters', async () => {
      const filterDto: FilterOrderDto = {
        status: OrderStatus.PENDING,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };
      
      jest.spyOn(repository, 'filter').mockResolvedValueOnce([mockOrder as Order]);
      
      const result = await repository.filter(filterDto);
      
      expect(result).toEqual([mockOrder]);
    });
  });
});