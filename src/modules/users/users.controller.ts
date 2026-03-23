import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { UsersService } from './users.service';
import { CreateUserDto, CreateUserResponseDto } from './dto/create-user.dto';
import { UpdateUserRequestDto, UpdateUserResponseDto } from './dto/update-user.dto';
import { ApiAuthContext } from '@common/guards/api-token.guard';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { GetUserRequestDto, GetUserResponseDto } from './dto/get-user.dto';
import { ResponseDtoOmitter } from '@common/decorators/response-dto-omitter';

@Controller({ path: 'users', version: '1' })
@ApiTags('Users')
@ApiBearerAuth('bearer')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user with the given information. Only admin can create users',
  })
  @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserResponseDto })
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return await this.usersService.createUserAsAdmin(dto);
  }

  @Patch(':id')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiParam({ name: 'id', description: 'User ID', format: 'uuid' })
  @ApiOperation({
    summary: 'Update a user',
    description: 'Update a user with the given information',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UpdateUserResponseDto })
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

  @UseInterceptors(new ResponseDtoOmitter(GetUserResponseDto))
  @Get('me')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.USER)
  @ApiOperation({
    summary: 'Get the current user',
    description: 'Get the current user',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: GetUserResponseDto })
  async getCurrentUser(@Req() req: Request & { apiAuth?: ApiAuthContext }): Promise<GetUserResponseDto> {
    const userId = req.apiAuth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing auth context');
    }
    return await this.usersService.getUser(userId);
  }

  @UseInterceptors(new ResponseDtoOmitter(GetUserResponseDto))
  @Get(':id')
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege(ApiTokenPrivilege.ADMIN)
  @ApiOperation({
    summary: 'Get a user',
    description: 'Get a user with the given ID',
  })
  @ApiParam({ name: 'id', description: 'User ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: GetUserResponseDto })
  async getUser(@Param() params: GetUserRequestDto): Promise<GetUserResponseDto> {
    const userId = params.id;
    return await this.usersService.getUser(userId);
  }
}
