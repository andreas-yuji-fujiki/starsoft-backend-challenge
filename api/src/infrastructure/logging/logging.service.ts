import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  logInfo(context: string, message: string, meta?: any): void {
    this.logger.log(`[${context}] ${message}${meta ? ` - ${JSON.stringify(meta)}` : ''}`);
  }

  logError(context: string, message: string, trace?: string, meta?: any): void {
    this.logger.error(
      `[${context}] ${message}${meta ? ` - ${JSON.stringify(meta)}` : ''}`, 
      trace
    );
  }

  logWarning(context: string, message: string, meta?: any): void {
    this.logger.warn(`[${context}] ${message}${meta ? ` - ${JSON.stringify(meta)}` : ''}`);
  }

  logDebug(context: string, message: string, meta?: any): void {
    this.logger.debug(`[${context}] ${message}${meta ? ` - ${JSON.stringify(meta)}` : ''}`);
  }
}