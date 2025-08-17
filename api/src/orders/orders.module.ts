import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersRepository } from './orders.repository';
import { KafkaModule } from '@app/infrastructure/kafka/kafka.module';
import { KafkaProducerService } from '@app/infrastructure/kafka/kafka-producer.service';
import { ElasticsearchModule } from '@app/infrastructure/elasticsearch/elasticsearch.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    KafkaModule,
    ElasticsearchModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, KafkaProducerService],
  exports: [OrdersService],
})
export class OrdersModule {}