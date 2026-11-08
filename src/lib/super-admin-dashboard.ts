export type DashboardDay = {
  date: string;
  users: number;
  posts: number;
};

export type AdminActivityType = 'USER' | 'POST' | 'LISTING' | 'GAME' | 'MEDIA_PROFILE';

export type AdminActivity = {
  id: string;
  type: AdminActivityType;
  title: string;
  createdAt: string;
};

export type ModuleAvailability = {
  label: string;
  state: 'CONNECTED' | 'NOT_CONNECTED';
  detail: string;
};

export type SuperAdminDashboardData = {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    onlineUsers: number;
    totalPosts: number;
    marketplaceListings: number;
    games: number;
    pendingApprovals: number;
  };
  growth: DashboardDay[];
  recentUsers: Array<{ id: string; name: string; username: string; email: string | null; profileImage: string | null; createdAt: string }>;
  activities: AdminActivity[];
  pendingProfiles: Array<{ id: string; fullName: string; profession: string; division: string; district: string; createdAt: string }>;
  moduleCounts: Array<{ label: string; count: number }>;
  systemStatus: ModuleAvailability[];
};

type DailySeriesInput = {
  end: Date;
  days: number;
  registrations: string[];
  posts: string[];
};

function toDayKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function buildDailySeries({ end, days, registrations, posts }: DailySeriesInput): DashboardDay[] {
  const length = Math.max(1, days);
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const dayKeys = Array.from({ length }, (_, offset) => {
    const day = new Date(endDay);
    day.setUTCDate(endDay.getUTCDate() - (length - 1 - offset));
    return toDayKey(day);
  });
  const knownDays = new Set(dayKeys);
  const registrationsByDay = registrations.reduce<Record<string, number>>((counts, value) => {
    const key = toDayKey(value);
    if (knownDays.has(key)) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const postsByDay = posts.reduce<Record<string, number>>((counts, value) => {
    const key = toDayKey(value);
    if (knownDays.has(key)) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return dayKeys.map((date) => ({ date, users: registrationsByDay[date] ?? 0, posts: postsByDay[date] ?? 0 }));
}

export function buildRecentActivities(activities: AdminActivity[]): AdminActivity[] {
  return [...activities].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function buildModuleAvailability(module: 'database' | 'ott' | 'payments' | 'support' | 'streaming'): ModuleAvailability {
  const map: Record<typeof module, ModuleAvailability> = {
    database: { label: 'Database', state: 'CONNECTED', detail: 'Connected' },
    ott: { label: 'OTT streaming', state: 'NOT_CONNECTED', detail: 'Not connected' },
    payments: { label: 'Payments', state: 'NOT_CONNECTED', detail: 'Not connected' },
    support: { label: 'Support tickets', state: 'NOT_CONNECTED', detail: 'Not connected' },
    streaming: { label: 'Live streaming', state: 'NOT_CONNECTED', detail: 'Not connected' },
  };
  return map[module];
}

export function formatAdminMetric(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
