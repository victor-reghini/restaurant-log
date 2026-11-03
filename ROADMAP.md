# RestôLog - Project Roadmap & Activities

## Status Overview

| Phase | Milestone | Status | Key Deliverables |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Core Architecture & MVP** | Completed | Domain entities, Clean Architecture, Mock & Supabase adapters, Cardápio/Buffet models, Proximity engine |
| **Phase 2** | **Community Moderation & Anti-Duplication** | In Progress | Suggestion queue, Trigram fuzzy matching, Duplicate warning dialog, Admin review workflow |
| **Phase 3** | **Mobile Adaptation (iOS & Android)** | Planned | PWA install manifest, Offline cache, Capacitor build for native iOS & Android |
| **Phase 4** | **High-Scale Performance Hardening** | Planned | Read replicas, Supavisor pooling, Edge CDN caching, Image optimization CDN |

---

## Detailed Phases & Activity Breakdown

### Phase 1: Core Architecture & Functional MVP (Completed)
- [x] **Activity 1.1 - Domain Modeling:** Define TypeScript interfaces for Restaurants, Menu Items (Daily vs Fixed vs Por Quilo), Reviews, and Suggestions.
- [x] **Activity 1.2 - Clean Architecture Repositories:** Create `IRestaurantRepository` interface to decouple data storage from presentation.
- [x] **Activity 1.3 - In-Memory Mock Engine:** Complete zero-config mock repository with realistic restaurants, pricing notes, and SP Paulista coordinates.
- [x] **Activity 1.4 - UI Presentation & Filtering:** Build responsive React UI with search, price tier filter, pricing model filter, and categories.
- [x] **Activity 1.5 - Geolocation Proximity Engine:** Implement GPS coordinate acquisition with Haversine distance calculations and location-sorted results.
- [x] **Activity 1.6 - Daily Menu Viewer:** Day-by-day tabbed menu inspection (Segunda a Sábado) and specials highlighting.
- [x] **Activity 1.7 - Reviews & Ratings:** Interactive star rating, customer comments, and photo attachment previews.
- [x] **Activity 1.8 - Database Schema:** Create full PostgreSQL schema with PostGIS spatial indices, rating triggers, and RLS policies.

---

### Phase 2: Moderation, Anti-Duplication & User Control
- [x] **Activity 2.1 - Suggestion Submission Flow:** Modal allowing community users to propose new restaurants or edits to existing entries.
- [x] **Activity 2.2 - Live Duplicate Detection:** Real-time similarity checking against existing restaurant names and coordinates (< 200m).
- [ ] **Activity 2.3 - Authentication & Role-Based Access (RBAC):**
  - Supabase Auth integration (Magic Link or Email/Password).
  - Restricted invitation-only access for closed group testing (Beta testers).
  - Admin moderation dashboard to approve or reject community suggestions.
- [ ] **Activity 2.4 - Photo Storage & Resizing:** Direct upload to Supabase Storage bucket (`restaurant-photos`) with automated thumbnail generation.

---

### Phase 3: Mobile Evolution (iOS & Android)
- [ ] **Activity 3.1 - Progressive Web App (PWA):**
  - Web App Manifest (`manifest.json`) and service worker for offline shell caching.
  - "Add to Home Screen" support on iOS Safari and Android Chrome.
- [ ] **Activity 3.2 - Native Mobile Packaging (Capacitor):**
  - Integrate `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`.
  - Native GPS plugin (`@capacitor/geolocation`) for background location updates.
  - Native Camera plugin (`@capacitor/camera`) for high-resolution dish photo uploads.
- [ ] **Activity 3.3 - App Store & Google Play Preparation:**
  - Asset generation (App icon, splash screens).
  - Privacy policy and permissions manifest (Location & Camera usage descriptions).

---

### Phase 4: High-Throughput & Scale Optimization (> 10,000 RPM)
- [ ] **Activity 4.1 - Supavisor Connection Pooling:** Configure transaction-mode pooling to handle spike traffic.
- [ ] **Activity 4.2 - Edge Response Caching:** Setup Cloudflare Cache or Vercel Edge Middleware with `stale-while-revalidate` for popular restaurant listings.
- [ ] **Activity 4.3 - Database Spatial Partitioning:** Partition `restaurants` table by geographic region if dataset exceeds 500,000 establishments.
- [ ] **Activity 4.4 - Automated Anti-Abuse Rate Limiting:** Enforce token-bucket rate limiting on review and suggestion endpoints.

