import React, { useState, useCallback } from "react";
import {
  PaymentElement,
  ExpressCheckoutElement,
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

const EmailInput = ({ email, setEmail, error, setError }) => {
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
  const [expressCheckoutAvailable, setExpressCheckoutAvailable] = useState(false);
  const [orderData, setOrderData] = useState({
    pricing: { quantity: 1, unitPrice: 800, totalPrice: 800, tier: 'standard', discount: 0 },
    shipping: { free: true, economyPrice: 0, nextDayPrice: 500 },  // No economy for qty 1
    quantity: 1,
    selectedShipping: 'free'
  });

  // Move useCallback to the top, before any conditional returns
  const handleOrderChange = useCallback((pricing, shipping, quantity, selectedShipping) => {
    const newOrderData = { pricing, shipping, quantity, selectedShipping };
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

  const handleExpressCheckoutReady = ({ availablePaymentMethods }) => {
    setExpressCheckoutAvailable(!!availablePaymentMethods);
  };

  const handleExpressCheckout = async (event) => {
    setIsLoading(true);
    
    try {
      // The event contains payment method data from the express checkout
      const confirmResult = await checkout.confirm();

      if (confirmResult.type === 'error') {
        setMessage(confirmResult.error.message);
      }
      // Success case - user will be redirected to return_url
    } catch (error) {
      setMessage(error.message || 'An error occurred during payment');
    }

    setIsLoading(false);
  };

  return (
    <div className="checkout-layout">
      <div className="checkout-content">
        {/* Left Column: Images + Contact & Payment */}
        <div className="checkout-left-column">
          {/* Product Images */}
          <div className="product-images-section">
            <ImageCarousel />
          </div>
          
          {/* Contact & Payment Form */}
          <div className="checkout-form-section">
            <form id="checkout-form" onSubmit={handleSubmit}>
              {/* Express Checkout (Apple Pay, Google Pay, etc.) */}
              <div className="express-checkout-section">
                <ExpressCheckoutElement
                  onReady={handleExpressCheckoutReady}
                  onConfirm={handleExpressCheckout}
                  options={{
                    buttonTheme: {
                      applePay: 'black',
                      googlePay: 'black'
                    },
                    buttonHeight: 48,
                    paymentMethods: {
                      googlePay: 'always',
                      applePay: 'always'
                    }
                  }}
                />
                
                {expressCheckoutAvailable && (
                  <div className="express-divider">
                    <span>Or</span>
                  </div>
                )}
              </div>
              
              <div className="form-section">
                <h3>Contact information</h3>
                <EmailInput
                  email={email}
                  setEmail={setEmail}
                  error={emailError}
                  setError={setEmailError}
                />
              </div>

              <div className="form-section">
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
                    <label htmlFor="country">Country or region</label>
                    <div className="select-wrapper">
                      <select id="country" defaultValue="US" required>
                        {/* <option value="">Select a country</option> */}
                        <option value="US">🇺🇸 United States</option>
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
              </div>

              <div className="form-section">
                <h3>Payment method</h3>
                <PaymentElement id="payment-element" />
              </div>
              
              <button disabled={isLoading || !orderData.pricing} type="submit" className="form-submit-button">
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
                        
                        const shippingCost = orderData.selectedShipping === 'economy' ? 100 : 
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
        <div className="checkout-right-column">
          <div className="order-configuration-wrapper">
            <OrderConfiguration onOrderChange={handleOrderChange} />
            
            <div className="order-summary-wrapper">
              <OrderSummary 
                pricing={orderData.pricing}
                shipping={orderData.shipping}
                quantity={orderData.quantity}
                selectedShipping={orderData.selectedShipping}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutForm;