// Load environment variables
require('dotenv').config();

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
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id parameter is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent"]
    });

    res.status(200).json({
      status: session.status,
      payment_status: session.payment_status,
      payment_intent_id: session.payment_intent.id,
      payment_intent_status: session.payment_intent.status
    });
  } catch (error) {
    console.error('Error retrieving session status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
