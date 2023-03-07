import request from 'supertest';
import app from './index';

describe('POST /get-ticket', () => {
	beforeAll(async () => {
		await new Promise(r => setTimeout(r, 2000)); // jest does not support top level awaits. Therefore I cannot await the async code within `index.ts`.
	});

	it('should return a new barcode', async () => {
		const response = await request(app).post("/get-ticket").send();
		expect(response.statusCode).toBe(201);
		expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(response.body.ticket).toBeDefined();
		expect(typeof response.body.ticket).toBe('object');
		expect(typeof response.body.ticket.barCode).toBe('string');
		expect(typeof response.body.ticket.dateOfIssuance).toBe('number');
		expect(response.body.ticket.barCode).toMatch(/^\d{16}$/);
	});

	it('should return a new barcode different then the previous one', async () => {
		const response1 = await request(app).post("/get-ticket").send();
		const response2 = await request(app).post("/get-ticket").send();

		expect(response1.statusCode).toBe(201);
		expect(response1.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(response1.body.ticket).toBeDefined();
		expect(typeof response1.body.ticket).toBe('object');
		expect(typeof response1.body.ticket.barCode).toBe('string');
		expect(typeof response1.body.ticket.dateOfIssuance).toBe('number');
		expect(response1.body.ticket.barCode).toMatch(/^\d{16}$/);

		expect(response2.statusCode).toBe(201);
		expect(response2.headers['content-type']).toEqual(expect.stringContaining('json'));
		expect(response2.body.ticket).toBeDefined();
		expect(typeof response2.body.ticket).toBe('object');
		expect(typeof response2.body.ticket.barCode).toBe('string');
		expect(typeof response2.body.ticket.dateOfIssuance).toBe('number');
		expect(response2.body.ticket.barCode).toMatch(/^\d{16}$/);

		expect(response1.body.ticket.barCode).not.toBe(response2.body.ticket.barCode);
	});
});
