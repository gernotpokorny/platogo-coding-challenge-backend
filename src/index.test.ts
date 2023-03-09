import request, { agent } from 'supertest';
import app from './index';

// constants
import { PaymentMethod } from './features/parking-garage/ParkingGarage.constants';

// models
import { Ticket as TicketModel } from './features/parking-garage/models/Ticket';
import { PaymentMethod as PaymentMethodModel } from './features/parking-garage/models/PaymentMethod';
import { Payment as PaymentModel } from './features/parking-garage/models/Payment';

// types
import {
	PostGetTicketRequestBody,
	PostGetTicketResponseBody,
	PostPayTicketRequestBody,
	PostPayTicketResponseBody,
	PostCheckoutSuccessRequestBody,
	PostCheckoutSuccessResponseBody,
	PostGetTicketStateRequestBody,
	PostGetTicketStateResponseBody,
	PostCalculateTicketPriceRequestBody,
	PostCalculateTicketPriceResponseBody,
} from './features/parking-garage/ParkingGarage.routes';
import { SuperTestResponse } from './shared/utils/types';

describe('Initial Setup', () => {
	beforeAll(async () => {
		agent(app); // trigger the execution of the code of app
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});
	test('Initially the there should be no tickets within the database', async () => {
		const tickets = await TicketModel.findAll();
		expect(tickets.length).toBe(0);
	});
	test('Initially the there should be no payments within the database', async () => {
		const payments = await PaymentModel.findAll();
		expect(payments.length).toBe(0);
	});
});

