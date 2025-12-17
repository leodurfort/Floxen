'use client';

import { useState, useRef, useEffect } from 'react';
import { Product } from '@productsynch/shared';

interface Props {
  products: Product[];
  value: string | null;  // Selected product ID
  onChange: (productId: string) => void;
}

export function ProductSelector({ products, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use wooTitle - it contains the full product name (parent + variation attributes)
  const getProductName = (product: Product): string => {
    return product.wooTitle;
  };

  const filteredProducts = searchQuery
    ? products.filter((p) => {
        const name = getProductName(p);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : products;

  const selectedProduct = products.find((p) => p.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(product: Product) {
    onChange(product.id);
    setIsOpen(false);
    setSearchQuery('');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border border-white/10 transition-colors flex items-center justify-between"
      >
        <span className="text-sm text-white truncate">
          {selectedProduct ? getProductName(selectedProduct) : 'Select product for preview...'}
        </span>
        <svg className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#252936] rounded-lg border border-white/10 shadow-2xl max-h-[320px] overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 bg-[#1a1d29] text-white text-sm rounded border border-white/10 focus:outline-none focus:border-[#5df0c0]"
              autoFocus
            />
          </div>

          {/* Product List */}
          <div className="overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">No products found</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/5 last:border-0 ${
                    value === product.id ? 'bg-[#2d3142]' : ''
                  }`}
                >
                  <div className="text-sm text-white font-medium truncate">{getProductName(product)}</div>
                  <div className="text-xs text-white/40 mt-0.5">ID: {product.wooProductId}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
