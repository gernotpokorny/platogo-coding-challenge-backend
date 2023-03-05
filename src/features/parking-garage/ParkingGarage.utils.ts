// types
import { Payment, PaymentMethod, Ticket, TicketState } from './ParkingGarage.types';

// utils
import { generateRandomNumber } from '../../shared/utils/randomness-utils';


export const generateBarCode = () => {
	return generateRandomNumber(16);
};

export const calculateTicketState = (ticket: Ticket, currentDate: Date) => {
	if (ticket.payments && ticket.payments.length > 0) {
		const paymentDate = new Date(ticket.payments[ticket.payments.length - 1].paymentDate);
		const minutes = Math.abs(currentDate.getTime() - paymentDate.getTime()) / 60000; // Dividing by 60000 converts the milliseconds difference into minutes.
		return minutes > 15 ? TicketState.UNPAID : TicketState.PAID;
	}
	else {
		return TicketState.UNPAID;
	}
};