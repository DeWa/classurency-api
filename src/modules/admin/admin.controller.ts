import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { AdminService } from './admin.service';
import { MintDto, MintResponseDto } from './dto/mint.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';

@Controller({ path: 'admin', version: '1' })
@ApiTags('Admin')
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('mint')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Mint currency',
    description: 'Increases an account balance and records a mint transaction on the chain.',
  })
  @ApiResponse({ status: 201, description: 'Mint applied', type: MintResponseDto })
  mint(@Body() dto: MintDto): Promise<MintResponseDto> {
    return this.adminService.mint(dto);
  }
}
