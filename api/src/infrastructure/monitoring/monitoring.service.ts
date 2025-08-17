import { Injectable, Logger } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly register: promClient.Registry;
  private readonly httpRequestDurationMicroseconds: promClient.Histogram<string>;
  private readonly httpRequestCounter: promClient.Counter<string>;

  constructor() {
    this.register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register: this.register });

    this.httpRequestDurationMicroseconds = new promClient.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duração das requisições HTTP em ms',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000],
    });
    this.register.registerMetric(this.httpRequestDurationMicroseconds);

    this.httpRequestCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'route', 'status_code'],
    });
    this.register.registerMetric(this.httpRequestCounter);

    this.logger.log('Prometheus metrics initialized');
  }

  observeHttpRequestDuration(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpRequestDurationMicroseconds.labels(method, route, statusCode.toString()).observe(durationMs);
  }

  incrementHttpRequestCounter(method: string, route: string, statusCode: number): void {
    this.httpRequestCounter.labels(method, route, statusCode.toString()).inc();
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}