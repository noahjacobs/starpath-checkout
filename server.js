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

app.post(["/create-checkout-session", "/api/create-checkout-session"], async (req, res) => {
  const { quantity = 1, priceId } = req.body;
  
  // Determine the correct price based on quantity
  let selectedPriceId;
  if (priceId) {
    selectedPriceId = priceId;
  } else if (quantity >= 100) {
    selectedPriceId = "price_1SAfGwKXDiHB9vqyZK6u2ro5"; // Bulk pricing (20% discount)
  } else {
    selectedPriceId = "price_1SAfGiKXDiHB9vqy69zu2AbV"; // Standard pricing
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

  res.send({ 
    clientSecret: session.client_secret,
    quantity: quantity,
    priceId: selectedPriceId
  });
});

// New endpoint to get pricing information
app.get(["/pricing-info", "/api/pricing-info"], (req, res) => {
  const { quantity } = req.query;
  const qty = parseInt(quantity) || 1;
  
  let priceInfo = {
    quantity: qty,
    unitPrice: 638.00, // $638 per unit for 1-99
    totalPrice: 638.00 * qty,
    priceId: "price_1SAfGiKXDiHB9vqy69zu2AbV",
    tier: "standard",
    discount: 0
  };

  if (qty >= 100) {
    priceInfo = {
      quantity: qty,
      unitPrice: 510.40, // $510.40 per unit for 100+ (20% discount off $638)
      totalPrice: 510.40 * qty,
      priceId: "price_1SAfGwKXDiHB9vqyZK6u2ro5",
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
    economyPrice: qty > 10 ? 100 : 0,
    nextDayPrice: calculateNextDayPrice(qty)
  };

  res.send({
    pricing: priceInfo,
    shipping: shipping
  });
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

app.listen(4242, () => console.log("Running on port 4242"));