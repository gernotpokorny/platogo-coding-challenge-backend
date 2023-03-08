import request from 'supertest';
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
} from './features/parking-garage/ParkingGarage.routes';

describe('Initial Setup', () => {
	beforeAll(async () => {
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
		const getTicketResponse = await request(app).post("/get-ticket").send();
		expect(getTicketResponse.statusCode).toBe(201);
		expect(getTicketResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect((getTicketResponse.body as PostGetTicketResponseBody).ticket).toBeDefined();
		expect(typeof (getTicketResponse.body as PostGetTicketResponseBody).ticket).toBe('object');
		expect(typeof (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode).toBe('string');
		expect(typeof (getTicketResponse.body as PostGetTicketResponseBody).ticket.dateOfIssuance).toBe('number');
		expect((getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode).toMatch(/^\d{16}$/);

		const tickets = await TicketModel.findAll({
			where: {
				barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
			}
		});
		expect(tickets.length).toBe(1);
		expect(tickets[0].dataValues.barCode).toBe((getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode);
		expect(tickets[0].dataValues.dateOfIssuance).toBe((getTicketResponse.body as PostGetTicketResponseBody).ticket.dateOfIssuance);
	});

	it('should return a new barcode different then the previous one', async () => {
		const getTicketResponse1 = await request(app).post("/get-ticket").send();
		const getTicketResponse2 = await request(app).post("/get-ticket").send();

		expect(getTicketResponse1.statusCode).toBe(201);
		expect(getTicketResponse1.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect((getTicketResponse1.body as PostGetTicketResponseBody).ticket).toBeDefined();
		expect(typeof (getTicketResponse1.body as PostGetTicketResponseBody).ticket).toBe('object');
		expect(typeof (getTicketResponse1.body as PostGetTicketResponseBody).ticket.barCode).toBe('string');
		expect(typeof (getTicketResponse1.body as PostGetTicketResponseBody).ticket.dateOfIssuance).toBe('number');
		expect((getTicketResponse1.body as PostGetTicketResponseBody).ticket.barCode).toMatch(/^\d{16}$/);

		expect(getTicketResponse2.statusCode).toBe(201);
		expect(getTicketResponse2.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect((getTicketResponse2.body as PostGetTicketResponseBody).ticket).toBeDefined();
		expect(typeof (getTicketResponse2.body as PostGetTicketResponseBody).ticket).toBe('object');
		expect(typeof (getTicketResponse2.body as PostGetTicketResponseBody).ticket.barCode).toBe('string');
		expect(typeof (getTicketResponse2.body as PostGetTicketResponseBody).ticket.dateOfIssuance).toBe('number');
		expect((getTicketResponse2.body as PostGetTicketResponseBody).ticket.barCode).toMatch(/^\d{16}$/);

		expect((getTicketResponse1.body as PostGetTicketResponseBody).ticket.barCode).not.toBe((getTicketResponse2.body as PostGetTicketResponseBody).ticket.barCode);
	});
});

describe('POST /pay-ticket', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	describe('one payment', () => {
		it('should return the paymentDate and safe a payment in the database whereby the payment should reference the provided ticket', async () => {
			const paymentMethod = PaymentMethod.CASH;
			const getTicketResponse = await request(app).post("/get-ticket").send();
			const barCode = (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode;
			const payTicketResponse = await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode,
					},
					paymentMethod,
				}
				return requestBody;
			})());
			const paymentDate = (payTicketResponse.body as PostPayTicketResponseBody).paymentDate;

			expect(payTicketResponse.statusCode).toBe(201);
			expect(payTicketResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(paymentDate).toBeDefined();
			expect(typeof paymentDate).toBe('number');

			const ticketInstance = await TicketModel.findOne({
				where: {
					barCode,
				}
			});
			const paymentMethodInstance = await PaymentMethodModel.findOne({
				where: {
					name: paymentMethod,
				}
			});
			if (ticketInstance && paymentMethodInstance) {
				const payments = await ticketInstance.getPayments();
				expect(payments.length).toBe(1);
				expect(payments[0].dataValues.paymentDate.getTime()).toBe(paymentDate);
				expect(payments[0].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
				expect(payments[0].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
			}
			else {
				expect(ticketInstance).not.toBe(null);
				expect(paymentMethodInstance).not.toBe(null);
			}
		});
	});
	describe('multiple payments', () => {
		test('should return the paymentDate and safe a payments in the database whereby the payments should reference the provided ticket', async () => {
			const paymentMethod = PaymentMethod.CASH;
			const getTicketResponse = await request(app).post("/get-ticket").send();
			const barCode = (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode;
			const payTicketResponse0 = await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode,
					},
					paymentMethod: paymentMethod,
				};
				return requestBody;
			})());
			const payTicketResponse1 = await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode,
					},
					paymentMethod: paymentMethod,
				};
				return requestBody;
			})());
			const paymentDate0 = (payTicketResponse0.body as PostPayTicketResponseBody).paymentDate;
			const paymentDate1 = (payTicketResponse1.body as PostPayTicketResponseBody).paymentDate;

			expect(payTicketResponse0.statusCode).toBe(201);
			expect(payTicketResponse0.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(paymentDate0).toBeDefined();
			expect(typeof paymentDate0).toBe('number');

			expect(payTicketResponse1.statusCode).toBe(201);
			expect(payTicketResponse1.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect(paymentDate1).toBeDefined();
			expect(typeof paymentDate1).toBe('number');

			const ticketInstance = await TicketModel.findOne({
				where: {
					barCode,
				}
			});
			const paymentMethodInstance = await PaymentMethodModel.findOne({
				where: {
					name: paymentMethod,
				}
			});
			if (ticketInstance && paymentMethodInstance) {
				const payments = await ticketInstance.getPayments();
				expect(payments.length).toBe(2);
				expect(payments[0].dataValues.paymentDate.getTime()).toBe(paymentDate0);
				expect(payments[0].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
				expect(payments[0].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
				expect(payments[1].dataValues.paymentDate.getTime()).toBe(paymentDate1);
				expect(payments[1].dataValues.TicketId).toBe(ticketInstance.dataValues.id);
				expect(payments[1].dataValues.PaymentMethodId).toBe(paymentMethodInstance.dataValues.id);
			}
			else {
				expect(ticketInstance).not.toBe(null);
				expect(paymentMethodInstance).not.toBe(null);
			}
		});
	});
});

