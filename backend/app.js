import express from 'express';
import loginRouter from './route.js';
import { sql, poolPromise } from './db.js';
import employeeRouter from './employeeRouter.js';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true,
}));

app.use(express.json());

app.get('/test', (req, res) => {
  res.send('Server is working');
});

app.use(loginRouter);
app.use('/api', employeeRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});