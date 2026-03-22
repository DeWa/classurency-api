import { Body, Controller, Post, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiAuthContext, ApiTokenGuard } from '@common/guards/api-token.guard';
import { ApiTokensService } from './api-tokens.service';
import { RequestTokenDto } from './dto/request-token.dto';

@Controller({ path: 'tokens', version: '1' })
@ApiTags('Tokens')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege('user')
  createToken(@Body() dto: RequestTokenDto, @Req() req: Request & { apiAuth?: ApiAuthContext }) {
    if (!req.apiAuth) {
      throw new UnauthorizedException('Missing auth context');
    }
    return this.apiTokensService.issueToken(dto, req.apiAuth?.userId);
  }
}
