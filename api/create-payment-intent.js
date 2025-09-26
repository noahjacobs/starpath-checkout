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
    const { quantity = 1, priceId, shippingCost = 0, email, company } = req.body;
    
    // Price mapping to calculate total
    const priceMap = {
      'price_1SAfGiKXDiHB9vqy69zu2AbV': 63800, // 65W EM Standard $638
      'price_1SBh46KXDiHB9vqyuUhWnwbx': 57420, // 65W EM Volume $574.20
      'price_1SAfGwKXDiHB9vqyZK6u2ro5': 51040, // 65W EM Bulk $510.40
      'price_1SAxDBKXDiHB9vqyNg9Bkop5': 89600, // 80W FM Standard $896
      'price_1SBh5zKXDiHB9vqyJAyKXGa0': 80640, // 80W FM Volume $806.40
      'price_1SAxDaKXDiHB9vqyDjybl3fP': 71680, // 80W FM Bulk $716.80
    };
    
    const unitPrice = priceMap[priceId] || 63800;
    const productTotal = quantity * unitPrice;
    const shippingTotal = Math.round(shippingCost * 100);
    const totalAmount = productTotal + shippingTotal;
    
    
    // Create customer first if email provided
    let customerId = null;
    if (email) {
      try {
        const customer = await stripe.customers.create({
          email: email,
          metadata: {
            company: company || '',
            quantity_ordered: quantity.toString(),
            unit_price: (unitPrice/100).toString(),
            total_amount: (totalAmount/100).toString()
          }
        });
        customerId = customer.id;
      } catch (customerError) {
      }
    }
    
    // Create PaymentIntent with correct amount - CARD ONLY
    const paymentIntentData = {
      amount: totalAmount,
      currency: 'usd',
      payment_method_types: ['card'], // Only allow credit/debit cards
      metadata: {
        quantity: quantity.toString(),
        unit_price_cents: unitPrice.toString(),
        product_price_id: priceId,
        shipping_cost_dollars: shippingCost.toString(),
        company: company || '',
        total_amount_dollars: (totalAmount/100).toString()
      }
    };
    
    if (customerId) {
      paymentIntentData.customer = customerId;
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    
    res.status(200).json({ 
      client_secret: paymentIntent.client_secret,
      amount: totalAmount,
      quantity: quantity,
      priceId: priceId,
      customerId: customerId
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
