import express from 'express';
import cors from 'cors';
import userRoutes from './routes/users';
import tripsRouter from './routes/trips';
import invitesRouter from "./routes/invites";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: 'http://localhost:8080', credentials: true }));
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/trips', tripsRouter);
app.use("/api/invites", invitesRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});