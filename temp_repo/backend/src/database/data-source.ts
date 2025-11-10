import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from './models/User';
import { ProjectRelation } from './models/ProjectRelation';
import { SharedCredential } from './models/SharedCredential';
import { SharedWorkflow } from './models/SharedWorkflow';
import { InstanceSettings } from './models/InstanceSettings';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'silhouette.db',
  synchronize: true, // Only for development! Use migrations for production
  logging: false,
  entities: [
    User,
    ProjectRelation,
    SharedCredential,
    SharedWorkflow,
    InstanceSettings
  ],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const closeDatabase = async () => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

// Initialize on module load
initializeDatabase().catch(console.error);