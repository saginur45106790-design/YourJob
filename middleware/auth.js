import jwt from 'jsonwebtoken';
import { readDB } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shoppro_super_secret_jwt_key_2026_production';

export const verifyAccess = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'অনুগ্রহ করে প্রথমে একাউন্টে লগইন করুন।' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = readDB();
    const user = db.users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
    }

    const now = new Date();
    const trialEnds = new Date(user.trialEndsAt);
    const isTrialActive = now < trialEnds;

    // পেইড সাবস্ক্রিপশন চেক
    const sub = db.subscriptions.find(s => s.userId === user.id && s.status === 'ACTIVE');
    const isSubActive = sub && new Date(sub.endDate) > now;

    // ১. ট্রায়াল সচল থাকলে এক্সেস দেওয়া হবে
    if (isTrialActive) {
      req.user = user;
      req.accessStatus = 'TRIAL';
      req.remainingHours = Math.max(0, ((trialEnds - now) / (1000 * 60 * 60)).toFixed(1));
      return next();
    }

    // ২. পেইড সাবস্ক্রিপশন থাকলে এক্সেস দেওয়া হবে
    if (isSubActive) {
      req.user = user;
      req.accessStatus = 'PREMIUM';
      req.subscription = sub;
      return next();
    }

    // ৩. ট্রায়াল শেষ এবং সাবস্ক্রিপশন না থাকলে ব্লক করা হবে
    return res.status(403).json({
      error: 'TRIAL_EXPIRED',
      message: 'আপনার ২৪ ঘণ্টার ফ্রি ট্রায়াল শেষ হয়েছে। সেবাটি অব্যাহত রাখতে সাপ্তাহিক ($২), মাসিক ($৫) বা বাৎসরিক ($৫০) প্ল্যান গ্রহণ করুন।'
    });

  } catch (err) {
    return res.status(401).json({ error: 'সেশন শেষ হয়েছে, পুনরায় লগইন করুন।' });
  }
};
