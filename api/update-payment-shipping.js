const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

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
    const { paymentIntentId, sessionId, shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    let result = {};

    // Try to update PaymentIntent with shipping info
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
          shipping: {
            name: shippingAddress.name,
            address: shippingAddress.address
          },
          metadata: {
            shipping_company: shippingAddress.company || '',
            updated_shipping: 'true'
          }
        });
        result.paymentIntentUpdated = true;
        result.paymentIntentId = paymentIntent.id;
      } catch (piError) {
        console.warn('Failed to update PaymentIntent:', piError);
        result.paymentIntentError = piError.message;
      }
    }

    // Try to update Checkout Session metadata
    if (sessionId) {
      try {
        // Note: Can't directly update session, but we can store in metadata via PaymentIntent
        result.sessionId = sessionId;
      } catch (sessionError) {
        console.warn('Session update info:', sessionError);
      }
    }

    // Also store as customer record if we have customer info
    try {
      // Try to find or create customer record
      const customers = await stripe.customers.list({
        limit: 1,
        email: shippingAddress.email // Assuming email might be available
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];
        await stripe.customers.update(customer.id, {
          shipping: {
            name: shippingAddress.name,
            address: shippingAddress.address
          }
        });
        result.customerUpdated = true;
      }
    } catch (customerError) {
      console.warn('Customer update failed:', customerError);
    }

    res.status(200).json({
      success: true,
      message: 'Shipping address processed',
      details: result
    });

  } catch (error) {
    console.error('Error updating shipping address:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
