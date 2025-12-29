'use client';

import { useState, useRef, useEffect } from 'react';
import { CatalogProduct } from '@productsynch/shared';

interface Props {
  products: CatalogProduct[];
  value: string | null;  // Selected product ID
  onChange: (productId: string) => void;
}

export function ProductSelector({ products, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getProductName = (product: CatalogProduct): string => {
    const openaiTitle = product.openaiAutoFilled?.title as string | undefined;
    return openaiTitle || `Product ${product.id}`;
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

  function handleSelect(product: CatalogProduct) {
    onChange(product.id);
    setIsOpen(false);
    setSearchQuery('');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white hover:bg-gray-50 rounded-lg border border-[#FA7315] transition-colors flex items-center justify-between"
      >
        <span className="text-sm text-gray-900 truncate">
          {selectedProduct ? getProductName(selectedProduct) : 'Select product for preview...'}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[320px] overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-200 focus:outline-none focus:border-[#FA7315]"
              autoFocus
            />
          </div>

          {/* Product List */}
          <div className="overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No products found</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    value === product.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-sm text-gray-900 font-medium truncate">{getProductName(product)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
