/**
 * Reports whether the Super Admin credentials currently work.
 *
 * This exists because a failed Super Admin sign-in always shows the same
 * generic "invalid credentials" message. That is deliberate (it stops an
 * attacker from discovering which accounts exist), but it also means a
 * wrong password, a stale database row, and a password with stray whitespace
 * are indistinguishable from the login screen. This script removes the
 * guesswork by checking the real stored hash directly.
 *
 * Usage: `npm run db:verify:super-admin`
 */

import { PrismaClient } from '@prisma/client';
import {
  describePasswordPolicy,
  loadSuperAdminPassword,
  SUPER_ADMIN_EMAIL,
  verifySuperAdminCredentials,
} from './super-admin-credentials.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('Super Admin credential check\n');

  let expected: string;
  let trimmed = false;
  try {
    const loaded = loadSuperAdminPassword();
    expected = loaded.password;
    trimmed = loaded.trimmed;
  } catch (error) {
    console.error(`x ${error instanceof Error ? error.message : String(error)}`);
    console.error('\nThe Super Admin account has not been seeded yet. Run:');
    console.error('  npm run db:seed:super-admin');
    process.exitCode = 1;
    return;
  }

  if (trimmed) {
    console.warn('! SUPER_ADMIN_PASSWORD contains leading/trailing whitespace.');
    console.warn('  The stored account was seeded with the trimmed value, which is what you must type.');
  }

  const policyProblems = describePasswordPolicy(expected);
  if (policyProblems.length > 0) {
    console.warn(`! SUPER_ADMIN_PASSWORD should ${policyProblems.join(', ')}.`);
  }

  const account = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
    select: { username: true, email: true, role: true, passwordHash: true },
  });

  const result = await verifySuperAdminCredentials(expected, account, trimmed);

  if (result.account) {
    console.log(`Identifier (User ID): ${result.account.username}`);
    console.log(`Identifier (email):   ${result.account.email}`);
  }
  console.log('Password source:      SUPER_ADMIN_PASSWORD in your .env');

  switch (result.status) {
    case 'ok':
      console.log('\nOK  The .env password matches the stored account. Sign-in should work.');
      console.log(`    ${result.remedy}`);
      return;
    case 'not-seeded':
      console.error(`\nx  No Super Admin account found for ${SUPER_ADMIN_EMAIL}.`);
      console.error(`   ${result.remedy}`);
      break;
    case 'wrong-role':
      console.error(
        `\nx  ${result.account?.email} exists but has the role ${result.account?.role}, not SUPER_ADMIN.`,
      );
      console.error(`   ${result.remedy}`);
      break;
    case 'mismatch':
      console.error('\nx  The .env password does NOT match the stored account.');
      console.error('   The database was seeded with a different password than your current .env.');
      console.error(`   ${result.remedy}`);
      break;
  }

  process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
