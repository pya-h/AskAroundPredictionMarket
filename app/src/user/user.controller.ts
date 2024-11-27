import {
  NoCredentialsUserSerialize,
  UserSerializerInterceptor,
} from './../interceptors/user-serialize.interceptor';
import { EntityNotFoundException } from './../exceptions/entity-not-found.exception';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  // UseInterceptors,
  ClassSerializerInterceptor,
  ForbiddenException,
  Session,
  ConflictException,
  UnauthorizedException,
  Res,
  HttpStatus,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PostUserDto } from 'src/dtos/post-user.dto';
import { User } from './entities/user.entity';
import { PatchUserDto } from 'src/dtos/patch-user.dto';
import { UserDto } from 'src/dtos/user.dto';
import { JustNameUserDto } from 'src/dtos/just-name-user.dto';
import { AuthService } from './auth.service';
import { EntityExistsException } from 'src/exceptions/entity-exists.exception';
import { Response } from 'express';
import { LoginUserDto } from 'src/dtos/login-user.dto';
// import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { STATUS_CODES } from 'http';
import { AddBadgeDto } from 'src/dtos/add-badge.dto';
import { DeleteUserAccountDto } from './dtos/delete-account.dto';

@Controller('user')
// @UseInterceptors(new UserSerializerInterceptor(UserDto))
@NoCredentialsUserSerialize(UserDto)
// @UseInterceptors(CurrentUserInterceptor)
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  // @UseInterceptors(ClassSerializerInterceptor)
  @Post('/register')
  async register(@Body() body: PostUserDto, @Session() session: any) {
    if (session.userID) throw new ConflictException('You are logged in.');
    const { username, password, email } = body;
    try {
      const user = await this.authService.register(username, email, password);
      session.userID = user.id;
      return user;
    } catch (ex) {
      if (ex instanceof EntityExistsException)
        throw new ForbiddenException(ex.message);
    }
    return 'What the fuck?';
    // return this.userService.createDirectly(username, password, email);  // Just for tutorial purposes
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
    try {
      user = await this.authService.login(
        username?.length ? username : email,
        password,
      );
    } catch (ex) {
      if (ex instanceof EntityNotFoundException)
        if (username?.length)
          throw new NotFoundException(
            `No user with this username:${username} found.`,
          );
        else
          throw new NotFoundException(
            `No user with this email:${email} found.`,
          );
    }
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
    try {
      user = await this.authService.login(
        username?.length ? username : email,
        password,
      );
    } catch (ex) {
      if (ex instanceof EntityNotFoundException)
        if (username?.length)
          throw new NotFoundException(
            `No user with this username:${username} found.`,
          );
        else
          throw new NotFoundException(
            `No user with this email:${email} found.`,
          );
    }
    if (!user)
      throw new ForbiddenException(
        'Cannot login because of wrong credentials.',
      );
    session.userID = user.id;
    return user;
  }

  // by Request decorator and direct use of CurrentUserInterceptor
  // @Get('/whoami')
  // async whoami(@Request() request: any, @Session() session: any) {
  //   if (!session.userID)
  //     throw new UnauthorizedException(
  //       'You are not logged in to find out who you are!',
  //     );
  //   return request.currentUser;
  // }
  // @UseInterceptors(ClassSerializerInterceptor)
  // @UseInterceptors(UserSerializerInterceptor)

  @Get('/whoami')
  @UseGuards(AuthGuard)
  async whoami(@CurrentUser() user: User) {
    return user;
  }

  @Post('/logout')
  async logout(@Session() session: any, @Res() response: Response) {
    session.userID = null;
    // return "Successfully logged out.";
    response.status(HttpStatus.OK).send('Successfully logged out.');
  }

  @Post('/badge')
  create(@Body() body: AddBadgeDto, @CurrentUser() user: User) {
    if (!user) throw new UnauthorizedException('You must login first!');
    const { name } = body;
    return this.userService.addBadge(user.id, name);
  }

  @Get('/badge')
  getAll() {
    return this.userService.findBadges();
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findOne(+id); // or parseInt
    if (!user)
      throw new NotFoundException('No uswer with this id has been found!');
    // delete user.password; // removing delete password section, cause of using Exclude and CLassSerializerInterceptor
    return user;
  }

  @Delete(':id/delete-account')
  @UseGuards(AuthGuard)
  async deleteUserAccount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() deleteUserAccountDto: DeleteUserAccountDto,
  ) {
    if (
      +id !== user.id ||
      !deleteUserAccountDto?.password ||
      !(await this.authService.checkPassword(user, deleteUserAccountDto.password))
    )
      // // Double checking that the user deleting this account is not someone else!
      throw new ForbiddenException(
        "You're not allowed to delete this account!",
      );

    // TODO: sign out

    // TODO: remove users data in other tables (?)
    return this.userService.hardRemove(user);
  }

  // @UseInterceptors(ClassSerializerInterceptor)
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
    // removing delete password section, cause of using Exclude and CLassSerializerInterceptor
    // return users.map((user: User) => {
    //   delete user.password;
    //   return user;
    // });
    return users;
  }

  // @UseInterceptors(ClassSerializerInterceptor)
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
    try {
      user = await this.userService.update(user, body); // actually its not necessary to assign return value to user, but whatever!
      //   delete user.password; // removing delete password section, cause of using Exclude and CLassSerializerInterceptor
      return user;
    } catch (err) {
      // unused, for using userService.updateById
      if (err instanceof EntityNotFoundException)
        throw new NotFoundException('No user with this id found to update!');
    }
    return null;
  }

  // @UseInterceptors(ClassSerializerInterceptor)
  @NoCredentialsUserSerialize(JustNameUserDto)
  @Delete('/:id')
  @UseGuards(AuthGuard)
  async deleteUser(@CurrentUser() user: User, @Param('id') id: string) {
    if (+id !== user.id)
      throw new UnauthorizedException(
        "You are not allowed to remove other users's!",
      );
    try {
      await this.userService.remove(user);
      //   delete user.password; // removing delete password section, cause of using Exclude and CLassSerializerInterceptor
      return 'Successfully Removed.';
    } catch (err) {
      // unused, for using userService.removeById
      if (err instanceof EntityNotFoundException)
        throw new NotFoundException('No user with this id found to remove!');
    }
    return null;
  }
}
