import type { Metadata } from 'next';
import LoginForm from './(auth)/login/login-form';

export const metadata: Metadata = {
  title: 'Twingface – Log in',
  description:
    'Come back to your people. Return to friends, family and everyone who makes it feel like home.',
};

export default function HomePage() {
  return <LoginForm />;
}
