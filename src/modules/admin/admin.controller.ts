import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';
import { AdminService } from './admin.service';
import { MintDto, MintResponseDto } from './dto/mint.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { ApiAuthContext } from '@common/guards/api-token.guard';
import { ItemProvidersService } from '@modules/item-providers/item-providers.service';
import { AccountsService } from '@modules/accounts/accounts.service';
import { ListAccountsQueryDto, ListAccountsResponseDto } from '@modules/accounts/dto/list-accounts.dto';
import { AdminAccountPatchResponseDto, UpdateAccountAdminDto } from '@modules/accounts/dto/update-account-admin.dto';
import {
  ListItemProvidersQueryDto,
  ListItemProvidersResponseDto,
} from '@modules/item-providers/dto/list-item-providers.dto';
import { UpdateItemProviderDto } from '@modules/item-providers/dto/update-item-provider.dto';
import { ItemProviderResponseDto } from '@modules/item-providers/dto/item-provider-response.dto';

@Controller({ path: 'admin', version: '1' })
@ApiTags('Admin')
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly itemProvidersService: ItemProvidersService,
    private readonly accountsService: AccountsService,
  ) {}

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

  @Get('item-providers')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'List item providers',
    description:
      'Returns a paginated list of item providers with owner and linked NFC metadata. Admins may filter by user id, owner type, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Item providers retrieved successfully',
    type: ListItemProvidersResponseDto,
  })
  listItemProviders(@Query() query: ListItemProvidersQueryDto): Promise<ListItemProvidersResponseDto> {
    return this.itemProvidersService.listAsAdmin(query);
  }

  @Patch('item-providers/:id')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @UseInterceptors(new ResponseDtoOmitter(ItemProviderResponseDto))
  @ApiOperation({
    summary: 'Update item provider',
    description:
      'Updates display name and/or the linked user and account. When relinking, the user must have type provider and the account must belong to that user.',
  })
  @ApiParam({ name: 'id', description: 'Item provider ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item provider updated', type: ItemProviderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or relink constraints' })
  @ApiResponse({ status: 404, description: 'Item provider not found' })
  updateItemProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemProviderDto,
  ): Promise<ItemProviderResponseDto> {
    return this.itemProvidersService.updateAsAdmin(id, dto);
  }

  @Get('accounts')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'List accounts',
    description:
      'Returns a paginated list of accounts with each account owner (user) summary. Same behavior as GET /accounts.',
  })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully', type: ListAccountsResponseDto })
  listAccounts(@Query() query: ListAccountsQueryDto): Promise<ListAccountsResponseDto> {
    return this.accountsService.listAccountsAsAdmin(query);
  }

  @Patch('accounts/:accountId')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Update account (admin)',
    description: 'Updates admin-managed fields such as lock state.',
  })
  @ApiParam({ name: 'accountId', description: 'Account ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Account updated', type: AdminAccountPatchResponseDto })
  @ApiResponse({ status: 400, description: 'No fields to update' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async updateAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: UpdateAccountAdminDto,
  ): Promise<AdminAccountPatchResponseDto> {
    const account = await this.accountsService.updateAccountAsAdmin(accountId, dto);
    return {
      id: account.id,
      userId: account.userId,
      isLocked: account.isLocked,
      updatedAt: account.updatedAt,
    };
  }
}
