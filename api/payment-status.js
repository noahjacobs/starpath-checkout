const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_intent_id } = req.query;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id parameter is required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    res.status(200).json({
      status: paymentIntent.status === 'succeeded' ? 'complete' : paymentIntent.status,
      payment_status: paymentIntent.status === 'succeeded' ? 'paid' : 'unpaid',
      payment_intent_id: paymentIntent.id,
      payment_intent_status: paymentIntent.status,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata
    });
  } catch (error) {
    console.error('Error retrieving payment intent status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
