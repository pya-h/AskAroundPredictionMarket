import { NoCredentialsUserSerialize } from './interceptors/user-serialize.interceptor';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  ForbiddenException,
  Session,
  ConflictException,
  UnauthorizedException,
  Res,
  HttpStatus,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PostUserDto } from './dtos/post-user.dto';
import { User } from './entities/user.entity';
import { PatchUserDto } from './dtos/patch-user.dto';
import { UserDto } from './dtos/user.dto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { LoginUserDto } from './dtos/login-user.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from './guards/auth.guard';

@Controller('user')
@NoCredentialsUserSerialize(UserDto)
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Post('/register')
  async register(@Body() body: PostUserDto, @Session() session: any) {
    if (session.userID) throw new ConflictException('You are logged in.');
    const { username, password, email } = body;

    const user = await this.authService.register(username, email, password);
    session.userID = user.id;
    return user;
  }

  @Get('/login')
  async login(
    @Query('username') username: string,
    @Query('email') email: string,
    @Query('password') password: string,
    @Session() session: any,
  ) {
    if (session?.userID) throw new ConflictException('You are logged in.');
    let user: User;
    user = await this.authService.login(
      username?.length ? username : email,
      password,
    );

    if (!user)
      throw new ForbiddenException(
        'Cannot login because of wrong credentials.',
      );
    session.userID = user.id;
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async loginByPost(@Body() body: LoginUserDto, @Session() session: any) {
    if (session.userID) throw new ConflictException('You are logged in.');
    let user: User;
    const { username, email, password } = body;
    console.log(username, email, password);
    user = await this.authService.login(
      username?.length ? username : email,
      password,
    );
    if (!user)
      throw new ForbiddenException(
        'Cannot login because of wrong credentials.',
      );
    session.userID = user.id;
    return user;
  }

  @Get('/whoami')
  @UseGuards(AuthGuard)
  async whoami(@CurrentUser() user: User) {
    return user;
  }

  @Post('/logout')
  async logout(@Session() session: any, @Res() response: Response) {
    session.userID = null;
    response.status(HttpStatus.OK).send('Successfully logged out.');
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findOne(+id);
    if (!user)
      throw new NotFoundException('No uswer with this id has been found!');
    return user;
  }

  @Get()
  async getSomeUsers(
    @Query('username') username: string,
    @Query('email') email: string,
  ) {
    let users: User[] = [],
      fieldname: string = '';
    if (username?.trim().length) {
      users = await this.userService.find({ username });
      fieldname = 'username';
    } else if (email?.trim().length) {
      users = await this.userService.find({ email });
      fieldname = 'email';
    }

    if (!users?.length)
      throw new NotFoundException(
        `No user has been found with such ${fieldname}!`,
      );

    return users;
  }

  @Patch('/:id')
  @UseGuards(AuthGuard)
  async updateUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: PatchUserDto,
  ) {
    if (+id !== user.id)
      throw new UnauthorizedException(
        "You are not allowed to modify other users's data!",
      );

    user = await this.userService.update(user, body); // actually its not necessary to assign return value to user, but whatever!
    return user;
  }
}
