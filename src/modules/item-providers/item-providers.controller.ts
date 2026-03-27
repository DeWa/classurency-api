import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ItemProvider } from './item-provider.entity';
import { ItemProvidersService } from './item-providers.service';
import { CreateItemProviderDto } from './dto/create-item-provider.dto';

@Controller({ path: 'item-providers', version: '1' })
@ApiTags('Item Providers')
@ApiBearerAuth('bearer')
export class ItemProvidersController {
  constructor(private readonly itemProvidersService: ItemProvidersService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({ summary: 'Create item provider', description: 'Admin creates an item provider for a user account.' })
  @ApiResponse({ status: 201, description: 'Item provider created successfully', type: ItemProvider })
  async createItemProvider(@Body() dto: CreateItemProviderDto): Promise<ItemProvider> {
    return this.itemProvidersService.createAsAdmin(dto.userId, dto.accountId, dto.name);
  }
}
