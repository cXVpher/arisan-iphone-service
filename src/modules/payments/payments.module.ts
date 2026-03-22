import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AdminModule } from '../admin/admin.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Ticket]), forwardRef(() => AdminModule), forwardRef(() => ReferralsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
