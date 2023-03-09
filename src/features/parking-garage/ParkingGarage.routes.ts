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
import { Ticket, Payment, PaymentReceipt } from './ParkingGarage.types';

// utils
import { generateBarCode, calculateTicketState, calculateTicketPrice, getFormattedPaymentDate } from './ParkingGarage.utils';

export const ticketsRouter = Router();

interface PostGetTicketRequestParams { }

export interface PostGetTicketRequestBody {
	dateOfIssuance?: number; // For testing purposes
}

export interface PostGetTicketResponseBody {
	ticket: Ticket;
}

ticketsRouter.post<PostGetTicketRequestParams, PostGetTicketResponseBody, PostGetTicketRequestBody>(
	'/get-ticket',
	async (req, res, next) => {
		const barCode = generateBarCode();
		const ticket: Omit<Ticket, 'payments'> = {
			barCode,
			dateOfIssuance: req.body.dateOfIssuance ?? Date.now(),
		};
		await TicketModel.create(ticket);
		res.status(201).json({ ticket });
	}
);

interface PostPayTicketRequestParams { }

export interface PostPayTicketRequestBody {
	barCode: string;
	paymentMethod: PaymentMethod;
	paymentDate?: number; // For testing purposes
}

export interface PostPayTicketResponseBody {
	paymentDate: number;
}

ticketsRouter.post<PostPayTicketRequestParams, PostPayTicketResponseBody, PostPayTicketRequestBody>(
	'/pay-ticket',
	async (req, res, next) => {
		if (req.body.barCode === undefined) {
			return res.status(422).json();
		}
		if (req.body.paymentMethod === undefined) {
			return res.status(422).json();
		}
		const ticketInstance = await TicketModel.findOne({
			where: {
				barCode: req.body.barCode,
			},
		});
		const paymentMethodInstance = await PaymentMethodModel.findOne({
			where: {
				name: req.body.paymentMethod,
			},
		});
		if (ticketInstance) {
			const payment = {
				paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
				PaymentMethodId: paymentMethodInstance?.dataValues.id,
			};
			await ticketInstance.createPayment(payment);

			res.status(201).json({
				paymentDate: payment.paymentDate.getTime(),
			});
		}
		else {
			res.status(500).json();
		}
	}
);

interface PostCheckoutSuccessRequestParams { }

export interface PostCheckoutSuccessRequestBody {
	barCode: string;
}

export interface PostCheckoutSuccessResponseBody {
	success: boolean;
}

ticketsRouter.post<PostCheckoutSuccessRequestParams, PostCheckoutSuccessResponseBody, PostCheckoutSuccessRequestBody>(
	'/checkout-success'
	, async (req, res, next) => {
		if (req.body.barCode === undefined) {
			return res.status(422).json();
		}
		const ticketInstance = await TicketModel.findOne({
			where: {
				barCode: req.body.barCode,
			},
		});
		if (ticketInstance) {
			PaymentModel.destroy({
				where: {
					TicketId: ticketInstance.id,
				},
			});
			await ticketInstance.destroy();
		}
		res.status(201).json({ success: true });
	}
);

interface PostGetTicketStateRequestParams { }

export interface PostGetTicketStateRequestBody {
	barCode: string;
	currentDate?: number; // For testing purposes
}

export interface PostGetTicketStateResponseBody {
	ticketState: TicketState
}

ticketsRouter.post<PostGetTicketStateRequestParams, PostGetTicketStateResponseBody, PostGetTicketStateRequestBody>(
	'/get-ticket-state'
	, async (req, res, next) => {
		if (req.body.barCode === undefined) {
			return res.status(422).json();
		}
		const ticketInstance = await TicketModel.findOne({
			where: {
				barCode: req.body.barCode,
			},
		});
		if (ticketInstance) {
			const [results] = await sequelize.query(
				'SELECT `Payment`.`paymentDate`, `PaymentMethod`.`name` AS `paymentMethod` FROM `payments` AS `Payment` \
				INNER JOIN paymentMethods  AS `PaymentMethod` ON `Payment`.`PaymentMethodId` = `PaymentMethod`.`id` \
				WHERE `Payment`.`TicketId` = :ticketId;',
				{
					replacements: {
						ticketId: ticketInstance.dataValues.id,
					},
				}
			);
			const currentDate = req.body.currentDate ? new Date(req.body.currentDate) : new Date();
			const ticketState = calculateTicketState(
				{
					barCode: ticketInstance.dataValues.barCode,
					dateOfIssuance: ticketInstance.dataValues.dateOfIssuance,
					payments: results as Payment[],
				},
				currentDate
			);
			res.status(201).json({
				ticketState,
			});
		}
	}
);


