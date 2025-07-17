import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { router as authRoutes } from './routes/auth';
import { router as campaignRoutes } from './routes/campaigns';
import { router as vendorRoutes } from './routes/vendors';
import { router as templateRoutes } from './routes/templates';
import { router as uploadRoutes } from './routes/uploads';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Basic security and utility middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/vendors', authenticateToken, vendorRoutes);
app.use('/api/templates', authenticateToken, templateRoutes);
app.use('/api/uploads', authenticateToken, uploadRoutes);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});