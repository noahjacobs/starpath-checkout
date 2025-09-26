import React, { useState, useCallback } from "react";
import {
  PaymentElement,
  useCheckout
} from '@stripe/react-stripe-js/checkout';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Shipping address state for custom UI
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    company: '',
    country: 'US',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [orderData, setOrderData] = useState({
    pricing: { quantity: 1, unitPrice: 638, totalPrice: 638, tier: 'standard', discount: 0 },
    shipping: { free: true, standardPrice: 0, nextDayPrice: 500 },  // No standard for qty 1
    quantity: 1,
    selectedShipping: 'free',
    selectedProduct: parentOrderData?.product || '65W_EM'
  });

  // Stable reference to prevent unnecessary re-renders - no dependencies needed since setParentOrderData is stable
  const handleOrderChange = useCallback((pricing, shipping, quantity, selectedShipping, selectedProduct) => {
    const newOrderData = { pricing, shipping, quantity, selectedShipping, selectedProduct };
    setOrderData(newOrderData);
    
    // Update parent order data for Stripe session creation - but only when values actually change
    if (setParentOrderData && pricing?.priceId) {
      const calculateShippingCost = () => {
        if (selectedShipping === 'free' || selectedShipping === 'standard') return 0;
        if (selectedShipping === 'nextday') {
          // Calculate Next-Day Air pricing based on tiers
          if (quantity <= 10) return 500;
          if (quantity <= 20) return 1000;  
          if (quantity <= 30) return 1500;
          
          const additionalTiers = Math.ceil((quantity - 30) / 10);
          return 1500 + (additionalTiers * 500);
        }
        return 0;
      };

      const shippingCost = calculateShippingCost();

      setParentOrderData(prev => {
        // Only update if the data has actually changed
        if (prev.quantity !== quantity || prev.priceId !== pricing.priceId || 
            prev.product !== selectedProduct || prev.shippingCost !== shippingCost) {
          return {
            quantity: quantity,
            priceId: pricing.priceId,
            product: selectedProduct,
            shippingCost: shippingCost
          };
        }
        return prev;
      });
    }
  }, [setParentOrderData]); // Empty dependencies - setParentOrderData should be stable from parent

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

    // Validate terms and conditions first
    if (!acceptedTerms) {
      setMessage('Please accept the terms and conditions to continue.');
      setIsLoading(false);
      return;
    }

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsLoading(false);
      return;
    }

    // Validate shipping address
    if (!shippingAddress.fullName || !shippingAddress.address || 
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      setMessage('Please fill out all required shipping address fields.');
      setIsLoading(false);
      return;
    }

    // Store shipping address after payment confirmation
    const confirmResult = await checkout.confirm();
    
    // If payment successful, send shipping address to your backend
    if (confirmResult.type === 'success') {
      try {
        // Send shipping address to backend for storage
        await fetch('/api/update-payment-shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: confirmResult.paymentIntent?.id,
            sessionId: confirmResult.session?.id,
            shippingAddress: {
              name: shippingAddress.fullName,
              company: shippingAddress.company,
              address: {
                line1: shippingAddress.address,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postal_code: shippingAddress.zipCode,
                country: shippingAddress.country,
              }
            }
          })
        });
      } catch (shippingError) {
        console.warn('Failed to update shipping address:', shippingError);
        // Don't fail the payment for shipping address update failures
      }
    }

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
      <div 
        className={`product-images-container mobile-images-first ${
          orderData.selectedProduct === '80W_FM' ? 'placeholder-mode' : 'images-mode'
        }`}
      >
        {/* MOBILE SECTION - SHOW ACTUAL CAROUSEL */}
        {orderData.selectedProduct !== '80W_FM' && (
          <div className="product-images-section mobile-only">
            <ImageCarousel />
          </div>
        )}
        
        {orderData.selectedProduct === '80W_FM' && (
          <div className="preorder-placeholder mobile-preorder">
            <div className="preorder-content">
              <h3>Starlight 80W FM</h3>
              <p>Product images coming soon</p>
              <div className="preorder-badge">Pre-Order • Ships Q4 2025</div>
            </div>
          </div>
        )}
      </div>

      <div className="checkout-content">
        {/* Left Column: Images + Contact & Payment */}
        <div className="checkout-left-column">
          <div 
            className={`product-images-container desktop-images ${
              orderData.selectedProduct === '80W_FM' ? 'placeholder-mode' : 'images-mode'
            }`}
          >
             {/* DESKTOP CAROUSEL SECTION */}
             {orderData.selectedProduct !== '80W_FM' && (
               <div className="product-images-section shared-carousel">
                 <ImageCarousel />
               </div>
             )}
               
             {orderData.selectedProduct === '80W_FM' && (
               <div className="preorder-placeholder">
                 <div className="preorder-content">
                   <h3>Starlight 80W FM</h3>
                   <p>Product images coming soon</p>
                   <div className="preorder-badge">Pre-Order • Ships Q4 2025</div>
                 </div>
               </div>
             )}
          </div>
          
          {/* Contact & Payment Form */}
          <div 
            className="checkout-form-section"
          >
            <form id="checkout-form" onSubmit={handleSubmit}>
              <div 
                className="form-section"
              >
                <h3>Contact information</h3>
                <EmailInput
                  email={email}
                  setEmail={setEmail}
                  error={emailError}
                  placeholder="name@example.com"
                  setError={setEmailError}
                />
              </div>

              <div 
                className="form-section"
              >
                <h3>Shipping address</h3>
                <div className="shipping-form">
                  <div className="form-group">
                    <label htmlFor="fullname">Full name</label>
                    <input
                      id="fullname"
                      type="text"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="company">Company (optional)</label>
                    <input
                      id="company"
                      type="text"
                      value={shippingAddress.company}
                      onChange={(e) => setShippingAddress({...shippingAddress, company: e.target.value})}
                      placeholder="Company or organization name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="country">Country or region</label>
                    <div className="select-wrapper">
                      <select 
                        id="country" 
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                        required
                      >
                        <option value="US">United States</option>
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
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                      placeholder="Street address, apartment, suite, etc."
                      rows="2"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City</label>
                      <input 
                        id="city" 
                        type="text" 
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        placeholder="City" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="state">State</label>
                      <input 
                        id="state" 
                        type="text" 
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        placeholder="State" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="zip">ZIP code</label>
                      <input 
                        id="zip" 
                        type="text" 
                        value={shippingAddress.zipCode}
                        onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
                        placeholder="ZIP code" 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className="form-section"
              >
                <h3>Payment method</h3>
                <PaymentElement id="payment-element" />
              </div>

              <div 
                className="form-section"
              >
                <div className="terms-and-conditions">
                  <label className="terms-checkbox">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="checkbox-input"
                    />
                    <div className="checkbox-custom"></div>
                    <span className="terms-text">
                      I agree to the{' '}
                      <a 
                        href="/Starlight-tc.pdf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="terms-link"
                      >
                        Terms and Conditions
                      </a>
                    </span>
                  </label>
                </div>
              </div>
              
              <button 
                disabled={isLoading || !orderData.pricing || !acceptedTerms} 
                type="submit" 
                className="form-submit-button"
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
              </button>
              
              {message && <div className="payment-message">{message}</div>}
            </form>
          </div>
        </div>
        
        {/* Right Column: Order Configuration & Summary */}
        <div 
          className="checkout-right-column"
        >
          <div 
            className="order-configuration-wrapper"
          >
            <div>
              <OrderConfiguration 
                onOrderChange={handleOrderChange} 
                initialProduct={parentOrderData?.product || '65W_EM'} 
              />
            </div>
            
            <div 
              className="order-summary-wrapper"
            >
              <OrderSummary 
                pricing={orderData.pricing}
                shipping={orderData.shipping}
                quantity={orderData.quantity}
                selectedShipping={orderData.selectedShipping}
                selectedProduct={orderData.selectedProduct}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div 
        className="checkout-footer"
      >
        <div className="footer-branding">
          <p className="footer-tagline">
            Engineered by Starpath for <span className="mars-text">Mars</span>. Flies Anywhere.
          </p>
          <p className="footer-copyright">@ 2025 Starpath Robotics</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutForm;