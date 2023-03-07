import { Router } from 'express';

// models
import { Ticket } from './models/Ticket';
import { Payment } from './models/Payment';
import { PaymentMethod } from './models/PaymentMethod';

// types
import { PaymentMethod as PaymentMethodData, Ticket as TicketData, Payment as PaymentData} from './ParkingGarage.types';

// utils
import { generateBarCode } from './ParkingGarage.utils';
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
	ticket: TicketData;
}

interface PostCheckoutSuccessRequest {
	params: PostCheckoutSuccessRequestParams
	body: PostCheckoutSuccessRequestBody;
}

ticketsRouter.post('/checkout-success', async (req: PostCheckoutSuccessRequest, res, next) => {
	const ticket = await Ticket.findOne({
		where: {
			barCode: req.body.ticket.barCode,
		}
	});
	if (ticket) {
		Payment.destroy({
			where: {
				TicketId: ticket?.id,
			}
		})
		await ticket.destroy();
	}
	res.status(201).json({ success: true });
});