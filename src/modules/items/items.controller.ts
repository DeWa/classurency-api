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
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ItemProvidersService } from '@modules/item-providers/item-providers.service';
import { ItemsService } from './items.service';
import { CreateProviderItemDto } from './dto/create-provider-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';

@Controller({ path: 'item-providers/:providerId/items', version: '1' })
@UseInterceptors(new ResponseDtoOmitter(ItemResponseDto))
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
  @ApiResponse({ status: 201, description: 'Item created successfully', type: ItemResponseDto })
  async createProviderItem(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderItemDto,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<ItemResponseDto> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    const provider = await this.itemProvidersService.getForUserOrFail(providerId, userId);
    return this.itemsService.addItemToProvider(provider, dto.name, dto.description, dto.value, dto.amount ?? null);
  }

  @Get()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.PROVIDER)
  @ApiOperation({
    summary: 'List provider items',
    description: 'Lists items for an item-provider owned by the caller.',
  })
  @ApiParam({ name: 'providerId', description: 'Provider ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: ItemResponseDto,
    isArray: true,
  })
  async listProviderItems(
    @Param('providerId') providerId: string,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<ItemResponseDto[]> {
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
  @ApiResponse({ status: 200, description: 'Item retrieved successfully', type: ItemResponseDto })
  async getProviderItem(
    @Param('providerId') providerId: string,
    @Param('itemId') itemId: string,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<ItemResponseDto> {
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
