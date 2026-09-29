/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UserWithoutPasswordDto } from './dto/UserWithoutPassword.dto';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private isEmailVerificationEnabled(): boolean {
    const raw = this.configService.get<string>('REQUIRE_EMAIL_VERIFICATION');
    return ['1', 'true', 'yes', 'on'].includes((raw ?? '').toLowerCase());
  }

  private generateCode(): { code: string; hash: string; expires: Date } {
    const code = crypto.randomInt(100000, 999999).toString();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 分钟
    return { code, hash, expires };
  }

  async register(dto: RegisterDto): Promise<UserWithoutPasswordDto> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('User already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const defaultShowRpeRaw =
      this.configService.get<string>('DEFAULT_SHOW_RPE');
    const defaultShowRpe =
      defaultShowRpeRaw == null
        ? true
        : ['1', 'true', 'yes', 'on'].includes(defaultShowRpeRaw.toLowerCase());

    const requireVerification = this.isEmailVerificationEnabled();

    let emailVerificationToken: string | undefined;
    let emailVerificationExpires: Date | undefined;
    let verificationCode: string | undefined;

    if (requireVerification) {
      const generated = this.generateCode();
      verificationCode = generated.code;
      emailVerificationToken = generated.hash;
      emailVerificationExpires = generated.expires;
    }

    const user = this.userRepo.create({
      ...dto,
      password: hashed,
      showRpe: defaultShowRpe,
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
      emailVerified: !requireVerification, // 功能关闭时自动验证
      emailVerificationToken,
      emailVerificationExpires,
    });
    const savedUser = await this.userRepo.save(user);

    // 仅在启用此功能时发送验证邮件
    if (requireVerification && verificationCode) {
      await this.emailService.sendVerificationEmail(
        savedUser.email,
        verificationCode,
      );
    }

    return new UserWithoutPasswordDto(savedUser);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'password',
        'avatar',
        'showRpe',
        'weeklyWorkoutGoal',
        'currentStreak',
        'currentWeekWorkouts',
        'unitScale',
        'weight',
        'height',
        'dateOfBirth',
        'gender',
        'primaryGoal',
        'targetWeight',
        'goalTimeframe',
        'onboardingCompleted',
        'emailVerified',
        'showWeightTracking',
        'weightGoalType',
        'startWeight',
        'role',
        'language',
      ],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.isEmailVerificationEnabled() && !user.emailVerified) {
      throw new ForbiddenException('email_not_verified');
    }

    const userDto = new UserWithoutPasswordDto(user);
    const token = this.jwtService.sign({ id: user.id, email: user.email });

    return { token, user: userDto };
  }

  async verifyEmail(
    email: string,
    code: string,
  ): Promise<{ token: string; user: UserWithoutPasswordDto }> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'showRpe',
        'onboardingCompleted',
        'emailVerified',
        'emailVerificationToken',
        'emailVerificationExpires',
      ],
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    const inputHash = crypto.createHash('sha256').update(code).digest('hex');

    if (
      !user.emailVerificationToken ||
      !user.emailVerificationExpires ||
      user.emailVerificationToken !== inputHash ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.userRepo.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null as unknown as string,
      emailVerificationExpires: null as unknown as Date,
    });

    user.emailVerified = true;
    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { token, user: new UserWithoutPasswordDto(user) };
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'emailVerified', 'emailVerificationExpires'],
    });

    // 静默返回，避免暴露用户是否存在
    if (!user) return;
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    // 频率限制：如果距上次发送验证码不足 1 分钟，则禁止再次发送
    const oneMinuteFromNow = new Date(Date.now() + 14 * 60 * 1000);
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires > oneMinuteFromNow
    ) {
      throw new BadRequestException(
        'Please wait before requesting another code',
      );
    }

    const { code, hash, expires } = this.generateCode();
    await this.userRepo.update(user.id, {
      emailVerificationToken: hash,
      emailVerificationExpires: expires,
    });

    await this.emailService.sendVerificationEmail(email, code);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'emailVerified'],
    });

    // 始终静默返回，避免暴露用户是否存在
    if (!user || !user.emailVerified) return;

    const { code, hash, expires } = this.generateCode();
    await this.userRepo.update(user.id, {
      passwordResetToken: hash,
      passwordResetExpires: expires,
    });

    await this.emailService.sendPasswordResetEmail(email, code);
  }

  async findOrCreateGithubUser(profile: {
    githubId: string;
    email?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<{ token: string; user: UserWithoutPasswordDto; isNew: boolean }> {
    // 1. 尝试通过 githubId 查找
    let user = await this.userRepo.findOne({
      where: { githubId: profile.githubId },
    });

    if (!user && profile.email) {
    // 2. 尝试通过邮箱查找——将 GitHub 账号关联到已有账号
      user = await this.userRepo.findOne({ where: { email: profile.email } });
      if (user) {
        await this.userRepo.update(user.id, { githubId: profile.githubId });
        user.githubId = profile.githubId;
      }
    }

    let isNew = false;
    if (!user) {
    // 3. 创建新用户
      const defaultShowRpeRaw =
        this.configService.get<string>('DEFAULT_SHOW_RPE');
      const defaultShowRpe =
        defaultShowRpeRaw == null
          ? true
          : ['1', 'true', 'yes', 'on'].includes(
              defaultShowRpeRaw.toLowerCase(),
            );

      user = this.userRepo.create({
        githubId: profile.githubId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        showRpe: defaultShowRpe,
      emailVerified: true, // GitHub 已确认邮箱
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
      });
      user = await this.userRepo.save(user);

      isNew = true;
    }

    // 确保 GitHub 用户的邮箱标记为已验证
    if (!user.emailVerified) {
      await this.userRepo.update(user.id, { emailVerified: true });
      user.emailVerified = true;
    }

    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { token, user: new UserWithoutPasswordDto(user), isNew };
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<{ token: string; user: UserWithoutPasswordDto; isNew: boolean }> {
    // 1. 尝试通过 googleId 查找
    let user = await this.userRepo.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user && profile.email) {
    // 2. 尝试通过邮箱查找——将 Google 账号关联到已有账号
      user = await this.userRepo.findOne({ where: { email: profile.email } });
      if (user) {
        await this.userRepo.update(user.id, { googleId: profile.googleId });
        user.googleId = profile.googleId;
      }
    }

    let isNew = false;
    if (!user) {
    // 3. 创建新用户
      const defaultShowRpeRaw =
        this.configService.get<string>('DEFAULT_SHOW_RPE');
      const defaultShowRpe =
        defaultShowRpeRaw == null
          ? true
          : ['1', 'true', 'yes', 'on'].includes(
              defaultShowRpeRaw.toLowerCase(),
            );

      user = this.userRepo.create({
        googleId: profile.googleId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        showRpe: defaultShowRpe,
      emailVerified: true, // Google 已确认邮箱
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
      });
      user = await this.userRepo.save(user);

      isNew = true;
    }

    // 确保 Google 用户的邮箱标记为已验证
    if (!user.emailVerified) {
      await this.userRepo.update(user.id, { emailVerified: true });
      user.emailVerified = true;
    }

    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { token, user: new UserWithoutPasswordDto(user), isNew };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'passwordResetToken', 'passwordResetExpires'],
    });

    if (!user) throw new BadRequestException('Invalid or expired reset code');

    const inputHash = crypto.createHash('sha256').update(code).digest('hex');

    if (
      !user.passwordResetToken ||
      !user.passwordResetExpires ||
      user.passwordResetToken !== inputHash ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null as unknown as string,
      passwordResetExpires: null as unknown as Date,
    });
  }
}
