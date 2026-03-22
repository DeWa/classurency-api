import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    const user = this.usersRepo.create({
      name: dto.name,
      passwordHash,
    });
    await this.usersRepo.save(user);

    return {
      id: user.id,
      name: user.name,
    };
  }
}
