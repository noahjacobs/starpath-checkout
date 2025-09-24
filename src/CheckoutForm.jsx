import React, { useState, useCallback } from "react";
import {
  PaymentElement,
  useCheckout
} from '@stripe/react-stripe-js/checkout';
import { motion, AnimatePresence } from 'framer-motion';
import OrderSummary from './OrderSummary';
import OrderConfiguration from './OrderConfiguration';
import ImageCarousel from './ImageCarousel';
import { formatCurrency } from './utils/formatting';

const validateEmail = async (email, checkout) => {
  const updateResult = await checkout.updateEmail(email);
  const isValid = updateResult.type !== "error";

  return { isValid, message: !isValid ? updateResult.error.message : null };
}

const EmailInput = ({ email, setEmail, error, setError, placeholder }) => {
  const checkoutState = useCheckout();
  if (checkoutState.type === 'loading') {
    return (
      <div className="email-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  } else if (checkoutState.type === 'error') {
    return (
      <div className="email-error">
        <p>Error: {checkoutState.error.message}</p>
      </div>
    );
  }
  const {checkout} = checkoutState;

  const handleBlur = async () => {
    if (!email) {
      return;
    }

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setError(message);
    }
  };

  const handleChange = (e) => {
    setError(null);
    setEmail(e.target.value);
  };

  return (
    <>
      <label>
        Email
        <input
          id="email"
          type="text"
          value={email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={error ? "error" : ""}
          placeholder={placeholder}
        />
      </label>
      {error && <div id="email-errors">{error}</div>}
    </>
  );
};

const CheckoutForm = ({ orderData: parentOrderData, setOrderData: setParentOrderData }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    pricing: { quantity: 1, unitPrice: 638, totalPrice: 638, tier: 'standard', discount: 0 },
    shipping: { free: true, standardPrice: 0, nextDayPrice: 500 },  // No standard for qty 1
    quantity: 1,
    selectedShipping: 'free',
    selectedProduct: parentOrderData?.product || '65W_EM'
  });

  // Move useCallback to the top, before any conditional returns
  const handleOrderChange = useCallback((pricing, shipping, quantity, selectedShipping, selectedProduct) => {
    const newOrderData = { pricing, shipping, quantity, selectedShipping, selectedProduct };
    setOrderData(newOrderData);
    
    // Update parent order data for Stripe session creation - but only when values actually change
    if (setParentOrderData && pricing?.priceId) {
      setParentOrderData(prev => {
        // Only update if the data has actually changed
        if (prev.quantity !== quantity || prev.priceId !== pricing.priceId) {
          return {
            quantity: quantity,
            priceId: pricing.priceId
          };
        }
        return prev;
      });
    }
  }, [setParentOrderData]); // Include setParentOrderData dependency

  const checkoutState = useCheckout();
  
  if (checkoutState.type === 'loading') {
    return (
      <div className="checkout-loading">
        <div className="loading-spinner-container">
          <div className="checkout-spinner"></div>
        </div>
      </div>
    );
  } else if (checkoutState.type === 'error') {
    return (
      <div>Error: {checkoutState.error.message}</div>
    );
  }
  const {checkout} = checkoutState;


  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsLoading(false);
      return;
    }

    const confirmResult = await checkout.confirm();

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (confirmResult.type === 'error') {
      setMessage(confirmResult.error.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="checkout-layout">
      {/* Mobile Images - Above Everything */}
      <motion.div 
        className={`product-images-container mobile-images-first ${
          orderData.selectedProduct === '80W_FM' ? 'placeholder-mode' : 'images-mode'
        }`}
        layout
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1] 
        }}
      >
        <AnimatePresence>
          {orderData.selectedProduct !== '80W_FM' && (
            <motion.div 
              className="product-images-section"
              key="mobile-product-images"
              layoutId="mobile-main-content"
              initial={{ 
                opacity: 0, 
                y: -20 
              }}
              animate={{ 
                opacity: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                y: -30 
              }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1] 
              }}
            >
              <ImageCarousel />
            </motion.div>
          )}
          
          {orderData.selectedProduct === '80W_FM' && (
            <motion.div 
              className="preorder-placeholder"
              key="mobile-preorder-placeholder"
              layoutId="mobile-main-content"
              initial={{ 
                opacity: 0, 
                y: 20 
              }}
              animate={{ 
                opacity: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                y: -20 
              }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1] 
              }}
            >
              <div className="preorder-content">
                <h3>Starlight 80W FM</h3>
                <p>Product images coming soon</p>
                <div className="preorder-badge">Pre-Order • Ships Q4 2025</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="checkout-content">
        {/* Left Column: Images + Contact & Payment */}
        <div className="checkout-left-column">
          {/* Product Images Container */}
          <motion.div 
            className={`product-images-container desktop-images ${
              orderData.selectedProduct === '80W_FM' ? 'placeholder-mode' : 'images-mode'
            }`}
            layout
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1] 
            }}
          >
            <AnimatePresence>
              {orderData.selectedProduct !== '80W_FM' && (
                <motion.div 
                  className="product-images-section"
                  key="product-images"
                  layoutId="main-content"
                  initial={{ 
                    opacity: 0, 
                    y: -20 
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -30 
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1] 
                  }}
                >
                  <ImageCarousel />
                </motion.div>
              )}
              
              {orderData.selectedProduct === '80W_FM' && (
                <motion.div 
                  className="preorder-placeholder"
                  key="preorder-placeholder"
                  layoutId="main-content"
                  initial={{ 
                    opacity: 0, 
                    y: 20 
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -20 
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1] 
                  }}
                >
                  <div className="preorder-content">
                    <h3>Starlight 80W FM</h3>
                    <p>Product images coming soon</p>
                    <div className="preorder-badge">Pre-Order • Ships Q4 2025</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Contact & Payment Form */}
          <motion.div 
            className="checkout-form-section"
            layout
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1] 
            }}
          >
            <form id="checkout-form" onSubmit={handleSubmit}>
              <motion.div 
                className="form-section"
                layout
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <h3>Contact information</h3>
                <EmailInput
                  email={email}
                  setEmail={setEmail}
                  error={emailError}
                  placeholder="name@example.com"
                  setError={setEmailError}
                />
              </motion.div>

              <motion.div 
                className="form-section"
                layout
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <h3>Shipping address</h3>
                <div className="shipping-form">
                  <div className="form-group">
                    <label htmlFor="fullname">Full name</label>
                    <input
                      id="fullname"
                      type="text"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="company">Company (optional)</label>
                    <input
                      id="company"
                      type="text"
                      placeholder="Company or organization name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="country">Country or region</label>
                    <div className="select-wrapper">
                      <select id="country" defaultValue="US" required>
                        {/* <option value="">Select a country</option> */}
                        {/* <option value="US">🇺🇸 United States</option> */}
                        <option value="US">United States</option>
                        {/* <option value="CA">🇨🇦 Canada</option>
                        <option value="GB">🇬🇧 United Kingdom</option>
                        <option value="AU">🇦🇺 Australia</option>
                        <option value="DE">🇩🇪 Germany</option>
                        <option value="FR">🇫🇷 France</option>
                        <option value="JP">🇯🇵 Japan</option> */}
                      </select>
                      <div className="select-arrow">
                        <svg width="12" height="8" viewBox="0 0 12 8">
                          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      placeholder="Street address, apartment, suite, etc."
                      rows="2"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City</label>
                      <input id="city" type="text" placeholder="City" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="state">State</label>
                      <input id="state" type="text" placeholder="State" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="zip">ZIP code</label>
                      <input id="zip" type="text" placeholder="ZIP code" required />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="form-section"
                layout
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <h3>Payment method</h3>
                <PaymentElement id="payment-element" />
              </motion.div>
              
              <motion.button 
                disabled={isLoading || !orderData.pricing} 
                type="submit" 
                className="form-submit-button"
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {isLoading ? (
                  <div className="button-spinner"></div>
                ) : (
                  orderData.pricing 
                    ? (() => {
                        // Calculate total including shipping
                        const calculateNextDayPrice = (qty) => {
                          if (qty <= 10) return 500;
                          if (qty <= 20) return 1000;  
                          if (qty <= 30) return 1500;
                          
                          // For quantities > 30, add $500 for each additional 10-unit tier
                          const additionalTiers = Math.ceil((qty - 30) / 10);
                          return 1500 + (additionalTiers * 500);
                        };
                        
                        const shippingCost = orderData.selectedShipping === 'standard' ? 0 : 
                                           orderData.selectedShipping === 'nextday' ? calculateNextDayPrice(orderData.quantity) : 0;
                        const subtotalWithShipping = orderData.pricing.totalPrice + shippingCost;
                        return `Complete Purchase · ${formatCurrency(subtotalWithShipping)} + tax`;
                      })()
                    : `Complete Purchase`
                )}
              </motion.button>
              
              {message && <div className="payment-message">{message}</div>}
            </form>
          </motion.div>
        </div>
        
        {/* Right Column: Order Configuration & Summary */}
        <motion.div 
          className="checkout-right-column"
          layout
          transition={{ 
            duration: 0.4, 
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <motion.div 
            className="order-configuration-wrapper"
            layout
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            <motion.div
              layout
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <OrderConfiguration 
                onOrderChange={handleOrderChange} 
                initialProduct={parentOrderData?.product || '65W_EM'} 
              />
            </motion.div>
            
            <motion.div 
              className="order-summary-wrapper"
              layout
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <OrderSummary 
                pricing={orderData.pricing}
                shipping={orderData.shipping}
                quantity={orderData.quantity}
                selectedShipping={orderData.selectedShipping}
                selectedProduct={orderData.selectedProduct}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Footer Branding */}
      <motion.div 
        className="checkout-footer"
        layout
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <div className="footer-branding">
          <p className="footer-tagline">
            Engineered by Starpath for <span className="mars-text">Mars</span>. Flies Anywhere.
          </p>
          <p className="footer-copyright">@ 2025 Starpath Robotics</p>
        </div>
      </motion.div>
    </div>
  );
}

export default CheckoutForm;