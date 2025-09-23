import React from 'react';
import { formatCurrency } from './utils/formatting';

const OrderSummary = ({ pricing, shipping, quantity, selectedShipping = 'free' }) => {
  if (!pricing) {
    return (
      <div className="order-summary">
        <div className="loading-state">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  const getShippingCost = () => {
    if (!shipping) return 0;
    switch (selectedShipping) {
      case 'free': return 0;
      case 'economy': return shipping.economyPrice || 0;
      case 'nextday': 
        return shipping.nextDayPrice || 0;
      default: return 0;
    }
  };

  const subtotal = pricing.totalPrice;
  const shippingCost = getShippingCost();
  // Tax will be calculated by Stripe based on shipping address
  const tax = 0; // Placeholder - Stripe handles this
  const total = subtotal + tax + shippingCost;

  return (
    <div className="order-summary">
      <div className="summary-header">
        <h3>Pay Starpath</h3>
        <div className="total-amount">
          <div className="price-animation-wrapper">
            {formatCurrency(total)}
          </div>
        </div>
      </div>
      
      <div className="order-item-main">
        <div className="product-image-summary">
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077be">
                <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
                <circle cx="12" cy="12" r="2" fill="#ffa726"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="product-details-summary">
          <div className="product-name-summary">
            Starlight 65W EM
            {pricing.tier === 'bulk' && (
              <span className="bulk-indicator">Bulk Pricing</span>
            )}
          </div>
          <div className="product-meta hidden sm:block">
            20% efficient, LEO-tough solar modules. {formatCurrency(pricing.unitPrice)}/W and below.
          </div>
          <div className="quantity-display">
            Qty {quantity} × {formatCurrency(pricing.unitPrice)}
            {pricing.discount > 0 && (
              <span className="discount-applied">({pricing.discount}% off)</span>
            )}
          </div>
        </div>
        <div className="item-total">
          <div className="price-animation-wrapper">
            {formatCurrency(pricing.totalPrice)}
          </div>
        </div>
      </div>

      <div className="order-breakdown">
        <div className="breakdown-row">
          <span className="breakdown-label">Subtotal</span>
          <span className="breakdown-value">
            <div className="price-animation-wrapper">{formatCurrency(subtotal)}</div>
          </span>
        </div>
        
        <div className="breakdown-row">
          <span className="breakdown-label">
            Shipping
            {shippingCost === 0 && (
              <span className="shipping-note">
                {(() => {
                  const today = new Date();
                  const oct10 = new Date(today.getFullYear(), 9, 10); // October is month 9 (0-based)
                  return today > oct10 
                    ? "(3-5 business days)"
                    : "(ships October 10th, delivers October 13-15th)";
                })()}
              </span>
            )}
          </span>
          <span className="breakdown-value">
            <div className="price-animation-wrapper">
              {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}
            </div>
          </span>
        </div>
        
        <div className="breakdown-row">
          <span className="breakdown-label">Tax</span>
          <span className="breakdown-value">
            <span className="tax-placeholder">Calculated at checkout</span>
          </span>
        </div>
        
        <div className="breakdown-row total-row">
          <span className="breakdown-label">Total due</span>
          <span className="breakdown-value">
            <div className="price-animation-wrapper">{formatCurrency(total)}</div>
          </span>
        </div>
      </div>

    </div>
  );
};

export default OrderSummary;

