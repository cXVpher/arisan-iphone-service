import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { UploadService } from '../../shared/upload/upload.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly uploadService: UploadService,
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
    if (ticket.status !== TicketStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Ticket status is '${ticket.status}', expected 'pending_payment'`,
      );
    }

    const proof_url = await this.uploadService.uploadToS3(file);

    const payment = this.paymentRepo.create({
      ticket_id: dto.ticket_id,
      user_id: userId,
      amount: dto.amount,
      proof_url,
      status: PaymentStatus.PENDING,
    });

    const saved = await this.paymentRepo.save(payment);

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
