// constants
import { PaymentMethod } from './ParkingGarage.constants';

export interface Payment {
	paymentDate: number;
	paymentMethod: PaymentMethod;
}

export interface Ticket {
	barCode: string;
	dateOfIssuance: number;
	payments?: Payment[];
}

export type PaymentReceipt = string[];