import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('system')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Verificar se a API está funcionando' })
  @ApiResponse({
    status: 200,
    description: 'API funcionando',
    type: String,
  })
  getHello(): string {
    return 'API is working!';
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar status da aplicação' })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está funcionando corretamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-05-11T12:00:00.000Z' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}