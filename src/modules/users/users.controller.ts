import { Body, Controller, Param, Post, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { UsersService } from './users.service';
import { CreateUserDto, CreateUserResponseDto } from './dto/create-user.dto';
import { UpdateUserRequestDto, UpdateUserResponseDto } from './dto/update-user.dto';
import { ApiAuthContext } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';

@Controller({ path: 'users', version: '1' })
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user with the given information. Only admin can create users',
  })
  @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserResponseDto })
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return await this.usersService.createUserAsAdmin(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Update a user with the given information',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UpdateUserRequestDto })
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  async updateUser(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRequestDto,
    @Req() req: Request & { apiAuth?: ApiAuthContext },
  ): Promise<UpdateUserResponseDto> {
    const reqUserId = req.apiAuth?.userId;
    if (!reqUserId) {
      throw new UnauthorizedException('Missing auth context');
    }
    return await this.usersService.updateUser(reqUserId, userId, dto);
  }
}
