# Product Requirements Document (PRD)
# WooCommerce Test Data Generator

**Version:** 1.0
**Date:** January 11, 2026
**Author:** PM Agent
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [User Flow](#5-user-flow)
6. [Functional Requirements](#6-functional-requirements)
7. [Product Catalog Specification](#7-product-catalog-specification)
8. [Edge Cases & Test Scenarios](#8-edge-cases--test-scenarios)
9. [Field Mapping Coverage](#9-field-mapping-coverage)
10. [Technical Requirements](#10-technical-requirements)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Out of Scope](#12-out-of-scope)
13. [Appendix](#13-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview

**WooCommerce Test Data Generator** is a developer tool that populates WooCommerce stores with approximately 500 fake apparel products. Its primary purpose is to enable comprehensive testing of ProductSync's field mapping and synchronization features.

### 1.2 Key Features

- **One-click OAuth connection** to any WooCommerce store
- **Automatic generation** of ~500 realistic apparel products
- **Comprehensive coverage** of all 70 OpenAI feed fields
- **Edge case testing** including special characters, long text, missing data
- **Progress tracking** during generation
- **Cleanup functionality** to remove only generated products

### 1.3 Target Release

Single release containing all features (no phased approach).

---

## 2. Problem Statement

### 2.1 Current Situation

ProductSync is a product synchronization application that maps WooCommerce product data to OpenAI feed format. Testing requires:

- A WooCommerce store with products
- Products covering all 70 field mappings
- Products testing all 17 transform functions
- Edge cases (special characters, missing data, extreme values)
- Various product types (simple, variable, grouped)

### 2.2 Pain Points

1. **Manual setup is time-consuming** - Creating 500+ test products manually takes hours
2. **Incomplete coverage** - Manual creation often misses edge cases
3. **Inconsistent test data** - Different testers create different data sets
4. **No cleanup mechanism** - Test data pollutes stores after testing

### 2.3 Solution

An automated tool that generates a standardized, comprehensive test dataset covering all ProductSync features in minutes.

---

## 3. Goals & Success Metrics

### 3.1 Primary Goals

| Goal | Description |
|------|-------------|
| **G1** | Enable one-click generation of comprehensive test data |
| **G2** | Cover 100% of ProductSync field mappings |
| **G3** | Test all transform functions with appropriate data |
| **G4** | Provide easy cleanup without affecting other products |

### 3.2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Products Generated** | 500 products | Count of successfully created products |
| **Field Coverage** | 100% (70/70 fields) | Fields with test data / Total fields |
| **Transform Coverage** | 100% (17/17 transforms) | Transforms exercised / Total transforms |
| **Error Rate** | 0% | Failed products / Total products |
| **Generation Time** | < 10 minutes | Time from start to completion |

---

## 4. User Personas

### 4.1 Primary Persona: Developer/QA Tester

**Name:** Alex
**Role:** Developer testing ProductSync
**Goals:**
- Quickly populate a test store with realistic data
- Test all field mappings work correctly
- Verify edge cases are handled properly
- Clean up test data when done

**Pain Points:**
- No time to manually create hundreds of products
- Forgets to test certain edge cases
- Leaves test data in stores accidentally

---

## 5. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WooCommerce Test Data Generator              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Landing Page                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Enter your WooCommerce store URL:                        │  │
│  │  [https://mystore.com                              ]      │  │
│  │                                                           │  │
│  │  [    Connect Store    ]                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: OAuth Redirect                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  → Redirect to WooCommerce OAuth authorization page       │  │
│  │  → User approves connection                               │  │
│  │  → Redirect back with credentials                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Connected State                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ Connected to: mystore.com                              │  │
│  │                                                           │  │
│  │  This will generate approximately 500 test products       │  │
│  │  covering all ProductSync field mappings and edge cases.  │  │
│  │                                                           │  │
│  │  Categories: Shirts, Hoodies, Jackets, Pants, Shorts,     │  │
│  │             Sneakers, Boots, Sandals, Hats, Bags, Belts   │  │
│  │                                                           │  │
│  │  [    Generate Products    ]                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Generation Progress                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Generating products...                                   │  │
│  │                                                           │  │
│  │  [████████████████████░░░░░░░░░░] 67%                     │  │
│  │                                                           │  │
│  │  Created: 335 / 500 products                              │  │
│  │  Current: Creating "Vintage Denim Jacket - Navy / L"      │  │
│  │                                                           │  │
│  │  Categories created: 11/11                                │  │
│  │  Simple products: 120/180                                 │  │
│  │  Variable products: 180/270                               │  │
│  │  Grouped products: 35/50                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Completion Summary                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ Generation Complete!                                   │  │
│  │                                                           │  │
│  │  Summary:                                                 │  │
│  │  • Total products created: 500                            │  │
│  │  • Categories created: 11                                 │  │
│  │  • Simple products: 180                                   │  │
│  │  • Variable products: 270 (1,847 variations)              │  │
│  │  • Grouped products: 50                                   │  │
│  │                                                           │  │
│  │  Field Coverage: 70/70 (100%)                             │  │
│  │  Edge Cases: 45/45 (100%)                                 │  │
│  │                                                           │  │
│  │  [  View in WooCommerce  ]  [  Cleanup Products  ]        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (if cleanup clicked)
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Cleanup Confirmation                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ⚠️ Cleanup Test Products                                 │  │
│  │                                                           │  │
│  │  This will permanently delete all 500 products            │  │
│  │  generated by this tool.                                  │  │
│  │                                                           │  │
│  │  Only products with the meta field                        │  │
│  │  "_generated_by: woo-test-generator" will be deleted.     │  │
│  │                                                           │  │
│  │  Your other products will NOT be affected.                │  │
│  │                                                           │  │
│  │  [  Cancel  ]  [  Delete Products  ]                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Cleanup Complete                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ✓ Cleanup Complete!                                      │  │
│  │                                                           │  │
│  │  Deleted: 500 products                                    │  │
│  │  Deleted: 11 categories                                   │  │
│  │                                                           │  │
│  │  [  Generate Again  ]  [  Disconnect  ]                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Functional Requirements

### 6.1 Store Connection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | User can enter a WooCommerce store URL | Must Have |
| FR-1.2 | System validates URL format before OAuth | Must Have |
| FR-1.3 | OAuth uses same flow as ProductSync (WooCommerce built-in OAuth) | Must Have |
| FR-1.4 | System stores credentials in session only (stateless) | Must Have |
| FR-1.5 | User can disconnect and connect a different store | Should Have |
| FR-1.6 | WooCommerce store must be version 5.0+ with REST API enabled | Must Have |
| FR-1.7 | Only one session per store URL at a time (single-session limitation) | Must Have |

### 6.2 Product Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Generate approximately 500 products total | Must Have |
| FR-2.2 | Create all 11 product categories with hierarchy | Must Have |
| FR-2.3 | Generate simple, variable, and grouped product types | Must Have |
| FR-2.4 | All products tagged with meta field `_generated_by: woo-test-generator` | Must Have |
| FR-2.5 | Use fictional brand names | Must Have |
| FR-2.6 | Generate real-looking SKUs | Must Have |
| FR-2.7 | Use generic placeholder images | Must Have |
| FR-2.8 | Stop immediately on any error | Must Have |

### 6.3 Progress Tracking

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Display progress bar during generation | Must Have |
| FR-3.2 | Show count of products created vs total | Must Have |
| FR-3.3 | Show current product being created | Should Have |
| FR-3.4 | Show breakdown by product type | Should Have |

### 6.4 Cleanup

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Delete only products with `_generated_by: woo-test-generator` meta | Must Have |
| FR-4.2 | Delete associated categories created by generator | Should Have |
| FR-4.3 | Show confirmation before deletion | Must Have |
| FR-4.4 | Show deletion progress | Should Have |

---

## 7. Product Catalog Specification

### 7.1 Category Structure

```
Apparel (Parent)
├── Tops
│   ├── T-Shirts
│   ├── Hoodies
│   └── Jackets
├── Bottoms
│   ├── Pants
│   └── Shorts
├── Footwear
│   ├── Sneakers
│   ├── Boots
│   └── Sandals
└── Accessories
    ├── Hats
    ├── Bags
    └── Belts
```

**Total Categories:** 14 (3 parent + 11 leaf categories)

### 7.2 Fictional Brands

| Brand Name | Style | Categories |
|------------|-------|------------|
| **UrbanThread** | Streetwear, casual | T-Shirts, Hoodies, Sneakers |
| **NorthPeak** | Outdoor, performance | Jackets, Boots, Bags |
| **VelvetStride** | Premium, luxury | Pants, Belts, Accessories |
| **CoastalBreeze** | Summer, beach | Shorts, Sandals, Hats |
| **IronForge** | Workwear, durable | Jackets, Boots, Belts |
| **ZenFlow** | Athleisure, comfort | Hoodies, Pants, Sneakers |
| **MetroStyle** | Urban, modern | T-Shirts, Jackets, Bags |
| **WildTrail** | Adventure, hiking | Boots, Shorts, Hats |
| **SilkHaven** | Elegant, refined | Pants, Accessories |
| **StreetPulse** | Youth, trendy | Sneakers, Hoodies, Hats |

### 7.3 Product Distribution

| Category | Simple | Variable | Grouped | Total |
|----------|--------|----------|---------|-------|
| T-Shirts | 15 | 30 | 5 | 50 |
| Hoodies | 12 | 25 | 3 | 40 |
| Jackets | 10 | 25 | 5 | 40 |
| Pants | 12 | 28 | 5 | 45 |
| Shorts | 15 | 20 | 5 | 40 |
| Sneakers | 10 | 30 | 5 | 45 |
| Boots | 12 | 23 | 5 | 40 |
| Sandals | 18 | 17 | 5 | 40 |
| Hats | 25 | 15 | 5 | 45 |
| Bags | 20 | 22 | 3 | 45 |
| Belts | 31 | 35 | 4 | 70 |
| **TOTAL** | **180** | **270** | **50** | **500** |

### 7.4 Complete Product Catalog

#### 7.4.1 T-Shirts (50 products)

**Simple Products (15):**

| # | SKU | Name | Brand | Price | Description | Edge Case |
|---|-----|------|-------|-------|-------------|-----------|
| 1 | TSH-001 | Classic Cotton Tee | UrbanThread | $29.99 | Standard product | Baseline |
| 2 | TSH-002 | Vintage Logo Tee | MetroStyle | $34.99 | Product with sale price | Sale price testing |
| 3 | TSH-003 | Performance Dry-Fit Tee | ZenFlow | $44.99 | High stock (10,000) | Large inventory |
| 4 | TSH-004 | Limited Edition Art Tee | StreetPulse | $89.99 | Zero stock | Out of stock |
| 5 | TSH-005 | Basic Crew Neck | UrbanThread | $19.99 | Backorder enabled | Backorder status |
| 6 | TSH-006 | Summer Vibes Tee | CoastalBreeze | $24.99 | No description | Missing description |
| 7 | TSH-007 | Oversized Graphic Tee | StreetPulse | $39.99 | Very long title that exceeds normal display limits and tests truncation handling in various UI components | Long title (150+ chars) |
| 8 | TSH-008 | Minimalist Pocket Tee | MetroStyle | $27.99 | Description with <strong>HTML tags</strong> and <em>formatting</em> | HTML in description |
| 9 | TSH-009 | Retro 80s Tee | UrbanThread | $32.99 | Description with emojis and special chars! @#$%^&*() | Special characters |
| 10 | TSH-010 | Organic Hemp Tee | ZenFlow | $54.99 | Product with all meta fields populated | Full meta data |
| 11 | TSH-011 | Tour Merch Tee 2024 | StreetPulse | $45.00 | Price ending in .00 | Round price |
| 12 | TSH-012 | Clearance Basic Tee | UrbanThread | $9.99 | Very low price | Low price edge |
| 13 | TSH-013 | Designer Collab Tee | VelvetStride | $299.99 | High price point | High price edge |
| 14 | TSH-014 | | MetroStyle | $29.99 | Product with empty title | Missing title |
| 15 | TSH-015 | Ultra Light Tee | ZenFlow | $0.01 | Minimum price | Minimum price |

**Variable Products (30):**

| # | SKU | Name | Brand | Base Price | Variations | Edge Case |
|---|-----|------|-------|------------|------------|-----------|
| 16 | TSH-VAR-001 | Essential Cotton Tee | UrbanThread | $29.99 | 5 colors x 6 sizes (30) | Standard variations |
| 17 | TSH-VAR-002 | Premium Blend Tee | MetroStyle | $39.99 | 3 colors x 5 sizes (15) | Medium variations |
| 18 | TSH-VAR-003 | Athletic Performance Tee | ZenFlow | $49.99 | 8 colors x 7 sizes (56) | Many variations |
| 19 | TSH-VAR-004 | Graphic Print Series | StreetPulse | $35.99 | 2 colors x 3 sizes (6) | Few variations |
| 20 | TSH-VAR-005 | Rainbow Collection Tee | CoastalBreeze | $32.99 | 12 colors x 1 size (12) | Single size, many colors |
| 21 | TSH-VAR-006 | One Color Wonder | UrbanThread | $27.99 | 1 color x 8 sizes (8) | Single color, many sizes |
| 22 | TSH-VAR-007 | Ultimate Flex Tee | ZenFlow | $44.99 | 5 colors x 6 sizes x 2 materials (60) | Three attributes |
| 23 | TSH-VAR-008 | Stress Test Mega Tee | UrbanThread | $34.99 | 10 colors x 8 sizes (80) | Stress test: 80 variations |
| 24 | TSH-VAR-009 | Sale Season Tee | MetroStyle | $45.99 | 4 colors x 5 sizes (20) | All variations on sale |
| 25 | TSH-VAR-010 | Mixed Stock Tee | StreetPulse | $33.99 | 3 colors x 4 sizes (12) | Mixed stock statuses |
| 26 | TSH-VAR-011 | Price Variant Tee | VelvetStride | $29.99-89.99 | 3 colors x 3 sizes (9) | Variable pricing per variant |
| 27 | TSH-VAR-012 | SKU Pattern Tee | MetroStyle | $36.99 | 4 colors x 4 sizes (16) | Complex SKU patterns |
| 28 | TSH-VAR-013 | Image Gallery Tee | UrbanThread | $31.99 | 3 colors x 3 sizes (9) | Multiple images per variant |
| 29 | TSH-VAR-014 | Weight Variant Tee | NorthPeak | $42.99 | 2 materials x 4 sizes (8) | Different weights per variant |
| 30 | TSH-VAR-015 | Dimension Variant Tee | IronForge | $38.99 | 3 fits x 3 sizes (9) | Different dimensions per variant |
| 31 | TSH-VAR-016 | GTIN Test Tee | ZenFlow | $35.99 | 3 colors x 2 sizes (6) | GTIN per variant |
| 32 | TSH-VAR-017 | Long Attribute Names Tee | StreetPulse | $33.99 | 2 x 2 (4) | Very long attribute names |
| 33 | TSH-VAR-018 | Special Char Variant | UrbanThread | $29.99 | 3 x 2 (6) | Special chars in variant names |
| 34 | TSH-VAR-019 | Unicode Variant Tee | MetroStyle | $37.99 | 3 x 3 (9) | Unicode in variant names |
| 35 | TSH-VAR-020 | Empty Variant Tee | CoastalBreeze | $28.99 | 2 x 2 (4) | Some variants missing data |
| 36 | TSH-VAR-021 | Duplicate Title Variant | UrbanThread | $30.99 | 2 x 2 (4) | Variant titles match parent |
| 37 | TSH-VAR-022 | Zero Price Variant | StreetPulse | $0.00-39.99 | 2 x 2 (4) | Some variants $0 |
| 38 | TSH-VAR-023 | Huge Price Range Tee | VelvetStride | $9.99-999.99 | 3 x 2 (6) | Extreme price variance |
| 39 | TSH-VAR-024 | All Backorder Tee | MetroStyle | $34.99 | 2 x 3 (6) | All variants backorder |
| 40 | TSH-VAR-025 | Partial Image Tee | UrbanThread | $32.99 | 3 x 2 (6) | Some variants no image |
| 41 | TSH-VAR-026 | Date Range Sale Tee | ZenFlow | $44.99 | 3 x 3 (9) | Sale with date range |
| 42 | TSH-VAR-027 | Custom Attribute Tee | StreetPulse | $36.99 | Custom1 x Custom2 (6) | Non-standard attributes |
| 43 | TSH-VAR-028 | Minimal Data Tee | CoastalBreeze | $25.99 | 2 x 2 (4) | Minimal variant data |
| 44 | TSH-VAR-029 | Maximum Data Tee | NorthPeak | $48.99 | 3 x 3 (9) | All fields populated |
| 45 | TSH-VAR-030 | Numeric Attribute Tee | IronForge | $39.99 | 3 x 3 (9) | Numeric attribute values |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 46 | TSH-GRP-001 | Summer Essentials Bundle | UrbanThread | 3 simple products | Standard grouped |
| 47 | TSH-GRP-002 | Color Coordinated Set | MetroStyle | 5 simple products | Multiple children |
| 48 | TSH-GRP-003 | Family Pack | ZenFlow | 2 variable products | Variable children |
| 49 | TSH-GRP-004 | Complete Wardrobe Set | StreetPulse | 8 mixed products | Many mixed children |
| 50 | TSH-GRP-005 | Duo Pack | CoastalBreeze | 2 simple products | Minimal grouped |

---

#### 7.4.2 Hoodies (40 products)

**Simple Products (12):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 51 | HOD-001 | Classic Pullover Hoodie | UrbanThread | $59.99 | Baseline |
| 52 | HOD-002 | Zip-Up Fleece Hoodie | ZenFlow | $69.99 | Full-zip type |
| 53 | HOD-003 | Heavyweight Winter Hoodie | NorthPeak | $89.99 | Heavy weight (800g) |
| 54 | HOD-004 | Lightweight Summer Hoodie | CoastalBreeze | $49.99 | Light weight (200g) |
| 55 | HOD-005 | Cropped Hoodie | StreetPulse | $54.99 | Non-standard dimensions |
| 56 | HOD-006 | Oversized Blanket Hoodie | ZenFlow | $79.99 | Extra large dimensions |
| 57 | HOD-007 | Tech Fleece Hoodie | MetroStyle | $99.99 | Premium material |
| 58 | HOD-008 | Recycled Cotton Hoodie | NorthPeak | $74.99 | Eco-friendly tag |
| 59 | HOD-009 | Artist Collab Hoodie | StreetPulse | $149.99 | Limited edition |
| 60 | HOD-010 | Basic Budget Hoodie | UrbanThread | $34.99 | Low price point |
| 61 | HOD-011 | Vintage Wash Hoodie | MetroStyle | $64.99 | Special wash |
| 62 | HOD-012 | Performance Hoodie | ZenFlow | $84.99 | Athletic category |

**Variable Products (25):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 63 | HOD-VAR-001 | Essential Pullover | UrbanThread | 6 colors x 5 sizes (30) | Standard |
| 64 | HOD-VAR-002 | Premium Zip Hoodie | ZenFlow | 4 colors x 6 sizes (24) | Zip type |
| 65 | HOD-VAR-003 | Ultra Collection | NorthPeak | 10 colors x 8 sizes (80) | Stress test |
| 66 | HOD-VAR-004 | Seasonal Limited | StreetPulse | 3 colors x 4 sizes (12) | Limited stock |
| 67 | HOD-VAR-005 | All-Weather Hoodie | NorthPeak | 5 colors x 5 sizes x 2 weights (50) | 3 attributes |
| 68 | HOD-VAR-006 | Kids Hoodie | CoastalBreeze | 4 colors x 4 sizes (16) | Kids sizes |
| 69 | HOD-VAR-007 | Plus Size Hoodie | ZenFlow | 3 colors x 5 sizes (15) | Extended sizes |
| 70 | HOD-VAR-008 | Tall Fit Hoodie | MetroStyle | 2 colors x 4 sizes (8) | Tall sizing |
| 71 | HOD-VAR-009 | Petite Hoodie | VelvetStride | 3 colors x 3 sizes (9) | Petite sizing |
| 72 | HOD-VAR-010 | Unisex Hoodie | UrbanThread | 5 colors x 7 sizes (35) | Unisex |
| 73 | HOD-VAR-011 | Gendered Hoodie Set | MetroStyle | 4 colors x 6 sizes x 2 genders (48) | Gender attribute |
| 74 | HOD-VAR-012 | Pattern Hoodie | StreetPulse | 6 patterns x 4 sizes (24) | Pattern attribute |
| 75 | HOD-VAR-013 | Custom Print Hoodie | CoastalBreeze | 4 designs x 5 sizes (20) | Design attribute |
| 76 | HOD-VAR-014 | Team Sports Hoodie | ZenFlow | 8 teams x 4 sizes (32) | Team attribute |
| 77 | HOD-VAR-015 | Gradient Hoodie | StreetPulse | 5 gradients x 4 sizes (20) | Gradient names |
| 78 | HOD-VAR-016 | Neon Hoodie | UrbanThread | 4 neon colors x 5 sizes (20) | Neon color names |
| 79 | HOD-VAR-017 | Pastel Hoodie | CoastalBreeze | 6 pastels x 4 sizes (24) | Pastel color names |
| 80 | HOD-VAR-018 | Earth Tone Hoodie | NorthPeak | 5 earth tones x 5 sizes (25) | Nature color names |
| 81 | HOD-VAR-019 | Monochrome Hoodie | MetroStyle | 5 shades x 4 sizes (20) | Shade names |
| 82 | HOD-VAR-020 | Metallic Hoodie | VelvetStride | 3 metallics x 4 sizes (12) | Metallic names |
| 83 | HOD-VAR-021 | Camo Hoodie | IronForge | 4 camo patterns x 5 sizes (20) | Camo patterns |
| 84 | HOD-VAR-022 | Tie-Dye Hoodie | CoastalBreeze | 5 tie-dyes x 4 sizes (20) | Tie-dye names |
| 85 | HOD-VAR-023 | Color Block Hoodie | StreetPulse | 4 combos x 5 sizes (20) | Multi-color names |
| 86 | HOD-VAR-024 | Ombre Hoodie | VelvetStride | 3 ombres x 4 sizes (12) | Gradient names |
| 87 | HOD-VAR-025 | Reversible Hoodie | MetroStyle | 3 combos x 5 sizes (15) | Reversible |

**Grouped Products (3):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 88 | HOD-GRP-001 | Hoodie & Jogger Set | ZenFlow | 2 products | Matching set |
| 89 | HOD-GRP-002 | Family Hoodie Pack | UrbanThread | 4 products | Size range |
| 90 | HOD-GRP-003 | Layering Bundle | NorthPeak | 3 products | Complementary |

---

#### 7.4.3 Jackets (40 products)

**Simple Products (10):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 91 | JKT-001 | Classic Denim Jacket | MetroStyle | $89.99 | Baseline |
| 92 | JKT-002 | Waterproof Rain Jacket | NorthPeak | $129.99 | Weather resistant |
| 93 | JKT-003 | Leather Biker Jacket | IronForge | $299.99 | Premium material |
| 94 | JKT-004 | Puffer Down Jacket | NorthPeak | $199.99 | Heavy insulation |
| 95 | JKT-005 | Bomber Jacket | UrbanThread | $79.99 | Classic style |
| 96 | JKT-006 | Windbreaker | CoastalBreeze | $59.99 | Lightweight |
| 97 | JKT-007 | Varsity Jacket | StreetPulse | $109.99 | Sport style |
| 98 | JKT-008 | Blazer | VelvetStride | $179.99 | Formal |
| 99 | JKT-009 | Track Jacket | ZenFlow | $69.99 | Athletic |
| 100 | JKT-010 | Utility Jacket | IronForge | $119.99 | Multi-pocket |

**Variable Products (25):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 101 | JKT-VAR-001 | All-Season Jacket | NorthPeak | 4 colors x 5 sizes (20) | Standard |
| 102 | JKT-VAR-002 | Insulated Jacket | NorthPeak | 3 colors x 5 sizes x 2 insulations (30) | 3 attributes |
| 103 | JKT-VAR-003 | Convertible Jacket | WildTrail | 2 colors x 4 sizes (8) | Zip-off sleeves |
| 104 | JKT-VAR-004 | 3-in-1 System Jacket | NorthPeak | 3 colors x 5 sizes (15) | Modular |
| 105-125 | JKT-VAR-005 to JKT-VAR-025 | Various Jackets | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 126 | JKT-GRP-001 | Layering System | NorthPeak | 3 products | Complementary layers |
| 127 | JKT-GRP-002 | His & Hers Jackets | MetroStyle | 2 products | Gendered pair |
| 128 | JKT-GRP-003 | Weather Collection | NorthPeak | 4 products | Weather types |
| 129 | JKT-GRP-004 | Style Collection | UrbanThread | 3 products | Style variety |
| 130 | JKT-GRP-005 | Budget Bundle | CoastalBreeze | 2 products | Value pack |

---

#### 7.4.4 Pants (45 products)

**Simple Products (12):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 131 | PNT-001 | Classic Chinos | VelvetStride | $69.99 | Baseline |
| 132 | PNT-002 | Slim Fit Jeans | MetroStyle | $79.99 | Denim |
| 133 | PNT-003 | Cargo Pants | IronForge | $89.99 | Multi-pocket |
| 134 | PNT-004 | Joggers | ZenFlow | $59.99 | Athletic |
| 135 | PNT-005 | Dress Pants | VelvetStride | $99.99 | Formal |
| 136 | PNT-006 | Sweatpants | UrbanThread | $49.99 | Casual |
| 137 | PNT-007 | Linen Pants | CoastalBreeze | $74.99 | Summer |
| 138 | PNT-008 | Work Pants | IronForge | $84.99 | Durable |
| 139 | PNT-009 | Track Pants | ZenFlow | $54.99 | Sport |
| 140 | PNT-010 | Pleated Trousers | SilkHaven | $119.99 | Elegant |
| 141 | PNT-011 | Corduroys | MetroStyle | $79.99 | Textured |
| 142 | PNT-012 | Fleece Pants | NorthPeak | $64.99 | Warm |

**Variable Products (28):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 143 | PNT-VAR-001 | Essential Chino | VelvetStride | 5 colors x 10 waist x 4 length (200) | Stress test: waist+length |
| 144 | PNT-VAR-002 | Stretch Jeans | MetroStyle | 4 washes x 8 sizes (32) | Wash attribute |
| 145 | PNT-VAR-003 | Tapered Pants | ZenFlow | 3 fits x 6 sizes (18) | Fit attribute |
| 146-170 | PNT-VAR-004 to PNT-VAR-028 | Various Pants | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 171 | PNT-GRP-001 | Work Week Pack | VelvetStride | 5 products | 5-day rotation |
| 172 | PNT-GRP-002 | Casual Bundle | UrbanThread | 3 products | Casual variety |
| 173 | PNT-GRP-003 | Active Set | ZenFlow | 2 products | Sport pair |
| 174 | PNT-GRP-004 | Seasonal Pack | CoastalBreeze | 4 products | Season variety |
| 175 | PNT-GRP-005 | Color Coordinated | MetroStyle | 3 products | Color matching |

---

#### 7.4.5 Shorts (40 products)

**Simple Products (15):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 176 | SHT-001 | Classic Chino Shorts | CoastalBreeze | $44.99 | Baseline |
| 177 | SHT-002 | Board Shorts | CoastalBreeze | $39.99 | Swim |
| 178 | SHT-003 | Cargo Shorts | IronForge | $54.99 | Multi-pocket |
| 179 | SHT-004 | Athletic Shorts | ZenFlow | $34.99 | Sport |
| 180 | SHT-005 | Denim Shorts | MetroStyle | $49.99 | Denim |
| 181 | SHT-006 | Swim Trunks | CoastalBreeze | $29.99 | Swim specific |
| 182 | SHT-007 | Running Shorts | ZenFlow | $39.99 | Performance |
| 183 | SHT-008 | Hiking Shorts | WildTrail | $59.99 | Outdoor |
| 184 | SHT-009 | Golf Shorts | VelvetStride | $69.99 | Golf |
| 185 | SHT-010 | Compression Shorts | ZenFlow | $44.99 | Base layer |
| 186 | SHT-011 | Linen Shorts | CoastalBreeze | $54.99 | Summer |
| 187 | SHT-012 | Basketball Shorts | StreetPulse | $34.99 | Sport |
| 188 | SHT-013 | Sleep Shorts | UrbanThread | $24.99 | Loungewear |
| 189 | SHT-014 | Bike Shorts | ZenFlow | $49.99 | Cycling |
| 190 | SHT-015 | Fleece Shorts | NorthPeak | $39.99 | Warm |

**Variable Products (20):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 191 | SHT-VAR-001 | Essential Shorts | CoastalBreeze | 6 colors x 5 sizes (30) | Standard |
| 192-210 | SHT-VAR-002 to SHT-VAR-020 | Various Shorts | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 211 | SHT-GRP-001 | Summer Essentials | CoastalBreeze | 4 products | Summer pack |
| 212 | SHT-GRP-002 | Active Bundle | ZenFlow | 3 products | Sport variety |
| 213 | SHT-GRP-003 | Beach Pack | CoastalBreeze | 2 products | Beach wear |
| 214 | SHT-GRP-004 | Casual Set | UrbanThread | 3 products | Casual variety |
| 215 | SHT-GRP-005 | Multi-Sport Pack | ZenFlow | 4 products | Sport variety |

---

#### 7.4.6 Sneakers (45 products)

**Simple Products (10):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 216 | SNK-001 | Classic Canvas Sneaker | UrbanThread | $59.99 | Baseline |
| 217 | SNK-002 | Leather Low-Top | MetroStyle | $99.99 | Premium |
| 218 | SNK-003 | Running Shoe | ZenFlow | $129.99 | Performance |
| 219 | SNK-004 | High-Top Sneaker | StreetPulse | $89.99 | High-top |
| 220 | SNK-005 | Slip-On Sneaker | CoastalBreeze | $49.99 | No laces |
| 221 | SNK-006 | Platform Sneaker | StreetPulse | $79.99 | Platform |
| 222 | SNK-007 | Retro Sneaker | UrbanThread | $109.99 | Retro style |
| 223 | SNK-008 | Training Shoe | ZenFlow | $119.99 | Cross-training |
| 224 | SNK-009 | Skate Shoe | StreetPulse | $74.99 | Skate |
| 225 | SNK-010 | Walking Shoe | ZenFlow | $89.99 | Comfort |

**Variable Products (30):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 226 | SNK-VAR-001 | Essential Sneaker | UrbanThread | 5 colors x 12 US sizes (60) | US sizing |
| 227 | SNK-VAR-002 | Euro Sneaker | MetroStyle | 4 colors x 15 EU sizes (60) | EU sizing |
| 228 | SNK-VAR-003 | UK Style Sneaker | VelvetStride | 3 colors x 12 UK sizes (36) | UK sizing |
| 229 | SNK-VAR-004 | Wide Fit Sneaker | ZenFlow | 3 colors x 8 sizes x 2 widths (48) | Width attribute |
| 230 | SNK-VAR-005 | Kids Sneaker | StreetPulse | 4 colors x 10 kids sizes (40) | Kids sizing |
| 231 | SNK-VAR-006 | Half Size Sneaker | UrbanThread | 2 colors x 20 half sizes (40) | Half sizes |
| 232-255 | SNK-VAR-007 to SNK-VAR-030 | Various Sneakers | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 256 | SNK-GRP-001 | Sneaker Collection | UrbanThread | 3 products | Style variety |
| 257 | SNK-GRP-002 | His & Hers Sneakers | StreetPulse | 2 products | Gendered pair |
| 258 | SNK-GRP-003 | Sport Sneaker Set | ZenFlow | 4 products | Activity variety |
| 259 | SNK-GRP-004 | Seasonal Pack | MetroStyle | 3 products | Season variety |
| 260 | SNK-GRP-005 | Family Sneaker Pack | UrbanThread | 4 products | Size range |

---

#### 7.4.7 Boots (40 products)

**Simple Products (12):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 261 | BOT-001 | Classic Leather Boot | IronForge | $149.99 | Baseline |
| 262 | BOT-002 | Hiking Boot | WildTrail | $179.99 | Outdoor |
| 263 | BOT-003 | Chelsea Boot | VelvetStride | $169.99 | Dress |
| 264 | BOT-004 | Work Boot | IronForge | $199.99 | Safety toe |
| 265 | BOT-005 | Combat Boot | IronForge | $159.99 | Military style |
| 266 | BOT-006 | Rain Boot | NorthPeak | $79.99 | Waterproof |
| 267 | BOT-007 | Snow Boot | NorthPeak | $189.99 | Insulated |
| 268 | BOT-008 | Ankle Boot | MetroStyle | $129.99 | Low cut |
| 269 | BOT-009 | Cowboy Boot | WildTrail | $229.99 | Western |
| 270 | BOT-010 | Motorcycle Boot | IronForge | $199.99 | Biker |
| 271 | BOT-011 | Desert Boot | CoastalBreeze | $139.99 | Chukka |
| 272 | BOT-012 | Duck Boot | NorthPeak | $159.99 | Waterproof |

**Variable Products (23):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 273 | BOT-VAR-001 | All-Terrain Boot | WildTrail | 3 colors x 12 sizes (36) | Standard |
| 274 | BOT-VAR-002 | Insulated Boot | NorthPeak | 2 colors x 10 sizes x 2 insulations (40) | 3 attributes |
| 275-295 | BOT-VAR-003 to BOT-VAR-023 | Various Boots | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 296 | BOT-GRP-001 | All-Weather Boot Set | NorthPeak | 3 products | Weather variety |
| 297 | BOT-GRP-002 | Work Boot Bundle | IronForge | 2 products | Work pair |
| 298 | BOT-GRP-003 | Adventure Pack | WildTrail | 4 products | Outdoor variety |
| 299 | BOT-GRP-004 | Style Collection | MetroStyle | 3 products | Style variety |
| 300 | BOT-GRP-005 | Season Pack | NorthPeak | 4 products | Season variety |

---

#### 7.4.8 Sandals (40 products)

**Simple Products (18):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 301 | SND-001 | Classic Flip Flop | CoastalBreeze | $19.99 | Baseline |
| 302 | SND-002 | Sport Sandal | ZenFlow | $49.99 | Athletic |
| 303 | SND-003 | Leather Sandal | VelvetStride | $79.99 | Premium |
| 304 | SND-004 | Slide Sandal | UrbanThread | $34.99 | Slide |
| 305 | SND-005 | Hiking Sandal | WildTrail | $69.99 | Outdoor |
| 306 | SND-006 | Platform Sandal | StreetPulse | $54.99 | Platform |
| 307 | SND-007 | Espadrille Sandal | CoastalBreeze | $59.99 | Rope sole |
| 308 | SND-008 | Gladiator Sandal | VelvetStride | $89.99 | Strappy |
| 309 | SND-009 | Water Sandal | CoastalBreeze | $39.99 | Quick-dry |
| 310 | SND-010 | Orthopedic Sandal | ZenFlow | $99.99 | Comfort |
| 311 | SND-011 | Cork Sandal | NorthPeak | $74.99 | Cork footbed |
| 312 | SND-012 | Toe Ring Sandal | CoastalBreeze | $29.99 | Minimal |
| 313 | SND-013 | Wedge Sandal | VelvetStride | $69.99 | Wedge heel |
| 314 | SND-014 | Mule Sandal | MetroStyle | $64.99 | Backless |
| 315 | SND-015 | Fisherman Sandal | WildTrail | $59.99 | Closed toe |
| 316 | SND-016 | Reef Sandal | CoastalBreeze | $44.99 | Beach |
| 317 | SND-017 | Recovery Sandal | ZenFlow | $54.99 | Post-workout |
| 318 | SND-018 | Dressy Sandal | SilkHaven | $109.99 | Formal |

**Variable Products (17):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 319 | SND-VAR-001 | Essential Flip Flop | CoastalBreeze | 6 colors x 8 sizes (48) | Standard |
| 320-335 | SND-VAR-002 to SND-VAR-017 | Various Sandals | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 336 | SND-GRP-001 | Beach Essentials | CoastalBreeze | 3 products | Beach pack |
| 337 | SND-GRP-002 | Summer Bundle | CoastalBreeze | 4 products | Summer variety |
| 338 | SND-GRP-003 | Active Sandal Set | ZenFlow | 2 products | Sport pair |
| 339 | SND-GRP-004 | Vacation Pack | CoastalBreeze | 3 products | Travel variety |
| 340 | SND-GRP-005 | His & Hers Sandals | VelvetStride | 2 products | Gendered pair |

---

#### 7.4.9 Hats (45 products)

**Simple Products (25):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 341 | HAT-001 | Classic Baseball Cap | UrbanThread | $24.99 | Baseline |
| 342 | HAT-002 | Snapback Cap | StreetPulse | $29.99 | Snapback |
| 343 | HAT-003 | Dad Hat | MetroStyle | $22.99 | Relaxed fit |
| 344 | HAT-004 | Trucker Hat | WildTrail | $27.99 | Mesh back |
| 345 | HAT-005 | Beanie | NorthPeak | $19.99 | Winter |
| 346 | HAT-006 | Fedora | VelvetStride | $59.99 | Formal |
| 347 | HAT-007 | Bucket Hat | CoastalBreeze | $34.99 | Sun protection |
| 348 | HAT-008 | Visor | ZenFlow | $18.99 | Sport |
| 349 | HAT-009 | Panama Hat | SilkHaven | $79.99 | Summer formal |
| 350 | HAT-010 | Newsboy Cap | MetroStyle | $39.99 | Vintage |
| 351 | HAT-011 | Beret | VelvetStride | $44.99 | French style |
| 352 | HAT-012 | Sun Hat | CoastalBreeze | $29.99 | Wide brim |
| 353 | HAT-013 | Trapper Hat | NorthPeak | $49.99 | Ear flaps |
| 354 | HAT-014 | Flat Cap | MetroStyle | $34.99 | Irish style |
| 355 | HAT-015 | Running Hat | ZenFlow | $24.99 | Performance |
| 356 | HAT-016 | Pom Beanie | StreetPulse | $24.99 | Pom-pom |
| 357 | HAT-017 | Headband | ZenFlow | $14.99 | Athletic |
| 358 | HAT-018 | Bandana | UrbanThread | $12.99 | Versatile |
| 359 | HAT-019 | Cowboy Hat | WildTrail | $69.99 | Western |
| 360 | HAT-020 | Safari Hat | WildTrail | $44.99 | Outdoor |
| 361 | HAT-021 | Fitted Cap | StreetPulse | $32.99 | Fitted sizes |
| 362 | HAT-022 | Slouch Beanie | UrbanThread | $24.99 | Slouchy |
| 363 | HAT-023 | Cycling Cap | ZenFlow | $19.99 | Bike |
| 364 | HAT-024 | Golf Hat | VelvetStride | $34.99 | Golf |
| 365 | HAT-025 | Military Cap | IronForge | $29.99 | Cadet style |

**Variable Products (15):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 366 | HAT-VAR-001 | Essential Cap | UrbanThread | 8 colors x 3 sizes (24) | Standard |
| 367 | HAT-VAR-002 | Fitted Baseball Cap | StreetPulse | 4 colors x 8 fitted sizes (32) | Fitted sizing |
| 368 | HAT-VAR-003 | Adjustable Cap | MetroStyle | 10 colors x 1 size (10) | One size fits most |
| 369-380 | HAT-VAR-004 to HAT-VAR-015 | Various Hats | Mixed | Various | Various edge cases |

**Grouped Products (5):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 381 | HAT-GRP-001 | Cap Collection | UrbanThread | 3 products | Style variety |
| 382 | HAT-GRP-002 | Winter Hat Bundle | NorthPeak | 4 products | Winter variety |
| 383 | HAT-GRP-003 | Summer Hat Pack | CoastalBreeze | 3 products | Summer variety |
| 384 | HAT-GRP-004 | Sport Hat Set | ZenFlow | 2 products | Athletic variety |
| 385 | HAT-GRP-005 | Seasonal Collection | MetroStyle | 4 products | Season variety |

---

#### 7.4.10 Bags (45 products)

**Simple Products (20):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 386 | BAG-001 | Classic Backpack | UrbanThread | $59.99 | Baseline |
| 387 | BAG-002 | Laptop Backpack | MetroStyle | $89.99 | Tech |
| 388 | BAG-003 | Messenger Bag | MetroStyle | $79.99 | Crossbody |
| 389 | BAG-004 | Duffle Bag | ZenFlow | $69.99 | Gym |
| 390 | BAG-005 | Tote Bag | VelvetStride | $49.99 | Shopping |
| 391 | BAG-006 | Fanny Pack | StreetPulse | $34.99 | Waist |
| 392 | BAG-007 | Hiking Backpack | WildTrail | $129.99 | Outdoor |
| 393 | BAG-008 | Travel Backpack | NorthPeak | $149.99 | Travel |
| 394 | BAG-009 | Sling Bag | UrbanThread | $44.99 | Single strap |
| 395 | BAG-010 | Weekender Bag | VelvetStride | $119.99 | Overnight |
| 396 | BAG-011 | Crossbody Bag | MetroStyle | $54.99 | Small crossbody |
| 397 | BAG-012 | Drawstring Bag | StreetPulse | $19.99 | Simple |
| 398 | BAG-013 | Camera Bag | MetroStyle | $99.99 | Photography |
| 399 | BAG-014 | Cooler Bag | CoastalBreeze | $39.99 | Insulated |
| 400 | BAG-015 | Toiletry Bag | NorthPeak | $29.99 | Travel |
| 401 | BAG-016 | Garment Bag | SilkHaven | $79.99 | Suit |
| 402 | BAG-017 | Beach Bag | CoastalBreeze | $34.99 | Beach |
| 403 | BAG-018 | Gym Bag | ZenFlow | $49.99 | Fitness |
| 404 | BAG-019 | School Backpack | StreetPulse | $44.99 | Student |
| 405 | BAG-020 | Mini Backpack | UrbanThread | $39.99 | Compact |

**Variable Products (22):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 406 | BAG-VAR-001 | Essential Backpack | UrbanThread | 6 colors x 2 sizes (12) | Size attribute |
| 407 | BAG-VAR-002 | Capacity Backpack | NorthPeak | 3 colors x 3 capacities (9) | Liter capacity |
| 408-427 | BAG-VAR-003 to BAG-VAR-022 | Various Bags | Mixed | Various | Various edge cases |

**Grouped Products (3):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 428 | BAG-GRP-001 | Travel Set | NorthPeak | 3 products | Travel variety |
| 429 | BAG-GRP-002 | Active Bundle | ZenFlow | 2 products | Sport pair |
| 430 | BAG-GRP-003 | Everyday Collection | MetroStyle | 4 products | Daily variety |

---

#### 7.4.11 Belts (70 products)

**Simple Products (31):**

| # | SKU | Name | Brand | Price | Edge Case |
|---|-----|------|-------|-------|-----------|
| 431 | BLT-001 | Classic Leather Belt | VelvetStride | $49.99 | Baseline |
| 432 | BLT-002 | Reversible Belt | MetroStyle | $59.99 | Two-in-one |
| 433 | BLT-003 | Canvas Belt | UrbanThread | $29.99 | Fabric |
| 434 | BLT-004 | Braided Belt | CoastalBreeze | $39.99 | Woven |
| 435 | BLT-005 | Dress Belt | SilkHaven | $79.99 | Formal |
| 436 | BLT-006 | Western Belt | WildTrail | $69.99 | Cowboy |
| 437 | BLT-007 | Work Belt | IronForge | $54.99 | Heavy duty |
| 438 | BLT-008 | Golf Belt | VelvetStride | $44.99 | Sport |
| 439 | BLT-009 | Stretch Belt | ZenFlow | $34.99 | Elastic |
| 440 | BLT-010 | Chain Belt | StreetPulse | $24.99 | Fashion |
| 441 | BLT-011 | Studded Belt | IronForge | $49.99 | Punk |
| 442 | BLT-012 | Skinny Belt | VelvetStride | $29.99 | Thin |
| 443 | BLT-013 | Wide Belt | MetroStyle | $54.99 | Statement |
| 444 | BLT-014 | Webbing Belt | WildTrail | $24.99 | Military |
| 445 | BLT-015 | Suede Belt | SilkHaven | $64.99 | Texture |
| 446 | BLT-016 | Ratchet Belt | MetroStyle | $44.99 | Auto-adjust |
| 447 | BLT-017 | Suspenders | VelvetStride | $39.99 | Alternative |
| 448 | BLT-018 | Double Buckle Belt | IronForge | $59.99 | Statement |
| 449 | BLT-019 | Woven Leather Belt | VelvetStride | $69.99 | Crafted |
| 450 | BLT-020 | No-Hole Belt | ZenFlow | $49.99 | Modern |
| 451 | BLT-021 | Vintage Belt | MetroStyle | $54.99 | Distressed |
| 452 | BLT-022 | Nylon Belt | NorthPeak | $19.99 | Lightweight |
| 453 | BLT-023 | Rope Belt | CoastalBreeze | $24.99 | Nautical |
| 454 | BLT-024 | Athletic Belt | ZenFlow | $29.99 | Sport |
| 455 | BLT-025 | Money Belt | NorthPeak | $44.99 | Hidden pocket |
| 456 | BLT-026 | Quick Release Belt | IronForge | $39.99 | Tactical |
| 457 | BLT-027 | D-Ring Belt | UrbanThread | $27.99 | Casual |
| 458 | BLT-028 | O-Ring Belt | StreetPulse | $22.99 | Fashion |
| 459 | BLT-029 | Elastic Web Belt | CoastalBreeze | $19.99 | Stretch |
| 460 | BLT-030 | Exotic Leather Belt | SilkHaven | $149.99 | Premium |
| 461 | BLT-031 | Minimalist Belt | MetroStyle | $34.99 | Simple |

**Variable Products (35):**

| # | SKU | Name | Brand | Variations | Edge Case |
|---|-----|------|-------|------------|-----------|
| 462 | BLT-VAR-001 | Essential Leather Belt | VelvetStride | 4 colors x 8 waist sizes (32) | Waist sizing |
| 463 | BLT-VAR-002 | Reversible Dress Belt | MetroStyle | 3 combos x 6 sizes (18) | Color combos |
| 464 | BLT-VAR-003 | Width Selection Belt | SilkHaven | 2 colors x 3 widths x 5 sizes (30) | Width attribute |
| 465-496 | BLT-VAR-004 to BLT-VAR-035 | Various Belts | Mixed | Various | Various edge cases |

**Grouped Products (4):**

| # | SKU | Name | Brand | Children | Edge Case |
|---|-----|------|-------|----------|-----------|
| 497 | BLT-GRP-001 | Belt Collection | VelvetStride | 3 products | Style variety |
| 498 | BLT-GRP-002 | Work Belt Bundle | IronForge | 2 products | Durable pair |
| 499 | BLT-GRP-003 | Dress Belt Set | SilkHaven | 3 products | Formal variety |
| 500 | BLT-GRP-004 | Casual Belt Pack | UrbanThread | 4 products | Casual variety |

---

## 8. Edge Cases & Test Scenarios

### 8.1 Text Field Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-TXT-01 | Very long title (150+ chars) | "Oversized Graphic Print Premium Cotton Blend Short Sleeve Crew Neck T-Shirt with Vintage Wash and Embroidered Logo Detail - Limited Edition" | title |
| EC-TXT-02 | Title with special characters | "Rock & Roll Tee - 100% Cotton (Size: M-XL)" | title |
| EC-TXT-03 | Title with emojis | "Summer Vibes Tee" | title |
| EC-TXT-04 | Title with unicode | "Caf Mocha Tee" | title |
| EC-TXT-05 | Empty title | "" | title |
| EC-TXT-06 | Title with HTML entities | "Tom & Jerry Classic Tee" | title |
| EC-TXT-07 | Very long description (5000+ chars) | Lorem ipsum... | description |
| EC-TXT-08 | Description with HTML | "<p><strong>Bold</strong> and <em>italic</em></p>" | description |
| EC-TXT-09 | Description with scripts (XSS test) | "<script>alert('test')</script>Normal text" | description |
| EC-TXT-10 | Description with markdown | "**Bold** and *italic* and `code`" | description |
| EC-TXT-11 | Empty description | "" | description |
| EC-TXT-12 | Description with line breaks | "Line 1\nLine 2\nLine 3" | description |
| EC-TXT-13 | Description with tabs | "Column1\tColumn2\tColumn3" | description |
| EC-TXT-14 | Description with URLs | "Visit https://example.com for more" | description |
| EC-TXT-15 | Short description only | "Just a brief note" | short_description |

### 8.2 Price Field Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-PRC-01 | Zero price | $0.00 | price, regular_price |
| EC-PRC-02 | Minimum price | $0.01 | price |
| EC-PRC-03 | Maximum price | $999,999.99 | price |
| EC-PRC-04 | Round price | $100.00 | price |
| EC-PRC-05 | Odd cents | $19.97 | price |
| EC-PRC-06 | Sale price lower | Regular: $50, Sale: $25 | regular_price, sale_price |
| EC-PRC-07 | Sale price equals regular | Regular: $50, Sale: $50 | regular_price, sale_price |
| EC-PRC-08 | Sale with date range | Sale: $25, From: 2026-01-01, To: 2026-12-31 | sale_price, date_on_sale_from, date_on_sale_to |
| EC-PRC-09 | Past sale dates | From: 2025-01-01, To: 2025-06-30 | date_on_sale_from, date_on_sale_to |
| EC-PRC-10 | Future sale dates | From: 2027-01-01, To: 2027-12-31 | date_on_sale_from, date_on_sale_to |
| EC-PRC-11 | No regular price | Regular: null, Sale: $25 | regular_price |
| EC-PRC-12 | Many decimal places | $19.999999 (should round) | price |

### 8.3 Inventory Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-INV-01 | Zero stock | stock_quantity: 0 | stock_quantity |
| EC-INV-02 | Negative stock | stock_quantity: -5 | stock_quantity |
| EC-INV-03 | Large stock | stock_quantity: 1,000,000 | stock_quantity |
| EC-INV-04 | In stock status | stock_status: "instock" | stock_status |
| EC-INV-05 | Out of stock status | stock_status: "outofstock" | stock_status |
| EC-INV-06 | On backorder status | stock_status: "onbackorder" | stock_status |
| EC-INV-07 | Stock mismatch (qty 0, status instock) | qty: 0, status: "instock" | stock_quantity, stock_status |
| EC-INV-08 | Stock mismatch (qty 100, status outofstock) | qty: 100, status: "outofstock" | stock_quantity, stock_status |
| EC-INV-09 | Null stock quantity | stock_quantity: null | stock_quantity |
| EC-INV-10 | Manage stock disabled | manage_stock: false | manage_stock |

### 8.4 SKU Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-SKU-01 | Standard SKU | "TSH-001-BLK-M" | sku |
| EC-SKU-02 | Empty SKU | "" | sku |
| EC-SKU-03 | Very long SKU | "PRODUCT-CATEGORY-SUBCATEGORY-BRAND-STYLE-COLOR-SIZE-MATERIAL-001" | sku |
| EC-SKU-04 | SKU with special chars | "TSH/001.BLK-M" | sku |
| EC-SKU-05 | Numeric only SKU | "1234567890" | sku |
| EC-SKU-06 | SKU with spaces | "TSH 001 BLK M" | sku |
| EC-SKU-07 | Duplicate SKU (handled by WooCommerce) | Same SKU on two products | sku |
| EC-SKU-08 | Case sensitivity | "tsh-001" vs "TSH-001" | sku |

### 8.5 GTIN/Barcode Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-GTIN-01 | Valid UPC-A (12 digits) | "012345678905" | global_unique_id |
| EC-GTIN-02 | Valid EAN-13 (13 digits) | "4006381333931" | global_unique_id |
| EC-GTIN-03 | Valid GTIN-14 (14 digits) | "00614141000036" | global_unique_id |
| EC-GTIN-04 | Valid ISBN-13 | "978-3-16-148410-0" | global_unique_id |
| EC-GTIN-05 | GTIN in meta_data._gtin | meta_data: [{key: "_gtin", value: "012345678905"}] | meta_data |
| EC-GTIN-06 | GTIN in meta_data.gtin | meta_data: [{key: "gtin", value: "012345678905"}] | meta_data |
| EC-GTIN-07 | Empty GTIN | "" | global_unique_id |
| EC-GTIN-08 | Invalid GTIN (wrong length) | "12345" | global_unique_id |
| EC-GTIN-09 | GTIN with formatting | "012-345-678-905" | global_unique_id |

### 8.6 Dimension & Weight Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-DIM-01 | All dimensions populated | L: 10, W: 5, H: 2 | length, width, height |
| EC-DIM-02 | Partial dimensions (missing height) | L: 10, W: 5, H: null | length, width, height |
| EC-DIM-03 | Zero dimensions | L: 0, W: 0, H: 0 | length, width, height |
| EC-DIM-04 | Very large dimensions | L: 1000, W: 500, H: 200 | length, width, height |
| EC-DIM-05 | Decimal dimensions | L: 10.5, W: 5.25, H: 2.75 | length, width, height |
| EC-DIM-06 | Weight populated | weight: 0.5 | weight |
| EC-DIM-07 | Zero weight | weight: 0 | weight |
| EC-DIM-08 | Large weight | weight: 100 | weight |
| EC-DIM-09 | Decimal weight | weight: 0.125 | weight |
| EC-DIM-10 | No dimensions or weight | All null | dimensions, weight |

### 8.7 Image Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-IMG-01 | Single image | images: [img1] | images |
| EC-IMG-02 | Multiple images | images: [img1, img2, img3, img4, img5] | images |
| EC-IMG-03 | Many images (10+) | images: [img1...img15] | images |
| EC-IMG-04 | No images | images: [] | images |
| EC-IMG-05 | Image with alt text | {src: url, alt: "Description"} | images |
| EC-IMG-06 | Image without alt text | {src: url, alt: ""} | images |
| EC-IMG-07 | Invalid image URL | {src: "invalid-url"} | images |
| EC-IMG-08 | Very long image URL | {src: "https://...very-long-path..."} | images |

### 8.8 Category Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-CAT-01 | Single category | categories: [{name: "T-Shirts"}] | categories |
| EC-CAT-02 | Multiple categories | categories: [{name: "T-Shirts"}, {name: "Sale"}] | categories |
| EC-CAT-03 | Nested category (3 levels) | Apparel > Tops > T-Shirts | categories |
| EC-CAT-04 | Deeply nested (5 levels) | Level1 > Level2 > Level3 > Level4 > Level5 | categories |
| EC-CAT-05 | No category | categories: [] | categories |
| EC-CAT-06 | Category with special chars | "Men's & Women's Tops" | categories |
| EC-CAT-07 | Category with unicode | "Caf Collection" | categories |

### 8.9 Attribute Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-ATTR-01 | Standard color attribute | Color: ["Red", "Blue", "Green"] | attributes |
| EC-ATTR-02 | Standard size attribute | Size: ["XS", "S", "M", "L", "XL"] | attributes |
| EC-ATTR-03 | Custom attribute | Material: ["Cotton", "Polyester"] | attributes |
| EC-ATTR-04 | Many attribute options | Color: [20 colors] | attributes |
| EC-ATTR-05 | Long attribute name | "Primary Manufacturing Material Type": [...] | attributes |
| EC-ATTR-06 | Attribute with special chars | "Color/Pattern": [...] | attributes |
| EC-ATTR-07 | Numeric attribute values | Size: ["32", "34", "36", "38"] | attributes |
| EC-ATTR-08 | Mixed attribute values | Size: ["S", "M", "32", "34"] | attributes |
| EC-ATTR-09 | No attributes | attributes: [] | attributes |
| EC-ATTR-10 | Single option attribute | Color: ["Black"] | attributes |

### 8.10 Variation Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-VAR-01 | Few variations (4) | 2 colors x 2 sizes | variations |
| EC-VAR-02 | Medium variations (20) | 4 colors x 5 sizes | variations |
| EC-VAR-03 | Many variations (50+) | 5 colors x 10 sizes | variations |
| EC-VAR-04 | Stress test (80+) | 10 colors x 8 sizes | variations |
| EC-VAR-05 | Three attributes | Color x Size x Material | variations |
| EC-VAR-06 | Single attribute | Color only | variations |
| EC-VAR-07 | Variation with different prices | Each variation different price | variations |
| EC-VAR-08 | Variation with same prices | All variations same price | variations |
| EC-VAR-09 | Variation missing image | Some variations no image | variations |
| EC-VAR-10 | Variation missing SKU | Some variations no SKU | variations |
| EC-VAR-11 | Variation title matches parent | No differentiation in title | variations |
| EC-VAR-12 | All variations out of stock | stock_status: outofstock | variations |
| EC-VAR-13 | Mixed stock status | Some in, some out, some backorder | variations |
| EC-VAR-14 | Variation with GTIN | Each variation has GTIN | variations |

### 8.11 Product Type Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-TYPE-01 | Simple product | type: "simple" | type |
| EC-TYPE-02 | Variable product | type: "variable" | type |
| EC-TYPE-03 | Grouped product | type: "grouped" | type |
| EC-TYPE-04 | Grouped with simple children | Grouped > 3 simple | type, grouped_products |
| EC-TYPE-05 | Grouped with variable children | Grouped > 2 variable | type, grouped_products |
| EC-TYPE-06 | Grouped with mixed children | Grouped > simple + variable | type, grouped_products |
| EC-TYPE-07 | Many grouped children (10+) | Grouped > 10 products | grouped_products |
| EC-TYPE-08 | Few grouped children (2) | Grouped > 2 products | grouped_products |

### 8.12 Brand Edge Cases

| ID | Edge Case | Test Data | Fields Affected | Distribution |
|----|-----------|-----------|-----------------|--------------|
| EC-BRD-01 | Brand in WooCommerce Brands | pa_brand: "UrbanThread" | brand taxonomy | ~40% of products |
| EC-BRD-02 | Brand in attributes | attributes: [{name: "Brand", options: ["UrbanThread"]}] | attributes | ~30% of products |
| EC-BRD-03 | Brand in meta_data | meta_data: [{key: "_brand", value: "UrbanThread"}] | meta_data | ~20% of products |
| EC-BRD-04 | No brand | No brand data | - | ~10% of products |
| EC-BRD-05 | Brand with special chars | "Nike & Adidas Collab" | brand | Included in above |

**Implementation:** Products are automatically distributed across brand storage methods using a deterministic pattern based on product index. The generator creates the `pa_brand` global attribute taxonomy and all brand terms during the brands phase, before creating products.

### 8.13 Related Products Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-REL-01 | Has related products | related_ids: [101, 102, 103] | related_ids |
| EC-REL-02 | Has cross-sell products | cross_sell_ids: [201, 202] | cross_sell_ids |
| EC-REL-03 | Has upsell products | upsell_ids: [301, 302] | upsell_ids |
| EC-REL-04 | All relationship types | related + cross + upsell | all relationship fields |
| EC-REL-05 | No relationships | All empty | - |
| EC-REL-06 | Many related (20+) | related_ids: [20 products] | related_ids |

### 8.14 Review/Rating Edge Cases

| ID | Edge Case | Test Data | Fields Affected |
|----|-----------|-----------|-----------------|
| EC-REV-01 | Has reviews | rating_count: 50, average_rating: 4.5 | rating_count, average_rating |
| EC-REV-02 | No reviews | rating_count: 0, average_rating: 0 | rating_count, average_rating |
| EC-REV-03 | Perfect rating | rating_count: 100, average_rating: 5.0 | rating_count, average_rating |
| EC-REV-04 | Low rating | rating_count: 10, average_rating: 1.5 | rating_count, average_rating |
| EC-REV-05 | Many reviews | rating_count: 10000 | rating_count |
| EC-REV-06 | Single review | rating_count: 1, average_rating: 3.0 | rating_count, average_rating |

---

## 9. Field Mapping Coverage

### 9.1 Complete Field Coverage Matrix

This matrix shows how each of the 70 OpenAI feed fields is covered by test products.

| # | OpenAI Field | Category | Requirement | Products Covering | Transform Used |
|---|--------------|----------|-------------|-------------------|----------------|
| 1 | enable_search | Flags | Required | All 500 | - |
| 2 | enable_checkout | Flags | Feature Disabled | - | - |
| 3 | id | Basic | Required | All 500 | generateStableId |
| 4 | gtin | Basic | Required | 150 (30%) | extractGtin |
| 5 | mpn | Basic | Recommended | 100 (20%) | - |
| 6 | title | Basic | Required | All 500 | cleanVariationTitle |
| 7 | description | Basic | Required | 480 (96%) | stripHtml |
| 8 | link | Basic | Required | All 500 | - |
| 9 | condition | Item Info | Required | All 500 | defaultToNew |
| 10 | product_category | Item Info | Required | All 500 | buildCategoryPath |
| 11 | brand | Item Info | Required | All 500 | extractBrand |
| 12 | material | Item Info | Recommended | 350 (70%) | - |
| 13 | dimensions | Item Info | Optional | 300 (60%) | formatDimensions |
| 14 | length | Item Info | Optional | 300 (60%) | addUnit |
| 15 | width | Item Info | Optional | 300 (60%) | addUnit |
| 16 | height | Item Info | Optional | 300 (60%) | addUnit |
| 17 | weight | Item Info | Recommended | 400 (80%) | addWeightUnit |
| 18 | age_group | Item Info | Recommended | 200 (40%) | - |
| 19 | image_link | Media | Required | 495 (99%) | - |
| 20 | additional_image_link | Media | Recommended | 300 (60%) | extractAdditionalImages |
| 21 | video_link | Media | Optional | 20 (4%) | - |
| 22 | model_3d_link | Media | Optional | 5 (1%) | - |
| 23 | price | Price | Required | All 500 | formatPriceWithCurrency |
| 24 | sale_price | Price | Recommended | 200 (40%) | formatPriceWithCurrency |
| 25 | sale_price_effective_date | Price | Conditional | 100 (20%) | formatSaleDateRange |
| 26 | unit_pricing_measure | Price | Optional | 50 (10%) | - |
| 27 | unit_pricing_base_measure | Price | Optional | 50 (10%) | - |
| 28 | pricing_trend | Price | Optional | 30 (6%) | - |
| 29 | availability | Availability | Required | All 500 | mapStockStatus |
| 30 | availability_date | Availability | Conditional | 80 (16%) | - |
| 31 | inventory_quantity | Availability | Required | 450 (90%) | defaultToZero |
| 32 | expiration_date | Availability | Optional | 10 (2%) | - |
| 33 | pickup_method | Availability | Optional | 25 (5%) | - |
| 34 | pickup_sla | Availability | Optional | 25 (5%) | - |
| 35 | item_group_id | Variants | Required (var) | 270 variable | generateGroupId |
| 36 | item_group_title | Variants | Recommended | 270 variable | - |
| 37 | color | Variants | Recommended | 400 (80%) | - |
| 38 | size | Variants | Recommended | 450 (90%) | - |
| 39 | size_system | Variants | Recommended | 100 (20%) | - |
| 40 | gender | Variants | Recommended | 300 (60%) | - |
| 41 | offer_id | Variants | Required | All 500 | generateOfferId |
| 42 | custom_variant1_category | Variants | Optional | 100 (20%) | extractCustomVariant |
| 43 | custom_variant1_option | Variants | Optional | 100 (20%) | extractCustomVariantOption |
| 44 | custom_variant2_category | Variants | Optional | 50 (10%) | - |
| 45 | custom_variant2_option | Variants | Optional | 50 (10%) | - |
| 46 | custom_variant3_category | Variants | Optional | 20 (4%) | - |
| 47 | custom_variant3_option | Variants | Optional | 20 (4%) | - |
| 48 | shipping | Fulfillment | Recommended | 100 (20%) | buildShippingString |
| 49 | delivery_estimate | Fulfillment | Optional | 80 (16%) | - |
| 50 | seller_name | Merchant | Required | Shop-level | - |
| 51 | seller_url | Merchant | Required | Shop-level | - |
| 52 | seller_privacy_policy | Merchant | Required | Shop-level | - |
| 53 | seller_tos | Merchant | Required | Shop-level | - |
| 54 | return_policy | Returns | Required | Shop-level | - |
| 55 | return_window | Returns | Required | Shop-level | - |
| 56 | popularity_score | Performance | Optional | 150 (30%) | calculatePopularityScore |
| 57 | return_rate | Performance | Optional | 50 (10%) | - |
| 58 | warning | Compliance | Conditional | 15 (3%) | - |
| 59 | warning_url | Compliance | Conditional | 15 (3%) | - |
| 60 | age_restriction | Compliance | Optional | 10 (2%) | - |
| 61 | product_review_count | Reviews | Recommended | 300 (60%) | - |
| 62 | product_review_rating | Reviews | Recommended | 300 (60%) | - |
| 63 | store_review_count | Reviews | Optional | Shop-level | - |
| 64 | store_review_rating | Reviews | Optional | Shop-level | - |
| 65 | q_and_a | Reviews | Optional | 50 (10%) | formatQAndA |
| 66 | raw_review_data | Reviews | Optional | 30 (6%) | - |
| 67 | related_product_id | Related | Optional | 200 (40%) | formatRelatedIds |
| 68 | relationship_type | Related | Optional | 200 (40%) | - |
| 69 | geo_price | Geo | Optional | 20 (4%) | - |
| 70 | geo_availability | Geo | Optional | 20 (4%) | - |

### 9.2 Transform Function Coverage

| # | Transform Function | Products Using | Description |
|---|-------------------|----------------|-------------|
| 1 | stripHtml | 50 | Products with HTML in description |
| 2 | cleanVariationTitle | 270 | All variable products |
| 3 | buildCategoryPath | 500 | All products |
| 4 | generateStableId | 500 | All products |
| 5 | generateGroupId | 270 | All variable products |
| 6 | generateOfferId | 500 | All products |
| 7 | formatRelatedIds | 200 | Products with related items |
| 8 | formatPriceWithCurrency | 500 | All products |
| 9 | formatSaleDateRange | 100 | Products with sale dates |
| 10 | formatDimensions | 300 | Products with all dimensions |
| 11 | addUnit | 300 | Products with dimensions |
| 12 | addWeightUnit | 400 | Products with weight |
| 13 | extractAdditionalImages | 300 | Products with multiple images |
| 14 | extractGtin | 150 | Products with barcodes |
| 15 | extractBrand | 500 | All products |
| 16 | extractCustomVariant | 100 | Products with custom attributes |
| 17 | extractCustomVariantOption | 100 | Products with custom attributes |
| 18 | buildShippingString | 100 | Products with shipping info |
| 19 | calculatePopularityScore | 150 | Products with sales data |
| 20 | formatQAndA | 50 | Products with FAQ |
| 21 | mapStockStatus | 500 | All products |
| 22 | defaultToNew | 500 | All products (condition) |
| 23 | defaultToZero | 450 | Products with inventory |

---

## 10. Technical Requirements

### 10.1 Architecture

```
ProductSynch/
├── apps/
│   ├── api/                    # Existing API
│   ├── web/                    # Existing Web App
│   └── test-generator/         # NEW: Test Data Generator
│       ├── src/
│       │   ├── app/            # Next.js App Router
│       │   │   ├── page.tsx    # Landing page
│       │   │   ├── api/        # API routes
│       │   │   │   ├── oauth/
│       │   │   │   │   ├── initiate/route.ts
│       │   │   │   │   └── callback/route.ts
│       │   │   │   ├── generate/route.ts
│       │   │   │   └── cleanup/route.ts
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── ConnectForm.tsx
│       │   │   ├── GenerateButton.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   └── CleanupButton.tsx
│       │   ├── lib/
│       │   │   ├── woo-client.ts
│       │   │   ├── product-generator.ts
│       │   │   └── session.ts
│       │   └── data/
│       │       └── product-catalog.ts  # All 500 product definitions
│       ├── package.json
│       ├── next.config.js
│       └── tsconfig.json
├── packages/
│   └── shared/                 # Shared types (existing)
└── package.json
```

### 10.2 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, API routes, React UI |
| Styling | Tailwind CSS | Consistent with ProductSync |
| State | React hooks + session storage | Stateless architecture |
| WooCommerce API | @woocommerce/woocommerce-rest-api | Official client |
| Session | iron-session | Encrypted cookies for credentials |
| Progress | Server-Sent Events (SSE) | Real-time progress updates |

### 10.3 Environment Variables

```env
# OAuth Configuration
NEXT_PUBLIC_APP_URL=https://test-generator.railway.app
WOO_APP_NAME=WooCommerce Test Data Generator

# Session
SESSION_SECRET=<32-character-secret>

# Optional: Placeholder Image Service
PLACEHOLDER_IMAGE_URL=https://via.placeholder.com
```

### 10.4 Session Data Structure

```typescript
interface SessionData {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  connectedAt: number;
  storeInfo?: {
    currency: string;
    dimensionUnit: string;
    weightUnit: string;
  };
}
```

### 10.5 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/oauth/initiate` | POST | Start OAuth flow, return auth URL |
| `/api/oauth/callback` | GET | Receive credentials from WooCommerce |
| `/api/generate` | POST | Start product generation (SSE) |
| `/api/cleanup` | POST | Delete generated products (SSE) |
| `/api/status` | GET | Check connection status |

### 10.6 Meta Field for Tracking

```typescript
const GENERATOR_META_KEY = '_generated_by';
const GENERATOR_META_VALUE = 'woo-test-generator';
const GENERATOR_BATCH_KEY = '_generator_batch_id';

// Each product will have:
meta_data: [
  { key: '_generated_by', value: 'woo-test-generator' },
  { key: '_generator_batch_id', value: '2026-01-11T10:30:00Z' }
]
```

---

## 11. UI/UX Requirements

### 11.1 Design Principles

1. **Minimal** - Single page, no navigation needed
2. **Clear progress** - User always knows what's happening
3. **Error visibility** - Errors shown prominently with details
4. **Consistent** - Match ProductSync visual style

### 11.2 Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Primary | #3B82F6 (Blue) | Buttons, links |
| Success | #10B981 (Green) | Completion, connected status |
| Error | #EF4444 (Red) | Errors, delete actions |
| Warning | #F59E0B (Amber) | Warnings, cleanup |
| Background | #F9FAFB | Page background |
| Card | #FFFFFF | Content cards |

### 11.3 Responsive Design

- Mobile-first approach
- Single column layout on all screen sizes
- Minimum width: 320px
- Maximum content width: 640px (centered)

---

## 12. Out of Scope

The following are explicitly **NOT** included in this release:

| Item | Reason |
|------|--------|
| User authentication | Public tool, no user accounts |
| Database persistence | Stateless by design |
| Multiple store support | One store per session |
| Custom product configuration | One comprehensive preset |
| Partial generation | All or nothing |
| Resume interrupted generation | Stop on error, start fresh |
| Product editing | Generate only |
| Category customization | Fixed apparel categories |
| Non-apparel products | Apparel industry only |
| Virtual/downloadable products | Physical products only |
| External product type | Not needed for testing |
| Affiliate product type | Not needed for testing |

---

## 13. Appendix

### 13.1 Glossary

| Term | Definition |
|------|------------|
| **ProductSync** | Parent application for syncing WooCommerce to OpenAI feeds |
| **OpenAI Feed** | Product data format for OpenAI's shopping features |
| **OAuth** | WooCommerce's built-in authorization protocol |
| **Consumer Key/Secret** | API credentials from WooCommerce OAuth |
| **Simple Product** | Single product without variations |
| **Variable Product** | Product with variations (e.g., different sizes/colors) |
| **Grouped Product** | Collection of related simple products |
| **Transform Function** | Code that converts WooCommerce data to OpenAI format |

### 13.2 Reference Documents

- [ProductSync OpenAI Feed Spec](../packages/shared/src/openai-feed-spec.ts)
- [ProductSync Transform Functions](../packages/shared/src/transforms/)
- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)

### 13.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | PM Agent | Initial draft |

---

**End of Document**