describe('POST /get-ticket', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('should return a new ticket and safe a new ticket into the database', async () => {
		const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();

		expect(getTicketResponse.statusCode).toBe(201);
		expect(getTicketResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(getTicketResponse.body.ticket).toBeDefined();
		expect(typeof getTicketResponse.body.ticket).toBe('object');
		expect(typeof getTicketResponse.body.ticket.barCode).toBe('string');
		expect(typeof getTicketResponse.body.ticket.dateOfIssuance).toBe('number');
		expect(getTicketResponse.body.ticket.barCode).toMatch(/^\d{16}$/);

		const tickets = await TicketModel.findAll({
			where: {
				barCode: getTicketResponse.body.ticket.barCode,
			},
		});
		expect(tickets.length).toBe(1);
		expect(tickets[0].dataValues.barCode).toBe(getTicketResponse.body.ticket.barCode);
		expect(tickets[0].dataValues.dateOfIssuance).toBe(getTicketResponse.body.ticket.dateOfIssuance);
	});

	it('should return a new barcode different then the previous one', async () => {
		const getTicketResponse1: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
		const getTicketResponse2: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();

		expect(getTicketResponse1.statusCode).toBe(201);
		expect(getTicketResponse1.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(getTicketResponse1.body.ticket).toBeDefined();
		expect(typeof getTicketResponse1.body.ticket).toBe('object');
		expect(typeof getTicketResponse1.body.ticket.barCode).toBe('string');
		expect(typeof getTicketResponse1.body.ticket.dateOfIssuance).toBe('number');
		expect(getTicketResponse1.body.ticket.barCode).toMatch(/^\d{16}$/);

		expect(getTicketResponse2.statusCode).toBe(201);
		expect(getTicketResponse2.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(getTicketResponse2.body.ticket).toBeDefined();
		expect(typeof getTicketResponse2.body.ticket).toBe('object');
		expect(typeof getTicketResponse2.body.ticket.barCode).toBe('string');
		expect(typeof getTicketResponse2.body.ticket.dateOfIssuance).toBe('number');
		expect(getTicketResponse2.body.ticket.barCode).toMatch(/^\d{16}$/);

		expect(getTicketResponse1.body.ticket.barCode).not.toBe(getTicketResponse2.body.ticket.barCode);
	});
});

describe('POST /pay-ticket', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	describe('one payment', () => {
		it('should return the paymentDate and safe a payment in the database whereby the payment should reference the provided ticket',
			async () => {
				const paymentMethod = PaymentMethod.CASH;

				const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
				const payTicketResponse: SuperTestResponse<PostPayTicketResponseBody> = await request(app).post('/pay-ticket').send((() => {
					const requestBody: PostPayTicketRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						paymentMethod,
					};
					return requestBody;
				})());

				expect(payTicketResponse.statusCode).toBe(201);
				expect(payTicketResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(payTicketResponse.body.paymentDate).toBeDefined();
				expect(typeof payTicketResponse.body.paymentDate).toBe('number');

				const ticketInstance = await TicketModel.findOne({
					where: {
						barCode: getTicketResponse.body.ticket.barCode,
					},
				});
				const paymentMethodInstance = await PaymentMethodModel.findOne({
					where: {
						name: paymentMethod,
					},
				});
				if (ticketInstance && paymentMethodInstance) {
					const payments = await ticketInstance.getPayments();
					expect(payments.length).toBe(1);
					expect(payments[0].dataValues.paymentDate.getTime()).toBe(payTicketResponse.body.paymentDate);
					expect(payments[0].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
					expect(payments[0].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
				}
				else {
					expect(ticketInstance).not.toBe(null);
					expect(paymentMethodInstance).not.toBe(null);
				}
			}
		);
	});
	describe('multiple payments', () => {
		test('should return the paymentDate and safe a payments in the database whereby the payments should reference the provided ticket',
			async () => {
				const paymentMethod = PaymentMethod.CASH;

				const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
				const payTicketResponse0: SuperTestResponse<PostPayTicketResponseBody> = (
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: paymentMethod,
						};
						return requestBody;
					})())
				);
				const payTicketResponse1: SuperTestResponse<PostPayTicketResponseBody> = (
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: paymentMethod,
						};
						return requestBody;
					})())
				);

				expect(payTicketResponse0.statusCode).toBe(201);
				expect(payTicketResponse0.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(payTicketResponse0.body.paymentDate).toBeDefined();
				expect(typeof payTicketResponse0.body.paymentDate).toBe('number');

				expect(payTicketResponse1.statusCode).toBe(201);
				expect(payTicketResponse1.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(payTicketResponse1.body.paymentDate).toBeDefined();
				expect(typeof payTicketResponse1.body.paymentDate).toBe('number');

				const ticketInstance = await TicketModel.findOne({
					where: {
						barCode: getTicketResponse.body.ticket.barCode,
					},
				});
				const paymentMethodInstance = await PaymentMethodModel.findOne({
					where: {
						name: paymentMethod,
					},
				});
				if (ticketInstance && paymentMethodInstance) {
					const payments = await ticketInstance.getPayments();
					expect(payments.length).toBe(2);
					expect(payments[0].dataValues.paymentDate.getTime()).toBe(payTicketResponse0.body.paymentDate);
					expect(payments[0].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
					expect(payments[0].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
					expect(payments[1].dataValues.paymentDate.getTime()).toBe(payTicketResponse1.body.paymentDate);
					expect(payments[1].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
					expect(payments[1].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
				}
				else {
					expect(ticketInstance).not.toBe(null);
					expect(paymentMethodInstance).not.toBe(null);
				}
			}
		);
	});
});

describe('POST /get-ticket-state', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('the ticket state of a newly issued ticket should be UNPAID', async () => {
		const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
		const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
			await request(app).post('/get-ticket-state').send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
				};
				return requestBody;
			})())
		);

		expect(getTicketStateResponse.statusCode).toBe(201);
		expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(getTicketStateResponse.body.ticketState).toBe('UNPAID');
	});

	describe('one payment', () => {
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
				await request(app).post('/get-ticket-state').send((() => {
					const requestBody: PostGetTicketStateRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
					};
					return requestBody;
				})())
			);

			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(getTicketStateResponse.body.ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment: 15 min',
			async () => {
				const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
					const requestBody: PostGetTicketRequestBody = {
						dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				await request(app).post('/pay-ticket').send((() => {
					const requestBody: PostPayTicketRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						paymentMethod: PaymentMethod.CASH,
						paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
					await request(app).post('/get-ticket-state').send((() => {
						const requestBody: PostGetTicketStateRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							currentDate: new Date(2020, 2, 10, 3, 15, 0, 0).getTime(),
						};
						return requestBody;
					})())
				);

				expect(getTicketStateResponse.statusCode).toBe(201);
				expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(getTicketStateResponse.body.ticketState).toBe('PAID');
			}
		);
		test('the ticket state of a paid ticket ticket should be UNPAID if more than 15min have passed since the payment',
			async () => {
				const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
					const requestBody: PostGetTicketRequestBody = {
						dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				await request(app).post('/pay-ticket').send((() => {
					const requestBody: PostPayTicketRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						paymentMethod: PaymentMethod.CASH,
						paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
					await request(app).post('/get-ticket-state').send((() => {
						const requestBody: PostGetTicketStateRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							currentDate: new Date(2020, 2, 10, 3, 15, 1, 0).getTime(),
						};
						return requestBody;
					})())
				);

				expect(getTicketStateResponse.statusCode).toBe(201);
				expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(getTicketStateResponse.body.ticketState).toBe('UNPAID');
			}
		);
	});

	describe('multiple payments', () => {
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
				await request(app).post('/get-ticket-state').send((() => {
					const requestBody: PostGetTicketStateRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
					};
					return requestBody;
				})())
			);

			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(getTicketStateResponse.body.ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment: 15 min',
			async () => {
				const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
					const requestBody: PostGetTicketRequestBody = {
						dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				await request(app).post('/pay-ticket').send((() => {
					const requestBody: PostPayTicketRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						paymentMethod: PaymentMethod.CASH,
						paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				await request(app).post('/pay-ticket').send((() => {
					const requestBody: PostPayTicketRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						paymentMethod: PaymentMethod.CASH,
						paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})());
				const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
					await request(app).post('/get-ticket-state').send((() => {
						const requestBody: PostGetTicketStateRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							currentDate: new Date(2020, 2, 10, 5, 15, 0, 0).getTime(),
						};
						return requestBody;
					})())
				);

				expect(getTicketStateResponse.statusCode).toBe(201);
				expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
				expect(getTicketStateResponse.body.ticketState).toBe('PAID');
			}
		);
		test('the ticket state of a paid ticket ticket should be UNPAID if more than 15min have passed since the payment', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const getTicketStateResponse: SuperTestResponse<PostGetTicketStateResponseBody> = (
				await request(app).post('/get-ticket-state').send((() => {
					const requestBody: PostGetTicketStateRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						currentDate: new Date(2020, 2, 10, 5, 15, 1, 0).getTime(),
					};
					return requestBody;
				})())
			);

			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(getTicketStateResponse.body.ticketState).toBe('UNPAID');
		});
	});
});

