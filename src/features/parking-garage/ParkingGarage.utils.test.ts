// types
import { PaymentMethod, TicketState } from './ParkingGarage.types';

// utils
import { generateBarCode } from './ParkingGarage.utils';

test('generateBarCode() should return a new barcode different then the previous one', () => {
	const ticket1 = generateBarCode();
	const ticket2 = generateBarCode();
	expect(ticket1).not.toBe(ticket2);
});