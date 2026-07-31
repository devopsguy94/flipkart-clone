import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ProductList from './components/ProductList'
import Cart from './pages/Cart'
import { useCart } from './context/CartContext'

export default function App() {
  const { cart } = useCart()

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Link to="/">Flipkart Clone</Link>
        </div>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/cart">Cart ({cart.length})</Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>

      <footer className="footer">© Flipkart Clone - Basic</footer>
    </div>
  )
}
