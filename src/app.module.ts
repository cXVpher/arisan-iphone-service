import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GroupsModule } from './modules/groups/groups.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DrawsModule } from './modules/draws/draws.module';
import { UploadModule } from './shared/upload/upload.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerModule } from './common/logger/logger.module';
import { Group } from './modules/groups/entities/group.entity';
import { GroupMember } from './modules/groups/entities/group-member.entity';
import { Ticket } from './modules/tickets/entities/ticket.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { Draw } from './modules/draws/entities/draw.entity';
import { User } from './modules/users/entities/user.entity';
import { AdminModule } from './modules/admin/admin.module';
import { ActivityLog } from './modules/admin/entities/activity-log.entity';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReferralReward } from './modules/referrals/entities/referral-reward.entity';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'arisan_iphone_db'),
        entities: [User, Group, GroupMember, Ticket, Payment, Draw, ActivityLog, ReferralReward],
        synchronize: true, // auto-create tables — disable in production
        logging: false,
        connectTimeout: 10000,
      }),
    }),
    UploadModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    TicketsModule,
    PaymentsModule,
    DrawsModule,
    AdminModule,
    ReferralsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
