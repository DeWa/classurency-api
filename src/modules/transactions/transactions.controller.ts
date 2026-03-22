import { Body, Controller, Post, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { TransactionsService } from './transactions.service';
import { TransferDto } from './dto/transfer.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';

@Controller({ path: 'transactions', version: '1' })
@ApiTags('Transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transfer')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege('user')
  transfer(@Req() req: Request & { apiAuth?: ApiAuthContext }, @Body() dto: TransferDto) {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.transfer(dto, req.apiAuth, req.ip ?? '');
  }

  @Post('purchase-item')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege('user')
  purchaseItem(@Req() req: Request & { apiAuth?: ApiAuthContext }, @Body() dto: PurchaseItemDto) {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.purchaseItems(
      {
        nfcCardUid: dto.nfcCardUid,
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
