# Canvas Jewelry — Business Overview

## **Product Summary**

Canvas Jewelry is a **web-based personalized metalwork design platform** that allows customers to create custom relief pieces from real-world locations. Users select any place on Earth, and the system generates a cast-metal art piece featuring the actual mountains or cityscape of that location. The product targets gift-givers, home decorators, and collectors seeking unique, location-specific memorabilia.

---

## **Core Offering**

### **Three Shape Options:**
1. **Plaques** (rectangular relief) — ideal for walls, home décor
2. **Discs** (circular) — modern, gallery-style pieces
3. **Hearts** — specialized gift/romantic occasion items

### **Three Metal Materials:**
- **Silver** (base pricing) — most affordable, classic aesthetic
- **Gold** (3.2× price multiplier) — luxury/premium segment
- **Platinum** (4× multiplier) — ultra-premium, investment-grade

### **Customization Parameters:**
- **Area size** (coverage on the map)
- **Relief intensity** (depth exaggeration factor)
- **Thickness** (material cost/durability)
- **Smoothing** (detail vs. artifact balance)
- **Optional city overlays** (buildings & streets highlighted on top of mountains)

---

## **User Journey**

```
1. Select Location (map search or famous preset locations)
   ↓
2. Preview in 3D (real-time render with chosen metal finish)
   ↓
3. Adjust Design (shape, size, relief, material)
   ↓
4. View Auto-Generated Price (based on volume → grams → metal cost)
   ↓
5. Download STL File (for personal 3D printing) OR Place Order (email-based)
```

### **Alternative Path: Pendant Designer**
- Upload an image → AI background removal & contour tracing → SVG design → export as pendant
- Exports: SVG, PNG, JSON project file

---

## **Data & Integration Stack**

| Component | Data Source | Purpose |
|-----------|-------------|---------|
| **Real mountains** | Google Elevation API | Authentic elevation data (55×55 grid sampling per location) |
| **Building/Streets** | OpenStreetMap (Overpass API) | Urban overlay detail; supports "maps" product variant |
| **Procedural Fallback** | Deterministic seeding | Graceful degradation if APIs unavailable |
| **3D Preview** | React Three Fiber (r3f) | Real-time PBR metal rendering |
| **STL Export** | Binary STL format | Direct feed to casting/3D print services |
| **Pricing Engine** | Volume calculation (divergence theorem) | Exact grams → AMD currency conversion |

---

## **Revenue Model**

**Base Revenue**: Per-order pricing structured as:
```
Price = (Mesh Volume in mm³ × Material Density × Metal Price Factor) + Margin
```

**Current Currency**: AMD (Armenian Dram) — base rate: **4000 AMD per gram of silver**

**Examples** (illustrative):
- Small silver disc: ~$8–15 USD
- Large gold plaque: ~$150–300 USD
- Platinum heart: ~$500+ USD

**Monetization Paths**:
1. **Direct orders** (current: email-based checkout stub)
2. **Batch exports** (STL → partner casting services; could integrate Shapeways, local foundries)
3. **Subscription** (premium presets, advanced design tools)
4. **B2B** (corporate gifts, real estate developers, tourism boards)

---

## **Competitive Advantages**

| Aspect | Advantage |
|--------|-----------|
| **Unique UX** | Map-based location → physical art (no competitors found doing this exactly) |
| **Real Data** | Uses actual Google Elevation + OSM building data, not stylized/generic |
| **No CAD Needed** | Average user can design in minutes; no 3D modeling skill required |
| **Real-Time Pricing** | Customers see exact cost before purchase |
| **Export Flexibility** | STL download enables drop-shipping / partner fulfillment |
| **Global Scope** | Works anywhere on Earth (190+ countries via APIs) |

---

## **Current Development Stage**

**Status**: **MVP / Early Feature-Complete**

| Feature | Status |
|---------|--------|
| Location picker + mountains preview | ✅ Live |
| 3D ring/plaque/heart viewer | ✅ Live |
| STL export | ✅ Live |
| Pendant designer (image → SVG) | ✅ Live |
| Pricing calculator | ✅ Live |
| Order system | ⚠️ Email stub only (no payment gateway) |
| City/Skyline variant | ✅ Live |

**Recent Development** (past 6 commits):
- Added hang/chain attachment for pendant
- Google API key management improvements
- Switched to free/keyless map providers (OSM, Mapbox) for reduced operational costs

---

## **Known Limitations & Next Steps**

### **Current Constraints**:
1. **No Payment Processing** — orders go via email; needs Stripe/payment gateway integration
2. **Rate Limiting** — Overpass API (buildings/streets) is public/rate-limited; not suitable for high volume
3. **No Order Fulfillment Integration** — STL is exported; manufacturing/shipping need manual setup
4. **API Dependencies** — Google Elevation requires billing; failure cascades to procedural fallback

### **Opportunities**:
- **Fulfillment Partner Network** — integrate Shapeways, local foundries, 3D print services
- **Social Sharing** — gift recommendations by map location
- **Historical Layers** — satellite/historical map overlays (cartographic niche)
- **Mobile Native App** — iOS/Android for on-location design (currently web-only)
- **AR Preview** — place virtual piece in customer's home before purchase
- **Bulk/Corporate Orders** — customized bulk pricing for events, real estate launches

---

## **Technical Foundation**

- **Tech Stack**: React 18 + TypeScript + Vite (fast builds) + Zustand (state) + React Query (data fetching)
- **Code Size**: ~77 files, 570MB (mostly node_modules)
- **Architecture**: Feature-Sliced Design (FSD) — clean layer separation, easy to extend
- **Hosting**: Vercel (SPA rewrite configured)

---

## **Market Positioning**

**Tagline**: *"Turn your favorite place into art."*

**Target Segments**:
- **Tourists** — souvenir from vacation destination
- **Real Estate** — agents gifting property maps to sellers/buyers
- **Couples** — anniversary/engagement gifts (heart shape, couple's hometown)
- **Nostalgia/Legacy** — childhood home, ancestral lands, milestones
- **Interior Design** — unique wall art for design-forward homeowners
- **Corporate** — branded office décor, client gifts

**Price Positioning**: Premium/artisanal (not mass-market; $15–500+ per piece)

---

## **Recommendation for Business Analyst**

**Critical next step**: **Decide fulfillment model**
- In-house casting/3D printing (capex, supply chain complexity)
- Partner with print-on-demand (Shapeways, etc.) — lower capex, lower margin
- Hybrid (premium pieces in-house, budget items outsourced)

This decision drives go-to-market strategy, pricing power, and unit economics.
