import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from './utils/formatting';

const OrderConfiguration = ({ onOrderChange, initialProduct = '65W_EM' }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedShipping, setSelectedShipping] = useState('free');
  const [userSelectedShipping, setUserSelectedShipping] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  
  // Memoize expensive date calculations to prevent re-computation on every render
  const shippingMessages = useMemo(() => {
    const today = new Date();
    const oct10 = new Date(today.getFullYear(), 9, 10); // October is month 9 (0-based)
    const isAfterOct10 = today > oct10;
    
    return {
      standard: isAfterOct10 
        ? "3-5 business days"
        : "Ships October 10th, delivers October 15-17th",
      standardBulk: isAfterOct10 
        ? "5-7 business days"
        : "Ships October 10th, delivers October 20-22nd",
      nextday: isAfterOct10 
        ? "1 business day"
        : "Ships October 10th, delivers next business day"
    };
  }, []); // Empty dependency array - only calculate once per component mount
  
  // Get product specifications
  const getProductSpecs = (productType, qty = 1) => {
    if (productType === '80W_FM') {
      // 80W FM: $11.20/W = $896 per unit
      return {
        name: 'Starlight 80W FM',
        subtitle: 'Flight Model',
        unitPrice: 896.00,
        priceId: "price_1SAxDBKXDiHB9vqyNg9Bkop5" // 80W FM Standard
      };
    } else {
      // 65W EM: $638 per unit
      return {
        name: 'Starlight 65W EM',
        subtitle: 'Engineering Model',
        unitPrice: 638.00,
        priceId: "price_1SAfGiKXDiHB9vqy69zu2AbV" // 65W EM Standard
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
      priceId: specs.priceId
    };
  });
  
  const [shipping, setShipping] = useState({
    free: true,
    standardPrice: 0,  // Don't show standard for quantity 1
    nextDayPrice: 500
  });

  // Stable reference for fetchPricingInfo to prevent recreation
  // const fetchPricingInfo = useCallback(async (qty, productType) => {
  //   try {
  //     const response = await fetch(`/api/pricing-info?quantity=${qty}&product=${productType}`);
  //     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
  //     const data = await response.json();
  //     // Only update pricing from backend if it's different to prevent flashing
  //     setPricing(prevPricing => {
  //       // Only update if there are actual differences to prevent unnecessary re-renders
  //       if (!prevPricing || 
  //           prevPricing.quantity !== data.pricing.quantity ||
  //           prevPricing.unitPrice !== data.pricing.unitPrice ||
  //           prevPricing.totalPrice !== data.pricing.totalPrice ||
  //           prevPricing.tier !== data.pricing.tier ||
  //           prevPricing.discount !== data.pricing.discount ||
  //           prevPricing.priceId !== data.pricing.priceId) {
  //         return data.pricing;
  //       }
  //       return prevPricing;
  //     });
      
  //   } catch (error) {
  //     // Remove expensive console.error to prevent mobile performance issues
  //     if (process.env.NODE_ENV === 'development') {
  //       console.error('Error fetching pricing:', error);
  //     }
  //     // Fallback pricing using product specs - only if we don't already have data
  //     setPricing(prevPricing => {
  //       if (!prevPricing || prevPricing.quantity !== qty) {
  //         const specs = getProductSpecs(productType, qty);
  //         return {
  //           quantity: qty,
  //           unitPrice: specs.unitPrice,
  //           totalPrice: specs.unitPrice * qty,
  //           priceId: specs.priceId,
  //           tier: qty >= 100 ? "bulk" : "standard",
  //           discount: specs.bulkDiscount
  //         };
  //       }
  //       return prevPricing;
  //     });
  //   }
  // }, []); // No dependencies needed - uses parameters directly

  // Initialize component ONCE when pricing and shipping are ready - but protect against multiple calls
  const isInitialized = React.useRef(false);
  const initializationTimer = React.useRef(null);
  
  useEffect(() => {
    // Only call onOrderChange once during initialization with debouncing
    if (!isInitialized.current && pricing && shipping && onOrderChange) {
      // Clear any previous timer
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
      
      // Debounce the initialization call to prevent rapid-fire calls
      initializationTimer.current = setTimeout(() => {
        if (!isInitialized.current) {
          onOrderChange(pricing, shipping, quantity, selectedShipping, selectedProduct);
          isInitialized.current = true;
        }
      }, 50); // 50ms debounce
    }
    
    return () => {
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
    };
  }, [pricing, shipping, onOrderChange, quantity, selectedShipping, selectedProduct]);

  const handleQuantityChange = (newQuantity) => {
    // Enforce 100 unit maximum limit
    if (newQuantity > 100) {
      return; // Don't allow changes above 100
    }
    const validQuantity = Math.max(1, Math.min(100, newQuantity));
    setQuantity(validQuantity);
    
    // Calculate immediate pricing update using current product specs
    const specs = getProductSpecs(selectedProduct, validQuantity);
    const updatedPricing = {
      quantity: validQuantity,
      unitPrice: specs.unitPrice,
      totalPrice: specs.unitPrice * validQuantity,
      tier: 'standard',
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
    
    // Update pricing and shipping together to prevent intermediate states
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
    
    // Skip API call for now to prevent discount flashing - our frontend calculation should be accurate
    // The API call was causing the volume discount to flash because it would overwrite our immediate calculation
    // Comment out the deferred API call that was causing discount flashing:
    // setTimeout(() => {
    //   fetchPricingInfo(validQuantity, selectedProduct);
    // }, 1000);
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
      tier: 'standard',
      priceId: specs.priceId
    };
    
    setPricing(updatedPricing);
    
    // Immediately notify parent
    onOrderChange(updatedPricing, shipping, quantity, selectedShipping, productType);
    
    // Skip API call to prevent flashing - frontend calculation should be accurate
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
      <motion.div 
        className="product-header-compact"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.h2
          key={`product-name-${selectedProduct}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {getProductSpecs(selectedProduct, quantity).name}
        </motion.h2>
        <motion.p
          className="product-subtitle"
          key={`product-subtitle-${selectedProduct}-${pricing.unitPrice}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {getProductSpecs(selectedProduct, quantity).subtitle} • {formatCurrency(pricing.unitPrice)}/unit
        </motion.p>
      </motion.div>

      {/* Quantity Section */}
      <motion.div 
        className="quantity-section"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
                max="100"
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
          {[10, 100].map(preset => (
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

      </motion.div>

      {/* Product Selection */}
      <motion.div 
        className="product-selection-section"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="section-header">
          <h3>Product</h3>
        </div>
        
        <div className="product-options">
          <motion.div 
            className={`product-card ${selectedProduct === '65W_EM' ? 'selected' : ''}`}
            onClick={() => handleProductChange('65W_EM')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              scale: selectedProduct === '65W_EM' ? 1.02 : 1,
              boxShadow: selectedProduct === '65W_EM' 
                ? "0 8px 32px rgba(3, 128, 252, 0.2)" 
                : "0 2px 8px rgba(0, 0, 0, 0.1)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <input 
              type="radio" 
              name="product"
              value="65W_EM" 
              checked={selectedProduct === '65W_EM'}
              onChange={() => {}} // Controlled by onClick
              style={{ pointerEvents: 'none' }}
            />
            <motion.div 
              className="product-info"
              animate={{
                color: selectedProduct === '65W_EM' ? '#0380fc' : '#333'
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="product-details">
                <div className="product-name">Starlight 65W EM</div>
                <div className="product-subtitle">Engineering Model • Available Now</div>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className={`product-card ${selectedProduct === '80W_FM' ? 'selected' : ''}`}
            onClick={() => handleProductChange('80W_FM')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              scale: selectedProduct === '80W_FM' ? 1.02 : 1,
              boxShadow: selectedProduct === '80W_FM' 
                ? "0 8px 32px rgba(3, 128, 252, 0.2)" 
                : "0 2px 8px rgba(0, 0, 0, 0.1)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <input 
              type="radio" 
              name="product"
              value="80W_FM" 
              checked={selectedProduct === '80W_FM'}
              onChange={() => {}} // Controlled by onClick
              style={{ pointerEvents: 'none' }}
            />
            <motion.div 
              className="product-info"
              animate={{
                color: selectedProduct === '80W_FM' ? '#0380fc' : '#333'
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="product-details">
                <div className="product-name">Starlight 80W FM</div>
                <div className="product-subtitle">Flight Model • Pre-Order (Ships Q4 2025)</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Shipping Section */}
      <motion.div 
        className="shipping-section"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
                      : shippingMessages.standard
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
                      : shippingMessages.standardBulk
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
                    : shippingMessages.nextday
                  }
                </div>
              </div>
              <div className="shipping-price">{formatCurrency(shipping.nextDayPrice)}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderConfiguration;
