// types
import { Payment, PaymentMethod, Ticket, TicketState } from './ParkingGarage.types';

// utils
import { generateRandomNumber } from '../../shared/utils/randomness-utils';


export const generateBarCode = () => {
	return generateRandomNumber(16);
};