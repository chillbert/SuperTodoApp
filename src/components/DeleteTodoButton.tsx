import { useState } from 'react';
import { redirectToCheckout } from '../stripe';
import { products } from '../stripe-config';

interface DeleteTodoButtonProps {
  todoId: string;
}

export function DeleteTodoButton({ todoId }: DeleteTodoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await redirectToCheckout(
        products.deleteTodos.priceId,
        products.deleteTodos.mode,
        { todoId }
      );
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="delete-btn"
    >
      {isLoading ? 'Processing...' : 'Delete'}
    </button>
  );
}