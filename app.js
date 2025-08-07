import express from 'express';
import loginRouter from './route.js';
import { sql, poolPromise } from './db.js';
import employeeRouter from './employeeRouter.js';
import cors from 'cors';
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true,
}));

app.use(express.json());

app.get('/test', (req, res) => {
  res.send('Server is working');
});

app.use(loginRouter);
app.use('/api', employeeRouter);

app.listen(8080, () => {
  console.log('Server running on port 8080');
});