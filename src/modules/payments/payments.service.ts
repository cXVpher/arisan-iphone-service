import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { UploadService } from '../../shared/upload/upload.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { ActivityLogService } from '../admin/services/activity-log.service';
import { ActivityAction, ActivityTargetType } from '../admin/entities/activity-log.entity';
import { ReferralRewardService } from '../referrals/services/referral-reward.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => ActivityLogService))
    private readonly activityLogService: ActivityLogService,
    @Inject(forwardRef(() => ReferralRewardService))
    private readonly referralRewardService: ReferralRewardService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<any> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: dto.ticket_id },
      relations: ['user', 'group'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${dto.ticket_id} not found`);
    }

    // Validasi: ticket milik user
    if (ticket.user_id !== userId) {
      throw new BadRequestException('Ticket ini bukan milikmu');
    }

    // Validasi: ticket harus pending_payment
    if (ticket.status !== TicketStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Ticket status is '${ticket.status}', expected 'pending_payment'`,
      );
    }

    // Validasi: tidak boleh ada payment PENDING untuk ticket ini
    const pendingPayment = await this.paymentRepo.findOne({
      where: { ticket_id: dto.ticket_id, status: PaymentStatus.PENDING },
    });
    if (pendingPayment) {
      throw new BadRequestException(
        'Masih ada bukti bayar yang menunggu verifikasi untuk ticket ini',
      );
    }

    const proof_url = await this.uploadService.uploadToS3(file);

    // Amount dari group ticket_price, bukan dari DTO
    const payment = this.paymentRepo.create({
      ticket_id: dto.ticket_id,
      user_id: userId,
      amount: ticket.group.ticket_price,
      proof_url,
      status: PaymentStatus.PENDING,
    });

    const saved = await this.paymentRepo.save(payment);

    await this.activityLogService.log({
      actorId: userId,
      action: ActivityAction.PAYMENT_UPLOADED,
      targetType: ActivityTargetType.PAYMENT,
      targetId: saved.id,
      metadata: {
        group_name: ticket.group.name,
        amount: dto.amount,
      },
    });

    return {
      id: saved.id,
      amount: saved.amount,
      status: saved.status,
      proof_url: saved.proof_url,
      note: saved.note,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
      user: {
        id: ticket.user.id,
        username: ticket.user.username,
        name: ticket.user.name,
      },
      ticket: {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        status: ticket.status,
        group: {
          id: ticket.group.id,
          name: ticket.group.name,
        },
      },
    };
  }

  async findByUser(userId: string): Promise<any[]> {
    const payments = await this.paymentRepo.find({
      where: { user_id: userId },
      relations: ['ticket', 'ticket.group'],
      order: { created_at: 'DESC' },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      proof_url: p.proof_url,
      note: p.note,
      created_at: p.created_at,
      ticket: {
        id: p.ticket.id,
        ticket_code: p.ticket.ticket_code,
        status: p.ticket.status,
        group: {
          id: p.ticket.group.id,
          name: p.ticket.group.name,
        },
      },
    }));
  }

  async findAll(status?: PaymentStatus): Promise<any[]> {
    const where = status ? { status } : {};
    const payments = await this.paymentRepo.find({
      where,
      relations: ['ticket', 'ticket.user', 'ticket.group'],
      order: { created_at: 'DESC' },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      proof_url: p.proof_url,
      note: p.note,
      created_at: p.created_at,
      updated_at: p.updated_at,
      user: {
        id: p.ticket.user.id,
        username: p.ticket.user.username,
        name: p.ticket.user.name,
      },
      ticket: {
        id: p.ticket.id,
        ticket_code: p.ticket.ticket_code,
        status: p.ticket.status,
        group: {
          id: p.ticket.group.id,
          name: p.ticket.group.name,
        },
      },
    }));
  }

  async verifyOrReject(id: string, dto: VerifyPaymentDto): Promise<any> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['ticket', 'ticket.user', 'ticket.group'],
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment is already '${payment.status}', cannot update`,
      );
    }

    // Update payment
    payment.status = dto.status;
    payment.note = dto.note ?? null;
    await this.paymentRepo.save(payment);

    // Cascade to ticket status
    if (dto.status === PaymentStatus.VERIFIED) {
      await this.ticketRepo.update(payment.ticket_id, {
        status: TicketStatus.PAID,
      });

      // Create referral reward if eligible (1-level, 5% bonus)
      const ticketWithGroup = await this.ticketRepo.findOne({
        where: { id: payment.ticket_id },
        relations: ['group'],
      });
      if (ticketWithGroup) {
        await this.referralRewardService.createRewardIfEligible(
          payment.user_id,
          payment.ticket_id,
          ticketWithGroup.group.ticket_price,
        );
      }
    } else if (dto.status === PaymentStatus.REJECTED) {
      await this.ticketRepo.update(payment.ticket_id, {
        status: TicketStatus.PENDING_PAYMENT,
      });
    }

    const updated = await this.paymentRepo.findOne({
      where: { id },
      relations: ['ticket', 'ticket.user', 'ticket.group'],
    });

    if (!updated) throw new NotFoundException(`Payment ${id} not found`);

    // Log activity
    const actionType =
      dto.status === PaymentStatus.VERIFIED
        ? ActivityAction.PAYMENT_VERIFIED
        : ActivityAction.PAYMENT_REJECTED;

    await this.activityLogService.log({
      actorId: updated.ticket.user.id,
      action: actionType,
      targetType: ActivityTargetType.PAYMENT,
      targetId: id,
      metadata: {
        group_name: updated.ticket.group.name,
        member_name: updated.ticket.user.name,
        amount: updated.amount,
        reason: dto.note || undefined,
      },
    });

    return {
      id: updated.id,
      amount: updated.amount,
      status: updated.status,
      proof_url: updated.proof_url,
      note: updated.note,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      user: {
        id: updated.ticket.user.id,
        username: updated.ticket.user.username,
        name: updated.ticket.user.name,
      },
      ticket: {
        id: updated.ticket.id,
        ticket_code: updated.ticket.ticket_code,
        status: updated.ticket.status,
        group: {
          id: updated.ticket.group.id,
          name: updated.ticket.group.name,
        },
      },
    };
  }
}
