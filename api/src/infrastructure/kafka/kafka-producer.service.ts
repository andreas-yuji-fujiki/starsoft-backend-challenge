import { Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;
  private readonly kafka: Kafka;
  private isConnected = false;
  private isConnecting = false;
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts: number;
  private readonly connectionTimeout: number;
  private readonly retryFactor: number;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService.get<string>('KAFKA_BROKERS', 'kafka:9092').split(',');
    this.maxConnectionAttempts = this.configService.get<number>('KAFKA_RETRY_MAX', 5);
    this.retryFactor = this.configService.get<number>('KAFKA_RETRY_FACTOR', 1.5);
    this.connectionTimeout = this.configService.get<number>('KAFKA_CONNECTION_TIMEOUT', 30000);

    this.logger.log(`Configurando Kafka com brokers: ${brokers.join(', ')}`);
    
    this.kafka = new Kafka({
      clientId: 'order-management-api',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
        factor: 1.5,
      },
      connectionTimeout: 3000, 
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit() {
    this.connect().catch(err => {
      this.logger.warn(`Inicialização não bloqueada apesar do erro de conexão com Kafka: ${err.message}`);
    });
  }

  async onApplicationShutdown() {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.logger.log('Produtor Kafka desconectado com sucesso.');
      } catch (error) {
        this.logger.error(`Erro ao desconectar o produtor Kafka: ${error.message}`);
      }
    }
  }

  private async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.connectionAttempts++;
      this.logger.log(`Tentando conectar ao Kafka (tentativa ${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
      
      const connectionPromise = this.producer.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao conectar ao Kafka')), this.connectionTimeout);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      
      this.isConnected = true;
      this.isConnecting = false;
      this.logger.log('Conectado ao Kafka com sucesso!');
    } catch (error) {
      this.isConnecting = false;
      
      this.logger.error(`Falha ao conectar ao Kafka: ${error.message}`);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        const waitTime = Math.min(
          300 * Math.pow(this.retryFactor, this.connectionAttempts - 1),
          30000
        );
        
        this.logger.log(`Tentando novamente em ${Math.round(waitTime)}ms...`);
        
        setTimeout(() => this.connect(), waitTime);
      } else {
        this.logger.warn(
          `Número máximo de tentativas atingido (${this.maxConnectionAttempts}). Desabilitando produtor Kafka.`
        );
        this.logger.warn(
          'A aplicação continuará funcionando, mas os eventos não serão publicados no Kafka.'
        );
      }
    }
  }

  async publish(topic: string, message: any): Promise<void> {
    if (typeof message.value === 'string') {
      return this.produceInternal(topic, message);
    } else {
      return this.produceInternal(topic, {
        key: message.key || message.orderId,
        value: JSON.stringify(message)
      });
    }
  }

  async produce(topic: string, message: any): Promise<void> {
    return this.publish(topic, message);
  }

  private async produceInternal(topic: string, message: { key?: string; value: string }): Promise<void> {
    if (!this.isConnected) {
      if (this.connectionAttempts < this.maxConnectionAttempts && !this.isConnecting) {
        try {
          await this.connect();
        } catch (error) {
          this.logger.warn(
            `Não foi possível enviar mensagem para o tópico ${topic} porque o Kafka está desconectado.`
          );
          return;
        }
      } else {
        this.logger.warn(
          `Mensagem para o tópico ${topic} descartada porque o Kafka está desativado.`
        );
        return;
      }
    }

    if (!this.isConnected) {
      this.logger.warn(`Mensagem para o tópico ${topic} descartada porque o Kafka continua desconectado.`);
      return;
    }

    try {
      const record: ProducerRecord = {
        topic,
        messages: [
          {
            key: message.key,
            value: message.value,
          },
        ],
      };

      await this.producer.send(record);
      this.logger.log(`Mensagem enviada com sucesso para o tópico ${topic}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem para o tópico ${topic}: ${error.message}`);
      this.logger.warn('A mensagem foi descartada, mas a aplicação continuará funcionando.');
      
      this.isConnected = false;
    }
  }
}