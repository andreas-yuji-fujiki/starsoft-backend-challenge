import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';
import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';

const mockProducer = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue({
    topicName: 'test-topic',
    partition: 0,
    errorCode: 0,
  }),
  sendBatch: jest.fn().mockResolvedValue({
    topicName: 'test-topic',
    partition: 0,
    errorCode: 0,
  }),
  transaction: jest.fn(),
  events: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    request: jest.fn(),
    requestTimeout: jest.fn(),
    requestQueue: jest.fn(),
  },
  logger: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockKafka = {
  producer: jest.fn().mockReturnValue(mockProducer),
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => mockKafka),
}));

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let configService: ConfigService;
  let logger: Logger;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaProducerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const config = {
                'KAFKA_BROKERS': 'kafka:9092',
                'KAFKA_RETRY_MAX': 5,
                'KAFKA_RETRY_FACTOR': 1.5,
                'KAFKA_CONNECTION_TIMEOUT': 30000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<Logger>(Logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should attempt to connect to Kafka', async () => {
      await service.onModuleInit();
      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it('should not break initialization if connection fails', async () => {
      mockProducer.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should disconnect from Kafka if connected', async () => {
      service['isConnected'] = true;
      service['producer'] = mockProducer as unknown as Producer;
      
      await service.onApplicationShutdown();
      expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it('should not attempt to disconnect if not connected', async () => {
      service['isConnected'] = false;
      
      await service.onApplicationShutdown();
      expect(mockProducer.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should publish a message to Kafka with string value', async () => {
      service['isConnected'] = true;
      service['producer'] = mockProducer as unknown as Producer;
      
      const topic = 'test-topic';
      const message = {
        key: 'key1',
        value: JSON.stringify({ data: 'test' }),
      };

      await service.publish(topic, message);
      
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          messages: expect.arrayContaining([
            expect.objectContaining({
              key: message.key,
              value: message.value,
            }),
          ]),
        })
      );
    });

    it('should stringify non-string values automatically', async () => {
      service['isConnected'] = true;
      service['producer'] = mockProducer as unknown as Producer;
      
      const topic = 'test-topic';
      const messageObj = {
        orderId: '123',
        customerName: 'Test Customer',
      };

      await service.publish(topic, messageObj);
      
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.any(String),
            }),
          ]),
        })
      );
    });
  });

  
  describe('comportamento com falhas', () => {
    it('should handle connection errors gracefully', async () => {
      mockProducer.connect.mockRejectedValueOnce(new Error('Connection failed'));
      service['isConnected'] = false;
      
      const topic = 'test-topic';
      const message = {
        key: 'key1',
        value: JSON.stringify({ data: 'test' }),
      };
      
      await expect(service.publish(topic, message)).resolves.not.toThrow();
      
      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      service['isConnected'] = true;
      service['producer'] = mockProducer as unknown as Producer;
      mockProducer.send.mockRejectedValueOnce(new Error('Send failed'));
      
      const topic = 'test-topic';
      const message = {
        key: 'key1',
        value: JSON.stringify({ data: 'test' }),
      };
      
      await expect(service.publish(topic, message)).resolves.not.toThrow();
      
      expect(service['isConnected']).toBe(false);
    });
    
    it('should not try to publish when disconnected', async () => {
      service['isConnected'] = false;
      service['connectionAttempts'] = 10; 
      service['maxRetries'] = 5; 
      
      const topic = 'test-topic';
      const message = {
        key: 'key1',
        value: JSON.stringify({ data: 'test' }),
      };
      
      await service.publish(topic, message);
      
      expect(mockProducer.connect).not.toHaveBeenCalled();
      expect(mockProducer.send).not.toHaveBeenCalled();
    });
  });
});