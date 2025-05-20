import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    
    if (session.mode === 'payment' && session.payment_status === 'paid') {
      try {
        const metadata = session.metadata || {};
        const todoId = metadata.todoId;

        if (!todoId) {
          console.error('No todo ID found in session metadata');
          return;
        }

        // Get the user_id from stripe_customers table
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single();

        if (customerError || !customerData) {
          console.error('Error fetching customer data:', customerError);
          return;
        }

        // Delete the todo
        const { error: deleteError } = await supabase
          .from('todos')
          .delete()
          .match({ id: todoId, user_id: customerData.user_id });

        if (deleteError) {
          console.error('Error deleting todo:', deleteError);
          return;
        }

        // Record the order
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id: session.id,
          payment_intent_id: session.payment_intent as string,
          customer_id: customerId,
          amount_subtotal: session.amount_subtotal || 0,
          amount_total: session.amount_total || 0,
          currency: session.currency || 'usd',
          payment_status: session.payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }

        console.info(`Successfully processed todo deletion payment for session: ${session.id}`);
      } catch (error) {
        console.error('Error processing todo deletion payment:', error);
      }
    }
  }
}