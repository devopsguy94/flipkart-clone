import React, { useState } from 'react'
import products from '../data/products'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'

export default function ProductList() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <h2 className="section-title">Top Picks</h2>
      <div className="grid">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onView={() => setSelected(p)} />
        ))}
      </div>

      {selected && (
        <ProductDetail product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
