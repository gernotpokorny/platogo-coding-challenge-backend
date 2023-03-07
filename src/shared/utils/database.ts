import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'data/database.sqlite',
	logging: process.env.NODE_ENV !== 'test' ? true : false,
	logQueryParameters: true,
});