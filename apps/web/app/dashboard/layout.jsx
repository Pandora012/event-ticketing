import { DashboardShell } from '../../components/dashboard';
export const metadata = { title: 'Organizer studio', robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
