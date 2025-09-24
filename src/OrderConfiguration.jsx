import React, { useState, useEffect } from 'react';
import { formatCurrency } from './utils/formatting';

const OrderConfiguration = ({ onOrderChange, initialProduct = '65W_EM' }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedShipping, setSelectedShipping] = useState('free');
  const [userSelectedShipping, setUserSelectedShipping] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  
  // Get product specifications
  const getProductSpecs = (productType, qty = 1) => {
    if (productType === '80W_FM') {
      // 80W FM: $11.20/W = $896 per unit
      // For bulk (100+), assume 20% discount like 65W EM = $716.80 per unit
      const unitPrice = qty >= 100 ? 716.80 : 896.00;
      return {
        name: 'Starlight 80W FM',
        subtitle: 'Flight Model',
        unitPrice: unitPrice,
        bulkDiscount: qty >= 100 ? 20 : 0,
        priceId: qty >= 100 ? "price_1SAfG80WFMBulk" : "price_1SAfG80WFMStandard"
      };
    } else {
      // 65W EM (existing)
      const unitPrice = qty >= 100 ? 510.40 : 638.00;
      return {
        name: 'Starlight 65W EM',
        subtitle: 'Engineering Model',
        unitPrice: unitPrice,
        bulkDiscount: qty >= 100 ? 20 : 0,
        priceId: qty >= 100 ? "price_1SAfGwKXDiHB9vqyZK6u2ro5" : "price_1SAfGiKXDiHB9vqy69zu2AbV"
      };
    }
  };

  // Provide immediate fallback data to prevent loading states
  const [pricing, setPricing] = useState(() => {
    const specs = getProductSpecs(selectedProduct, 1);
    return {
      quantity: 1,
      unitPrice: specs.unitPrice,
      totalPrice: specs.unitPrice,
      tier: 'standard',
      discount: specs.bulkDiscount,
      priceId: specs.priceId
    };
  });
  
  const [shipping, setShipping] = useState({
    free: true,
    standardPrice: 0,  // Don't show standard for quantity 1
    nextDayPrice: 500
  });

  // Fetch pricing data - but don't automatically update state to prevent loops
  const fetchPricingInfo = async (qty) => {
    try {
      const response = await fetch(`/api/pricing-info?quantity=${qty}&product=${selectedProduct}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      // Only update pricing from backend, keep our shipping calculation
      setPricing(data.pricing);
      // Don't update shipping to preserve our correct frontend calculations
      
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Fallback pricing using product specs
      const specs = getProductSpecs(selectedProduct, qty);
      const fallbackPricing = {
        quantity: qty,
        unitPrice: specs.unitPrice,
        totalPrice: specs.unitPrice * qty,
        priceId: specs.priceId,
        tier: qty >= 100 ? "bulk" : "standard",
        discount: specs.bulkDiscount
      };
      // Calculate Next-Day Air pricing based on tiers  
      const calculateNextDayPrice = (qty) => {
        if (qty <= 10) return 500;
        if (qty <= 20) return 1000;
        if (qty <= 30) return 1500;
        
        // For quantities > 30, add $500 for each additional 10-unit tier
        const additionalTiers = Math.ceil((qty - 30) / 10);
        return 1500 + (additionalTiers * 500);
      };

      const fallbackShipping = {
        free: qty <= 10,
        standardPrice: 0,
        nextDayPrice: calculateNextDayPrice(qty)
      };
      setPricing(fallbackPricing);
      setShipping(fallbackShipping);
    }
  };

  // Initialize component ONCE when pricing and shipping are ready
  const isInitialized = React.useRef(false);
  
  useEffect(() => {
    // Only call onOrderChange once during initialization
    if (!isInitialized.current && pricing && shipping && onOrderChange) {
      console.log('OrderConfiguration: Initializing with:', { pricing, shipping, quantity, selectedShipping });
      onOrderChange(pricing, shipping, quantity, selectedShipping, selectedProduct);
      isInitialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Empty dependency array intentional - initialization should only happen once

  const handleQuantityChange = (newQuantity) => {
    const validQuantity = Math.max(1, Math.min(1000, newQuantity));
    setQuantity(validQuantity);
    
    // Calculate immediate pricing update using current product specs
    const specs = getProductSpecs(selectedProduct, validQuantity);
    const updatedPricing = {
      quantity: validQuantity,
      unitPrice: specs.unitPrice,
      totalPrice: specs.unitPrice * validQuantity,
      tier: validQuantity >= 100 ? 'bulk' : 'standard',
      discount: specs.bulkDiscount,
      priceId: specs.priceId
    };
    
    // Calculate Next-Day Air pricing based on tiers
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

    const updatedShipping = {
      free: validQuantity <= 10,
      standardPrice: 0,
      nextDayPrice: calculateNextDayPrice(validQuantity)
    };
    setPricing(updatedPricing);
    setShipping(updatedShipping);
    
    // Ensure a valid shipping option is always selected
    let newSelectedShipping = selectedShipping;
    
    // If free shipping was selected but is no longer available (qty > 10)
    if (selectedShipping === 'free' && validQuantity > 10) {
      newSelectedShipping = 'standard'; // Auto-switch to standard
      setSelectedShipping(newSelectedShipping);
    }
    // If quantity changes to qualify for free shipping, always select free
    // unless user specifically chose premium next-day shipping
    else if (validQuantity <= 10) {
      // Auto-select free shipping unless user explicitly chose next-day
      if (selectedShipping !== 'nextday') {
        newSelectedShipping = 'free';
        setSelectedShipping(newSelectedShipping);
        // Reset user selection flag when auto-switching to free
        if (selectedShipping === 'standard') {
          setUserSelectedShipping(false);
        }
      }
    }
    // If no shipping was selected and we're in bulk tier, select standard
    else if (!userSelectedShipping && validQuantity > 10) {
      newSelectedShipping = 'standard';
      setSelectedShipping(newSelectedShipping);
    }
    
    // Immediately notify parent
    onOrderChange(updatedPricing, updatedShipping, validQuantity, newSelectedShipping, selectedProduct);
    
    // Fetch real data in background (don't override our calculations)
    fetchPricingInfo(validQuantity);
  };

  const handleShippingChange = (shippingType) => {
    setSelectedShipping(shippingType);
    setUserSelectedShipping(true);
    
    // Immediately notify parent of shipping change
    onOrderChange(pricing, shipping, quantity, shippingType, selectedProduct);
  };

  const handleProductChange = (productType) => {
    setSelectedProduct(productType);
    
    // Recalculate pricing for new product
    const specs = getProductSpecs(productType, quantity);
    const updatedPricing = {
      quantity: quantity,
      unitPrice: specs.unitPrice,
      totalPrice: specs.unitPrice * quantity,
      tier: quantity >= 100 ? 'bulk' : 'standard',
      discount: specs.bulkDiscount,
      priceId: specs.priceId
    };
    
    setPricing(updatedPricing);
    
    // Immediately notify parent
    onOrderChange(updatedPricing, shipping, quantity, selectedShipping, productType);
  };

  if (!pricing || !shipping) {
    return (
      <div className="order-configuration">
        <div className="loading-state">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-configuration">
      {/* Product Header */}
      <div className="product-header-compact">
        <h2>{getProductSpecs(selectedProduct, quantity).name}</h2>
        <p className="product-subtitle">{getProductSpecs(selectedProduct, quantity).subtitle} • {formatCurrency(pricing.unitPrice)}/unit</p>
        {pricing.tier === 'bulk' && (
          <div className="volume-discount-badge">
            {/* <span className="discount-icon">🎉</span> */}
            <span>20% Volume Discount</span>
          </div>
        )}
      </div>

      {/* Quantity Section */}
      <div className="quantity-section">
        <div className="section-header">
          <h3>Quantity</h3>
        </div>
        
        <div className="quantity-control-group">
          <div className="apple-quantity-stepper">
            <button 
              className="quantity-stepper-btn minus"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              type="button"
            >
              −
            </button>
            
            <div className="quantity-input-container">
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="apple-quantity-input"
                min="1"
                max="1000"
              />
            </div>
            
            <button 
              className="quantity-stepper-btn plus"
              onClick={() => handleQuantityChange(quantity + 1)}
              type="button"
            >
              +
            </button>
          </div>
        </div>
        
        <div className="quantity-presets">
          {[10, 100, 1000].map(preset => (
            <button 
              key={preset}
              type="button" 
              className={`preset-btn ${quantity === preset ? 'active' : ''}`}
              onClick={() => handleQuantityChange(preset)}
            >
              {preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Volume Discount Upsell */}
        {quantity < 100 && (
          <div className="volume-upsell" onClick={() => handleQuantityChange(100)}>
            <div className="upsell-content">
              {/* <div className="upsell-icon">💰</div> */}
              <div className="upsell-text">
                <div className="upsell-title">Save 20% with bulk ordering</div>
                <div className="upsell-subtitle">Order 100+ units to unlock volume pricing</div>
              </div>
              <div className="upsell-arrow">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Selection */}
      <div className="product-selection-section">
        <div className="section-header">
          <h3>Product</h3>
        </div>
        
        <div className="product-options">
          <div 
            className={`product-card ${selectedProduct === '65W_EM' ? 'selected' : ''}`}
            onClick={() => handleProductChange('65W_EM')}
          >
            <input 
              type="radio" 
              name="product"
              value="65W_EM" 
              checked={selectedProduct === '65W_EM'}
              onChange={() => {}} // Controlled by onClick
              style={{ pointerEvents: 'none' }}
            />
            <div className="product-info">
              <div className="product-details">
                <div className="product-name">Starlight 65W EM</div>
                <div className="product-subtitle">Engineering Model • Available Now</div>
              </div>
            </div>
          </div>
          
          <div 
            className={`product-card ${selectedProduct === '80W_FM' ? 'selected' : ''}`}
            onClick={() => handleProductChange('80W_FM')}
          >
            <input 
              type="radio" 
              name="product"
              value="80W_FM" 
              checked={selectedProduct === '80W_FM'}
              onChange={() => {}} // Controlled by onClick
              style={{ pointerEvents: 'none' }}
            />
            <div className="product-info">
              <div className="product-details">
                <div className="product-name">Starlight 80W FM</div>
                <div className="product-subtitle">Flight Model • Pre-Order (Ships Q4 2025)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Section */}
      <div className="shipping-section">
        <div className="section-header">
          <h3>Shipping</h3>
        </div>
        
        <div className="shipping-options">
          {quantity <= 10 && (
            <div 
              className={`shipping-card ${selectedShipping === 'free' ? 'selected' : ''}`}
              onClick={() => handleShippingChange('free')}
            >
              <input 
                type="radio" 
                name="shipping"
                value="free" 
                checked={selectedShipping === 'free'}
                onChange={() => {}} // Controlled by onClick
                style={{ pointerEvents: 'none' }}
              />
              <div className="shipping-info">
                <div className="shipping-details">
                  <div className="shipping-name">Standard Shipping</div>
                  <div className="shipping-time">
                    {selectedProduct === '80W_FM' 
                      ? "Ships Q4 2025"
                      : (() => {
                          const today = new Date();
                          const oct10 = new Date(today.getFullYear(), 9, 10); // October is month 9 (0-based)
                          return today > oct10 
                            ? "3-5 business days"
                            : "Ships October 10th, delivers October 15-17th";
                        })()
                    }
                  </div>
                </div>
                <div className="shipping-price">Free</div>
              </div>
            </div>
          )}
          
          {quantity > 10 && (
            <div 
              className={`shipping-card ${selectedShipping === 'standard' ? 'selected' : ''}`}
              onClick={() => handleShippingChange('standard')}
            >
              <input 
                type="radio" 
                name="shipping"
                value="standard" 
                checked={selectedShipping === 'standard'}
                onChange={() => {}} // Controlled by onClick
                style={{ pointerEvents: 'none' }}
              />
              <div className="shipping-info">
                <div className="shipping-details">
                  <div className="shipping-name">Standard Shipping</div>
                  <div className="shipping-time">
                    {selectedProduct === '80W_FM' 
                      ? "Ships Q4 2025"
                      : (() => {
                          const today = new Date();
                          const oct10 = new Date(today.getFullYear(), 9, 10); // October is month 9 (0-based)
                          return today > oct10 
                            ? "5-7 business days"
                            : "Ships October 10th, delivers October 20-22nd";
                        })()
                    }
                  </div>
                </div>
                <div className="shipping-price">{shipping.standardPrice === 0 ? 'Free' : formatCurrency(shipping.standardPrice)}</div>
              </div>
            </div>
          )}
          
          <div 
            className={`shipping-card ${selectedShipping === 'nextday' ? 'selected' : ''}`}
            onClick={() => handleShippingChange('nextday')}
          >
            <input 
              type="radio" 
              name="shipping"
              value="nextday" 
              checked={selectedShipping === 'nextday'}
              onChange={() => {}} // Controlled by onClick
              style={{ pointerEvents: 'none' }}
            />
            <div className="shipping-info">
              <div className="shipping-details">
                <div className="shipping-name">Next-Day Air</div>
                <div className="shipping-time">
                  {selectedProduct === '80W_FM' 
                    ? "Ships Q4 2025"
                    : (() => {
                        const today = new Date();
                        const oct10 = new Date(today.getFullYear(), 9, 10); // October is month 9 (0-based)
                        return today > oct10 
                          ? "1 business day"
                          : "Ships October 10th, delivers next business day";
                      })()
                  }
                </div>
              </div>
              <div className="shipping-price">{formatCurrency(shipping.nextDayPrice)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfiguration;
