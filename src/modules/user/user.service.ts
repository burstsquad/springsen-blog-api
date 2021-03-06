/* eslint-disable @typescript-eslint/camelcase */
import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create.user';
import { Role } from '../role/role.entity';
import { AuthService } from '../auth/auth.service';
import { UserException } from '../../errors/user.error';

@Injectable()
export class UserService {
  constructor(
    // auth service 互相引用需要先做正向
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .getMany();
  }

  async findOneWithPassword(
    username: string,
    password?: string,
  ): Promise<User> {
    if (password) {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where({ username, password })
        .innerJoinAndSelect('user.roles', 'role')
        .getOne();

      if (!user || user.password != password) {
        throw new UserException(50005, 'username or password is incorrect');
      }
      return user;
    }
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where({ username })
      .getOne();
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new User();
    user.username = createUserDto.username;
    user.password = createUserDto.password;
    user.email = createUserDto.email;

    const roles = await this.roleRepository.findByIds(createUserDto.roles);

    user.roles = [...roles];

    return this.userRepository.save(user);
  }
}
