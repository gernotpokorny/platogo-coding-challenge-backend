export enum PaymentMethod {
	CREDIT_CARD = 'CREDIT_CARD',
	DEBIT_CARD = 'DEBIT_CARD',
	CASH = 'CASH',
}

export enum TicketState {
	PAID = 'PAID',
	UNPAID = 'UNPAID',
}

export interface Payment {
	paymentDate: number;
	paymentMethod: PaymentMethod;
}

export interface Ticket {
	barCode: string;
	dateOfIssuance: number;
	payments?: Payment[];
}