import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { AdminService } from './admin.service';
import { MintDto, MintResponseDto } from './dto/mint.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ApiAuthContext } from '@common/guards/api-token.guard';

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
  mint(@Body() dto: MintDto, @Req() req: Request & { apiAuth?: ApiAuthContext }): Promise<MintResponseDto> {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.adminService.mint(dto, req.apiAuth.userId);
  }
}
