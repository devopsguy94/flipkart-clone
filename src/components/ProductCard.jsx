import React from 'react'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product, onView }) {
  const { addToCart } = useCart()

  return (
    <div className="card">
      <div className="card-img" onClick={onView}>
        <img src={product.image} alt={product.name} />
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-price">₹{product.price.toLocaleString()}</p>
        <p className="card-rating">⭐ {product.rating}</p>
        <div className="card-actions">
          <button className="btn" onClick={() => addToCart(product, 1)}>
            Add to Cart
          </button>
          <button className="btn btn-outline" onClick={onView}>
            View
          </button>
        </div>
      </div>
    </div>
  )
}