describe('POST /get-ticket-state', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('the ticket state of a newly issued ticket should be UNPAID', async () => {
		const getTicketResponse = await request(app).post("/get-ticket").send();
		const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
			const requestBody: PostGetTicketStateRequestBody = {
				barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
			};
			return requestBody;
		})());
		expect(getTicketStateResponse.statusCode).toBe(201);
		expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('UNPAID');
	});

	describe('one payment', () => {
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send();
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment: 15 min', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime()
				}
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					currentDate: new Date(2020, 2, 10, 3, 15, 0, 0).getTime(),
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be UNPAID if more than 15min have passed since the payment', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime()
				}
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					currentDate: new Date(2020, 2, 10, 3, 15, 1, 0).getTime(),
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('UNPAID');
		});
	});

	describe('multiple payments', () => {
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send();
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be PAID if not more than 15min have passed since the payment: 15 min', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime()
				}
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					currentDate: new Date(2020, 2, 10, 5, 15, 0, 0).getTime(),
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('PAID');
		});
		test('the ticket state of a paid ticket ticket should be UNPAID if more than 15min have passed since the payment', async () => {
			const getTicketResponse = await request(app).post("/get-ticket").send((() => {
				const requestBody: PostGetTicketRequestBody = {
					dateOfIssuance: (new Date(2020, 2, 10, 1, 0, 0, 0)).getTime()
				}
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 3, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					},
					paymentMethod: PaymentMethod.CASH,
					paymentDate: (new Date(2020, 2, 10, 5, 0, 0, 0)).getTime(),
				};
				return requestBody;
			})());
			const getTicketStateResponse = await request(app).post("/get-ticket-state").send((() => {
				const requestBody: PostGetTicketStateRequestBody = {
					barCode: (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode,
					currentDate: new Date(2020, 2, 10, 5, 15, 1, 0).getTime(),
				};
				return requestBody;
			})());
			expect(getTicketStateResponse.statusCode).toBe(201);
			expect(getTicketStateResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((getTicketStateResponse.body as PostGetTicketStateResponseBody).ticketState).toBe('UNPAID');
		});
	});
});

describe('POST /checkout-success', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('should destroy the ticket and with the ticket associated payments within the database', async () => {
		const getTicketResponse = await request(app).post("/get-ticket").send();
		const barCode = (getTicketResponse.body as PostGetTicketResponseBody).ticket.barCode;
		const ticketInstanceAfterGetTicket = await TicketModel.findOne({
			where: {
				barCode
			}
		});
		if (ticketInstanceAfterGetTicket) {
			const ticketId = ticketInstanceAfterGetTicket.dataValues.id;
			await request(app).post("/pay-ticket").send((() => {
				const requestBody: PostPayTicketRequestBody = {
					ticket: {
						barCode,
					},
					paymentMethod: PaymentMethod.CASH,
				};
				return requestBody;
			})());
			const checkoutSuccessResponse = await request(app).post("/checkout-success").send((() => {
				const requestBody: PostCheckoutSuccessRequestBody = {
					barCode
				};
				return requestBody;
			})());

			expect(checkoutSuccessResponse.statusCode).toBe(201);
			expect(checkoutSuccessResponse.headers['content-type']).toEqual(expect.stringContaining('json'));
			expect((checkoutSuccessResponse.body as PostCheckoutSuccessResponseBody).success).toBe(true);

			const ticketInstanceAfterCheckoutSuccess = await TicketModel.findOne({
				where: {
					barCode
				}
			});
			expect(ticketInstanceAfterCheckoutSuccess).toBe(null);
			const payments = await PaymentModel.findAll({
				where: {
					TicketId: ticketId
				}
			});
			expect(payments.length).toBe(0);
		}
		else {
			expect(ticketInstanceAfterGetTicket).not.toBe(null);
		}
	});
});