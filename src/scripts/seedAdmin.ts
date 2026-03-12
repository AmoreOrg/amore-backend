/**
 * Seed script — populates the database with RBAC roles, permissions,
 * and a default SUPER_ADMIN account.
 *
 * Usage:  npx ts-node-dev src/scripts/seedAdmin.ts
 *    or:  npx tsx src/scripts/seedAdmin.ts
 *
 * Safe to run multiple times — skips existing entries.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { Permission } from '../models/Permission';
import { Role } from '../models/Role';
import { AdminUser } from '../models/AdminUser';
import { PERMISSIONS, ROLES } from '../config/permissions';

const SALT_ROUNDS = 12;

async function seedAdmin() {
  console.log('🌱 Connecting to MongoDB …');
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to', config.mongoUri);

  // ─── 1. Seed Permissions ───────────────────────────────────────────
  console.log('\n📋 Seeding permissions …');
  let permCreated = 0;
  let permSkipped = 0;

  for (const perm of PERMISSIONS) {
    const exists = await Permission.findOne({ code: perm.code });
    if (exists) {
      permSkipped++;
      continue;
    }
    await Permission.create(perm);
    permCreated++;
  }
  console.log(`   ✅ Permissions: ${permCreated} created, ${permSkipped} skipped (already exist)`);

  // ─── 2. Seed Roles ────────────────────────────────────────────────
  console.log('\n🎭 Seeding roles …');
  let roleCreated = 0;
  let roleSkipped = 0;

  for (const roleDef of ROLES) {
    const exists = await Role.findOne({ slug: roleDef.slug });
    if (exists) {
      // Update permissions for existing roles to stay in sync
      const permIds = await Permission.find({ code: { $in: roleDef.permissions } }).distinct('_id');
      exists.permissions = permIds;
      exists.name = roleDef.name;
      exists.description = roleDef.description;
      await exists.save();
      console.log(`   🔄 Updated role: ${roleDef.slug} (${permIds.length} permissions)`);
      roleSkipped++;
      continue;
    }

    const permIds = await Permission.find({ code: { $in: roleDef.permissions } }).distinct('_id');
    await Role.create({
      name: roleDef.name,
      slug: roleDef.slug,
      description: roleDef.description,
      permissions: permIds,
      isSystem: true,
    });
    console.log(`   ✅ Created role: ${roleDef.slug} (${permIds.length} permissions)`);
    roleCreated++;
  }
  console.log(`   Roles: ${roleCreated} created, ${roleSkipped} updated`);

  // ─── 3. Create Default Super Admin ────────────────────────────────
  console.log('\n👤 Creating default Super Admin …');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@amore.in';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@1234';
  const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const existingAdmin = await AdminUser.findOne({ email: superAdminEmail });
  if (existingAdmin) {
    console.log(`   ⏭️  Super Admin already exists: ${superAdminEmail}`);
  } else {
    const superAdminRole = await Role.findOne({ slug: 'SUPER_ADMIN' });
    if (!superAdminRole) {
      console.error('   ❌ SUPER_ADMIN role not found! Something went wrong.');
    } else {
      const hashedPassword = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);
      await AdminUser.create({
        name: superAdminName,
        email: superAdminEmail,
        password: hashedPassword,
        role: superAdminRole._id,
        isActive: true,
      });
      console.log(`   ✅ Super Admin created: ${superAdminEmail}`);
      console.log(`   🔑 Password: ${superAdminPassword}`);
      console.log(`   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!`);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  SEED COMPLETE — RBAC System Initialized');
  console.log('═'.repeat(60));

  const totalPerms = await Permission.countDocuments();
  const totalRoles = await Role.countDocuments();
  const totalAdmins = await AdminUser.countDocuments();

  console.log(`  📋 Permissions: ${totalPerms}`);
  console.log(`  🎭 Roles:       ${totalRoles}`);
  console.log(`  👤 Admins:      ${totalAdmins}`);
  console.log('═'.repeat(60));

  console.log('\n📊 Role → Permission Mapping:');
  const roles = await Role.find().populate('permissions');
  for (const role of roles) {
    const perms = (role.permissions as any[]).map((p) => p.code);
    console.log(`  ${role.slug}: ${perms.length} permissions`);
    if (role.slug !== 'SUPER_ADMIN') {
      console.log(`    → ${perms.join(', ')}`);
    } else {
      console.log(`    → ALL PERMISSIONS (${perms.length})`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
