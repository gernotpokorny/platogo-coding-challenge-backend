import { Router } from 'express';
import { PaymentMethod } from './models/PaymentMethod';

// models
import { Ticket } from './models/Ticket';

// types
import { PaymentMethod as PaymentMethodData, Ticket as TicketData, TicketState } from './ParkingGarage.types';

// utils
import { generateBarCode, calculateTicketState } from './ParkingGarage.utils';
import _ from 'lodash';

export const ticketsRouter = Router();

ticketsRouter.post('/get-ticket', async (req, res, next) => {
	const barCode = generateBarCode();
	const ticket: Omit<TicketData, 'payments'> = {
		barCode,
		dateOfIssuance: Date.now(),
	};
	await Ticket.create(ticket);
	res.status(201).json({ ticket });
});

interface PostPayTicketRequestParams { }

interface PostPayTicketRequestBody {
	ticket: Omit<TicketData, 'payments'>;
	paymentMethod: PaymentMethodData;
}

interface PostPayTicketRequest {
	params: PostPayTicketRequestParams
	body: PostPayTicketRequestBody;
}

ticketsRouter.post('/pay-ticket', async (req: PostPayTicketRequest, res, next) => {
	const ticket = await Ticket.findOne({
		where: {
			barCode: req.body.ticket.barCode,
		}
	});
	const paymentMethod = await PaymentMethod.findOne({
		where: {
			name: req.body.paymentMethod,
		},
	});
	console.log('paymentMethodId', paymentMethod?.dataValues.id);
	const payment = {
		paymentDate: new Date(),
		PaymentMethodId: paymentMethod?.dataValues.id,
	}
	if (ticket) {
		await ticket.createPayment(payment);
		// ticket.$add('payments', { id: ticket.id, ...payment });
		res.status(201).json(_.omit(payment, ['PaymentMethodId']));
	}
	else {
		res.status(500).json({});
	}
});

interface PostGateCheckoutRequestParams { }

interface PostGateCheckoutRequestBody {
	ticket: TicketData;
}

interface PostGateCheckoutRequest {
	params: PostGateCheckoutRequestParams
	body: PostGateCheckoutRequestBody;
}

ticketsRouter.post('/gate-checkout', async (req: PostGateCheckoutRequest, res, next) => {
	const ticket = req.body.ticket;
	const currentDate = new Date();
	const ticketState = calculateTicketState(ticket, currentDate);
	res.status(201).json({
		success: ticketState === TicketState.PAID ? true : false,
	});
});