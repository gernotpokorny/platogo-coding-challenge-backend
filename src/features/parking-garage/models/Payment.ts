import { sequelize } from '../../../shared/utils/database';

// models
import { PaymentMethod } from './PaymentMethod';

// types
import { DataTypes, Model, CreationOptional, InferAttributes, InferCreationAttributes, ForeignKey } from 'sequelize';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
	declare id: CreationOptional<number>;
	declare paymentDate: Date;
	declare PaymentMethodId: ForeignKey<PaymentMethod['id']>;
}

Payment.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		paymentDate: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	},
	{
		sequelize,
		tableName: 'payments'
	}
);