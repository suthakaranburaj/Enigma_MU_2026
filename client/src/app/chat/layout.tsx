import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/protected-route';

export const metadata: Metadata = {
  title: 'Chat | RegIntel',
  description: 'Chat with RegIntel AI',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
      </div>
    // </ProtectedRoute>
  );
}
