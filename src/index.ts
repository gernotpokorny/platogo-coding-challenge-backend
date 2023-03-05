// database
import { sequelize } from './shared/utils/database';

// models
import { Ticket } from './features/parking-garage/models/Ticket';
import { PaymentMethod } from './features/parking-garage/models/PaymentMethod';
import { Payment } from './features/parking-garage/models/Payment';

// routes
import { ticketsRouter } from './features/parking-garage/ParkingGarage.routes';

// utils
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});
app.use(ticketsRouter);

PaymentMethod.hasMany(Payment, {
	foreignKey: {
		allowNull: false,
	}
});
Payment.belongsTo(PaymentMethod);

Ticket.hasMany(Payment);
Payment.belongsTo(Ticket);

(async () => {
	try {
		await sequelize.sync(); // Use `{ force: true }` as options in order to update Associations. This will then drop and recreate the table.
		const paymentMethod = await PaymentMethod.findByPk(1);
		if (!paymentMethod) {
			await PaymentMethod.create({ name: 'CASH' });
			await PaymentMethod.create({ name: 'CREDIT_CARD' });
			await PaymentMethod.create({ name: 'DEBIT_CARD' });
		}
		app.listen(3001);
	} catch (error) {
		console.error(error);
	}
})();
