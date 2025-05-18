import { Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';

@Module({
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
