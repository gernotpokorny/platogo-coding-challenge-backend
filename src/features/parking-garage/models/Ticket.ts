import { sequelize } from '../../../shared/utils/database';

// models
import { Payment } from './Payment';

// types
import { Model, DataTypes, CreationOptional, InferAttributes, InferCreationAttributes, HasManyCreateAssociationMixin } from 'sequelize';

export class Ticket extends Model<InferAttributes<Ticket>, InferCreationAttributes<Ticket>> {
	declare id: CreationOptional<number>;
	declare barCode: string;
	declare dateOfIssuance: number;

	declare createPayment: HasManyCreateAssociationMixin<Payment>;
}

Ticket.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		barCode: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		dateOfIssuance: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
	},
	{
		sequelize,
		tableName: 'tickets'
	}
);