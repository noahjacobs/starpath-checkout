import React, { useState, useEffect } from 'react';
import { formatCurrency } from './utils/formatting';

const OrderConfiguration = ({ onOrderChange }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedShipping, setSelectedShipping] = useState('free');
  const [userSelectedShipping, setUserSelectedShipping] = useState(false);
  
  // Provide immediate fallback data to prevent loading states
  const [pricing, setPricing] = useState({
    quantity: 1,
    unitPrice: 800,
    totalPrice: 800,
    tier: 'standard',
    discount: 0,
    priceId: "price_1SAFHNKXDiHB9vqy3vKynK84"
  });
  
  const [shipping, setShipping] = useState({
    free: true,
    economyPrice: 0,  // Don't show economy for quantity 1
    nextDayPrice: 500
  });

  // Fetch pricing data - but don't automatically update state to prevent loops
  const fetchPricingInfo = async (qty) => {
    try {
      const response = await fetch(`/api/pricing-info?quantity=${qty}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      // Only update pricing from backend, keep our shipping calculation
      setPricing(data.pricing);
      // Don't update shipping to preserve our correct frontend calculations
      
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Fallback pricing
      const fallbackPricing = {
        quantity: qty,
        unitPrice: qty >= 100 ? 640.00 : 800.00,
        totalPrice: (qty >= 100 ? 640.00 : 800.00) * qty,
        priceId: qty >= 100 ? "price_1SAYrqKXDiHB9vqyc2HZvqCt" : "price_1SAFHNKXDiHB9vqy3vKynK84",
        tier: qty >= 100 ? "bulk" : "standard",
        discount: qty >= 100 ? 20 : 0
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
        economyPrice: qty > 10 ? 100 : 0,
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
      onOrderChange(pricing, shipping, quantity, selectedShipping);
      isInitialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Empty dependency array intentional - initialization should only happen once

  const handleQuantityChange = (newQuantity) => {
    const validQuantity = Math.max(1, Math.min(1000, newQuantity));
    setQuantity(validQuantity);
    
    // Calculate immediate pricing update
    const unitPrice = validQuantity >= 100 ? 640 : 800;
    const updatedPricing = {
      quantity: validQuantity,
      unitPrice: unitPrice,
      totalPrice: unitPrice * validQuantity,
      tier: validQuantity >= 100 ? 'bulk' : 'standard',
      discount: validQuantity >= 100 ? 20 : 0,
      priceId: validQuantity >= 100 ? "price_1SAYrqKXDiHB9vqyc2HZvqCt" : "price_1SAFHNKXDiHB9vqy3vKynK84"
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
      economyPrice: validQuantity > 10 ? 100 : 0,
      nextDayPrice: calculateNextDayPrice(validQuantity)
    };
    setPricing(updatedPricing);
    setShipping(updatedShipping);
    
    // Ensure a valid shipping option is always selected
    let newSelectedShipping = selectedShipping;
    
    // If free shipping was selected but is no longer available (qty > 10)
    if (selectedShipping === 'free' && validQuantity > 10) {
      newSelectedShipping = 'economy'; // Auto-switch to economy
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
        if (selectedShipping === 'economy') {
          setUserSelectedShipping(false);
        }
      }
    }
    // If no shipping was selected and we're in bulk tier, select economy
    else if (!userSelectedShipping && validQuantity > 10) {
      newSelectedShipping = 'economy';
      setSelectedShipping(newSelectedShipping);
    }
    
    // Immediately notify parent
    onOrderChange(updatedPricing, updatedShipping, validQuantity, newSelectedShipping);
    
    // Fetch real data in background (don't override our calculations)
    fetchPricingInfo(validQuantity);
  };

  const handleShippingChange = (shippingType) => {
    setSelectedShipping(shippingType);
    setUserSelectedShipping(true);
    
    // Immediately notify parent of shipping change
    onOrderChange(pricing, shipping, quantity, shippingType);
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
        <h2>Starpath Solar</h2>
        <p className="product-subtitle">Engineering Model • {formatCurrency(pricing.unitPrice)}/unit</p>
        {pricing.tier === 'bulk' && (
          <div className="volume-discount-badge">
            <span className="discount-icon">🎉</span>
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
              <div className="upsell-icon">💰</div>
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
                  <div className="shipping-name">Free Shipping</div>
                  <div className="shipping-time">3-5 business days</div>
                </div>
                <div className="shipping-price">Free</div>
              </div>
            </div>
          )}
          
          {quantity > 10 && (
            <div 
              className={`shipping-card ${selectedShipping === 'economy' ? 'selected' : ''}`}
              onClick={() => handleShippingChange('economy')}
            >
              <input 
                type="radio" 
                name="shipping"
                value="economy" 
                checked={selectedShipping === 'economy'}
                onChange={() => {}} // Controlled by onClick
                style={{ pointerEvents: 'none' }}
              />
              <div className="shipping-info">
                <div className="shipping-details">
                  <div className="shipping-name">Economy Shipping</div>
                  <div className="shipping-time">5-7 business days</div>
                </div>
                <div className="shipping-price">{formatCurrency(shipping.economyPrice)}</div>
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
                <div className="shipping-time">1 business day</div>
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
