import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container">
      <div className="empty">
        <span className="eyebrow">404 / A wrong turn</span>
        <h1>This one’s off the map.</h1>
        <p>The page you’re looking for isn’t here. There are still good things to find.</p>
        <Link className="button" href="/events">
          Back to the calendar
        </Link>
      </div>
    </div>
  );
}
