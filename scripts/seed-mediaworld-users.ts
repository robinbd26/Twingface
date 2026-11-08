import argon2 from 'argon2';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { describePasswordPolicy, readEnvFileValue } from './super-admin-credentials.ts';

/**
 * Demo Media World accounts used to exercise the Find Talent queue and the
 * super-admin approval screens. The password is never stored in the repo: it
 * comes from MEDIAWORLD_SEED_PASSWORD, exactly like the Super Admin seed.
 */
const SEED_PASSWORD_ENV = 'MEDIAWORLD_SEED_PASSWORD';

function loadSeedPassword(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): { password: string; source: 'environment' | 'dotenv-file' } {
  const fromEnv = env[SEED_PASSWORD_ENV];
  const raw = fromEnv !== undefined && fromEnv !== '' ? fromEnv : readEnvFileValue(join(cwd, '.env'), SEED_PASSWORD_ENV);
  const password = (raw ?? '').trim();
  if (!password) {
    throw new Error(`${SEED_PASSWORD_ENV} must be set before seeding demo accounts. Add it to your .env file.`);
  }
  return { password, source: fromEnv ? 'environment' : 'dotenv-file' };
}

const DEMO_USERS = [
  { username: 'profile-1', name: 'Profile One' },
  { username: 'profile-2', name: 'Profile Two' },
  { username: 'profile-3', name: 'Profile Three' },
  { username: 'profile-4', name: 'Profile Four' },
  { username: 'profile-5', name: 'Profile Five' },
] as const;

const PROFESSIONS = ['OTHER', 'HOBBIES', 'FASHION', 'ELECTRONICS', 'VEHICLES'] as const;
const DIVISIONS = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal'];

const prisma = new PrismaClient();

async function main() {
  const { password, source } = loadSeedPassword();

  const policyProblems = describePasswordPolicy(password);
  if (policyProblems.length > 0) {
    console.warn(`! ${SEED_PASSWORD_ENV} should ${policyProblems.join(', ')}.`);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const demo = DEMO_USERS[i];
    const email = `${demo.username}@twingface.test`;

    // An existing account keeps its own password: a demo seed must never
    // overwrite credentials a real person chose.
    const user = await prisma.user.upsert({
      where: { username: demo.username },
      update: { name: demo.name, email },
      create: { username: demo.username, name: demo.name, email, passwordHash, role: 'USER' },
      select: { id: true, username: true },
    });

    const profileData = {
      fullName: demo.name,
      profession: PROFESSIONS[i % PROFESSIONS.length],
      bio: `This is ${demo.name}, a media professional from Bangladesh.`,
      division: DIVISIONS[i % DIVISIONS.length],
      district: DIVISIONS[i % DIVISIONS.length],
      phone: `+880170000000${i + 1}`,
      email,
      portfolio: 'https://example.com/portfolio',
      experience: '5+ years',
      status: 'PENDING' as const,
    };

    await prisma.mediaProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });

    console.log(`Demo account ready: ${user.username} (password: ${SEED_PASSWORD_ENV} from ${source}, not shown)`);
  }

  console.log('The Super Admin account is not part of this seed; use `npm run db:seed:super-admin`.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
