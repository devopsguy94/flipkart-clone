import React from 'react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart } = useCart()

  const total = cart.reduce((s, item) => s + item.price * item.qty, 0)

  function handleCheckout() {
    if (cart.length === 0) {
      alert('Your cart is empty')
      return
    }
    alert(`Checkout - Total: ₹${total.toLocaleString()}`)
    clearCart()
  }

  return (
    <div>
      <h2 className="section-title">Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty. Go add some products!</p>
      ) : (
        <div className="cart">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p>Price: ₹{item.price.toLocaleString()}</p>
                  <div className="qty-controls">
                    <label>Qty:</label>
                    <input type="number" min="1" value={item.qty} onChange={e => updateQty(item.id, Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                </div>
                <div className="cart-item-actions">
                  <p className="cart-item-sub">Subtotal: ₹{(item.price * item.qty).toLocaleString()}</p>
                  <button className="btn btn-outline" onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>Order Summary</h3>
            <p>Items: {cart.length}</p>
            <p>Total: <strong>₹{total.toLocaleString()}</strong></p>
            <button className="btn" onClick={handleCheckout}>Checkout</button>
          </aside>
        </div>
      )}
    </div>
  )
}
