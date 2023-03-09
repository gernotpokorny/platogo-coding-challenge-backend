// constants
import { TicketState } from './ParkingGarage.constants';

// types
import { Ticket } from './ParkingGarage.types';

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

export const getFormattedPaymentDate = (paymentDate: Date) => {
	return paymentDate.toLocaleDateString('de-DE', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

/**
 * `date` can be for example the date of the issuance of the ticket or the date of the last payment which happened before the current payment.
 * `paymentDate` is the current payment.
 */
export const calculateTicketPrice = (date: Date, paymentDate: Date) => {
	const hours = Math.abs(paymentDate.getTime() - date.getTime()) / 36e5; // 36e5 is the scientific notation for 60*60*1000, dividing by which converts the milliseconds difference into hours.
	const billedHours = Math.ceil(hours);
	const HOURLY_RATE = 2;
	return billedHours * HOURLY_RATE;
};