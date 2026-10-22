'use client';
export default function Error({ reset }) {
  return (
    <div className="container">
      <div className="empty" role="alert">
        <h2>Something interrupted the moment.</h2>
        <p>Please try loading this page again.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
