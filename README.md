# NestQuest AI — Property Hunter 🏡
### Emma & Jordan's Home Sale & Purchase Decision Sanctuary

A tailored, AI-powered property comparison suite crafted specifically for **Jordan & Emma's** move in Brisbane, Queensland. Pre-loaded with your exact numbers from your property spreadsheet, your family preferences, your Eight Mile Plains work hub, and your 4 fur babies.

---

## 🚀 Quick Start (Two Ways to Run)

### Option 1: Double-Click Launcher (Recommended)
Simply double-click **`start.command`** in this folder (or run `./start.sh` in Terminal).  
It will automatically launch the local Python server and open your web browser at **`http://localhost:8080`**.

### Option 2: Direct Offline Browser Access
Double-click **`app/index.html`** to open it immediately in Google Chrome, Safari, or Edge.  
*No server or installation needed!* The app automatically runs offline in local mode using browser storage.

---

## ✨ Key Features Built for You

### 1. 🏡 Pre-loaded Property Hub & Deep Dive Cards
Includes the 5 candidate properties from your spreadsheet with real-world figures:
* **8/19 Baringa Street, Morningside** ($1.04m) — 3 Bed, 2 Bath, 3 Tandem, 3 Levels, Large Garage, Flood overlay.
* **3/58 Dickson Street, Morningside** ($920k) — 3 Bed, 2 Bath, Double Garage, 3 Levels, Overland flow overlay.
* **17/44 Rogers Parade West, Everton Park** ($999k) — 4 Bed, 3 Bath, Courtyard, 2 Levels, Second living area, Bushfire buffer.
* **17/101 Richmond Road, Morningside** ($900k) — 3 Bed, 2 Bath, 1 Garage, Courtyard, 2 Levels. **#1 Savings Champion (+$2,072/mo)**.
* **45/120 Bunya Road, Everton Hills** ($925k) — 3 Bed, 2.5 Bath, Double Garage, Courtyard, 2 Levels, 5 mins from Callum & Kaitlin. **(+$1,996/mo)**.

### 2. 🤖 Tailored AI Matchmaker Engine
Each property is scored across 4 custom dimensions:
* **Emma Match %**: Evaluates Morningside preference, walking distance to shops/cafés, rapid 20-min commute to Eight Mile Plains, and city train proximity.
* **Jordan Match %**: Evaluates 4-bedroom preference for a real home feel, proximity to family (Callum & Kaitlin 5 mins away, parents), side-by-side double garages, and green dog walks.
* **Fur Babies Score (14yo Senior Dog & 16yo Cat Focus)**: 
  * Specifically penalizes **3-level layouts with balconies only** (Baringa & Dickson) where carrying an arthritic 14yo dog up three flights of stairs multiple times a day is physically painful.
  * Rewards **2-level layouts with ground-floor private courtyards** (Richmond, Bunya, Rogers).
* **Financial Health Score**: Incorporates Queensland transfer duty, loan reductions, and body corporate fees.

### 3. 🤖 The 1-Step Workflow: Just Drop Screenshots in Chat!
Whenever you or Emma find a house on **Realestate.com.au**, **Domain**, or **Property.com.au** on your phones:
* **Screenshot & Drop**: Take 1 or 2 quick screenshots of the listing (specs, price, facade photo, floor plan) and drop them straight into your AI Assistant chat!
* **Zero Technical Setup**: No bookmarklets to install, no browser security blocks, and no tedious form typing.
* **Automated Concierge Extraction**:
  * Extracts address, bedrooms, bathrooms, car parking, levels, and courtyard
  * Crops high-res facade photos and saves architectural floor plans
  * Pulls Property.com.au / PropTrack automated valuations
  * Calculates exact Google Maps drive & transit commute times to Eight Mile Plains, Callum & Kaitlin, and parents
  * Runs the financial simulator (mortgage, QLD stamp duty, and exact monthly cash freed up)
  * Evaluates Emma Match %, Jordan Match %, and Fur Baby safety (stair & courtyard analysis)
  * Adds the property directly to your live portfolio!
* **Quick Text Paste & Manual Form**: If you prefer, you can also paste listing text directly in the Add Property modal or enter details manually.

### 4. ⚖️ Head-to-Head Comparison Studio
Select any 2 to 4 properties with the checkboxes to compare them side-by-side:
* Direct category winners (Overall Fit, Cashflow Champion, Emma's Top Pick, Jordan's Top Pick, Best for Fur Babies).
* Full spec comparison table (Levels, Body corporate, Savings, Parking, Overlays).
* Trade-off summary highlighting exact compromises.

### 5. 💰 Interactive Sale & Purchase Financial Simulator
Recreates and enhances your spreadsheet calculations:
* **Current Home Sale**: Modelled at **$1,400,000** minus **$806,992** mortgage and **$40,000** selling costs = **$553,008** net equity released.
* **Queensland Stamp Duty**: Dynamic Queensland transfer duty home concession calculator.
* **New Monthly Housing Cost**: Calculates principal & interest mortgage repayment + body corporate fees.
* **Monthly Savings Breakdown**: Visualizes how much monthly cash is freed up compared to your current $4,810/month mortgage (e.g. freeing up **$933 to $2,072/month** into your bank account!).

### 6. 🐾 Family & Pet Compass
A dedicated life navigation matrix comparing:
* Commute times to **Eight Mile Plains** work hub.
* Distance to **Callum & Kaitlin** (5 mins from Everton Hills vs 35 mins from Morningside).
* Proximity to Emma's and Jordan's parents, Brisbane CBD, and the airport.
* Care matrix for your 16yo cat, 6yo cat, 14yo senior dog, and 8yo active dog.

---

## 🎨 Warm, Welcoming Design System
Designed to be modern, elegant, and inviting (perfect to share with family or your broker):
* **Colors**: Warm Terracotta (`#C85A32`), Earthy Sage Green (`#456B52`), Warm Honey Amber (`#D97706`), Warm Ivory/Linen (`#FAF7F2`), and Soft Charcoal typography.
* **Typography**: Editorial modern headlines using *Outfit* and *Fraunces*, paired with clean, readable *Plus Jakarta Sans*.

---

## 📂 Project Directory Structure

```
Property Hunter/
├── start.command         # Double-clickable macOS launcher (starts server + opens browser)
├── start.sh              # Terminal bash script launcher
├── README.md             # This comprehensive guide
├── app/                  # Frontend UI application
│   ├── index.html        # Modern HTML5 app shell
│   ├── css/
│   │   └── style.css     # Warm modern design system
│   └── js/
│       ├── app.js        # UI controller, state, tabs & modals
│       ├── calculator.js # QLD stamp duty & mortgage calculations
│       ├── ai-engine.js  # Multi-factor AI scoring & comparison
│       └── scraper.js    # Client-side web & text parser
├── backend/              # Python REST & Scraper API (Zero pip dependencies)
│   ├── server.py         # Lightweight HTTP & REST server
│   ├── scraper.py        # Web scraper & listing text extractor
│   └── ai_advisor.py     # AI property advisor & conversational chat
└── data/                 # Persistent storage
    ├── properties.json   # Pre-populated property database
    └── finances.json     # Pre-populated budget, profiles & distances
```
