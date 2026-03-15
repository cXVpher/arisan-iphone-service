import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
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
import { Group } from './modules/groups/entities/group.entity';
import { GroupMember } from './modules/groups/entities/group-member.entity';
import { Ticket } from './modules/tickets/entities/ticket.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { Draw } from './modules/draws/entities/draw.entity';
import { User } from './modules/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'arisan_iphone_db'),
        entities: [User, Group, GroupMember, Ticket, Payment, Draw],
        synchronize: true, // auto-create tables — disable in production
        logging: false,
      }),
    }),
    UploadModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    TicketsModule,
    PaymentsModule,
    DrawsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
