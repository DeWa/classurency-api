import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ItemProvidersService } from './item-providers.service';
import { CreateItemProviderDto } from './dto/create-item-provider.dto';
import { ItemProviderResponseDto } from './dto/item-provider-response.dto';

@Controller({ path: 'item-providers', version: '1' })
@UseInterceptors(new ResponseDtoOmitter(ItemProviderResponseDto))
@ApiTags('Item Providers')
@ApiBearerAuth('bearer')
export class ItemProvidersController {
  constructor(private readonly itemProvidersService: ItemProvidersService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Create item provider',
    description:
      'Admin creates an item provider linked to a user account. The user referenced by userId must have type provider.',
  })
  @ApiResponse({ status: 201, description: 'Item provider created successfully', type: ItemProviderResponseDto })
  @ApiResponse({ status: 400, description: 'User is not type provider, account mismatch, or invalid input' })
  async createItemProvider(@Body() dto: CreateItemProviderDto): Promise<ItemProviderResponseDto> {
    return this.itemProvidersService.createAsAdmin(dto.userId, dto.accountId, dto.name);
  }
}
