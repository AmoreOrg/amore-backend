/**
 * Seed script — populates the database with random expert girls
 * (caller profiles) along with bio, pricing, and wallet data.
 *
 * Usage:  npx ts-node-dev src/scripts/seed.ts
 *    or:  npx ts-node src/scripts/seed.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User } from '../models/User';
import { CallerProfile } from '../models/CallerProfile';
import { Wallet } from '../models/Wallet';

/* ------------------------------------------------------------------ */
/*  Random-data helpers                                                */
/* ------------------------------------------------------------------ */

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T>(arr: T[], min: number, max: number): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

/* ------------------------------------------------------------------ */
/*  Data pools                                                         */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Aaradhya', 'Ananya', 'Diya', 'Ishita', 'Kavya', 'Meera', 'Myra',
  'Nisha', 'Priya', 'Riya', 'Saanvi', 'Sana', 'Tanya', 'Zara', 'Pooja',
  'Aisha', 'Kiara', 'Sneha', 'Divya', 'Neha', 'Simran', 'Ira', 'Avni',
  'Aditi', 'Kriti', 'Sakshi', 'Tanvi', 'Jiya', 'Anushka', 'Palak',
  'Radhika', 'Shreya', 'Mansi', 'Nikita', 'Ritika', 'Swati', 'Komal',
  'Anamika', 'Bhavna', 'Chitra',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Reddy', 'Nair',
  'Kapoor', 'Joshi', 'Mehta', 'Chopra', 'Malhotra', 'Iyer', 'Das',
  'Bhat', 'Rao', 'Agarwal', 'Kulkarni', 'Deshmukh', 'Pillai',
];

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
  'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu',
];

const EXPERTISE_POOL = [
  'Relationship Advice', 'Tarot Reading', 'Astrology', 'Life Coaching',
  'Career Guidance', 'Mental Wellness', 'Fitness & Nutrition',
  'Love & Dating', 'Breakup Recovery', 'Spirituality', 'Meditation',
  'Vedic Astrology', 'Numerology', 'Dream Interpretation',
  'Self Confidence', 'Stress Management', 'Emotional Support',
  'Marriage Counseling', 'Personal Growth', 'Motivational Coaching',
];

const EXPERIENCE_OPTIONS = [
  '6 months', '1 year', '2 years', '3 years', '4 years',
  '5 years', '6+ years', '8+ years', '10+ years',
];

const BIO_TEMPLATES = [
  `Hi, I'm {{name}}! 🌸 I specialize in {{expertise}} and love helping people find clarity in their lives. With {{exp}} of experience, I bring warmth and deep insight to every conversation.`,
  `Hey there! I'm {{name}} — a passionate {{expertise}} expert. I've spent {{exp}} guiding people through their toughest moments. Let's chat and bring some light into your day! ✨`,
  `Welcome! I'm {{name}}, and I believe everyone deserves to be heard. My background in {{expertise}} ({{exp}}) helps me offer thoughtful, personalized guidance. Talk to me anytime 💜`,
  `I'm {{name}}, your go-to expert for {{expertise}}. With {{exp}} under my belt, I've helped hundreds of people navigate life's challenges. Can't wait to connect with you! 🌟`,
  `Namaste! I'm {{name}} 🙏 Certified in {{expertise}} with {{exp}} of hands-on experience. My approach is compassionate, non-judgmental, and results-oriented. Let's grow together.`,
  `Hello! I'm {{name}} — a friendly voice who truly cares. I focus on {{expertise}} and have been doing this for {{exp}}. Whether you need advice or just someone to listen, I'm here for you 💕`,
  `Hey! {{name}} here. I've dedicated {{exp}} to mastering {{expertise}}. My clients say I'm easy to talk to and genuinely insightful. Book a call and see for yourself! 😊`,
  `I'm {{name}}, and helping people is my passion. Skilled in {{expertise}}, I combine {{exp}} of knowledge with an empathetic ear. Let's figure things out together 🌻`,
];

