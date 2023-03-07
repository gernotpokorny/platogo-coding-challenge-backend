// database
import { sequelize } from './shared/utils/database';

// models
import { Ticket as TicketModel } from './features/parking-garage/models/Ticket';
import { PaymentMethod as PaymentMethodModel } from './features/parking-garage/models/PaymentMethod';
import { Payment as PaymentModel } from './features/parking-garage/models/Payment';

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

PaymentMethodModel.hasMany(PaymentModel, {
	foreignKey: {
		allowNull: false,
	}
});
PaymentModel.belongsTo(PaymentMethodModel);

TicketModel.hasMany(PaymentModel);
PaymentModel.belongsTo(TicketModel);

(async () => {
	try {
		await sequelize.sync(); // Use `{ force: true }` as options in order to update Associations. This will then drop and recreate the table.
		const paymentMethod = await PaymentMethodModel.findByPk(1);
		if (!paymentMethod) {
			await PaymentMethodModel.create({ name: 'CASH' });
			await PaymentMethodModel.create({ name: 'CREDIT_CARD' });
			await PaymentMethodModel.create({ name: 'DEBIT_CARD' });
		}
		if (process.env.NODE_ENV !== 'test') {
			app.listen(3001);
		}
	} catch (error) {
		console.error(error);
	}
})();

export default app;