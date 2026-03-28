import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { TransactionsService } from './transactions.service';
import { TransferDto } from './dto/transfer.dto';
import { PurchaseItemDto, PurchaseItemResponseDto } from './dto/purchase-item.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';

@Controller({ path: 'transactions', version: '1' })
@ApiTags('Transactions')
@ApiBearerAuth('bearer')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transfer')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'Transfer funds',
    description: 'Transfer funds from the authenticated user’s NFC-backed account to a recipient account.',
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: TransactionResponseDto })
  async transfer(
    @Req() req: Request & { apiAuth?: ApiAuthContext },
    @Body() dto: TransferDto,
  ): Promise<TransactionResponseDto> {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    const tx = await this.transactionsService.transfer(dto, req.apiAuth, req.ip ?? '');
    return this.transactionsService.mapTransactionToResponse(tx);
  }

  @Post('purchase-item')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'Purchase items',
    description: 'Authenticates with the NFC card and purchases items from a provider account.',
  })
  @ApiResponse({ status: 201, description: 'Purchase completed', type: PurchaseItemResponseDto })
  purchaseItem(
    @Req() req: Request & { apiAuth?: ApiAuthContext },
    @Body() dto: PurchaseItemDto,
  ): Promise<PurchaseItemResponseDto> {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.purchaseItems(
      {
        pin: dto.pin,
        encryptedPrivateKeyFromCard: dto.encryptedPrivateKeyFromCard,
      },
      dto.items,
      dto.providerAccountId,
      req.apiAuth.userId,
      req.ip ?? '',
    );
  }
}
