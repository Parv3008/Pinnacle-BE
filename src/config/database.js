import mongoose from 'mongoose';
import { env } from './environment.js';

export const connectDatabase = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  console.log('MongoDB connected successfully');
};
