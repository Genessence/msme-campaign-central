import express from 'express';
import { query } from '../db';
import { sendCampaignEmail } from '../services/emailService';
import { sendCampaignWhatsApp } from '../services/whatsappService';

export const router = express.Router();

// Get all campaigns
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM campaign_email_sends WHERE campaign_id = c.id) as emails_sent,
        (SELECT COUNT(*) FROM msme_responses WHERE campaign_id = c.id) as total_responses,
        (SELECT COUNT(*) FROM msme_responses WHERE campaign_id = c.id AND response_status = 'Submitted') as submitted_responses
      FROM msme_campaigns c
      ORDER BY c.created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get campaign by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM campaign_email_sends WHERE campaign_id = c.id) as emails_sent,
        (SELECT COUNT(*) FROM msme_responses WHERE campaign_id = c.id) as total_responses,
        (SELECT COUNT(*) FROM msme_responses WHERE campaign_id = c.id AND response_status = 'Submitted') as submitted_responses
      FROM msme_campaigns c
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create a new campaign
router.post('/', async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      deadline, 
      targetVendors, 
      emailTemplateId, 
      whatsappTemplateId 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Campaign name is required' });
    }
    
    const result = await query(`
      INSERT INTO msme_campaigns (
        name, 
        description, 
        deadline, 
        target_vendors, 
        email_template_id, 
        whatsapp_template_id,
        created_by
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `, [
      name, 
      description, 
      deadline, 
      targetVendors || [], 
      emailTemplateId, 
      whatsappTemplateId,
      req.user?.userId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update a campaign
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      deadline, 
      status,
      targetVendors, 
      emailTemplateId, 
      whatsappTemplateId 
    } = req.body;
    
    // Check if campaign exists
    const existingCampaign = await query('SELECT * FROM msme_campaigns WHERE id = $1', [id]);
    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    const result = await query(`
      UPDATE msme_campaigns 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        deadline = COALESCE($3, deadline),
        status = COALESCE($4, status),
        target_vendors = COALESCE($5, target_vendors),
        email_template_id = COALESCE($6, email_template_id),
        whatsapp_template_id = COALESCE($7, whatsapp_template_id),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      name, 
      description, 
      deadline, 
      status,
      targetVendors, 
      emailTemplateId, 
      whatsappTemplateId,
      id
    ]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a campaign
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if campaign exists
    const existingCampaign = await query('SELECT * FROM msme_campaigns WHERE id = $1', [id]);
    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Delete campaign
    await query('DELETE FROM msme_campaigns WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Execute a campaign
router.post('/:id/execute', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get campaign details
    const campaignResult = await query(`
      SELECT c.*, 
        e.id as email_template_id, e.subject as email_subject, e.body as email_body, e.variables as email_variables,
        w.id as whatsapp_template_id, w.content as whatsapp_content, w.variables as whatsapp_variables
      FROM msme_campaigns c
      LEFT JOIN email_templates e ON c.email_template_id = e.id
      LEFT JOIN whatsapp_templates w ON c.whatsapp_template_id = w.id
      WHERE c.id = $1
    `, [id]);
    
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    const campaign = campaignResult.rows[0];
    
    // Get target vendors
    const vendorResult = await query(`
      SELECT * FROM vendors
      WHERE id = ANY($1::uuid[])
    `, [campaign.target_vendors]);
    
    const vendors = vendorResult.rows;
    
    const emailsSent = [];
    const whatsappsSent = [];
    const errors = [];
    
    // Process each vendor
    for (const vendor of vendors) {
      try {
        // Create response record if it doesn't exist
        const responseExists = await query(
          'SELECT id FROM msme_responses WHERE campaign_id = $1 AND vendor_id = $2',
          [campaign.id, vendor.id]
        );
        
        if (responseExists.rows.length === 0) {
          await query(
            'INSERT INTO msme_responses (campaign_id, vendor_id) VALUES ($1, $2)',
            [campaign.id, vendor.id]
          );
        }
        
        // Send email if template exists
        if (campaign.email_template_id && vendor.email) {
          await sendCampaignEmail(campaign, vendor);
          
          // Record email send
          await query(
            'INSERT INTO campaign_email_sends (campaign_id, vendor_id, email_type) VALUES ($1, $2, $3)',
            [campaign.id, vendor.id, 'campaign']
          );
          
          emailsSent.push(vendor.email);
        }
        
        // Send WhatsApp if template exists
        if (campaign.whatsapp_template_id && vendor.phone) {
          await sendCampaignWhatsApp(campaign, vendor);
          whatsappsSent.push(vendor.phone);
        }
      } catch (error: any) {
        errors.push({
          vendor: vendor.vendor_name,
          error: error.message
        });
      }
    }
    
    // Update campaign status to Active
    await query(
      'UPDATE msme_campaigns SET status = $1, updated_at = NOW() WHERE id = $2',
      ['Active', campaign.id]
    );
    
    res.status(200).json({
      message: 'Campaign executed successfully',
      emailsSent: emailsSent.length,
      whatsappsSent: whatsappsSent.length,
      errors
    });
  } catch (error) {
    next(error);
  }
});

// Get campaign responses
router.get('/:id/responses', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT r.*, v.vendor_name, v.vendor_code, v.email, v.phone
      FROM msme_responses r
      JOIN vendors v ON r.vendor_id = v.id
      WHERE r.campaign_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});