describe('POST /calculate-ticket-price', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	describe('unpaid ticket', () => {
		test('the calculated price of a newly issued ticket should be 2', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
			const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
				await request(app).post('/calculate-ticket-price').send((() => {
					const requestBody: PostCalculateTicketPriceRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
					};
					return requestBody;
				})())
			);

			expect(calculateTicketPriceResponse.statusCode).toBe(201);
			expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
			expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
		});
		test('Every started hour costs 2 Eur more: 60 min 00 sec passed: price should be 2', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
				await request(app).post('/calculate-ticket-price').send((() => {
					const requestBody: PostCalculateTicketPriceRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						currentDate: (new Date(2020, 2, 10, 2, 0, 0, 0)).getTime(),
					};
					return requestBody;
				})())
			);

			expect(calculateTicketPriceResponse.statusCode).toBe(201);
			expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
			expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
		});
		test('Every started hour costs 2 Eur more: 60 min 01 sec passed: price should be 4', async () => {
			const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
				await request(app).post('/calculate-ticket-price').send((() => {
					const requestBody: PostCalculateTicketPriceRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
						currentDate: (new Date(2020, 2, 10, 2, 0, 1, 0)).getTime(),
					};
					return requestBody;
				})())
			);

			expect(calculateTicketPriceResponse.statusCode).toBe(201);
			expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(calculateTicketPriceResponse.body.ticketPrice).toBe(4);
			expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
		});
	});
	describe('payed ticket', () => {
		describe('<= 15 min have passed since last payment', () => {
			describe('one payment', () => {
				test('15 min 00 sec passed since last payment: the calculated price should be 0 and a payment receipt should be returned',
					async () => {
						const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
							await request(app).post('/get-ticket').send((() => {
								const requestBody: PostGetTicketRequestBody = {
									dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
								};
								return requestBody;
							})())
						);
						await request(app).post('/pay-ticket').send((() => {
							const requestBody: PostPayTicketRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								paymentMethod: PaymentMethod.CASH,
								paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})());
						const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
							await request(app).post('/calculate-ticket-price').send((() => {
								const requestBody: PostCalculateTicketPriceRequestBody = {
									barCode: getTicketResponse.body.ticket.barCode,
									currentDate: (new Date(2020, 2, 10, 3, 15, 0, 0)).getTime(),
								};
								return requestBody;
							})())
						);

						expect(calculateTicketPriceResponse.statusCode).toBe(201);
						expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
						expect(calculateTicketPriceResponse.body.ticketPrice).toBe(0);
						expect(calculateTicketPriceResponse.body.paymentReceipt).toStrictEqual([
							'Paid: 6€',
							'Payment date: Dienstag, 10. März 2020 um 03:00:00',
							'Payment method: CASH',
						]);
					}
				);
			});
			describe('multiple payments', () => {
				test('15 min 00 sec passed since last payment: the calculated price should be 0 and a payment receipt should be returned',
					async () => {
						const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
							await request(app).post('/get-ticket').send((() => {
								const requestBody: PostGetTicketRequestBody = {
									dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
								};
								return requestBody;
							})())
						);
						await request(app).post('/pay-ticket').send((() => {
							const requestBody: PostPayTicketRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								paymentMethod: PaymentMethod.CASH,
								paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})());
						await request(app).post('/pay-ticket').send((() => {
							const requestBody: PostPayTicketRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								paymentMethod: PaymentMethod.CASH,
								paymentDate: (new Date(2020, 2, 10, 4, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})());
						const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
							await request(app).post('/calculate-ticket-price').send((() => {
								const requestBody: PostCalculateTicketPriceRequestBody = {
									barCode: getTicketResponse.body.ticket.barCode,
									currentDate: (new Date(2020, 2, 10, 4, 15, 0, 0)).getTime(),
								};
								return requestBody;
							})())
						);

						expect(calculateTicketPriceResponse.statusCode).toBe(201);
						expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
						expect(calculateTicketPriceResponse.body.ticketPrice).toBe(0);
						expect(calculateTicketPriceResponse.body.paymentReceipt).toStrictEqual([
							'Paid: 2€',
							'Payment date: Dienstag, 10. März 2020 um 04:00:00',
							'Payment method: CASH',
						]);
					}
				);
			});
		});
		describe('> 15 min have passed since last payment', () => {
			describe('one payment', () => {
				test('First hour price since the last payment should be 2', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send((() => {
							const requestBody: PostGetTicketRequestBody = {
								dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 3, 15, 1, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
				test('Every started hour since the last payment costs 2 Eur more: 60 min 00 sec passed', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send((() => {
							const requestBody: PostGetTicketRequestBody = {
								dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 4, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
				test('Every started hour since the last payment costs 2 Eur more: 60 min 01 sec passed', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send((() => {
							const requestBody: PostGetTicketRequestBody = {
								dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 4, 0, 1, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(4);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
			});
			describe('multiple payments', () => {
				test('First hour price since the last payment should be 2', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send((() => {
							const requestBody: PostGetTicketRequestBody = {
								dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 5, 15, 1, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
				test('Every started hour since the last payment costs 2 Eur more: 60 min 00 sec passed', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send((() => {
							const requestBody: PostGetTicketRequestBody = {
								dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 6, 0, 0, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(2);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
				test('Every started hour since the last payment costs 2 Eur more: 60 min 01 sec passed', async () => {
					const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = (
						await request(app).post('/get-ticket').send({
							dateOfIssuance: (new Date(2020, 2, 10, 0, 0, 0, 0)).getTime(),
						})
					);
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					await request(app).post('/pay-ticket').send((() => {
						const requestBody: PostPayTicketRequestBody = {
							barCode: getTicketResponse.body.ticket.barCode,
							paymentMethod: PaymentMethod.CASH,
							paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
						};
						return requestBody;
					})());
					const calculateTicketPriceResponse: SuperTestResponse<PostCalculateTicketPriceResponseBody> = (
						await request(app).post('/calculate-ticket-price').send((() => {
							const requestBody: PostCalculateTicketPriceRequestBody = {
								barCode: getTicketResponse.body.ticket.barCode,
								currentDate: (new Date(2020, 2, 10, 6, 0, 1, 0)).getTime(),
							};
							return requestBody;
						})())
					);

					expect(calculateTicketPriceResponse.statusCode).toBe(201);
					expect(calculateTicketPriceResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
					expect(calculateTicketPriceResponse.body.ticketPrice).toBe(4);
					expect(calculateTicketPriceResponse.body.paymentReceipt).not.toBeDefined();
				});
			});
		});
	});
});

describe('POST /checkout-success', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('should destroy the ticket and with the ticket associated payments within the database', async () => {
		const getTicketResponse: SuperTestResponse<PostGetTicketResponseBody> = await request(app).post('/get-ticket').send();
		
		const ticketInstanceAfterGetTicket = await TicketModel.findOne({
			where: {
				barCode: getTicketResponse.body.ticket.barCode,
			},
		});
		if (ticketInstanceAfterGetTicket) {
			const ticketId = ticketInstanceAfterGetTicket.dataValues.id;
			await request(app).post('/pay-ticket').send((() => {
				const requestBody: PostPayTicketRequestBody = {
					barCode: getTicketResponse.body.ticket.barCode,
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const checkoutSuccessResponse: SuperTestResponse<PostCheckoutSuccessResponseBody> = (
				await request(app).post('/checkout-success').send((() => {
					const requestBody: PostCheckoutSuccessRequestBody = {
						barCode: getTicketResponse.body.ticket.barCode,
					};
					return requestBody;
				})())
			);

			expect(checkoutSuccessResponse.statusCode).toBe(201);
			expect(checkoutSuccessResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(checkoutSuccessResponse.body.success).toBe(true);

			const ticketInstanceAfterCheckoutSuccess = await TicketModel.findOne({
				where: {
					barCode: getTicketResponse.body.ticket.barCode,
				},
			});
			expect(ticketInstanceAfterCheckoutSuccess).toBe(null);
			const payments = await PaymentModel.findAll({
				where: {
					TicketId: ticketId,
				},
			});
			expect(payments.length).toBe(0);
		}
		else {
			expect(ticketInstanceAfterGetTicket).not.toBe(null);
		}
	});
});