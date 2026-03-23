import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';
import { TransactionsService } from './transactions.service';
import { TransferDto } from './dto/transfer.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';

@Controller({ path: 'transactions', version: '1' })
@ApiTags('Transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Returns transactions for the authenticated user (as payer, payee, or mint recipient).
   */
  @UseInterceptors(new ResponseDtoOmitter(TransactionResponseDto))
  @Get()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'List my transactions',
    description:
      'Returns transactions where the current user is involved (source account, destination account, or mint).',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: TransactionResponseDto,
    isArray: true,
  })
  getMyTransactions(@Req() req: Request & { apiAuth?: ApiAuthContext }): Promise<TransactionResponseDto[]> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.findTransactionsForUser(userId, 5);
  }

  /**
   * Returns a single transaction by id if the current user is allowed to see it.
   */
  @UseInterceptors(new ResponseDtoOmitter(TransactionResponseDto))
  @Get(':id')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'Get transaction by id',
    description: 'Returns a transaction if the current user is the payer, recipient, or mint recipient.',
  })
  @ApiParam({ name: 'id', description: 'Transaction id', type: Number })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully', type: TransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not found or not accessible' })
  getTransactionById(
    @Param('id', ParseIntPipe) transactionId: number,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<TransactionResponseDto> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.findTransactionByIdForUser(transactionId, userId);
  }

  @ApiOperation({
    summary: 'Transfer funds',
    description: 'Transfer funds to a recipient account',
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: TransferDto })
  @Post('transfer')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  transfer(@Req() req: Request & { apiAuth?: ApiAuthContext }, @Body() dto: TransferDto) {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.transfer(dto, req.apiAuth, req.ip ?? '');
  }

  @Post('purchase-item')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
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
