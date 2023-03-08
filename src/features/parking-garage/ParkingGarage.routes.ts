import { Router } from 'express';

// constants
import { PaymentMethod, TicketState } from './ParkingGarage.constants';

// database
import { sequelize } from '../../shared/utils/database';

// models
import { Ticket as TicketModel } from './models/Ticket';
import { Payment as PaymentModel } from './models/Payment';
import { PaymentMethod as PaymentMethodModel } from './models/PaymentMethod';

// types
import { Ticket, Payment } from './ParkingGarage.types';

// utils
import { generateBarCode, calculateTicketState } from './ParkingGarage.utils';
import _ from 'lodash';

export const ticketsRouter = Router();

interface PostGetTicketRequestParams { }

export interface PostGetTicketRequestBody {
	dateOfIssuance?: number; // For testing purposes
}

export interface PostGetTicketResponseBody {
	ticket: Ticket;
}

ticketsRouter.post<PostGetTicketRequestParams, PostGetTicketResponseBody, PostGetTicketRequestBody>('/get-ticket', async (req, res, next) => {
	const barCode = generateBarCode();
	const ticket: Omit<Ticket, 'payments'> = {
		barCode,
		dateOfIssuance: req.body.dateOfIssuance ?? Date.now()
	};
	await TicketModel.create(ticket);
	res.status(201).json({ ticket });
});

interface PostPayTicketRequestParams { }

export interface PostPayTicketRequestBody {
	ticket: Omit<Ticket, 'payments' | 'dateOfIssuance'>;
	paymentMethod: PaymentMethod;
	paymentDate?: number; // For testing purposes
}

export interface PostPayTicketResponseBody {
	paymentDate: number;
}

ticketsRouter.post<PostPayTicketRequestParams, PostPayTicketResponseBody, PostPayTicketRequestBody>('/pay-ticket', async (req, res, next) => {
	if (req.body.ticket === undefined) {
		return res.status(422).json();
	}
	if (req.body.paymentMethod === undefined) {
		return res.status(422).json();
	}
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
		paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
		PaymentMethodId: paymentMethod?.dataValues.id,
	}
	if (ticket) {
		await ticket.createPayment(payment);

		res.status(201).json({
			paymentDate: payment.paymentDate.getTime()
		});
	}
	else {
		res.status(500).json();
	}
});

interface PostCheckoutSuccessRequestParams { }

export interface PostCheckoutSuccessRequestBody {
	barCode: string;
}

export interface PostCheckoutSuccessResponseBody {
	success: boolean;
}

ticketsRouter.post<PostCheckoutSuccessRequestParams, PostCheckoutSuccessResponseBody, PostCheckoutSuccessRequestBody>('/checkout-success', async (req, res, next) => {
	const ticket = await TicketModel.findOne({
		where: {
			barCode: req.body.barCode,
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

interface PostGetTicketStateRequestParams { }

export interface PostGetTicketStateRequestBody {
	barCode: string;
	currentDate?: number; // For testing purposes
}

export interface PostGetTicketStateResponseBody {
	ticketState: TicketState
}

ticketsRouter.post<PostGetTicketStateRequestParams, PostGetTicketStateResponseBody, PostGetTicketStateRequestBody>('/get-ticket-state', async (req, res, next) => {
	if (req.body.barCode === undefined) {
		return res.status(422).json();
	}
	const ticket = await TicketModel.findOne({
		where: {
			barCode: req.body.barCode,
		}
	});
	if (ticket) {
		const [results] = await sequelize.query(
			'SELECT `Payment`.`paymentDate`, `PaymentMethod`.`name` AS `paymentMethod` FROM `payments` AS `Payment` \
			INNER JOIN paymentMethods  AS `PaymentMethod` ON `Payment`.`PaymentMethodId` = `PaymentMethod`.`id` \
			WHERE `Payment`.`TicketId` = :ticketId;',
			{
				replacements: {
					ticketId: ticket.dataValues.id
				},
			}
		);
		const currentDate = req.body.currentDate ? new Date(req.body.currentDate) : new Date();
		const ticketState = calculateTicketState(
			{
				barCode: ticket.dataValues.barCode,
				dateOfIssuance: ticket.dataValues.dateOfIssuance,
				payments: results as Payment[],
			},
			currentDate
		);
		res.status(201).json({
			ticketState,
		});
	}
});