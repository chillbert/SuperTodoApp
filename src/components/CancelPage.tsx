export function CancelPage() {
  return (
    <div className="cancel-page">
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made.</p>
      <a href="/" className="btn-primary">Return to Home</a>
    </div>
  );
}