const AVATAR_STYLES = [
  // Placeholder avatar URLs using DiceBear / UI Avatars style
  (name: string, i: number) =>
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}-${i}&style=circle`,
];

/* ------------------------------------------------------------------ */
/*  Generate one expert caller                                         */
/* ------------------------------------------------------------------ */

interface SeedCaller {
  user: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'caller';
    avatar: string;
    languages: string[];
    dob: Date;
    isActive: boolean;
    isPhoneVerified: boolean;
  };
  profile: {
    bio: string;
    languages: string[];
    expertise: string[];
    experience: string;
    pricePerMinute: number;
    isOnline: boolean;
    rating: number;
    totalCalls: number;
    totalEarnings: number;
  };
}

function generateCaller(index: number): SeedCaller {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const slug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`;
  const email = `${slug}@amore-seed.in`;
  const phone = `+91${randBetween(7000000000, 9999999999)}`;
  const languages = pickN(LANGUAGES, 1, 4);
  const expertise = pickN(EXPERTISE_POOL, 2, 5);
  const experience = pick(EXPERIENCE_OPTIONS);

  // Price tiers: budget ₹3-10, mid ₹10-30, premium ₹30-80
  const tier = Math.random();
  let pricePerMinute: number;
  if (tier < 0.4) pricePerMinute = randBetween(3, 10);
  else if (tier < 0.8) pricePerMinute = randBetween(10, 30);
  else pricePerMinute = randBetween(30, 80);

  const rating = randFloat(3.5, 5.0, 1);
  const totalCalls = randBetween(0, 1200);
  const totalEarnings = totalCalls * pricePerMinute * randBetween(2, 8); // rough estimate

  const bio = pick(BIO_TEMPLATES)
    .replace(/{{name}}/g, firstName)
    .replace(/{{expertise}}/g, expertise.slice(0, 2).join(' & '))
    .replace(/{{exp}}/g, experience);

  const avatar = AVATAR_STYLES[0](name, index);

  // Random DOB between 20-35 years old
  const now = new Date();
  const age = randBetween(20, 35);
  const dob = new Date(now.getFullYear() - age, randBetween(0, 11), randBetween(1, 28));

  return {
    user: {
      name,
      email,
      phone,
      password: 'Seed@1234', // will be hashed below
      role: 'caller',
      avatar,
      languages,
      dob,
      isActive: true,
      isPhoneVerified: true,
    },
    profile: {
      bio,
      languages,
      expertise,
      experience,
      pricePerMinute,
      isOnline: Math.random() > 0.4, // ~60 % online
      rating,
      totalCalls,
      totalEarnings,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Main seed function                                                 */
/* ------------------------------------------------------------------ */

const SEED_COUNT = 50; // number of expert girls to create

async function seed() {
  console.log('🌱 Connecting to MongoDB …');
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to', config.mongoUri);

  // Hash the shared password once
  const hashedPassword = await bcrypt.hash('Seed@1234', 12);

  const callers: SeedCaller[] = Array.from({ length: SEED_COUNT }, (_, i) =>
    generateCaller(i + 1),
  );

  console.log(`🚀 Seeding ${SEED_COUNT} expert callers …`);

  let created = 0;
  let skipped = 0;

  for (const caller of callers) {
    try {
      // Check if email or phone already exists
      const exists = await User.findOne({
        $or: [{ email: caller.user.email }, { phone: caller.user.phone }],
      });

      if (exists) {
        skipped++;
        continue;
      }

      // 1. Create User
      const user = await User.create({
        ...caller.user,
        password: hashedPassword,
      });

      // 2. Create CallerProfile
      await CallerProfile.create({
        userId: user._id,
        ...caller.profile,
      });

      // 3. Create Wallet (starting balance ₹0)
      await Wallet.create({
        userId: user._id,
        balance: 0,
        currency: 'INR',
      });

      created++;
    } catch (err: any) {
      // Duplicate key or validation error — skip gracefully
      if (err.code === 11000) {
        skipped++;
      } else {
        console.error(`❌ Error seeding ${caller.user.name}:`, err.message);
      }
    }
  }

  console.log(`\n✅ Seed complete — ${created} created, ${skipped} skipped (duplicates).`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
