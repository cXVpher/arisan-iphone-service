import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { Group, GroupStatus } from '../groups/entities/group.entity';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
  ) {}

  private generateTicketCode(): string {
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `TKT-${hex}`;
  }

  async buyTicket(dto: BuyTicketDto): Promise<Ticket> {
    const group = await this.groupRepo.findOne({
      where: { id: dto.group_id },
    });
    if (!group) {
      throw new NotFoundException(`Group ${dto.group_id} not found`);
    }
    if (group.status !== GroupStatus.ACTIVE) {
      throw new BadRequestException(
        'Tickets can only be purchased for active groups',
      );
    }

    let ticket_code: string = '';
    let isUnique = false;
    // Retry loop to guarantee uniqueness
    while (!isUnique) {
      ticket_code = this.generateTicketCode();
      const exists = await this.ticketRepo.findOne({ where: { ticket_code } });
      if (!exists) isUnique = true;
    }

    const ticket = this.ticketRepo.create({
      ticket_code,
      user_id: dto.user_id,
      group_id: dto.group_id,
      status: TicketStatus.PENDING_PAYMENT,
    });

    return this.ticketRepo.save(ticket);
  }

  async findByUserAndGroup(userId: string, groupId: string): Promise<Ticket[]> {
    if (!userId || !groupId) {
      throw new BadRequestException('userId and groupId query params are required');
    }
    return this.ticketRepo.find({
      where: { user_id: userId, group_id: groupId },
      order: { created_at: 'DESC' },
    });
  }
}
