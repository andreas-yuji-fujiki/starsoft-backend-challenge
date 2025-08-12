import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from './src/orders/order.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'orders',
  entities: [Order],
  migrations: ['src/migrations/*.ts'],
});
