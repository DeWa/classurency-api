import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { User, UserType } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRequestDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Create a new user
   * @param name - The name of the user
   * @param password - The password of the user
   * @param type - The type of the user
   * @returns The created user
   */
  async createUser(name: string, userName: string, password: string) {
    const passwordHash = await this.cryptoService.hashPassword(password);

    const user = this.usersRepo.create({
      name,
      userName,
      passwordHash,
      type: UserType.USER,
    });
    await this.usersRepo.save(user);

    return {
      id: user.id,
      name: user.name,
      userName: user.userName,
      type: user.type,
    };
  }

  /**
   * Create a new user with a random password
   * @param name - The name of the user
   * @param type - The type of the user
   * @returns The created user
   */
  async createUserAsAdmin(dto: CreateUserDto) {
    const password = this.cryptoService.generateRandomPassword();
    const user = await this.createUser(dto.name, dto.userName, password);
    return {
      id: user.id,
      name: user.name,
      userName: user.userName,
      type: user.type,
      password,
    };
  }

  /**
   * Update a user
   * @param dto - The update user request dto
   * @returns The updated user
   */
  async updateUser(reqUserId: string, userId: string, dto: UpdateUserRequestDto) {
    if (reqUserId !== userId) {
      throw new ForbiddenException('You are not allowed to update this user');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedUser = this.usersRepo.merge(user, dto);
    return this.usersRepo.save(updatedUser);
  }
}
