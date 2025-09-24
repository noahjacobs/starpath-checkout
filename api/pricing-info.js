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

  const { quantity, product } = req.query;
  const qty = parseInt(quantity) || 1;
  const productType = product || '65W_EM';
  
  let priceInfo;
  
  if (productType === '80W_FM') {
    // 80W FM: $11.20/W = $896 per unit standard, $716.80 bulk (20% off)
    if (qty >= 100) {
      priceInfo = {
        quantity: qty,
        unitPrice: 716.80, // $716.80 per unit for 100+ (20% discount off $896)
        totalPrice: 716.80 * qty,
        priceId: "price_1SAxDaKXDiHB9vqyDjybl3fP",
        tier: "bulk",
        discount: 20
      };
    } else {
      priceInfo = {
        quantity: qty,
        unitPrice: 896.00, // $896 per unit for 1-99
        totalPrice: 896.00 * qty,
        priceId: "price_1SAxDBKXDiHB9vqyNg9Bkop5",
        tier: "standard",
        discount: 0
      };
    }
  } else {
    // 65W EM (existing product)
    if (qty >= 100) {
      priceInfo = {
        quantity: qty,
        unitPrice: 510.40, // $510.40 per unit for 100+ (20% discount off $638)
        totalPrice: 510.40 * qty,
        priceId: "price_1SAfGwKXDiHB9vqyZK6u2ro5",
        tier: "bulk",
        discount: 20
      };
    } else {
      priceInfo = {
        quantity: qty,
        unitPrice: 638.00, // $638 per unit for 1-99
        totalPrice: 638.00 * qty,
        priceId: "price_1SAfGiKXDiHB9vqy69zu2AbV",
        tier: "standard",
        discount: 0
      };
    }
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

  res.status(200).json({
    pricing: priceInfo,
    shipping: shipping
  });
}
