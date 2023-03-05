// types
import { PaymentMethod, TicketState } from './ParkingGarage.types';

// utils
import { generateBarCode, calculateTicketState } from './ParkingGarage.utils';

test('generateBarCode()', () => {
	const ticket1 = generateBarCode();
	const ticket2 = generateBarCode();
	expect(ticket1).not.toBe(ticket2);
});

test('calculateTicketState() 15min 01 seconds passed', () => {
	const barCode = '1294035554460157';
	const dateOfIssuance = new Date(2023, 1, 1, 2, 0, 0);
	const paymentDate = new Date(2023, 1, 1, 3, 0, 0);
	const ticketState = calculateTicketState(
		{
			barCode,
			dateOfIssuance: dateOfIssuance.getTime(),
			payments: [
				{
					paymentDate: paymentDate.getTime(),
					paymentMethod: PaymentMethod.CREDIT_CARD,
				},
			],
		},
		new Date(2023, 1, 1, 3, 15, 1)
	);
	expect(ticketState).toBe(TicketState.UNPAID);
});

test('calculateTicketState() 15 min 00 seconds passed', () => {
	const barCode = '3739016609451616';
	const dateOfIssuance = new Date(2023, 1, 1, 2, 0, 0);
	const paymentDate = new Date(2023, 1, 1, 3, 0, 0);
	const ticketState = calculateTicketState(
		{
			barCode,
			dateOfIssuance: dateOfIssuance.getTime(),
			payments: [
				{
					paymentDate: paymentDate.getTime(),
					paymentMethod: PaymentMethod.CREDIT_CARD,
				},
			],
		},
		new Date(2023, 1, 1, 3, 15, 0)
	);
	expect(ticketState).toBe(TicketState.PAID);
});