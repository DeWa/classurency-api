import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard, type ApiAuthContext } from '@common/guards/api-token.guard';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, CreateAccountResponseDto } from './dto/create-account.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { DEFAULT_ACCOUNT_TRANSACTIONS_LIMIT, TransactionsService } from '@modules/transactions/transactions.service';
import { TransactionResponseDto } from '@modules/transactions/dto/transaction-response.dto';

@Controller({ path: 'accounts', version: '1' })
@ApiTags('Accounts')
@ApiBearerAuth('bearer')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Create account',
    description: 'Creates an NFC-backed account for a user. Requires an admin API token.',
  })
  @ApiResponse({ status: 201, description: 'Account created', type: CreateAccountResponseDto })
  createAccount(@Body() dto: CreateAccountDto): Promise<CreateAccountResponseDto> {
    return this.accountsService.createAccount(dto);
  }

  @UseInterceptors(new ResponseDtoOmitter(TransactionResponseDto))
  @Get(':accountId/transactions')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'List account transactions',
    description:
      'Returns transactions where the account is the payer, payee, or mint recipient. The account owner or an admin may call this.',
  })
  @ApiParam({ name: 'accountId', description: 'Account ID', format: 'uuid' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: `How many transactions to return (default ${DEFAULT_ACCOUNT_TRANSACTIONS_LIMIT}, max 100).`,
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: TransactionResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 403, description: 'Caller is not the account owner or an admin' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  getAccountTransactions(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_ACCOUNT_TRANSACTIONS_LIMIT), ParseIntPipe) limit: number,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<TransactionResponseDto[]> {
    const auth = req.apiAuth;
    if (!auth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.transactionsService.findTransactionsForAccount(accountId, auth, limit);
  }
}
