import express from 'express';
import { query } from '../db';

export const router = express.Router();

// Get all email templates
router.get('/email', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT t.*, u.full_name as creator_name,
      (
        SELECT COUNT(*) FROM msme_campaigns
        WHERE email_template_id = t.id AND status = 'Active'
      ) as active_campaigns_count
      FROM email_templates t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get email template by ID
router.get('/email/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT t.*, u.full_name as creator_name
      FROM email_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email template not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create a new email template
router.post('/email', async (req, res, next) => {
  try {
    const { name, subject, body, variables } = req.body;
    
    if (!name || !subject || !body) {
      return res.status(400).json({ message: 'Name, subject and body are required' });
    }
    
    const result = await query(`
      INSERT INTO email_templates (name, subject, body, variables, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, subject, body, variables || [], req.user?.userId]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update an email template
router.put('/email/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, subject, body, variables } = req.body;
    
    // Check if template exists
    const existingTemplate = await query('SELECT * FROM email_templates WHERE id = $1', [id]);
    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({ message: 'Email template not found' });
    }
    
    const result = await query(`
      UPDATE email_templates
      SET 
        name = COALESCE($1, name),
        subject = COALESCE($2, subject),
        body = COALESCE($3, body),
        variables = COALESCE($4, variables),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, subject, body, variables, id]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete an email template
router.delete('/email/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if template exists
    const existingTemplate = await query('SELECT * FROM email_templates WHERE id = $1', [id]);
    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({ message: 'Email template not found' });
    }
    
    // Check if template is used in active campaigns
    const activeUsage = await query(`
      SELECT COUNT(*) FROM msme_campaigns
      WHERE email_template_id = $1 AND status = 'Active'
    `, [id]);
    
    if (parseInt(activeUsage.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete template as it is being used in active campaigns' 
      });
    }

    // Clear template references from completed campaigns
    await query(`
      UPDATE msme_campaigns
      SET email_template_id = null
      WHERE email_template_id = $1 AND status != 'Active'
    `, [id]);
    
    // Delete template
    await query('DELETE FROM email_templates WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get all WhatsApp templates
router.get('/whatsapp', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT t.*, u.full_name as creator_name,
      (
        SELECT COUNT(*) FROM msme_campaigns
        WHERE whatsapp_template_id = t.id AND status = 'Active'
      ) as active_campaigns_count
      FROM whatsapp_templates t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get WhatsApp template by ID
router.get('/whatsapp/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT t.*, u.full_name as creator_name
      FROM whatsapp_templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'WhatsApp template not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create a new WhatsApp template
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { name, content, variables } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ message: 'Name and content are required' });
    }
    
    const result = await query(`
      INSERT INTO whatsapp_templates (name, content, variables, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, content, variables || [], req.user?.userId]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update a WhatsApp template
router.put('/whatsapp/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, content, variables } = req.body;
    
    // Check if template exists
    const existingTemplate = await query('SELECT * FROM whatsapp_templates WHERE id = $1', [id]);
    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({ message: 'WhatsApp template not found' });
    }
    
    const result = await query(`
      UPDATE whatsapp_templates
      SET 
        name = COALESCE($1, name),
        content = COALESCE($2, content),
        variables = COALESCE($3, variables),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, content, variables, id]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a WhatsApp template
router.delete('/whatsapp/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if template exists
    const existingTemplate = await query('SELECT * FROM whatsapp_templates WHERE id = $1', [id]);
    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({ message: 'WhatsApp template not found' });
    }
    
    // Check if template is used in active campaigns
    const activeUsage = await query(`
      SELECT COUNT(*) FROM msme_campaigns
      WHERE whatsapp_template_id = $1 AND status = 'Active'
    `, [id]);
    
    if (parseInt(activeUsage.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete template as it is being used in active campaigns' 
      });
    }

    // Clear template references from completed campaigns
    await query(`
      UPDATE msme_campaigns
      SET whatsapp_template_id = null
      WHERE whatsapp_template_id = $1 AND status != 'Active'
    `, [id]);
    
    // Delete template
    await query('DELETE FROM whatsapp_templates WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});