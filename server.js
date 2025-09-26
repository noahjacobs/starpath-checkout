// Load environment variables from .env file
require('dotenv').config();

// This test secret API key is a placeholder. Don't include personal details in requests with this key.
// To see your test secret API key embedded in code samples, sign in to your Stripe account.
// You can also find your test secret API key at https://dashboard.stripe.com/test/apikeys.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});
const express = require("express");
const app = express();
app.use(express.static("public"));
app.use(express.json());

const YOUR_DOMAIN = "http://localhost:3000";

app.post(["/create-payment-intent", "/api/create-payment-intent"], async (req, res) => {
  try {
    const { quantity = 1, priceId, shippingCost = 0, email, company } = req.body;
    
    // console.log(`💳 CREATING PAYMENT INTENT: Quantity=${quantity}, PriceId=${priceId}, Email=${email}, Company=${company}`);
    
    // Price mapping to calculate total
    const priceMap = {
      'price_1SBi95KcDhbxGafoCB3PthG7': 63800, // 65W EM Standard $638
      'price_1SBi9LKcDhbxGafoXvlIL15R': 57420, // 65W EM Volume $574.20
      'price_1SBi9YKcDhbxGafovyLEYGSL': 51040, // 65W EM Bulk $510.40
      'price_1SBiMoKcDhbxGafo5TI8NWnP': 89600, // 80W FM Standard $896
      'price_1SBiNOKcDhbxGafobgEbo1FD': 80640, // 80W FM Volume $806.40
      'price_1SBiN2KcDhbxGafo8FYo1va6': 71680, // 80W FM Bulk $716.80
    };
    
    const unitPrice = priceMap[priceId] || 63800;
    const productTotal = quantity * unitPrice;
    const shippingTotal = Math.round(shippingCost * 100);
    const totalAmount = productTotal + shippingTotal;
    
    // console.log(`💰 TOTAL CALCULATION: ${quantity} × $${unitPrice/100} + $${shippingCost} = $${totalAmount/100}`);
    
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
        // console.log('👤 Customer created:', customerId);
      } catch (customerError) {
        console.warn('Customer creation failed:', customerError);
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

    // console.log(`✅ PAYMENT INTENT CREATED: ID=${paymentIntent.id}, Amount=$${totalAmount/100}, Quantity=${quantity}`);
    
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
});

// OLD CHECKOUT SESSION REMOVED - Using PaymentIntents now
/*
app.post(["/create-checkout-session", "/api/create-checkout-session"], async (req, res) => {
  const { quantity = 1, priceId } = req.body;
  
  // Determine the correct price based on quantity
  let selectedPriceId;
  if (priceId) {
    selectedPriceId = priceId;
  } else if (quantity >= 100) {
    selectedPriceId = "price_1SAfGwKXDiHB9vqyZK6u2ro5"; // 65W EM Bulk pricing (20% discount)
  } else {
    selectedPriceId = "price_1SAfGiKXDiHB9vqy69zu2AbV"; // 65W EM Standard pricing
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
    // automatic_tax: {enabled: true},
  });

  res.send({ 
    clientSecret: session.client_secret,
    quantity: quantity,
    priceId: selectedPriceId
  });
});
*/

// New endpoint to get pricing information
app.get(["/pricing-info", "/api/pricing-info"], (req, res) => {
  const { quantity } = req.query;
  const qty = parseInt(quantity) || 1;
  
  let priceInfo = {
    quantity: qty,
    unitPrice: 638.00, // $638 per unit for 1-99
    totalPrice: 638.00 * qty,
    priceId: "price_1SAfGiKXDiHB9vqy69zu2AbV", // 65W EM Standard
    tier: "standard",
    discount: 0
  };

  if (qty >= 100) {
    priceInfo = {
      quantity: qty,
      unitPrice: 510.40, // $510.40 per unit for 100+ (20% discount off $638)
      totalPrice: 510.40 * qty,
      priceId: "price_1SAfGiKXDiHB9vqy69zu2AbV", // 65W EM Standard
      tier: "bulk",
      discount: 20
    };
  }

  // Calculate shipping with tiered Next-Day Air pricing
  const calculateNextDayPrice = (qty) => {    
    if (qty <= 10) {
      return 500;
    }
    if (qty <= 20) {
      return 1000;
    }
    if (qty <= 30) {
      return 1500;
    }
    
    // For quantities > 30, add $500 for each additional 10-unit tier
    const additionalTiers = Math.ceil((qty - 30) / 10);
    const price = 1500 + (additionalTiers * 500);
    return price;
  };

  let shipping = {
    free: qty <= 10,
    standardPrice: qty > 10 ? 100 : 0,
    nextDayPrice: calculateNextDayPrice(qty)
  };

  res.send({
    pricing: priceInfo,
    shipping: shipping
  });
});

app.get(["/payment-status", "/api/payment-status"], async (req, res) => {
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
});

app.get(["/session-status", "/api/session-status"], async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {expand: ["payment_intent"]});

   res.send({
    status: session.status,
    payment_status: session.payment_status,
    payment_intent_id: session.payment_intent.id,
    payment_intent_status: session.payment_intent.status
  });
});

app.listen(4242, () => {
  // Server running on port 4242
});