import express from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db';

export const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload document
router.post('/document', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { campaignId, vendorId } = req.body;

    const result = await query(`
      INSERT INTO document_uploads (
        campaign_id, 
        vendor_id, 
        file_type, 
        file_size, 
        file_name, 
        file_path
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      campaignId || null,
      vendorId || null,
      req.file.mimetype,
      req.file.size,
      req.file.originalname,
      req.file.path
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get upload logs
router.get('/logs', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM upload_logs
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Clear upload logs
router.delete('/logs', async (req, res, next) => {
  try {
    await query(`DELETE FROM upload_logs`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Create upload log entry
router.post('/logs', async (req, res, next) => {
  try {
    const { 
      uploadSessionId,
      vendorName,
      vendorCode,
      errorType,
      errorDetails,
      rawData
    } = req.body;

    const result = await query(`
      INSERT INTO upload_logs (
        upload_session_id,
        vendor_name,
        vendor_code,
        error_type,
        error_details,
        raw_data,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      uploadSessionId,
      vendorName,
      vendorCode,
      errorType,
      errorDetails,
      rawData,
      req.user?.userId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});