interface PostCalculateTicketPriceRequestParams { }

export interface PostCalculateTicketPriceRequestBody {
	barCode: string;
	currentDate?: number; // For testing purposes
}

export interface PostCalculateTicketPriceResponseBody {
	ticketPrice: number;
	paymentReceipt?: PaymentReceipt;
}

ticketsRouter.post<PostCalculateTicketPriceRequestParams, PostCalculateTicketPriceResponseBody, PostCalculateTicketPriceRequestBody>(
	'/calculate-ticket-price',
	async (req, res, next) => {
		if (req.body.barCode === undefined) {
			return res.status(422).json();
		}
		const currentDate = req.body.currentDate ? new Date(req.body.currentDate) : new Date();
		const ticketInstance = await TicketModel.findOne({
			where: {
				barCode: req.body.barCode,
			},
		});
		if (ticketInstance) {
			const [payments] = await sequelize.query(
				'SELECT `Payment`.`paymentDate`, `PaymentMethod`.`name` AS `paymentMethod` FROM `payments` AS `Payment` \
				INNER JOIN paymentMethods  AS `PaymentMethod` ON `Payment`.`PaymentMethodId` = `PaymentMethod`.`id` \
				WHERE `Payment`.`TicketId` = :ticketId;',
				{
					replacements: {
						ticketId: ticketInstance.dataValues.id,
					},
				}
			) as [Payment[], unknown];
			const ticketState = calculateTicketState(
				{
					barCode: ticketInstance.dataValues.barCode,
					dateOfIssuance: ticketInstance.dataValues.dateOfIssuance,
					payments: payments,
				},
				currentDate
			);
			if (payments && payments.length > 0 && ticketState === TicketState.PAID) {
				if (payments.length === 1) {
					const issueDate = new Date(ticketInstance.dataValues.dateOfIssuance);
					const currentPayment = payments[payments.length - 1];
					const paymentDate = new Date(currentPayment.paymentDate);
					const ticketPrice = calculateTicketPrice(issueDate, paymentDate);
					return res.status(201).json({
						ticketPrice: 0,
						paymentReceipt: [
							`Paid: ${ticketPrice}€`,
							`Payment date: ${getFormattedPaymentDate(paymentDate)}`,
							`Payment method: ${currentPayment.paymentMethod}`,
						],
					});
				}
				else {
					const penultimatePaymentDate = new Date(payments[payments.length - 2].paymentDate);
					const currentPayment = payments[payments.length - 1];
					const paymentDate = new Date(currentPayment.paymentDate);
					const ticketPrice = calculateTicketPrice(penultimatePaymentDate, paymentDate);
					return res.status(201).json({
						ticketPrice: 0,
						paymentReceipt: [
							`Paid: ${ticketPrice}€`,
							`Payment date: ${getFormattedPaymentDate(paymentDate)}`,
							`Payment method: ${currentPayment.paymentMethod}`,
						],
					});
				}
			}
			else {
				if (payments && payments.length > 0) {
					const lastPayment = payments[payments.length - 1];
					const paymentDate = currentDate;
					const ticketPrice = calculateTicketPrice(
						new Date(lastPayment.paymentDate),
						paymentDate
					);
					return res.status(201).json({
						ticketPrice,
					});
				}
				else {
					const issueDate = new Date(ticketInstance.dataValues.dateOfIssuance);
					const paymentDate = currentDate;
					const ticketPrice = calculateTicketPrice(issueDate, paymentDate);
					return res.status(201).json({
						ticketPrice,
					});
				}
			}
		}
		else {
			res.status(404).json();
		}
	}
);