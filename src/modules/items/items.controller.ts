import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ItemProvidersService } from '@modules/item-providers/item-providers.service';
import { Item } from './item.entity';
import { ItemsService } from './items.service';
import { CreateProviderItemDto } from './dto/create-provider-item.dto';

@Controller({ path: 'item-providers/:providerId/items', version: '1' })
@ApiTags('Items')
@ApiBearerAuth('bearer')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemProvidersService: ItemProvidersService,
  ) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.PROVIDER)
  @ApiOperation({
    summary: 'Create provider item',
    description: 'Creates an item for an item-provider owned by the caller.',
  })
  @ApiParam({ name: 'providerId', description: 'Provider ID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Item created successfully', type: Item })
  async createProviderItem(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderItemDto,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<Item> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    await this.itemProvidersService.getForUserOrFail(providerId, userId);
    return this.itemsService.addItemToProvider(providerId, dto.name, dto.description, dto.value, dto.amount ?? null);
  }

  @Get()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.PROVIDER)
  @ApiOperation({
    summary: 'List provider items',
    description: 'Lists items for an item-provider owned by the caller.',
  })
  @ApiParam({ name: 'providerId', description: 'Provider ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully', type: Item, isArray: true })
  async listProviderItems(
    @Param('providerId') providerId: string,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<Item[]> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    await this.itemProvidersService.getForUserOrFail(providerId, userId);
    return this.itemsService.listByProvider(providerId);
  }

  @Get(':itemId')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.PROVIDER)
  @ApiOperation({
    summary: 'Get provider item',
    description: 'Gets one item by id for an item-provider owned by the caller.',
  })
  @ApiParam({ name: 'providerId', description: 'Provider ID', format: 'uuid' })
  @ApiParam({ name: 'itemId', description: 'Item ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item retrieved successfully', type: Item })
  async getProviderItem(
    @Param('providerId') providerId: string,
    @Param('itemId') itemId: string,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<Item> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    await this.itemProvidersService.getForUserOrFail(providerId, userId);
    const item = await this.itemsService.findById(itemId);
    if (!item || item.providerId !== providerId) {
      throw new BadRequestException('Item not found');
    }
    return item;
  }
}
