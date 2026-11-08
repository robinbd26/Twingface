import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import {
  describePasswordPolicy,
  loadSuperAdminPassword,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_USERNAME,
} from './super-admin-credentials.ts';

const prisma = new PrismaClient();

async function main() {
  const { password, source, trimmed } = loadSuperAdminPassword();

  if (trimmed) {
    console.warn(
      '! SUPER_ADMIN_PASSWORD had leading/trailing whitespace, which was removed.',
    );
    console.warn('  The account is being seeded with the trimmed value.');
  }

  const policyProblems = describePasswordPolicy(password);
  if (policyProblems.length > 0) {
    console.warn(`! SUPER_ADMIN_PASSWORD should ${policyProblems.join(', ')}.`);
  }

  const usernameOwner = await prisma.user.findUnique({
    where: { username: SUPER_ADMIN_USERNAME },
    select: { id: true, email: true },
  });
  if (usernameOwner && usernameOwner.email !== SUPER_ADMIN_EMAIL) {
    throw new Error('The admin username is already assigned to another account.');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { name: 'Super Admin', username: SUPER_ADMIN_USERNAME, passwordHash, role: 'SUPER_ADMIN' },
    create: {
      name: 'Super Admin',
      username: SUPER_ADMIN_USERNAME,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    select: { username: true, role: true },
  });

  console.log(`Super Admin account ready: ${user.username} (${user.role})`);
  console.log('Sign in at /login with any of these identifiers:');
  console.log(`  - User ID: ${user.username}`);
  console.log(`  - Email:   ${SUPER_ADMIN_EMAIL}`);
  console.log(`Password: the SUPER_ADMIN_PASSWORD value from your .env (${source}, not shown here).`);
  console.log('Run `npm run db:verify:super-admin` to confirm the credentials work.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

