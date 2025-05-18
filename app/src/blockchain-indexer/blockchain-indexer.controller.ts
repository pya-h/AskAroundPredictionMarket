import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { ApiStandardOkResponse } from 'src/core/decorators/api-standard-ok-response.decorator';

@ApiTags('Omen Arena', 'Blockchain Indexer')
@Controller('blockchain-indexer')
export class BlockchainIndexerController {
  constructor(
    private readonly blockchainIndexerService: BlockchainIndexerService,
  ) {}
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    description:
      'In case admins have made any change in chains data (esp rpc urls), this endpoint should be called to reload chain data.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', { default: 'OK' })
  @Post('restart')
  async reload() {
    await this.blockchainIndexerService.restartIndexer();
    return 'OK';
  }
}
