import Link from 'next/link';
import { QuikkredLogo } from '@/components/QuikkredLogo';

export default function Home() {
  return (
    <main className="home-shell">
      <div className="home-orb home-orb-a" aria-hidden />
      <div className="home-orb home-orb-b" aria-hidden />

      <div className="home-content">
        <div className="home-brand">
          <QuikkredLogo size="lg" variant="badge" />
        </div>

        <h1 className="home-title">
          Welcome to the Quikkred task management system
        </h1>

        <p className="home-sub">
          Plan work, assign tasks to your team, and stay in sync — sign in to
          get started.
        </p>

        <div className="home-ctas">
          <Link href="/admin/login" className="home-btn-primary">
            Admin Login
          </Link>
          <Link href="/user/login" className="home-btn-secondary">
            Member Login
          </Link>
        </div>
      </div>
    </main>
  );
}
