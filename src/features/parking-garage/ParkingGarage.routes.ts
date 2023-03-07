import { Router } from 'express';

// models
import { Ticket as TicketModel } from './models/Ticket';
import { Payment as PaymentModel } from './models/Payment';
import { PaymentMethod as PaymentMethodModel } from './models/PaymentMethod';

// types
import { PaymentMethod, Ticket } from './ParkingGarage.types';

// utils
import { generateBarCode } from './ParkingGarage.utils';
import _ from 'lodash';

export const ticketsRouter = Router();

ticketsRouter.post('/get-ticket', async (req, res, next) => {
	const barCode = generateBarCode();
	const ticket: Omit<Ticket, 'payments'> = {
		barCode,
		dateOfIssuance: Date.now(),
	};
	await TicketModel.create(ticket);
	res.status(201).json({ ticket });
});

interface PostPayTicketRequestParams { }

interface PostPayTicketRequestBody {
	ticket: Omit<Ticket, 'payments'>;
	paymentMethod: PaymentMethod;
}

interface PostPayTicketRequest {
	params: PostPayTicketRequestParams
	body: PostPayTicketRequestBody;
}

ticketsRouter.post('/pay-ticket', async (req: PostPayTicketRequest, res, next) => {
	const ticket = await TicketModel.findOne({
		where: {
			barCode: req.body.ticket.barCode,
		}
	});
	const paymentMethod = await PaymentMethodModel.findOne({
		where: {
			name: req.body.paymentMethod,
		},
	});
	const payment = {
		paymentDate: new Date(),
		PaymentMethodId: paymentMethod?.dataValues.id,
	}
	if (ticket) {
		await ticket.createPayment(payment);

		res.status(201).json({
			paymentDate: payment.paymentDate.getTime()
		});
	}
	else {
		res.status(500).json({});
	}
});

interface PostCheckoutSuccessRequestParams { }

interface PostCheckoutSuccessRequestBody {
	ticket: Ticket;
}

interface PostCheckoutSuccessRequest {
	params: PostCheckoutSuccessRequestParams
	body: PostCheckoutSuccessRequestBody;
}

ticketsRouter.post('/checkout-success', async (req: PostCheckoutSuccessRequest, res, next) => {
	const ticket = await TicketModel.findOne({
		where: {
			barCode: req.body.ticket.barCode,
		}
	});
	if (ticket) {
		PaymentModel.destroy({
			where: {
				TicketId: ticket?.id,
			}
		})
		await ticket.destroy();
	}
	res.status(201).json({ success: true });
});