import { Body, Controller, Post, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiAuthContext, ApiTokenGuard } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from './api-token.entity';
import { ApiTokensService } from './api-tokens.service';
import { RequestTokenDto, RequestTokenResponseDto } from './dto/request-token.dto';

@Controller({ path: 'tokens', version: '1' })
@ApiTags('Tokens')
@ApiBearerAuth('bearer')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'Request API token',
    description: 'Issues a new JWT for the given user (subject to caller privilege).',
  })
  @ApiResponse({ status: 201, description: 'Token issued', type: RequestTokenResponseDto })
  createApiToken(
    @Body() dto: RequestTokenDto,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<RequestTokenResponseDto> {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.apiTokensService.createApiToken(dto, req.apiAuth?.userId);
  }
}
