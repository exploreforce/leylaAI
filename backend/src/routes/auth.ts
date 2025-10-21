import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password, name, preferredLanguage } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const existing = await db('users').where({ email }).first();
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const accountId = uuidv4();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await db('accounts').insert({ id: accountId, name, created_at: new Date(), updated_at: new Date() });
  await db('users').insert({
    id: userId,
    account_id: accountId,
    email,
    password_hash: passwordHash,
    preferred_language: preferredLanguage || 'de',
    created_at: new Date(),
    updated_at: new Date(),
  });
  await db('account_members').insert({ id: uuidv4(), account_id: accountId, user_id: userId, role: 'owner', created_at: new Date() });

  // Copy bot config from admin account (susi@susi.com)
  try {
    console.log(`📋 [Signup] Copying bot config for new account: ${accountId}`);
    const adminUser = await db('users')
      .where('email', 'susi@susi.com')
      .first();
    
    if (adminUser) {
      const adminConfig = await db('bot_configs')
        .where('account_id', adminUser.account_id)
        .where('is_active', true)
        .first();
      
      if (adminConfig) {
        console.log(`✅ [Signup] Found admin config, copying to new account...`);
        await db('bot_configs').insert({
          id: uuidv4(),
          account_id: accountId,
          system_prompt: adminConfig.system_prompt,
          tone: adminConfig.tone,
          business_hours: adminConfig.business_hours,
          timezone: adminConfig.timezone,
          max_appointment_duration: adminConfig.max_appointment_duration,
          buffer_time: adminConfig.buffer_time,
          bot_name: adminConfig.bot_name,
          bot_description: adminConfig.bot_description,
          personality_tone: adminConfig.personality_tone,
          character_traits: adminConfig.character_traits,
          background_info: adminConfig.background_info,
          services_offered: adminConfig.services_offered,
          escalation_rules: adminConfig.escalation_rules,
          bot_limitations: adminConfig.bot_limitations,
          generated_system_prompt: adminConfig.generated_system_prompt,
          review_mode: adminConfig.review_mode,
          message_review_mode: adminConfig.message_review_mode,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ [Signup] Bot config copied successfully for account: ${accountId}`);
      } else {
        console.warn(`⚠️ [Signup] No admin bot config found, new account will start with empty config`);
      }
    } else {
      console.warn(`⚠️ [Signup] Admin user susi@susi.com not found, new account will start with empty config`);
    }
  } catch (error) {
    console.error(`❌ [Signup] Error copying bot config:`, error);
    // Don't fail signup if config copy fails
  }

  // Ensure account has a bot config (create default if copy failed)
  const existingConfig = await db('bot_configs')
    .where('account_id', accountId)
    .where('is_active', true)
    .first();

  if (!existingConfig) {
    console.log(`📝 [Signup] Creating default bot config for account: ${accountId}`);
    await db('bot_configs').insert({
      id: uuidv4(),
      account_id: accountId,
      system_prompt: 'Du bist ein hilfreicher AI-Assistent.',
      bot_name: 'AI Assistant',
      bot_description: 'Ein hilfreicher AI-Assistent',
      tone: 'friendly',
      personality_tone: 'friendly',
      character_traits: 'Hilfsbereit, geduldig, verständnisvoll',
      review_mode: 'never',
      message_review_mode: 'never',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`✅ [Signup] Default bot config created for account: ${accountId}`);
  }

  const token = jwt.sign({ userId, accountId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  return res.status(201).json({ token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await db('users').where({ email }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  
  // Update last_login timestamp
  await db('users').where('id', user.id).update({ last_login: new Date() });
  
  const token = jwt.sign({ userId: user.id, accountId: user.account_id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  return res.json({ token });
});

router.get('/me', requireAuth as any, async (req: AuthRequest, res) => {
  try {
    const user = await db('users')
      .select('id', 'account_id', 'email', 'preferred_language', 'role')
      .where('id', req.userId)
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      success: true,
      data: {
        userId: user.id,
        accountId: user.account_id,
        email: user.email,
        preferredLanguage: user.preferred_language,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


