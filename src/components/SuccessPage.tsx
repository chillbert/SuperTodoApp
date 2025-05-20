import { useEffect, useState } from 'react';
import { getUserOrders } from '../stripe';

export function SuccessPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestOrder() {
      try {
        const orders = await getUserOrders();
        if (orders && orders.length > 0) {
          setOrder(orders[0]);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestOrder();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return <div>No order found.</div>;
  }

  return (
    <div className="success-page">
      <h1>Payment Successful!</h1>
      <div className="order-details">
        <h2>Order Details</h2>
        <p>Order ID: {order.order_id}</p>
        <p>Amount: {(order.amount_total / 100).toFixed(2)} {order.currency.toUpperCase()}</p>
        <p>Status: {order.order_status}</p>
        <p>Date: {new Date(order.order_date).toLocaleDateString()}</p>
      </div>
      <a href="/" className="btn-primary">Return to Home</a>
    </div>
  );
}