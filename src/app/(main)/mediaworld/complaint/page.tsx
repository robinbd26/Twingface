import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  MediaWorldLanguageProvider,
  MediaWorldLanguageToggle,
} from '@/components/mediaworld/mediaworld-language';
import ComplaintForm from './complaint-form';

export default async function MediaWorldComplaintPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-shell page-enter" data-theme="dark">
      <MediaWorldLanguageProvider>
        <main className="fb-layout">
          <section className="fb-main">
            <div
              className="fb-card surface"
              style={{ maxWidth: 640, margin: '0 auto', paddingTop: 40, paddingBottom: 40 }}
            >
              <div className="mediaworld-language-bar" style={{ justifyContent: 'flex-end' }}>
                <MediaWorldLanguageToggle />
              </div>
              <h1>সমস্যা জানাও</h1>
              <p style={{ color: '#9aa0a6', marginBottom: 20 }}>
                বাংলাদেশের সেরা মিডিয়া প্রফেশনাল এবং ইকুইপমেন্ট রেন্টাল সার্ভিসের ক্ষেত্রে বিবৃতি, মিথ্যা তথ্য বা অন্যান্য সমস্যার জন্য আপনার শিকারের পাঠান।
              </p>
              <ComplaintForm />
            </div>
          </section>
        </main>
      </MediaWorldLanguageProvider>
    </div>
  );
}
