import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, CreateAccountResponseDto } from './dto/create-account.dto';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';

@Controller({ path: 'accounts', version: '1' })
@ApiTags('Accounts')
@ApiBearerAuth('bearer')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

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
}
