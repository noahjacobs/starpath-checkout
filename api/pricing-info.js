export default function handler(req, res) {
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

  const { quantity } = req.query;
  const qty = parseInt(quantity) || 1;
  
  let priceInfo = {
    quantity: qty,
    unitPrice: 800.00, // $800 per unit for 1-99
    totalPrice: 800.00 * qty,
    priceId: "price_1SAFHNKXDiHB9vqy3vKynK84",
    tier: "standard",
    discount: 0
  };

  if (qty >= 100) {
    priceInfo = {
      quantity: qty,
      unitPrice: 640.00, // $640 per unit for 100+ (20% discount)
      totalPrice: 640.00 * qty,
      priceId: "price_1SAYrqKXDiHB9vqyc2HZvqCt",
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

  res.status(200).json({
    pricing: priceInfo,
    shipping: shipping
  });
}
