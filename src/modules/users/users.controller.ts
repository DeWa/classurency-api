import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePrivilege } from '@common/guards/require-privilege.decorator';
import { ApiTokenGuard } from '@common/guards/api-token.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller({ path: 'users', version: '1' })
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @RequirePrivilege('admin')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }
}
