import type { Metadata } from 'next';
import AuthForm from '../auth-form';

export const metadata: Metadata = {
  title: 'Twingface – Create your account',
  description: 'Reconnect with the people who make Bangladesh feel like home. Join Twingface.',
};

export default function RegisterPage() {
  return <AuthForm initialMode='register' />;
}
