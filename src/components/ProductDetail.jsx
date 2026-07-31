import React, { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function ProductDetail({ product, onClose }) {
  const { addToCart } = useCart()
  const [qty, setQty] = useState(1)

  function handleAdd() {
    addToCart(product, qty)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-content">
          <div className="modal-image">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="modal-info">
            <h2>{product.name}</h2>
            <p className="modal-price">₹{product.price.toLocaleString()}</p>
            <p className="modal-rating">⭐ {product.rating}</p>
            <p className="modal-desc">{product.description}</p>

            <div className="qty-row">
              <label>Quantity</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={handleAdd}>Add to Cart</button>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
