const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Get the domain from environment variables or default to production URL
const YOUR_DOMAIN = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.DOMAIN || "https://starpath-checkout.vercel.app";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { quantity = 1, priceId } = req.body;
    
    // Determine the correct price based on quantity
    let selectedPriceId;
    if (priceId) {
      selectedPriceId = priceId;
    } else if (quantity >= 100) {
      selectedPriceId = "price_1SAYrqKXDiHB9vqyc2HZvqCt"; // Bulk pricing (20% discount)
    } else {
      selectedPriceId = "price_1SAFHNKXDiHB9vqy3vKynK84"; // Standard pricing
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: "custom",
      line_items: [
        {
          price: selectedPriceId,
          quantity: quantity,
        },
      ],
      mode: "payment",
      payment_method_types: ['card'], // Only allow credit/debit cards
      return_url: `${YOUR_DOMAIN}/complete?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: {enabled: true},
    });

    res.status(200).json({ 
      clientSecret: session.client_secret,
      quantity: quantity,
      priceId: selectedPriceId
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
