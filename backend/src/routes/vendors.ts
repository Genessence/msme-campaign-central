import express from 'express';
import { query } from '../db';

export const router = express.Router();

// Get all vendors
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM vendors 
      ORDER BY created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get vendor by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT * FROM vendors 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create a new vendor
router.post('/', async (req, res, next) => {
  try {
    const { 
      vendorName, 
      vendorCode,
      email,
      phone,
      location,
      businessCategory,
      groupCategory,
      msmeCategory,
      msmeStatus,
      registrationDate,
      udyamNumber
    } = req.body;
    
    if (!vendorName || !vendorCode) {
      return res.status(400).json({ message: 'Vendor name and code are required' });
    }
    
    const result = await query(`
      INSERT INTO vendors (
        vendor_name, 
        vendor_code, 
        email, 
        phone, 
        location, 
        business_category,
        group_category,
        msme_category,
        msme_status,
        registration_date,
        udyam_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      vendorName,
      vendorCode,
      email,
      phone,
      location,
      businessCategory,
      groupCategory,
      msmeCategory,
      msmeStatus,
      registrationDate,
      udyamNumber
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update a vendor
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      vendorName, 
      email,
      phone,
      location,
      businessCategory,
      groupCategory,
      msmeCategory,
      msmeStatus,
      registrationDate,
      udyamNumber,
      openingBalance,
      closingBalance,
      creditAmount,
      debitAmount
    } = req.body;
    
    // Check if vendor exists
    const existingVendor = await query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (existingVendor.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    const result = await query(`
      UPDATE vendors 
      SET 
        vendor_name = COALESCE($1, vendor_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        location = COALESCE($4, location),
        business_category = COALESCE($5, business_category),
        group_category = COALESCE($6, group_category),
        msme_category = COALESCE($7, msme_category),
        msme_status = COALESCE($8, msme_status),
        registration_date = COALESCE($9, registration_date),
        udyam_number = COALESCE($10, udyam_number),
        opening_balance = COALESCE($11, opening_balance),
        closing_balance = COALESCE($12, closing_balance),
        credit_amount = COALESCE($13, credit_amount),
        debit_amount = COALESCE($14, debit_amount),
        last_updated_date = NOW(),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      vendorName,
      email,
      phone,
      location,
      businessCategory,
      groupCategory,
      msmeCategory,
      msmeStatus,
      registrationDate,
      udyamNumber,
      openingBalance,
      closingBalance,
      creditAmount,
      debitAmount,
      id
    ]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a vendor
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if vendor exists
    const existingVendor = await query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (existingVendor.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Delete vendor
    await query('DELETE FROM vendors WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get vendor responses
router.get('/:id/responses', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT r.*, c.name as campaign_name
      FROM msme_responses r
      JOIN msme_campaigns c ON r.campaign_id = c.id
      WHERE r.vendor_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});