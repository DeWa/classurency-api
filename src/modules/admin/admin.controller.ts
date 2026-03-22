import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { AdminService } from './admin.service';
import { MintDto } from './dto/mint.dto';

@Controller({ path: 'admin', version: '1' })
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('mint')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege('admin')
  mint(@Body() dto: MintDto) {
    return this.adminService.mint(dto);
  }
}
