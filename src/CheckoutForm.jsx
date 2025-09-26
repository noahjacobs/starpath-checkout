import React, { useState, useCallback } from "react";
import {
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import OrderSummary from './OrderSummary';
import OrderConfiguration from './OrderConfiguration';
import ImageCarousel from './ImageCarousel';
import { formatCurrency } from './utils/formatting';

const validateEmail = async (email) => {
  // Simple email validation since we're using direct Elements
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return { 
    isValid, 
    message: !isValid ? 'Please enter a valid email address' : null 
  };
}

const EmailInput = ({ email, setEmail, error, setError, placeholder }) => {
  const handleBlur = async () => {
    if (!email) {
      return;
    }

    const { isValid, message } = await validateEmail(email);
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
  
  // Company field separate from AddressElement since it's not natively supported
  const [company, setCompany] = useState('');
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
          const newData = {
            quantity: quantity,
            priceId: pricing.priceId,
            product: selectedProduct,
            shippingCost: shippingCost
          };
          return newData;
        }
        return prev;
      });
    }
  }, [setParentOrderData]); // Empty dependencies - setParentOrderData should be stable from parent

  const stripe = useStripe();
  const elements = useElements();


  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.defaultPrevented) {
      return;
    }

    setIsLoading(true);

    // Validate terms and conditions first
    if (!acceptedTerms) {
      setMessage('Please accept the terms and conditions to continue.');
      setIsLoading(false);
      return;
    }

    const { isValid, message } = await validateEmail(email);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsLoading(false);
      return;
    }

    try {
      // Calculate shipping cost
      const currentShippingCost = orderData.selectedShipping === 'nextday' ? 
        (orderData.quantity <= 10 ? 500 : 
         orderData.quantity <= 20 ? 1000 : 
         orderData.quantity <= 30 ? 1500 : 
         1500 + (Math.ceil((orderData.quantity - 30) / 10) * 500)) : 0;
      
      // Create PaymentIntent with current data
      
      // Create PaymentIntent with current order data
      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: orderData.quantity,
          priceId: orderData.pricing.priceId,
          shippingCost: currentShippingCost,
          email: email,
          company: company
        })
      });
      
      if (!paymentResponse.ok) {
        throw new Error(`PaymentIntent creation failed: ${paymentResponse.status}`);
      }
      
      const paymentData = await paymentResponse.json();
      // console.log('✅ PaymentIntent created with quantity:', paymentData.quantity);
      
      // Step 1: Submit elements first (required by Stripe)
      // console.log('1️⃣ Submitting elements...');
      const submitResult = await elements.submit();
      if (submitResult.error) {
        throw new Error(submitResult.error.message);
      }
      // console.log('✅ Elements submitted successfully');
      
      // Step 2: Confirm payment with current form data
      // console.log('2️⃣ Confirming payment...');
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: paymentData.client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/complete?payment_intent={PAYMENT_INTENT_ID}`,
        }
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      setMessage(`❌ Payment failed: ${error.message}`);
      setIsLoading(false);
    }
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
            <form 
              id="checkout-form" 
              onSubmit={handleSubmit} 
              noValidate
              onReset={(e) => e.preventDefault()}
              style={{overflow: 'hidden'}}
            >
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
                
                <div className="form-group">
                  <label htmlFor="company">Company (optional)</label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company or organization name"
                  />
                </div>
                
                <AddressElement 
                  id="address-element"
                  options={{mode: 'shipping'}}
                />
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
                type="button"
                className="form-submit-button"
                onClick={handleSubmit}
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