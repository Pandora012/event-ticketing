import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import './globals.css';
import { Providers } from '../components/providers';
import { Navbar, Footer } from '../components/navigation';
export const metadata = {
  title: { default: 'eventify. — Find your next good thing', template: '%s — eventify.' },
  description:
    'Discover independent events, meet your people, and bring your ticket. A fictional event discovery and QR ticketing portfolio project.',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
