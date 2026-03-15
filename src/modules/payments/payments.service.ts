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
  ): Promise<Payment> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: dto.ticket_id },
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
      user_id: dto.user_id,
      amount: dto.amount,
      proof_url,
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepo.save(payment);
  }

  async findAll(status?: PaymentStatus): Promise<Payment[]> {
    const where = status ? { status } : {};
    return this.paymentRepo.find({
      where,
      relations: ['ticket'],
      order: { created_at: 'DESC' },
    });
  }

  async verifyOrReject(id: string, dto: VerifyPaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['ticket'],
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

    return this.paymentRepo.findOne({
      where: { id },
      relations: ['ticket'],
    }) as Promise<Payment>;
  }
}
