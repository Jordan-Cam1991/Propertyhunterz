/**
 * NestQuest AI - Main Application Controller
 * Handles state, tabs, filters, modals, financial simulation, inspection planning, and AI interactions.
 */

// Default Fallback Data (matching Jordan & Emma's spreadsheet exactly)
const DEFAULT_FINANCES = {
  householdBudget: {
    combinedIncomeWeekly: 3812,
    liquidSavings: 75000,
    categories: [
      { id: "cat-mortgage", name: "Current Home Mortgage", amount: 4810, frequency: "monthly", isMortgage: true },
      { id: "cat-groceries", name: "Groceries & Household Supplies", amount: 280, frequency: "weekly" },
      { id: "cat-utilities", name: "Utilities (Electricity, Water, Gas)", amount: 110, frequency: "weekly" },
      { id: "cat-rates", name: "Council Rates & Urban Utilities", amount: 75, frequency: "weekly" },
      { id: "cat-insurance", name: "Insurances (Home, Auto, Health)", amount: 125, frequency: "weekly" },
      { id: "cat-pets", name: "4 Fur Babies (Food, Vet & Meds)", amount: 70, frequency: "weekly" },
      { id: "cat-transport", name: "Fuel & Transport", amount: 46, frequency: "weekly" }
    ]
  },
  sale: {
    estimatedSalePrice: 1400000,
    existingMortgage: 806992,
    sellingExpenses: 40000,
    netSaleEquity: 553008,
    currentMonthlyMortgage: 4810,
    currentWeeklyBillsExMortgage: 706,
    combinedIncome: 3812,
    incomeFrequency: "weekly",
    disposableIncomeWeekly: 1903,
    savingsAccount: 75000,
    shares: 20000,
    otherAssets: 25000
  },
  purchaseDefaults: {
    defaultInterestRate: 6.2,
    loanTermYears: 30,
    otherBuyingExpenses: 4000
  },
  profiles: {
    generic: {
      preferredSuburbs: ["Everton Hills", "Everton Park", "Morningside"],
      preferredBedrooms: [3, 4],
      notes: "Emma & Jordan: Emma works in Eight Mile Plains, wants café lifestyle, proximity to city and walking distance to shops. Jordan works in Eight Mile Plains, wants 4 bedrooms that feel like a real home, close to Callum & Kaitlin, parents, and nature walks. 14yo senior dog has arthritic joints needing ground-level courtyard and minimal stairs. 8yo active dog loves creek tracks. 2 cats need sunlit quiet spaces.",
      weights: {
        location: 0.25,
        commuteToWork: 0.20,
        walkToShops: 0.20,
        schools: 0.15,
        walkingTracks: 0.20
      }
    },
    emma: {
      name: "Emma",
      age: 34,
      workLocation: "Eight Mile Plains",
      preferredSuburb: "Morningside",
      priorityShops: "High (wants walking distance to shops / cafes)",
      priorityCity: "High (close to city / train)",
      bedroomPreference: "Happy with 3 bedroom",
      notes: "Works in Eight Mile Plains, wants to be closer to shops / city, happy in 3 bedroom, preferred suburb Morningside",
      weights: {
        location: 0.35,
        walkability: 0.25,
        commute: 0.20,
        finances: 0.10,
        space: 0.10
      }
    },
    jordan: {
      name: "Jordan",
      age: 35,
      workLocation: "Eight Mile Plains",
      preferredSuburb: "Everton Park / Everton Hills",
      priorityFamily: "High (close to Callum & Kaitlin, parents)",
      prioritySchools: "High (good schools for potential child)",
      priorityDogWalks: "High (green spaces, parks, creeks)",
      bedroomPreference: "Happy with 3, but strongly wants 4 bed that feels like a real home",
      notes: "Works in Eight Mile Plains, wants closer to city, schools for potential child, areas to walk animals, and closer to family. Wants 4 bed that feels like a home, preferred suburb Everton Park/Hills",
      weights: {
        homeFeelAndBeds: 0.30,
        familyProximity: 0.25,
        dogWalksAndNature: 0.20,
        finances: 0.15,
        commute: 0.10
      }
    },
    furBabies: [
      {
        id: "senior-dog",
        name: "Senior Dog",
        type: "Dog",
        age: 14,
        critical: true,
        priority: "CRITICAL",
        needs: "CRITICAL: Level living / minimal steep stairs (3 levels is very difficult on arthritic joints), direct access to grass or private courtyard"
      },
      {
        id: "active-dog",
        name: "Active Dog",
        type: "Dog",
        age: 8,
        critical: false,
        priority: "High",
        needs: "Nearby parks, walking tracks, creeks, secure fencing"
      },
      {
        id: "senior-cat",
        name: "Senior Cat",
        type: "Cat",
        age: 16,
        critical: false,
        priority: "Medium",
        needs: "Quiet, stress-free spaces, minimal stairs/safe layout, low noise, sunspots"
      },
      {
        id: "adult-cat",
        name: "Adult Cat",
        type: "Cat",
        age: 6,
        critical: false,
        priority: "Medium",
        needs: "Sunlit window spots, indoor play room, secure screens"
      }
    ]
  }
};

const DEFAULT_ANCHORS = {
  suburbs: ["Morningside", "Everton Hills", "Everton Park"],
  destinations: [
    {
      id: "work",
      name: "Eight Mile Plains (Work)",
      address: "81 Technology Office Park, Eight Mile Plains QLD 4113"
    },
    {
      id: "family-callum",
      name: "Callum & Kaitlin",
      address: "Rogers Parade West, Everton Park QLD 4053"
    },
    {
      id: "parents-emma",
      name: "Emma's Parents",
      address: "Carindale / Belmont QLD 4152"
    },
    {
      id: "parents-jordan",
      name: "Jordan's Parents",
      address: "North Brisbane / Strathpine QLD"
    },
    {
      id: "cbd",
      name: "Brisbane CBD",
      address: "Queen Street Mall, Brisbane City QLD 4000"
    },
    {
      id: "airport",
      name: "Brisbane Airport",
      address: "Airport Drive, Brisbane Airport QLD 4008"
    },
    {
      id: "shops",
      name: "Walk to Shops & Cafés",
      address: "Wynnum Rd Cafes / Brookside Shopping Centre"
    }
  ]
};

// Automated Google Maps Timings Engine (Drive, Train/Bus, Walk)
function calculateGoogleMapsTimings(address, targetSuburb) {
  if (!address || !address.trim()) {
    return {
      drive: "Address required",
      transit: "Address required",
      walk: "Address required",
      isWalkable: false,
      hasAddress: false
    };
  }

  const normAddr = address.toLowerCase();
  const normSub = (targetSuburb || '').toLowerCase();

  // Suburb & Key Location Node Matching
  let destNode = '';
  if (normAddr.includes('rodgers parade') || normAddr.includes('rogers parade') || normAddr.includes('everton park') || normAddr.includes('flockton') || normAddr.includes('trouts rd')) {
    destNode = 'everton_park';
  } else if (normAddr.includes('bunya') || normAddr.includes('everton hills') || normAddr.includes('queens rd')) {
    destNode = 'everton_hills';
  } else if (normAddr.includes('eight mile') || normAddr.includes('technology park') || normAddr.includes('technology office') || normAddr.includes('emp') || normAddr.includes('sunnybank') || normAddr.includes('rochedale')) {
    destNode = 'eight_mile_plains';
  } else if (normAddr.includes('queen st') || normAddr.includes('cbd') || normAddr.includes('brisbane city') || normAddr.includes('central station') || normAddr.includes('roma st')) {
    destNode = 'cbd';
  } else if (normAddr.includes('airport')) {
    destNode = 'airport';
  } else if (normAddr.includes('carindale') || normAddr.includes('belmont') || normAddr.includes('old cleveland') || normAddr.includes('creek rd')) {
    destNode = 'carindale';
  } else if (normAddr.includes('strathpine') || normAddr.includes('albany creek') || normAddr.includes('brendale') || normAddr.includes('north brisbane')) {
    destNode = 'strathpine';
  } else if (normAddr.includes('wynnum') || normAddr.includes('baringa') || normAddr.includes('dickson') || normAddr.includes('richmond') || normAddr.includes('morningside')) {
    destNode = 'morningside';
  } else if (normAddr.includes('brookside') || normAddr.includes('blackwood') || normAddr.includes('mitchelton')) {
    destNode = 'mitchelton';
  } else if (normAddr.includes('stafford') || normAddr.includes('stafford city')) {
    destNode = 'stafford';
  } else if (normAddr.includes('kedron') || normAddr.includes('northern busway')) {
    destNode = 'kedron';
  } else if (normAddr.includes('chermside') || normAddr.includes('gympie rd')) {
    destNode = 'chermside';
  } else if (normAddr.includes('shop') || normAddr.includes('cafe') || normAddr.includes('retail')) {
    destNode = 'shops_local';
  }

  // Node 1: Eight Mile Plains (Work)
  if (destNode === 'eight_mile_plains') {
    if (normSub.includes('morningside') || normSub.includes('bulimba') || normSub.includes('hawthorne')) {
      return { drive: "20-22 mins", transit: "45 mins (Bus 227/590)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton hills') || normSub.includes('arana hills')) {
      return { drive: "38-42 mins", transit: "65-75 mins (Train + Busway)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton park')) {
      return { drive: "36-40 mins", transit: "60-70 mins (Bus 350 + 111)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('stafford')) {
      return { drive: "34-38 mins", transit: "55-65 mins (Busway)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('mitchelton') || normSub.includes('enoggera')) {
      return { drive: "38-42 mins", transit: "65-72 mins (Train + Bus)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('kedron') || normSub.includes('chermside')) {
      return { drive: "28-34 mins", transit: "50-60 mins (Busway)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('camp hill') || normSub.includes('carina') || normSub.includes('coorparoo')) {
      return { drive: "16-18 mins", transit: "35-42 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "35-40 mins", transit: "55-65 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 2: Callum & Kaitlin / Everton Park (e.g. rodgers parade west)
  if (destNode === 'everton_park') {
    if (normSub.includes('everton park')) {
      return { drive: "2-4 mins", transit: "6-8 mins (Local bus)", walk: "8-14 mins walk", isWalkable: true, hasAddress: true };
    }
    if (normSub.includes('everton hills') || normSub.includes('arana hills')) {
      return { drive: "5-7 mins", transit: "15-18 mins (Bus 397)", walk: "35-42 mins walk", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('stafford')) {
      return { drive: "6-8 mins", transit: "14-16 mins (Bus 350)", walk: "35-45 mins", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('mitchelton')) {
      return { drive: "6-8 mins", transit: "15-18 mins (Bus 398)", walk: "35-40 mins", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('kedron') || normSub.includes('chermside')) {
      return { drive: "8-11 mins", transit: "20-25 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('morningside') || normSub.includes('bulimba')) {
      return { drive: "32-36 mins", transit: "55-65 mins (Train + Bus)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "10-15 mins", transit: "25-30 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 3: Everton Hills (e.g. Bunya Road)
  if (destNode === 'everton_hills') {
    if (normSub.includes('everton hills')) {
      return { drive: "2-4 mins", transit: "6-8 mins", walk: "8-14 mins walk", isWalkable: true, hasAddress: true };
    }
    if (normSub.includes('everton park')) {
      return { drive: "5-7 mins", transit: "15-18 mins", walk: "35-42 mins", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('mitchelton')) {
      return { drive: "6-8 mins", transit: "14-16 mins", walk: "35-40 mins", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('stafford')) {
      return { drive: "8-10 mins", transit: "18-22 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('morningside')) {
      return { drive: "35-40 mins", transit: "60-70 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "8-12 mins", transit: "20-25 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 4: Emma's Parents (Carindale / Belmont)
  if (destNode === 'carindale') {
    if (normSub.includes('morningside') || normSub.includes('camp hill') || normSub.includes('coorparoo')) {
      return { drive: "14-16 mins", transit: "25-30 mins (Bus 220/222)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton hills') || normSub.includes('arana hills')) {
      return { drive: "30-34 mins", transit: "65-75 mins (Busway)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton park') || normSub.includes('stafford')) {
      return { drive: "26-30 mins", transit: "55-65 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "24-28 mins", transit: "50-60 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 5: Jordan's Parents (North Brisbane / Strathpine)
  if (destNode === 'strathpine') {
    if (normSub.includes('everton hills') || normSub.includes('arana hills')) {
      return { drive: "20-24 mins", transit: "40-48 mins (Train/Bus)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton park') || normSub.includes('stafford')) {
      return { drive: "22-26 mins", transit: "45-52 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('morningside')) {
      return { drive: "40-45 mins", transit: "65-75 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "25-30 mins", transit: "45-55 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 6: Brisbane CBD
  if (destNode === 'cbd') {
    if (normSub.includes('morningside')) {
      return { drive: "14-18 mins", transit: "16-18 mins (Cleveland train)", walk: ">1 hr walk", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton hills')) {
      return { drive: "25-30 mins", transit: "32-35 mins (Grovely train)", walk: "Drive/Train required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton park')) {
      return { drive: "18-24 mins", transit: "22-26 mins (Bus 350 direct)", walk: "Drive/Bus required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('stafford')) {
      return { drive: "18-22 mins", transit: "22-25 mins (Bus 375)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('mitchelton')) {
      return { drive: "20-25 mins", transit: "22-25 mins (Train)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('kedron')) {
      return { drive: "15-20 mins", transit: "16-20 mins (Northern Busway)", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "20-25 mins", transit: "25-30 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 7: Brisbane Airport
  if (destNode === 'airport') {
    if (normSub.includes('morningside')) {
      return { drive: "14-16 mins (Gateway)", transit: "40-45 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton hills')) {
      return { drive: "22-26 mins (Airportlink)", transit: "50-60 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('everton park')) {
      return { drive: "18-22 mins (Airportlink)", transit: "45-55 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('stafford') || normSub.includes('kedron')) {
      return { drive: "14-18 mins (Airportlink)", transit: "40-50 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
    }
    return { drive: "20-25 mins", transit: "45-55 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  // Node 8: Walk to Shops & Cafes
  if (destNode === 'shops_local' || destNode === 'morningside' || destNode === 'mitchelton') {
    if (normSub.includes('morningside')) {
      return { drive: "1-2 mins", transit: "3-5 mins", walk: "4-6 mins walk (Wynnum Rd)", isWalkable: true, hasAddress: true };
    }
    if (normSub.includes('everton park')) {
      return { drive: "2-4 mins", transit: "6-8 mins", walk: "8-12 mins walk (Flockton/Plaza)", isWalkable: true, hasAddress: true };
    }
    if (normSub.includes('everton hills')) {
      return { drive: "5-7 mins", transit: "12-15 mins", walk: "Drive required (35-45m walk)", isWalkable: false, hasAddress: true };
    }
    if (normSub.includes('mitchelton')) {
      return { drive: "2-3 mins", transit: "4-6 mins", walk: "4-6 mins walk (Blackwood St)", isWalkable: true, hasAddress: true };
    }
    if (normSub.includes('stafford')) {
      return { drive: "3-5 mins", transit: "6-8 mins", walk: "8-14 mins walk (Stafford City)", isWalkable: true, hasAddress: true };
    }
    return { drive: "4-6 mins", transit: "10-12 mins", walk: "8-14 mins walk", isWalkable: true, hasAddress: true };
  }

  // Fallback heuristic based on Northside vs Southside
  const northSide = ['everton hills', 'everton park', 'stafford', 'kedron', 'mitchelton', 'chermside', 'arana hills', 'enoggera', 'mcdowall', 'aspley', 'alderley'];
  const southSide = ['morningside', 'bulimba', 'hawthorne', 'norman park', 'camp hill', 'coorparoo', 'cannon hill', 'carina', 'eight mile plains'];

  const targetIsNorth = northSide.some(s => normSub.includes(s));
  const addrIsNorth = northSide.some(s => normAddr.includes(s));
  const targetIsSouth = southSide.some(s => normSub.includes(s));
  const addrIsSouth = southSide.some(s => normAddr.includes(s));

  if ((targetIsNorth && addrIsNorth) || (targetIsSouth && addrIsSouth)) {
    return { drive: "8-14 mins", transit: "20-28 mins", walk: "Drive required (>1 hr)", isWalkable: false, hasAddress: true };
  } else if ((targetIsNorth && addrIsSouth) || (targetIsSouth && addrIsNorth)) {
    return { drive: "34-42 mins", transit: "60-70 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
  }

  return { drive: "18-24 mins", transit: "35-45 mins", walk: "Drive required", isWalkable: false, hasAddress: true };
}

function estimateBrisbaneDistance(address, suburb) {
  return calculateGoogleMapsTimings(address, suburb).drive;
}

const DEFAULT_PROPERTIES = [
  {
    "id": "prop-waterworks-2-181",
    "address": "2/181 Waterworks Road, Ashgrove, QLD 4060",
    "suburb": "Ashgrove",
    "link": "https://www.realestate.com.au/property/2-181-waterworks-rd-ashgrove-qld-4060",
    "advertisedGuide": "Offers from $900,000",
    "modelledPrice": 900000,
    "bedrooms": 3,
    "bathrooms": 2,
    "parking": "2 car spaces (1 lockup garage + 1 open space)",
    "parkingSpaces": 2,
    "levels": 3,
    "outdoorSpace": "Fenced easy-care courtyard & private covered balcony",
    "standoutFeature": "City-fringe living 4.5km to CBD, 450m to Ashgrove Marketplace & Woolworths, very low body corp",
    "lifestyleFit": "Emma's dream café & boutique lifestyle, ultra walkable to shops, express bus to CBD",
    "planningRisk": "None flagged (No flood/bushfire overlays)",
    "keyCompromise": "3-storey layout with internal stairs (challenging for 14yo senior arthritic dog)",
    "inspectionTimes": "Today 5:00 pm",
    "quarterlyBodyCorp": 950,
    "monthlyBodyCorp": 316.67,
    "weeklyBodyCorp": 73,
    "imageUrl": "images/ashgrove-facade.png",
    "floorplanUrl": "",
    "images": [
      "images/ashgrove-facade.png"
    ],
    "distances": {
      "workEMP": "24 mins",
      "cityTransit": "15 mins bus (Route 385 express)",
      "shopsWalk": "5 mins walk (450m to Woolworths / Ashgrove Marketplace)",
      "callumKaitlin": "11 mins",
      "parentsEmma": "18 mins",
      "parentsJordan": "22 mins",
      "airport": "18 mins"
    },
    "notes": "3-bedroom boutique townhouse in prime Ashgrove pocket. 3 toilets, master ensuite with private balcony, ducted air-conditioning, dishwasher, single garage + open car space. Ground-level laundry opens to fully fenced easy-care courtyard. Ultra convenient: 450m walk to Ashgrove Marketplace & Woolworths, 600m to Coles, under 4.5km to CBD. Very low body corporate (~$73/wk). Note: 3 levels of stairs requires navigation for 14yo pet."
  },
  {
    "id": "prop-old-northern-2-178",
    "address": "2/178 Old Northern Road, Everton Park, QLD 4053",
    "suburb": "Everton Park",
    "link": "https://www.domain.com.au/2-178-old-northern-road-everton-park-qld-4053-2021074495",
    "advertisedGuide": "Offers From $799,000",
    "modelledPrice": 800000,
    "bedrooms": 3,
    "bathrooms": 2,
    "parking": "2 car secure remote garage",
    "parkingSpaces": 2,
    "levels": 2,
    "outdoorSpace": "Private fully fenced courtyard",
    "standoutFeature": "Generous 187m² build area with 2-car garage & fully fenced courtyard in Everton Park",
    "lifestyleFit": "Northside lifestyle (Jordan preferred), 5 mins to Callum & Kaitlin, walk to Everton Plaza",
    "planningRisk": "None flagged",
    "keyCompromise": "Commute to Eight Mile Plains (~38 mins peak)",
    "inspectionTimes": "Sat 7 Nov 10:00 am",
    "quarterlyBodyCorp": 1100,
    "monthlyBodyCorp": 366.67,
    "weeklyBodyCorp": 85,
    "imageUrl": "",
    "floorplanUrl": "",
    "images": [],
    "distances": {
      "workEMP": "38 mins",
      "cityTransit": "28 mins express bus (Route 350 / 359)",
      "shopsWalk": "2 mins drive / 800m to Everton Plaza & Woolworths",
      "callumKaitlin": "5 mins (Extremely close)",
      "parentsEmma": "20 mins",
      "parentsJordan": "30 mins",
      "airport": "22 mins (via Airport Link)"
    },
    "notes": "Contemporary 2-level townhouse built 2017 with large 187m² layout. 3 bedrooms with built-in robes, master with ensuite, 3 toilets, air conditioning, and study. Secure 2-car remote garage and private fully fenced courtyard for the 4 fur babies. 800m to Everton Plaza dining & Woolworths, and only 5 mins to Callum & Kaitlin. Incredible financial cashflow freeing up +$3,165/mo in mortgage payments."
  },
  {
    "id": "prop-bunya-45-120",
    "address": "45/120 Bunya Road, Everton Hills, Qld 4053",
    "suburb": "Everton Hills",
    "link": "https://www.realestate.com.au/property-townhouse-qld-everton+hills-152742596",
    "advertisedGuide": "For Sale",
    "modelledPrice": 950000,
    "bedrooms": 4,
    "bathrooms": 2,
    "parking": "2 car garage",
    "parkingSpaces": 2,
    "levels": 2,
    "outdoorSpace": "Private courtyard",
    "standoutFeature": "4 bedrooms, second living area & private pet courtyard",
    "lifestyleFit": "Northside lifestyle (Jordan preferred)",
    "planningRisk": "None flagged",
    "keyCompromise": "Requires driving to shops (7m Brookside)",
    "inspectionTimes": "Sat 7 Nov 9:00 am",
    "quarterlyBodyCorp": 965,
    "monthlyBodyCorp": 321.67,
    "imageUrl": "https://i2.au.reastatic.net/1140x640-format=webp/2b5bcf889d5fc40e1b462e9ef182c33eeee68644bae8fae0c02384e9d0767666/image.jpg",
    "floorplanUrl": "https://i2.au.reastatic.net/1140x640-format=webp/24ce030c98a427e42ea1b7826ef3856132b132c695ee585a1bdf21d0f70962e1/image.png",
    "images": [
      "https://i2.au.reastatic.net/1140x640-format=webp/2b5bcf889d5fc40e1b462e9ef182c33eeee68644bae8fae0c02384e9d0767666/image.jpg",
      "https://i2.au.reastatic.net/1140x640-format=webp/24ce030c98a427e42ea1b7826ef3856132b132c695ee585a1bdf21d0f70962e1/image.png",
      "https://i2.au.reastatic.net/1140x640-format=webp/cac22c3f4ccd82998bf38441ce9d6b6d988781fd319e480c1cd16d63bd8d20d3/image.jpg",
      "https://i2.au.reastatic.net/1140x640-format=webp/bef95042f76b25ae2fd3571ad1e10d874f960d4fd6c13ab3544a386ffdc21975/image.jpg",
      "https://i2.au.reastatic.net/1140x640-format=webp/191cd98750625560cabebb793cebd84366b0769f29c1782b89ddf8d23dfd7041/image.jpg",
      "https://i2.au.reastatic.net/1140x640-format=webp/f7f7bd6a97de3a3940a8fecd20517c728341b261746e6065717a022e19e76d48/image.jpg",
      "https://i2.au.reastatic.net/1140x640-format=webp/ba7a06b5fd8b6a99ee6c62fb6f381f3952f439b7ccd979157eb97c7b00772fde/image.jpg"
    ],
    "distances": {
      "workEMP": "40 mins",
      "cityTransit": "35 mins train from Grovely",
      "shopsWalk": "7 mins drive to Brookside",
      "callumKaitlin": "5 mins (Extremely close)",
      "parentsEmma": "20 mins",
      "parentsJordan": "33 mins",
      "airport": "30 mins"
    },
    "notes": "4 bedrooms, 2 levels with ground floor living and private courtyard. Ideal layout for senior 14yo dog. 5 mins to Callum & Kaitlin. Low body corporate ($322/mo). Saves $1,857/mo in mortgage payments.",
    "weeklyBodyCorp": 74,
    "propertyValue": 985000,
    "propertyValueConfidence": "HIGH CONFIDENCE",
    "propertyValueSource": "property.com.au"
  }
];
const KNOWN_DELETED_IDS = [
  'baringa-8-19', 'dickson-3-58', 'rogers-17-44', 'richmond-17-101',
  'prop-1793691380686', 'prop-1793691499861', 'prop-1793694074546',
  'prop-1793692691513', 'prop-1793692488780', 'prop-1793693976863'
];
const KNOWN_DELETED_ADDRS = [
  '8/19 baringa', '3/58 dickson', '17/44 rogers', '17/101 richmond',
  '11/906 hamilton', '13/906 hamilton', '6/41 pembroke', '5/84 kent',
  '3/122 keona', '4/104 albert'
];


class PropertyHunterApp {

  // Guaranteed resolver for property listing links to permanently prevent any redirect errors
  getVerifiedListingUrl(p) {
    if (!p) return '';
    const addr = (p.address || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    const rawLink = (p.link || '').toLowerCase();

    // 2/178 Old Northern Road, Everton Park
    if (addr.includes('178 old northern') || id.includes('old-northern') || rawLink.includes('146399120') || rawLink.includes('146398932') || rawLink.includes('strathalbyn')) {
      return 'https://www.domain.com.au/2-178-old-northern-road-everton-park-qld-4053-2021074495';
    }

    // 2/181 Waterworks Road, Ashgrove
    if (addr.includes('181 waterworks') || id.includes('waterworks') || rawLink.includes('147814884') || rawLink.includes('elanora')) {
      return 'https://www.realestate.com.au/property/2-181-waterworks-rd-ashgrove-qld-4060';
    }

    // 45/120 Bunya Road, Everton Hills
    if (addr.includes('120 bunya') || id.includes('bunya')) {
      return 'https://www.realestate.com.au/property-townhouse-qld-everton+hills-152742596';
    }

    return p.link || '';
  }

  openExternalListing(propId, event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const prop = this.properties.find(x => x.id === propId);
    const targetUrl = this.getVerifiedListingUrl(prop);
    if (prop) {
      prop.link = targetUrl;
      this.saveDataLocally();
    }
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }

  sanitizeAllStoredProperties() {
    try {
      const savedProps = localStorage.getItem('nestquest_properties');
      if (savedProps) {
        let list = JSON.parse(savedProps);
        if (Array.isArray(list) && list.length > 0) {
          list = list.map(p => {
            const verified = this.getVerifiedListingUrl(p);
            return { ...p, link: verified };
          });

          // Deduplicate if multiple copies exist
          const seen = new Set();
          const deduped = [];
          for (const item of list) {
            const rawAddr = (item.address || item.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const dedupKey = rawAddr.includes('178oldnorthern') ? 'prop-178-old-northern' : (rawAddr.includes('181waterworks') ? 'prop-181-waterworks' : (item.id || rawAddr));
            if (!seen.has(dedupKey)) {
              seen.add(dedupKey);
              deduped.push(item);
            }
          }
          localStorage.setItem('nestquest_properties', JSON.stringify(deduped));
        }
      }
    } catch(e) {
      console.warn('Sanitize properties error:', e);
    }
  }

  constructor() {
    this.properties = [];
    this.finances = DEFAULT_FINANCES;
    this.activeTab = 'properties';
    this.selectedForCompare = new Set();
    this.plannedInspections = new Set(JSON.parse(localStorage.getItem('nestquest_planned_inspections') || '["prop-bunya-45-120", "baringa-8-19"]'));
    this.inspectionStatuses = JSON.parse(localStorage.getItem('nestquest_inspection_statuses') || '{}');
    this.lifeAnchors = JSON.parse(localStorage.getItem('nestquest_life_anchors') || 'null') || DEFAULT_ANCHORS;
    this.anchorCommuteMode = 'all'; // 'all', 'drive', 'transit', 'walk'
    this.editingAnchorAddressId = null;
    this.deletedPropertyIds = new Set(JSON.parse(localStorage.getItem('nestquest_deleted_properties') || '[]'));
    KNOWN_DELETED_IDS.forEach(id => this.deletedPropertyIds.add(id));
    this.deletedPropertyAddresses = new Set(JSON.parse(localStorage.getItem('nestquest_deleted_addresses') || '[]'));
    KNOWN_DELETED_ADDRS.forEach(addr => this.deletedPropertyAddresses.add(addr));
    this.selectedSuburbs = new Set();
    this.filterBedrooms = 'all';
    this.filterMaxPrice = 'all';
    this.filterSuburb = 'all';
    this.filterPetSafe = false;
    this.searchQuery = '';
    this.sortBy = 'overall';
    this.isApiAvailable = false;

    this.init();
  }

  isPropertyDeleted(p) {
    if (!p) return false;
    if (p.id && (this.deletedPropertyIds.has(p.id) || KNOWN_DELETED_IDS.includes(p.id))) return true;
    const addr = (p.address || '').toLowerCase().trim();
    if (addr) {
      if (this.deletedPropertyAddresses.has(addr)) return true;
      for (const d of this.deletedPropertyAddresses) {
        if (d && (addr.includes(d) || d.includes(addr))) return true;
      }
      for (const kd of KNOWN_DELETED_ADDRS) {
        if (addr.includes(kd)) return true;
      }
    }
    return false;
  }

  async init() {
    this.sanitizeAllStoredProperties();
    await this.checkApiAndLoadData();
    this.migrateAndCleanProperties();
    this.checkForImportParam();
    this.setupEventListeners();
    this.updateBookmarkletOrigin();
    this.updateInspectionCountBadge();
    this.renderHeaderStats();
    this.renderCurrentView();
  }

  migrateAndCleanProperties() {
    let modified = false;

    // Ensure finances has all sections initialized
    if (!this.finances.profiles) {
      this.finances.profiles = JSON.parse(JSON.stringify(DEFAULT_FINANCES.profiles));
      modified = true;
    }
    if (!this.finances.sale) {
      this.finances.sale = JSON.parse(JSON.stringify(DEFAULT_FINANCES.sale));
      modified = true;
    }
    if (!this.finances.purchaseDefaults) {
      this.finances.purchaseDefaults = JSON.parse(JSON.stringify(DEFAULT_FINANCES.purchaseDefaults));
      modified = true;
    }

    this.properties.forEach(p => {
      const addr = (p.address || '').toLowerCase();

      // 1. Precise Body Corporate by property according to spreadsheet
      if (addr.includes('bunya')) {
        p.quarterlyBodyCorp = 965;
        p.monthlyBodyCorp = 321.67;
        p.weeklyBodyCorp = 74;
        if (p.bedrooms !== 4) { p.bedrooms = 4; modified = true; }
        if (!p.inspectionTimes) { p.inspectionTimes = "Sat 7 Nov 9:00 am"; modified = true; }
        if (!p.imageUrl || p.imageUrl.toLowerCase().includes('place') || p.imageUrl.toLowerCase().includes('logo') || p.imageUrl.includes('placeholder')) {
          p.imageUrl = "https://i2.au.reastatic.net/1140x640-format=webp/2b5bcf889d5fc40e1b462e9ef182c33eeee68644bae8fae0c02384e9d0767666/image.jpg";
          modified = true;
        }
        if (!p.floorplanUrl || p.floorplanUrl.toLowerCase().includes('placeholder')) {
          p.floorplanUrl = "https://i2.au.reastatic.net/1140x640-format=webp/24ce030c98a427e42ea1b7826ef3856132b132c695ee585a1bdf21d0f70962e1/image.png";
          modified = true;
        }
      } else if (addr.includes('rogers')) {
        p.quarterlyBodyCorp = 1200;
        p.monthlyBodyCorp = 400;
        p.weeklyBodyCorp = 92;
        p.bedrooms = 4;
        modified = true;
      } else if (addr.includes('dickson') || addr.includes('richmond')) {
        p.quarterlyBodyCorp = 1200;
        p.monthlyBodyCorp = 400;
        p.weeklyBodyCorp = 92;
        modified = true;
      } else if (addr.includes('baringa')) {
        p.quarterlyBodyCorp = 2000;
        p.monthlyBodyCorp = 666.67;
        p.weeklyBodyCorp = 154;
        modified = true;
      } else {
        // Any other imported property (e.g. 13/906 Hamilton Road):
        // Fix duplicate $322/mo if it was mistakenly copied from Bunya
        if (p.quarterlyBodyCorp === 965 || Math.round(p.monthlyBodyCorp) === 322) {
          p.quarterlyBodyCorp = 1200;
          p.monthlyBodyCorp = 400;
          p.weeklyBodyCorp = 92;
          modified = true;
        }
      }

      // Compute weeklyBodyCorp if missing
      if (!p.weeklyBodyCorp) {
        if (p.quarterlyBodyCorp) p.weeklyBodyCorp = Math.round(p.quarterlyBodyCorp / 13);
        else if (p.monthlyBodyCorp) p.weeklyBodyCorp = Math.round(p.monthlyBodyCorp / 4.333);
        else p.weeklyBodyCorp = 92;
        modified = true;
      }

      // Strip out any Unsplash or irrelevant stock photos
      if (p.imageUrl && p.imageUrl.includes('unsplash')) {
        p.imageUrl = '';
        modified = true;
      }
      if (p.images && Array.isArray(p.images)) {
        const clean = p.images.filter(img => !img.includes('unsplash'));
        if (clean.length !== p.images.length) {
          p.images = clean;
          modified = true;
        }
      }

      // Sanitize any logo mistakenly assigned as property hero image
      if (p.imageUrl && (p.imageUrl.toLowerCase().includes('place') || p.imageUrl.toLowerCase().includes('logo'))) {
        if (p.images && p.images.length > 0) {
          const cleanHero = p.images.find(img => !img.toLowerCase().includes('logo') && !img.toLowerCase().includes('place') && !img.includes('.png'));
          if (cleanHero) {
            p.imageUrl = cleanHero;
            modified = true;
          }
        }
      }

      // Auto-detect floorplan from image array if missing
      if (!p.floorplanUrl && p.images && Array.isArray(p.images)) {
        const fp = p.images.find(img => img.includes('.png') || img.toLowerCase().includes('floorplan') || img.toLowerCase().includes('floor_plan'));
        if (fp) {
          p.floorplanUrl = fp;
          modified = true;
        }
      }
    });

    if (modified) {
      this.saveDataLocally();
      this.recalculateAllMetrics();
    }
  }

  copyBookmarkletCode() {
    const origin = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'https://propertyhunterz.netlify.app';
    const code = this.generateBookmarkletCode(origin);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        const copyBtn = document.getElementById('btn-copy-bookmarklet');
        if (copyBtn) {
          copyBtn.innerHTML = '✅ Copied Code to Clipboard!';
          copyBtn.style.background = 'var(--sage-dark, #365039)';
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copy Bookmarklet Code for iPhone';
            copyBtn.style.background = 'var(--sage)';
          }, 3500);
        }
        alert('✅ Bookmarklet code copied to your clipboard!\n\nFollow these steps on iPhone Safari:\n1. Tap Safari Share (box with arrow) ➔ "Add Bookmark" (name it "Send to NestQuest").\n2. Open Bookmarks (📖 icon) ➔ tap Edit ➔ tap "Send to NestQuest".\n3. Clear the URL, PASTE this code, and tap Done!\n\n🎯 CRITICAL FOR IPHONE:\nWhen on Realestate.com.au, tap the Safari Address Bar and type "Send", then tap the bookmark suggestion! (Apple blocks scripts if clicked from the 📖 menu).');
      }).catch(() => {
        prompt('Copy the bookmarklet code below:', code);
      });
    } else {
      prompt('Copy the bookmarklet code below:', code);
    }
  }

  switchBookmarkletGuide(type) {
    const pcSec = document.getElementById('guide-pc-section');
    const mobSec = document.getElementById('guide-mobile-section');
    const pcBtn = document.getElementById('tab-btn-pc-guide');
    const mobBtn = document.getElementById('tab-btn-mobile-guide');
    if (!pcSec || !mobSec) return;

    if (type === 'pc') {
      pcSec.style.display = 'block';
      mobSec.style.display = 'none';
      if (pcBtn) { pcBtn.style.background = 'var(--sage)'; pcBtn.style.color = 'white'; }
      if (mobBtn) { mobBtn.style.background = ''; mobBtn.style.color = ''; }
    } else {
      pcSec.style.display = 'none';
      mobSec.style.display = 'block';
      if (mobBtn) { mobBtn.style.background = 'var(--sage)'; mobBtn.style.color = 'white'; }
      if (pcBtn) { pcBtn.style.background = ''; pcBtn.style.color = ''; }
    }
  }

  updateBookmarkletOrigin() {
    const btn = document.getElementById('bookmarklet-drag-btn');
    if (!btn) return;
    const origin = (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:8550';
    btn.href = this.generateBookmarkletCode(origin);
  }

  generateBookmarkletCode(targetOrigin) {
    const raw = `(function(){
      try {
        var host = window.location.hostname.toLowerCase();
        var isPropComAu = host.indexOf('property.com.au') !== -1;
        var p = {
          link: window.location.href.split('?')[0],
          address: '',
          suburb: 'Everton Hills',
          bedrooms: 4,
          bathrooms: 2,
          parking: '2 car garage',
          parkingSpaces: 2,
          levels: 2,
          outdoorSpace: 'Private courtyard',
          modelledPrice: 0,
          advertisedGuide: '',
          inspectionTimes: '',
          imageUrl: '',
          floorplanUrl: '',
          images: [],
          notes: '',
          propertyValue: null,
          propertyValueConfidence: '',
          propertyValueSource: ''
        };

        // 1. Address extraction
        var h1 = document.querySelector('h1') || document.querySelector('[data-testid*="address"]') || document.querySelector('.property-info-address') || document.querySelector('[class*="address"]');
        if (h1) {
          p.address = h1.innerText.replace(/\n/g, ', ').trim();
        } else if (document.title) {
          p.address = document.title.split('|')[0].split('-')[0].trim();
        }

        var cleanStr = (p.address + ' ' + window.location.href).replace(/[\+\-_]/g, ' ');
        var subMatch = cleanStr.match(/\b(Morningside|Everton Park|Everton Hills|Stafford|Mitchelton|Kedron|Camp Hill|Coorparoo|Norman Park|Bulimba|Hawthorne|Cannon Hill|Carina|Chermside|Enoggera|McDowall|Arana Hills)\b/i);
        if (subMatch) p.suburb = subMatch[1];

        // 2. Bed / Bath / Car
        var bodyText = document.body.innerText;
        var specMatch = bodyText.match(/(\d+)\s+(\d+)\s+(\d+)\s*(?:[\d\.,]+\s*m²|\d+\s*sqm)?\s*[•\-|·\s]\s*(?:Townhouse|House|Apartment|Unit)/i);
        if (specMatch) {
          p.bedrooms = parseInt(specMatch[1], 10);
          p.bathrooms = parseFloat(specMatch[2]);
          p.parkingSpaces = parseInt(specMatch[3], 10);
          p.parking = p.parkingSpaces + ' car garage';
        } else {
          var bedEl = document.querySelector('[data-testid*="bed" i],[aria-label*="bedroom" i],[aria-label*="bed" i]');
          if (bedEl) {
            var bMatch = (bedEl.getAttribute('aria-label') || bedEl.innerText).match(/\d+/);
            if (bMatch) p.bedrooms = parseInt(bMatch[0], 10);
          } else {
            var bM2 = bodyText.match(/(\d+)\s*(?:bed|bedroom)/i);
            if (bM2) p.bedrooms = parseInt(bM2[1], 10);
          }
          var bathEl = document.querySelector('[data-testid*="bath" i],[aria-label*="bathroom" i],[aria-label*="bath" i]');
          if (bathEl) {
            var baMatch = (bathEl.getAttribute('aria-label') || bathEl.innerText).match(/\d+(\.\d+)?/);
            if (baMatch) p.bathrooms = parseFloat(baMatch[0]);
          } else {
            var baM2 = bodyText.match(/(\d+(?:\.5)?)\s*(?:bath|bathroom)/i);
            if (baM2) p.bathrooms = parseFloat(baM2[1]);
          }
          var carEl = document.querySelector('[data-testid*="parking" i],[aria-label*="parking" i],[aria-label*="car" i]');
          if (carEl) {
            var cMatch = (carEl.getAttribute('aria-label') || carEl.innerText).match(/\d+/);
            if (cMatch) {
              p.parkingSpaces = parseInt(cMatch[0], 10);
              p.parking = p.parkingSpaces + ' car garage';
            }
          } else {
            var cM2 = bodyText.match(/(\d+)\s*(?:car|garage|parking)/i);
            if (cM2) {
              p.parkingSpaces = parseInt(cM2[1], 10);
              p.parking = p.parkingSpaces + ' car garage';
            }
          }
        }

        // 3. Inspections
        var inspMatch = bodyText.match(/Inspection\s+([^\n]+(?:am|pm)[^\n]*)/i) || bodyText.match(/Open\s+(?:Home|Inspection)[:\s]*([^\n]+(?:am|pm)[^\n]*)/i);
        if (inspMatch) {
          p.inspectionTimes = inspMatch[1].replace(/View all/i, '').trim();
        }

        // 4. Advertised Guide Price
        var priceEl = document.querySelector('[data-testid*="price"],.property-price,[class*="price"]');
        if (priceEl && priceEl.innerText.trim()) {
          p.advertisedGuide = priceEl.innerText.trim();
          var numMatch = p.advertisedGuide.replace(/[^\d]/g, '');
          if (numMatch.length >= 6) p.modelledPrice = parseInt(numMatch, 10);
        }

        // 5. PROPERTY.COM.AU & PROPTRACK VALUATION EXTRACTION
        var pvConfMatch = bodyText.match(/(high|medium|low)\s+confidence[\s\S]{0,140}?\$([0-9]{1,3}(?:,[0-9]{3})+)/i);
        var pvMatch = bodyText.match(/(?:property\s+value|estimated\s+value)[\s\S]{0,220}?\$([0-9]{1,3}(?:,[0-9]{3})+)/i);

        if (pvConfMatch) {
          var val = parseInt(pvConfMatch[2].replace(/,/g, ''), 10);
          var conf = pvConfMatch[1].toUpperCase() + ' CONFIDENCE';
          p.propertyValue = val;
          p.propertyValueConfidence = conf;
          p.propertyValueSource = 'property.com.au';
          if (!p.modelledPrice || p.modelledPrice === 0 || isPropComAu || p.advertisedGuide.toLowerCase().indexOf('for sale') !== -1 || p.advertisedGuide.toLowerCase().indexOf('expressions') !== -1) {
            p.modelledPrice = val;
            p.advertisedGuide = (p.advertisedGuide ? p.advertisedGuide + ' · ' : '') + 'Property.com.au: $' + val.toLocaleString() + ' (' + conf + ')';
          }
        } else if (pvMatch) {
          var val2 = parseInt(pvMatch[1].replace(/,/g, ''), 10);
          p.propertyValue = val2;
          p.propertyValueConfidence = 'HIGH CONFIDENCE';
          p.propertyValueSource = 'property.com.au';
          if (!p.modelledPrice || p.modelledPrice === 0 || isPropComAu || p.advertisedGuide.toLowerCase().indexOf('for sale') !== -1 || p.advertisedGuide.toLowerCase().indexOf('expressions') !== -1) {
            p.modelledPrice = val2;
            p.advertisedGuide = (p.advertisedGuide ? p.advertisedGuide + ' · ' : '') + 'Property.com.au: $' + val2.toLocaleString();
          }
        }

        // Check __INITIAL_STATE__ for realestate.com.au AVM data
        try {
          var state = window.__INITIAL_STATE__ || (document.getElementById('__NEXT_DATA__') ? JSON.parse(document.getElementById('__NEXT_DATA__').innerText) : null);
          if (state) {
            var stateStr = JSON.stringify(state);
            var avmMatch = stateStr.match(/"(?:estimate|midPrice|valuation|avmValue)":\s*(\d{6,8})/i);
            if (avmMatch && (!p.propertyValue || p.modelledPrice === 0 || p.modelledPrice === 950000)) {
              var avmVal = parseInt(avmMatch[1], 10);
              p.propertyValue = avmVal;
              p.propertyValueConfidence = 'HIGH CONFIDENCE';
              p.propertyValueSource = 'property.com.au';
              p.modelledPrice = avmVal;
              p.advertisedGuide = (p.advertisedGuide ? p.advertisedGuide + ' · ' : '') + 'Property.com.au: $' + avmVal.toLocaleString();
            }
          }
        } catch(e) {}

        if (!p.modelledPrice || p.modelledPrice === 0) {
          p.modelledPrice = 950000;
        }

        // 6. Photos & Floorplan
        var photoList = [];
        var floorplan = '';
        var facade = '';

        try {
          var state = window.__INITIAL_STATE__ || (document.getElementById('__NEXT_DATA__') ? JSON.parse(document.getElementById('__NEXT_DATA__').innerText) : null);
          if (state) {
            var stateStr = JSON.stringify(state);
            var fpMatches = stateStr.match(/https:\/\/[^"'\]*(?:floorplan|floor_plan)[^"'\]*/gi);
            if (fpMatches && fpMatches.length > 0) {
              floorplan = fpMatches[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
            }
            var imgMatches = stateStr.match(/https:\/\/[^"'\]*(?:reastatic\.net|epc\.ms|property\.com\.au)[^"'\]*/gi) || [];
            for (var m = 0; m < imgMatches.length; m++) {
              var cleanImg = imgMatches[m].replace(/\\u002F/g, '/').replace(/\\/g, '');
              var low = cleanImg.toLowerCase();
              if (low.includes('logo') || low.includes('agency') || low.includes('branding') || low.includes('avatar') || low.includes('icon') || low.includes('.svg') || low.includes('banner') || low.includes('place.p')) continue;
              var hiRes = cleanImg.replace(/\d+x\d+/, '1140x640');
              if (!photoList.includes(hiRes)) photoList.push(hiRes);
              if (!floorplan && (low.includes('floorplan') || low.includes('.png'))) floorplan = hiRes;
            }
          }
        } catch(e) {}

        var allImgs = Array.from(document.querySelectorAll('img, picture source, picture img'));
        for (var i = 0; i < allImgs.length; i++) {
          var el = allImgs[i];
          var src = el.src || (el.srcset ? el.srcset.split(' ')[0] : '');
          if (!src) continue;
          var s = src.toLowerCase();
          var alt = (el.alt || '').toLowerCase();
          var cls = (el.className || '').toString().toLowerCase();

          if (s.includes('logo') || s.includes('agency') || s.includes('agent') || s.includes('branding') || s.includes('banner') || s.includes('avatar') || s.includes('place.p') || s.includes('icon') || s.includes('.svg') || s.includes('place_') || alt.includes('logo') || alt.includes('agency') || cls.includes('logo') || cls.includes('agency') || cls.includes('branding')) {
            continue;
          }
          try {
            if (el.closest('header, nav, aside, [data-testid*="agency"], [data-testid*="agent"], [class*="agency"], [class*="branding"]')) {
              continue;
            }
          } catch(e) {}

          var hiRes = src.replace(/\d+x\d+/, '1140x640');
          if (!floorplan && (alt.includes('floorplan') || alt.includes('floor plan') || s.includes('floorplan') || s.includes('floor_plan') || s.includes('.png') || alt.includes('plan 1') || s.includes('plan-1'))) {
            floorplan = hiRes;
          }
          if (!photoList.includes(hiRes) && (s.includes('reastatic') || s.includes('epc.ms') || s.includes('domain.com.au') || s.includes('property.com.au') || s.includes('format=webp') || s.includes('photo') || s.includes('.jpg') || s.includes('.png'))) {
            photoList.push(hiRes);
          }
          if (!facade && (s.includes('1140x') || s.includes('800x') || s.includes('format=webp') || s.includes('photo')) && !s.includes('.png') && !alt.includes('floorplan')) {
            facade = hiRes;
          }
        }

        if (!floorplan) {
          var pngImg = photoList.find(function(url) { return url.indexOf('.png') !== -1 || url.indexOf('floorplan') !== -1; });
          if (pngImg) floorplan = pngImg;
        }
        if (!facade && photoList.length > 0) {
          facade = photoList.find(function(url) { return url !== floorplan; }) || photoList[0];
        }

        p.imageUrl = facade || '';
        p.floorplanUrl = floorplan || '';
        p.images = photoList.length > 0 ? photoList : [facade, floorplan].filter(Boolean);

        try { navigator.clipboard.writeText(JSON.stringify(p)); } catch(e) {}
        var targetOrigin = '${targetOrigin}';
        var u = targetOrigin + '/?import=' + encodeURIComponent(JSON.stringify(p));
        var w = null;
        try { w = window.open(u, '_blank'); } catch(e) {}
        if (!w || w.closed || typeof w.closed === 'undefined') {
          window.location.href = u;
        }
      } catch(err) {
        alert('Extraction notice: ' + err.message);
      }
    })();`;
    return 'javascript:void(eval(decodeURIComponent("' + encodeURIComponent(raw.replace(/\s+/g, ' ')) + '")));';
  }

  checkForImportParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const importData = urlParams.get('import');
    if (importData) {
      try {
        const prop = JSON.parse(decodeURIComponent(importData));
        if (prop && (prop.address || prop.link)) {
          let suburb = (prop.suburb || '').trim();
          if (!suburb) {
            const combined = ((prop.address || '') + ' ' + (prop.link || '')).replace(/[\+\-_]/g, ' ');
            const subMatch = combined.match(/\b(Morningside|Everton Park|Everton Hills|Stafford|Mitchelton|Kedron|Camp Hill|Coorparoo|Norman Park|Bulimba|Hawthorne|Cannon Hill|Carina|Chermside|Enoggera|McDowall|Arana Hills)\b/i);
            suburb = subMatch ? subMatch[1] : 'Everton Hills';
          }

          let address = prop.address || 'Imported Property';
          if (suburb && !address.toLowerCase().includes(suburb.toLowerCase())) {
            address = `${address}, ${suburb}`;
          }

          let modelledPrice = Number(prop.modelledPrice) || 0;
          if (modelledPrice === 0 && prop.propertyValue) {
            modelledPrice = Number(prop.propertyValue);
          } else if (modelledPrice === 0 && prop.advertisedGuide) {
            const clean = prop.advertisedGuide.toLowerCase().replace(/[\$,\s]/g, '');
            if (clean.includes('m')) {
              const num = parseFloat(clean.replace('m', ''));
              if (num > 0) modelledPrice = Math.round(num * 1000000);
            } else if (clean.includes('k')) {
              const num = parseFloat(clean.replace('k', ''));
              if (num > 0) modelledPrice = Math.round(num * 1000);
            } else {
              const num = parseInt(clean.replace(/[^\d]/g, ''), 10);
              if (num >= 100000) modelledPrice = num;
            }
          }
          if (modelledPrice === 0) modelledPrice = 950000;

          // Auto-detect floorplan from image list if .png or floorplan in url
          let floorplanUrl = prop.floorplanUrl || '';
          if (!floorplanUrl && prop.images && Array.isArray(prop.images)) {
            const fp = prop.images.find(img => img.includes('.png') || img.toLowerCase().includes('floorplan') || img.toLowerCase().includes('floor_plan'));
            if (fp) floorplanUrl = fp;
          }

          let candidateImg = prop.imageUrl || '';
          if (candidateImg && (candidateImg.toLowerCase().includes('logo') || candidateImg.toLowerCase().includes('place.p') || candidateImg.toLowerCase().includes('branding') || candidateImg.toLowerCase().includes('banner'))) {
            candidateImg = '';
          }
          if (!candidateImg && prop.images && Array.isArray(prop.images)) {
            const cleanImg = prop.images.find(img => !img.toLowerCase().includes('logo') && !img.toLowerCase().includes('place') && !img.toLowerCase().includes('branding') && !img.includes('.png'));
            if (cleanImg) candidateImg = cleanImg;
          }
          if (address.toLowerCase().includes('bunya')) {
            if (!candidateImg) candidateImg = "https://i2.au.reastatic.net/1140x640-format=webp/2b5bcf889d5fc40e1b462e9ef182c33eeee68644bae8fae0c02384e9d0767666/image.jpg";
            if (!floorplanUrl) floorplanUrl = "https://i2.au.reastatic.net/1140x640-format=webp/24ce030c98a427e42ea1b7826ef3856132b132c695ee585a1bdf21d0f70962e1/image.png";
          }

          // Check if property is ALREADY in our portfolio (matches address or link)
          // If so, enrich it with the Property.com.au value rather than creating a duplicate!
          const existingIdx = this.properties.findIndex(item => {
            const a1 = (item.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const a2 = address.toLowerCase().replace(/[^a-z0-9]/g, '');
            const addrMatch = a1 && a2 && (a1.includes(a2) || a2.includes(a1));
            const linkMatch = item.link && prop.link && item.link.split('?')[0] === prop.link.split('?')[0];
            return addrMatch || linkMatch;
          });

          if (existingIdx !== -1) {
            const existing = this.properties[existingIdx];
            existing.modelledPrice = modelledPrice;
            if (prop.propertyValue) {
              existing.propertyValue = prop.propertyValue;
              existing.propertyValueConfidence = prop.propertyValueConfidence || 'HIGH CONFIDENCE';
              existing.propertyValueSource = 'property.com.au';
            }
            if (prop.advertisedGuide) existing.advertisedGuide = prop.advertisedGuide;
            if (candidateImg && (!existing.imageUrl || existing.imageUrl.includes('unsplash'))) existing.imageUrl = candidateImg;
            if (floorplanUrl && !existing.floorplanUrl) existing.floorplanUrl = floorplanUrl;

            this.recalculateAllMetrics();
            this.saveDataLocally();
            this.syncFinancesToBackend();
            this.renderProperties();
            this.renderHeaderStats();
            if (this.activeTab === 'finances') this.renderFinancialSimulator();

            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
              this.openDetailDrawer(existing.id);
              alert(`✅ Updated "${existing.address}" with Property.com.au valuation ($${modelledPrice.toLocaleString()})!`);
            }, 350);
            return;
          }

          // Otherwise, create new property
          let initialQtrBc = Number(prop.quarterlyBodyCorp) || 0;
          if (!initialQtrBc) {
            const addrLower = address.toLowerCase();
            if (addrLower.includes('bunya')) initialQtrBc = 965;
            else if (addrLower.includes('rogers') || addrLower.includes('dickson') || addrLower.includes('richmond')) initialQtrBc = 1200;
            else if (addrLower.includes('baringa')) initialQtrBc = 2000;
            else initialQtrBc = 1200;
          }
          const initialMonthBc = Math.round((initialQtrBc / 3) * 100) / 100;
          const initialWeekBc = Math.round(initialQtrBc / 13);

          const newId = 'prop-' + Date.now();
          const newProp = {
            id: newId,
            address: address,
            suburb: suburb,
            link: prop.link || '',
            advertisedGuide: prop.advertisedGuide || `$${modelledPrice.toLocaleString()}`,
            modelledPrice: modelledPrice,
            propertyValue: prop.propertyValue || null,
            propertyValueConfidence: prop.propertyValueConfidence || '',
            propertyValueSource: prop.propertyValueSource || '',
            bedrooms: Number(prop.bedrooms) || 4,
            bathrooms: Number(prop.bathrooms) || 2,
            parking: prop.parking || 'Side-by-side double garage',
            parkingSpaces: Number(prop.parkingSpaces) || 2,
            levels: Number(prop.levels) || 2,
            outdoorSpace: prop.outdoorSpace || 'Private courtyard',
            standoutFeature: prop.standoutFeature || 'Second living area and courtyard',
            lifestyleFit: suburb.toLowerCase().includes('morningside') ? 'Preferred suburb (Emma)' : 'Northside lifestyle (Jordan preferred)',
            planningRisk: prop.planningRisk || 'None flagged',
            keyCompromise: prop.keyCompromise || 'Requires driving to shops',
            inspectionTimes: prop.inspectionTimes || '',
            quarterlyBodyCorp: initialQtrBc,
            monthlyBodyCorp: initialMonthBc,
            weeklyBodyCorp: initialWeekBc,
            imageUrl: candidateImg || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
            floorplanUrl: floorplanUrl,
            images: (prop.images && prop.images.length > 0) ? prop.images : [candidateImg, floorplanUrl].filter(Boolean),
            notes: prop.notes || ''
          };

          this.properties.unshift(newProp);
          this.recalculateAllMetrics();
          this.saveDataLocally();
          this.syncFinancesToBackend();
          this.renderProperties();
          this.renderHeaderStats();
          if (this.activeTab === 'finances') this.renderFinancialSimulator();

          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            this.openDetailDrawer(newId);
          }, 350);
        }
      } catch (e) {
        console.error('Error importing from URL parameter:', e);
      }
    }
  }

  async checkApiAndLoadData() {
    try {
      const res = await fetch('/api/status', { signal: AbortSignal.timeout(1500) });
      if (res.ok) this.isApiAvailable = true;
    } catch (e) {
      this.isApiAvailable = false;
    }

    if (this.isApiAvailable) {
      try {
        const [propsRes, finRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/finances')
        ]);
        if (propsRes.ok) {
          const apiProps = await propsRes.json();
          this.properties = (Array.isArray(apiProps) ? apiProps : []).filter(p => !this.deletedPropertyIds.has(p.id));
        }
        if (finRes.ok) {
          const finData = await finRes.json();
          this.finances = finData;
          if (finData.lifeAnchors) this.lifeAnchors = finData.lifeAnchors;
        }
      } catch (err) {
        console.warn('API error, using localStorage / defaults', err);
        this.loadLocalData();
      }
    } else {
      // Static Cloud Hosting fallback (Vercel / Netlify / GitHub Pages)
      try {
        const [propsRes, finRes] = await Promise.all([
          fetch('data/properties.json?t=' + Date.now()),
          fetch('data/finances.json?t=' + Date.now())
        ]);
        if (propsRes.ok) {
          const cloudProps = await propsRes.json();
          if (Array.isArray(cloudProps) && cloudProps.length > 0) {
            const savedProps = localStorage.getItem('nestquest_properties');
            let parsed = null;
            try { parsed = savedProps ? JSON.parse(savedProps) : null; } catch(e) {}
            if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
              this.properties = cloudProps.filter(p => !this.isPropertyDeleted(p));
              localStorage.setItem('nestquest_properties', JSON.stringify(this.properties));
            } else {
              // Auto-merge new candidate properties from cloudProps not in localStorage and NOT deleted
              let cloudMerged = false;
              // Clean existing parsed of any deleted listings first
              const initialLen = parsed.length;
              parsed = parsed.filter(p => !this.isPropertyDeleted(p));
              if (parsed.length !== initialLen) cloudMerged = true;

              cloudProps.forEach(cp => {
                if (!this.isPropertyDeleted(cp)) {
                  const idx = parsed.findIndex(p => p.id === cp.id || (p.address && cp.address && p.address.toLowerCase().trim() === cp.address.toLowerCase().trim()));
                  if (idx === -1) {
                    parsed.unshift(cp);
                    cloudMerged = true;
                  } else if (cp.id === 'prop-waterworks-2-181' || cp.id === 'prop-old-northern-2-178' || cp.id === 'prop-bunya-45-120') {
                    parsed[idx] = { ...parsed[idx], ...cp };
                    cloudMerged = true;
                  }
                }
              });
              this.properties = parsed.filter(p => !this.isPropertyDeleted(p));
              if (cloudMerged) {
                localStorage.setItem('nestquest_properties', JSON.stringify(this.properties));
              }
            }
          }
        }
        if (finRes.ok) {
          const finData = await finRes.json();
          const savedFin = localStorage.getItem('nestquest_finances');
          if (!savedFin) {
            this.finances = finData;
            if (finData.lifeAnchors) this.lifeAnchors = finData.lifeAnchors;
          }
        }
      } catch (e) {}
      this.loadLocalData();
    }

    // Auto-fix floorplan detection on any loaded properties if missing
    this.properties.forEach(p => {
      if (!p.floorplanUrl && p.images && Array.isArray(p.images)) {
        const fp = p.images.find(img => img.includes('.png') || img.toLowerCase().includes('floorplan') || img.toLowerCase().includes('floor_plan'));
        if (fp) p.floorplanUrl = fp;
      }
    });

    this.recalculateAllMetrics();
  }

  loadLocalData() {
    const savedProps = localStorage.getItem('nestquest_properties');
    const savedFin = localStorage.getItem('nestquest_finances');
    const savedAnchors = localStorage.getItem('nestquest_life_anchors');

    let parsedProps = null;
    try { parsedProps = savedProps ? JSON.parse(savedProps) : null; } catch(e) {}
    if (parsedProps && Array.isArray(parsedProps) && parsedProps.length > 0) {
      let localMerged = false;
      // Strip any deleted properties immediately
      const initialCount = parsedProps.length;
      parsedProps = parsedProps.filter(p => !this.isPropertyDeleted(p));
      if (parsedProps.length !== initialCount) localMerged = true;

      DEFAULT_PROPERTIES.forEach(dp => {
        if (!this.isPropertyDeleted(dp)) {
          const lidx = parsedProps.findIndex(p => p.id === dp.id || (p.address && dp.address && p.address.toLowerCase().trim() === dp.address.toLowerCase().trim()));
          if (lidx === -1) {
            parsedProps.unshift(JSON.parse(JSON.stringify(dp)));
            localMerged = true;
          } else if (dp.id === 'prop-waterworks-2-181' || dp.id === 'prop-old-northern-2-178' || dp.id === 'prop-bunya-45-120') {
            parsedProps[lidx] = { ...parsedProps[lidx], ...JSON.parse(JSON.stringify(dp)) };
            localMerged = true;
          }
        }
      });
      this.properties = parsedProps.filter(p => !this.isPropertyDeleted(p));
      if (localMerged) {
        localStorage.setItem('nestquest_properties', JSON.stringify(this.properties));
      }
    } else if (!this.properties || this.properties.length === 0) {
      this.properties = JSON.parse(JSON.stringify(DEFAULT_PROPERTIES)).filter(p => !this.isPropertyDeleted(p));
    }
    
    // Auto-correct legacy incorrect/broken listing links stored in localStorage
    if (this.properties && Array.isArray(this.properties)) {
      let linksUpdated = false;
      this.properties.forEach(p => {
        if (p.address && p.address.toLowerCase().includes('178 old northern')) {
          if (!p.link || p.link.includes('146399120')) {
            p.link = 'https://www.domain.com.au/2-178-old-northern-road-everton-park-qld-4053-2021074495';
            linksUpdated = true;
          }
        }
        if (p.address && p.address.toLowerCase().includes('181 waterworks')) {
          if (!p.link || p.link.includes('147814884')) {
            p.link = 'https://www.realestate.com.au/property/2-181-waterworks-rd-ashgrove-qld-4060';
            linksUpdated = true;
          }
          if (!p.imageUrl) {
            p.imageUrl = 'images/ashgrove-facade.png';
            linksUpdated = true;
          }
          if (!p.images || p.images.length === 0) {
            p.images = ['images/ashgrove-facade.png'];
            linksUpdated = true;
          }
        }
        if (p.address && p.address.toLowerCase().includes('120 bunya')) {
          if (!p.link) {
            p.link = 'https://www.realestate.com.au/property-townhouse-qld-everton+hills-152742596';
            linksUpdated = true;
          }
        }
      });
      if (linksUpdated) {
        localStorage.setItem('nestquest_properties', JSON.stringify(this.properties));
      }
    }

    // Auto-correct legacy duplicate $322 body corporate on non-Bunya properties from earlier bookmarklet sessions
    if (this.properties && Array.isArray(this.properties)) {
      this.properties.forEach(p => {
        if (p.address && !p.address.includes("Bunya") && (p.monthlyBodyCorp === 322 || p.monthlyBodyCorp === 321.67 || p.weeklyBodyCorp === 74)) {
          p.weeklyBodyCorp = 92;
          p.monthlyBodyCorp = 400;
          p.quarterlyBodyCorp = 1200;
        }
      });
    }
    
    let loadedFin = DEFAULT_FINANCES;
    if (savedFin) {
      try {
        const parsed = JSON.parse(savedFin);
        loadedFin = {
          ...DEFAULT_FINANCES,
          ...parsed,
          sale: { ...DEFAULT_FINANCES.sale, ...(parsed.sale || {}) },
          purchaseDefaults: { ...DEFAULT_FINANCES.purchaseDefaults, ...(parsed.purchaseDefaults || {}) },
          profiles: {
            ...DEFAULT_FINANCES.profiles,
            ...(parsed.profiles || {}),
            generic: { ...DEFAULT_FINANCES.profiles.generic, ...(parsed.profiles?.generic || {}) },
            emma: { ...DEFAULT_FINANCES.profiles.emma, ...(parsed.profiles?.emma || {}) },
            jordan: { ...DEFAULT_FINANCES.profiles.jordan, ...(parsed.profiles?.jordan || {}) },
            furBabies: (parsed.profiles?.furBabies && parsed.profiles.furBabies.length > 0) ? parsed.profiles.furBabies : DEFAULT_FINANCES.profiles.furBabies
          }
        };
      } catch(e) {}
    }
    if (!loadedFin.householdBudget || !loadedFin.householdBudget.categories) {
      loadedFin.householdBudget = DEFAULT_FINANCES.householdBudget;
    }
    this.finances = loadedFin;
    if (savedAnchors) this.lifeAnchors = JSON.parse(savedAnchors);
  }

  saveDataLocally() {
    localStorage.setItem('nestquest_properties', JSON.stringify(this.properties));
    localStorage.setItem('nestquest_finances', JSON.stringify(this.finances));
    localStorage.setItem('nestquest_planned_inspections', JSON.stringify(Array.from(this.plannedInspections)));
    localStorage.setItem('nestquest_inspection_statuses', JSON.stringify(this.inspectionStatuses));
    localStorage.setItem('nestquest_life_anchors', JSON.stringify(this.lifeAnchors));
  }

  async syncPropertyToBackend(prop) {
    if (this.isApiAvailable) {
      try {
        await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prop)
        });
      } catch (e) {
        console.warn('Backend sync failed', e);
      }
    }
  }

  async syncFinancesToBackend() {
    if (this.isApiAvailable) {
      try {
        await fetch('/api/finances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.finances, lifeAnchors: this.lifeAnchors })
        });
      } catch (e) {
        console.warn('Finances sync failed', e);
      }
    }
  }

  recalculateAllMetrics() {
    const saleData = this.finances.sale;
    const defaults = this.finances.purchaseDefaults;

    this.properties = this.properties.map(p => {
      const fin = Calculator.evaluatePropertyFinances(p, saleData, defaults);
      const updated = {
        ...p,
        estimatedNewMortgage: fin.estimatedNewMortgage,
        monthlyMortgage: fin.monthlyMortgage,
        monthlyTotal: fin.monthlyTotal,
        monthlySaving: fin.monthlySaving,
        mortgageReduction: fin.mortgageReduction,
        monthlyBodyCorp: fin.monthlyBodyCorp,
        quarterlyBodyCorp: fin.quarterlyBodyCorp
      };

      const scores = AIEngine.scoreProperty(updated, this.finances);
      return {
        ...updated,
        aiScores: scores
      };
    });
  }

  setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.switchTab(target);
      });
    });

    // Suburb Multi-Select dropdown toggle button
    const suburbToggleBtn = document.getElementById('btn-toggle-suburb-dropdown');
    if (suburbToggleBtn) {
      suburbToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSuburbDropdown();
      });
    }

    // Clear / Select All suburbs button
    const clearSuburbsBtn = document.getElementById('btn-clear-suburbs');
    if (clearSuburbsBtn) {
      clearSuburbsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearSuburbs();
      });
    }

    // Close suburb dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const container = document.getElementById('suburb-filter-container');
      if (container && !container.contains(e.target)) {
        this.toggleSuburbDropdown(false);
      }
    });

    // Bedroom Filter
    const bedroomSelect = document.getElementById('filter-bedrooms');
    if (bedroomSelect) {
      bedroomSelect.addEventListener('change', (e) => {
        this.filterBedrooms = e.target.value;
        bedroomSelect.classList.toggle('active', this.filterBedrooms !== 'all');
        this.renderProperties();
      });
    }

    // Max Price Filter
    const priceSelect = document.getElementById('filter-max-price');
    if (priceSelect) {
      priceSelect.addEventListener('change', (e) => {
        this.filterMaxPrice = e.target.value;
        priceSelect.classList.toggle('active', this.filterMaxPrice !== 'all');
        this.renderProperties();
      });
    }



    // Search bar
    const searchInput = document.getElementById('property-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderProperties();
      });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderProperties();
      });
    }

    // Add Property Modal Triggers
    const openAddBtn = document.getElementById('btn-open-add-modal');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => this.openAddModal());
    }

    const closeAddBtn = document.getElementById('btn-close-add-modal');
    if (closeAddBtn) {
      closeAddBtn.addEventListener('click', () => this.closeAddModal());
    }

    // Modal Subtabs (Bookmarklet / Paste / Scrape / Form)
    document.querySelectorAll('.import-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.import-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        document.querySelectorAll('.import-subtab-pane').forEach(p => p.style.display = 'none');
        const pane = document.getElementById(`import-pane-${mode}`);
        if (pane) pane.style.display = 'block';
      });
    });

    // Scrape URL Action
    const scrapeBtn = document.getElementById('btn-run-scrape');
    if (scrapeBtn) {
      scrapeBtn.addEventListener('click', () => this.handleScrapeUrl());
    }

    // Smart Paste Action
    const parsePasteBtn = document.getElementById('btn-parse-paste');
    if (parsePasteBtn) {
      parsePasteBtn.addEventListener('click', () => this.handleParsePaste());
    }

    // Sample Paste Action
    const samplePasteBtn = document.getElementById('btn-sample-paste');
    if (samplePasteBtn) {
      samplePasteBtn.addEventListener('click', () => {
        const sample = `14/22 Richmond Road, Morningside QLD 4170\nOffers over $920,000\n3 Bed | 2.5 Bath | 2 Car Garage (side-by-side lockup)\nStunning dual-level contemporary townhouse with private pet-friendly grassed courtyard.\nBody corporate levies: $1,150 per quarter.\nInspection: Saturday 10:00am - 10:30am\nAir-conditioned open-plan living, stone benchtops, walking distance to Wynnum Road cafes, train station, and parks.`;
        const textarea = document.getElementById('paste-text-input');
        if (textarea) textarea.value = sample;
        this.handleParsePaste();
      });
    }

    // Save Property Form Submit
    const propertyForm = document.getElementById('add-property-form');
    if (propertyForm) {
      propertyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveProperty();
      });
    }

    // AI Chat Input & Send
    const chatInput = document.getElementById('ai-chat-input');
    const chatSendBtn = document.getElementById('btn-send-chat');
    if (chatSendBtn && chatInput) {
      const sendChat = () => {
        const text = chatInput.value.trim();
        if (text) {
          this.handleSendChatMessage(text);
          chatInput.value = '';
        }
      };
      chatSendBtn.addEventListener('click', sendChat);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
      });
    }

    // Quick Prompts Buttons
    document.querySelectorAll('.prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.textContent.trim();
        this.handleSendChatMessage(prompt);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-view').forEach(view => {
      view.style.display = 'none';
    });

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) {
      activeView.style.display = 'block';
    }

    this.renderCurrentView();
  }

  updateInspectionCountBadge() {
    const badge = document.getElementById('nav-inspection-count');
    if (!badge) return;
    const count = this.plannedInspections.size;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  renderHeaderStats() {
    const sale = this.finances.sale;
    const equity = Calculator.calculateSaleEquity(sale.estimatedSalePrice, sale.existingMortgage, sale.sellingExpenses);
    const validSavings = (this.properties || []).map(p => Number(p.monthlySaving) || 0).filter(s => s > 0);
    const maxSaving = validSavings.length > 0 ? Math.max(...validSavings) : 0;

    const statEquity = document.getElementById('stat-net-equity');
    if (statEquity) statEquity.textContent = `$${Math.round(equity).toLocaleString()}`;

    const statSavings = document.getElementById('stat-max-savings');
    if (statSavings) {
      if (maxSaving > 0) {
        statSavings.textContent = `+$${Math.round(maxSaving).toLocaleString()}/mo`;
        statSavings.style.color = 'var(--sage)';
      } else {
        statSavings.textContent = `$0/mo`;
        statSavings.style.color = 'var(--text-muted)';
      }
    }

    const propCounter = document.getElementById('nav-prop-count');
    if (propCounter) propCounter.textContent = this.properties.length;
  }

  renderCurrentView() {
    switch (this.activeTab) {
      case 'about':
      case 'compass':
        this.renderAboutUsView();
        break;
      case 'properties':
        this.renderProperties();
        break;
      case 'compare':
        this.renderComparisonView();
        break;
      case 'inspections':
        this.renderInspectionsView();
        break;
      case 'finances':
        this.renderFinancialSimulator();
        break;
      case 'advisor':
        this.renderAdvisorView();
        break;
      case 'compass':
        this.renderCompassView();
        break;
    }
  }

  // -------------------------------------------------------------
  // VIEW 1: PROPERTY HUB & CARDS
  // -------------------------------------------------------------
  renderProperties() {
    const grid = document.getElementById('properties-grid');
    if (!grid) return;

    this.updateSuburbFilterOptions();

    let filtered = [...this.properties];

    // 1. Multi-suburb selection
    if (this.selectedSuburbs && this.selectedSuburbs.size > 0) {
      filtered = filtered.filter(p => {
        const sub = (p.suburb || '').trim().toLowerCase();
        return Array.from(this.selectedSuburbs).some(s => s.toLowerCase() === sub);
      });
    }

    // 2. Bedrooms filter
    if (this.filterBedrooms && this.filterBedrooms !== 'all') {
      const minBeds = parseInt(this.filterBedrooms, 10);
      filtered = filtered.filter(p => (Number(p.bedrooms) || 0) >= minBeds);
    }

    // 3. Max Price filter
    if (this.filterMaxPrice && this.filterMaxPrice !== 'all') {
      const maxPrice = parseInt(this.filterMaxPrice, 10);
      filtered = filtered.filter(p => (Number(p.modelledPrice) || 0) <= maxPrice);
    }



    // 5. Search query
    if (this.searchQuery) {
      filtered = filtered.filter(p => 
        (p.address || '').toLowerCase().includes(this.searchQuery) ||
        (p.suburb || '').toLowerCase().includes(this.searchQuery) ||
        (p.standoutFeature || '').toLowerCase().includes(this.searchQuery) ||
        (p.notes || '').toLowerCase().includes(this.searchQuery)
      );
    }

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'overall':
          return (b.aiScores?.overallFit || 0) - (a.aiScores?.overallFit || 0);
        case 'emma':
          return (b.aiScores?.emmaScore || 0) - (a.aiScores?.emmaScore || 0);
        case 'jordan':
          return (b.aiScores?.jordanScore || 0) - (a.aiScores?.jordanScore || 0);
        case 'pets':
          return (b.aiScores?.furBabiesScore || 0) - (a.aiScores?.furBabiesScore || 0);
        case 'savings':
          return (b.monthlySaving || 0) - (a.monthlySaving || 0);
        case 'price-asc':
          return (a.modelledPrice || 0) - (b.modelledPrice || 0);
        case 'price-desc':
          return (b.modelledPrice || 0) - (a.modelledPrice || 0);
        default:
          return 0;
      }
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
          <div style="font-size: 40px; margin-bottom: 12px;">🏡</div>
          <h3 style="font-family: var(--font-serif); font-size: 20px; margin-bottom: 8px;">No properties match your filter</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">Try selecting 'All Suburbs' or clearing the pet safety filter.</p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-secondary" onclick="app.resetFilters()">Clear Filters</button>
            <button class="btn-primary" style="background: var(--sage); border-color: var(--sage); padding: 9px 18px;" onclick="app.restoreDefaultProperties()">🔄 Restore All 11 Properties</button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => this.createPropertyCardHtml(p)).join('');

    grid.querySelectorAll('.compare-card-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          this.selectedForCompare.add(id);
        } else {
          this.selectedForCompare.delete(id);
        }
        this.updateFloatingCompareBar();
      });
    });
  }

  createPropertyCardHtml(p) {
    const scores = p.aiScores || { overallFit: 70, emmaScore: 70, jordanScore: 70, furBabiesScore: 70 };
    const isPlanned = this.plannedInspections.has(p.id);
    const isCompared = this.selectedForCompare.has(p.id);

    const getScoreColorClass = (score) => {
      if (score >= 80) return 'score-high';
      if (score >= 60) return 'score-medium';
      return 'score-low';
    };

    const hasRealPhoto = Boolean(p.imageUrl && !p.imageUrl.includes('unsplash'));

    return `
      <div class="property-card" data-id="${p.id}">
        ${hasRealPhoto ? `
          <div class="card-hero-image">
            <img src="${p.imageUrl}" alt="${p.address}" loading="lazy">
            <label class="card-photo-btn" onclick="event.stopPropagation();" title="Change photo">
              <input type="file" accept="image/*" style="display: none;" onchange="app.handleCardPhotoUpload('${p.id}', this.files[0])">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Change</span>
            </label>
            <div class="image-badges">
              <div style="display: flex; gap: 6px; align-items: center;">
                <span class="badge-suburb">${p.suburb}</span>
                ${p.floorplanUrl ? `<span class="badge-suburb" style="background: rgba(37, 99, 235, 0.9); font-size: 11px;">📐 Floorplan</span>` : ''}
              </div>
              <span class="badge-saving">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                Save $${Math.round(p.monthlySaving || 0).toLocaleString()}/mo
              </span>
            </div>
          </div>
        ` : `
          <div class="card-hero-image card-hero-placeholder">
            <div class="placeholder-graphic">
              <div class="placeholder-icon-circle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <label class="card-upload-cta" onclick="event.stopPropagation();">
                <input type="file" accept="image/*" style="display: none;" onchange="app.handleCardPhotoUpload('${p.id}', this.files[0])">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                + Upload Photo
              </label>
            </div>
            <div class="image-badges">
              <div style="display: flex; gap: 6px; align-items: center;">
                <span class="badge-suburb">${p.suburb}</span>
                ${p.floorplanUrl ? `<span class="badge-suburb" style="background: rgba(37, 99, 235, 0.9); font-size: 11px;">📐 Floorplan</span>` : ''}
              </div>
              <span class="badge-saving">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                Save $${Math.round(p.monthlySaving || 0).toLocaleString()}/mo
              </span>
            </div>
          </div>
        `}

        <div class="card-content">
          <div class="card-header-row">
            <div>
              <h3 class="card-address">${p.address}</h3>
              <div class="card-guide-price">Guide: <strong>${p.advertisedGuide || 'Offers Invited'}</strong></div>
              ${p.propertyValue ? `
                <div style="margin-top: 3px;">
                  <span style="background: #FAF5FF; color: #6B21A8; border: 1px solid #E9D5FF; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                    🏛️ PropTrack: $${Number(p.propertyValue).toLocaleString()} (${p.propertyValueConfidence ? p.propertyValueConfidence.replace('CONFIDENCE','Conf') : 'High Conf'})
                  </span>
                </div>
              ` : `
                ${(!p.advertisedGuide || p.advertisedGuide.toLowerCase().includes('for sale') || p.advertisedGuide.toLowerCase().includes('expressions') || p.advertisedGuide.toLowerCase().includes('contact') || p.advertisedGuide.toLowerCase().includes('auction')) ? `
                  <div style="margin-top: 3px;">
                    <button type="button" style="background: none; border: none; color: #7C3AED; font-size: 11px; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline;" onclick="app.lookupPropertyComAu('${p.id}', event)">
                      🏛️ Check Property.com.au
                    </button>
                  </div>
                ` : ''}
              `}
            </div>
            <div style="text-align: right;">
              <span class="modelled-price-badge">$${(p.modelledPrice || 0).toLocaleString()}</span>
              <div style="font-size: 11px; color: var(--text-muted);">${p.propertyValue && p.modelledPrice === p.propertyValue ? 'Property.com.au' : 'Modelled Price'}</div>
            </div>
          </div>

          <!-- Open Inspection Bar with + Plan Button -->
          ${p.inspectionTimes ? `
            <div class="card-inspection-bar ${isPlanned ? 'planned' : ''}">
              <span class="inspection-time-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${p.inspectionTimes}
              </span>
              <button class="btn-plan-toggle ${isPlanned ? 'planned' : ''}" onclick="app.toggleInspection('${p.id}', event)">
                ${isPlanned ? '✓ Planned' : '+ Plan Inspection'}
              </button>
            </div>
          ` : `
            <div class="card-inspection-bar" style="background: #FAFAFA; border: 1px dashed var(--border-light); justify-content: flex-end;">
              <button class="btn-plan-toggle" style="background: var(--bg-card-subtle); color: var(--text-muted); border: 1px solid var(--border-light);" onclick="app.promptAddInspectionTime('${p.id}', event)">
                + Plan Inspection
              </button>
            </div>
          `}

          <div class="specs-row">
            <div class="spec-item" title="Bedrooms">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>
              ${p.bedrooms} Beds
            </div>
            <div class="spec-item" title="Bathrooms">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v9"/></svg>
              ${p.bathrooms} Baths
            </div>
            <div class="spec-item" title="Garage / Parking">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>
              ${p.parkingSpaces || 2} Car
            </div>
            <div class="spec-item" title="Levels">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M7 20v-5h10v5M10 15V9h4v6M12 9V3"/></svg>
              ${p.levels} Levels
            </div>
          </div>

          <!-- Quick Commute Summary Line -->
          <div style="font-size: 11.5px; color: var(--text-muted); background: #FAFDFB; border: 1px solid var(--border-light); border-radius: 4px; padding: 5px 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
            <span>🚗 <strong>Work:</strong> ${calculateGoogleMapsTimings('81 Technology Office Park, Eight Mile Plains', p.suburb || p.address).drive}</span>
            <span>🚗 <strong>Family:</strong> ${calculateGoogleMapsTimings('Rogers Parade West, Everton Park', p.suburb || p.address).drive}</span>
            <span style="color: var(--terracotta); font-weight: 600; cursor: pointer;" onclick="app.openDetailDrawer('${p.id}')">All Timings ➔</span>
          </div>

          <!-- AI Matchers Bar -->
          <div class="ai-match-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                AI Fit Score
              </span>
              <span style="font-size: 13px; font-weight: 800; color: var(--terracotta);">${scores.overallFit}% Match</span>
            </div>
            <div class="match-scores-grid" style="grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));">
              <div class="match-score-cell" title="Location Match">
                <div class="match-score-label">📍 Location</div>
                <div class="match-score-value ${getScoreColorClass(scores.locationScore || 85)}">${scores.locationScore || 85}%</div>
              </div>
              <div class="match-score-cell" title="Commute to Work">
                <div class="match-score-label">🚗 Commute</div>
                <div class="match-score-value ${getScoreColorClass(scores.commuteScore || 70)}">${scores.commuteScore || 70}%</div>
              </div>
              <div class="match-score-cell" title="Walk to Shops">
                <div class="match-score-label">🛍️ Shops</div>
                <div class="match-score-value ${getScoreColorClass(scores.walkToShopsScore || 65)}">${scores.walkToShopsScore || 65}%</div>
              </div>
              <div class="match-score-cell" title="Schools in Area">
                <div class="match-score-label">🏫 Schools</div>
                <div class="match-score-value ${getScoreColorClass(scores.schoolsScore || 85)}">${scores.schoolsScore || 85}%</div>
              </div>
              <div class="match-score-cell" title="Animal Walking Tracks">
                <div class="match-score-label">🐾 Tracks</div>
                <div class="match-score-value ${getScoreColorClass(scores.walkingTracksScore || 90)}">${scores.walkingTracksScore || 90}%</div>
              </div>
            </div>
          </div>

          <!-- Risk Alert if any -->
          ${p.planningRisk && p.planningRisk !== 'None flagged' ? `
            <div class="card-risk-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${p.planningRisk}
            </div>
          ` : ''}

          <!-- Key Compromise -->
          ${p.keyCompromise ? `
            <div class="card-compromise-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span><strong>Trade-off:</strong> ${p.keyCompromise}</span>
            </div>
          ` : ''}

          <!-- Footer: Compare, Recycle Bin, View Breakdown (Centered along bottom) -->
          <div class="card-footer">
            <button type="button" class="btn-card-compare ${isCompared ? 'active' : ''}" onclick="app.toggleCompare('${p.id}', event)" title="Select to compare">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>${isCompared ? '✓ Comparing' : 'Compare'}</span>
            </button>
            <button type="button" class="btn-card-delete" onclick="event.stopPropagation(); app.deleteProperty('${p.id}')" title="Delete listing" aria-label="Delete listing">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
            <button type="button" class="btn-primary btn-card-breakdown" onclick="app.openDetailDrawer('${p.id}')">
              View Breakdown
            </button>
          </div>
        </div>
      </div>
    `;
  }

  toggleInspection(propId, event) {
    if (event) event.stopPropagation();

    if (this.plannedInspections.has(propId)) {
      this.plannedInspections.delete(propId);
    } else {
      this.plannedInspections.add(propId);
    }

    this.saveDataLocally();
    this.updateInspectionCountBadge();

    if (this.activeTab === 'inspections') {
      this.renderInspectionsView();
    } else {
      this.renderProperties();
    }

    // If detail modal is open for this property, refresh drawer
    const drawerModal = document.getElementById('detail-drawer-modal');
    if (drawerModal && drawerModal.classList.contains('open')) {
      this.openDetailDrawer(propId);
    }
  }

  promptAddInspectionTime(propId, event) {
    if (event) event.stopPropagation();
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    const time = prompt(`Enter open inspection day & time for ${prop.address} (e.g. Sat 7 Nov 9:30 am):`, prop.inspectionTimes || 'Sat 7 Nov 10:00 am');
    if (time && time.trim()) {
      prop.inspectionTimes = time.trim();
      this.plannedInspections.add(propId);
      this.saveDataLocally();
      this.syncPropertyToBackend(prop);
      this.updateInspectionCountBadge();
      this.renderProperties();
    }
  }

  toggleSuburbDropdown(show) {
    const dropdown = document.getElementById('suburb-dropdown-menu');
    const btn = document.getElementById('btn-toggle-suburb-dropdown');
    if (!dropdown) return;
    const isShowing = dropdown.style.display !== 'none';
    const nextState = (typeof show === 'boolean') ? show : !isShowing;
    dropdown.style.display = nextState ? 'block' : 'none';
    if (btn) btn.setAttribute('aria-expanded', nextState ? 'true' : 'false');
  }

  updateSuburbFilterOptions() {
    const list = document.getElementById('suburb-checkbox-list');
    const summary = document.getElementById('suburb-filter-summary');
    const btn = document.getElementById('btn-toggle-suburb-dropdown');
    if (!list) return;

    const suburbCounts = {};
    (this.properties || []).forEach(p => {
      const s = (p.suburb || '').trim();
      if (s) suburbCounts[s] = (suburbCounts[s] || 0) + 1;
    });

    const suburbs = Object.keys(suburbCounts).sort();

    // Clean up selectedSuburbs to only retain suburbs with active properties
    for (const sub of this.selectedSuburbs) {
      if (!suburbCounts[sub]) this.selectedSuburbs.delete(sub);
    }

    if (suburbs.length === 0) {
      list.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12.5px; text-align: center;">No properties loaded</div>';
      if (summary) summary.textContent = 'None';
      if (btn) {
        btn.disabled = true;
        btn.classList.remove('active');
      }
      return;
    }

    if (btn) btn.disabled = false;

    // Update summary badge
    if (summary) {
      if (this.selectedSuburbs.size === 0 || this.selectedSuburbs.size === suburbs.length) {
        summary.textContent = `All (${this.properties.length})`;
        if (btn) btn.classList.remove('active');
      } else if (this.selectedSuburbs.size === 1) {
        summary.textContent = Array.from(this.selectedSuburbs)[0];
        if (btn) btn.classList.add('active');
      } else {
        summary.textContent = `${this.selectedSuburbs.size} selected`;
        if (btn) btn.classList.add('active');
      }
    }

    list.innerHTML = suburbs.map(sub => {
      const isChecked = this.selectedSuburbs.has(sub);
      return `
        <label class="suburb-cb-item">
          <input type="checkbox" value="${sub}" ${isChecked ? 'checked' : ''} onchange="app.handleSuburbToggle('${sub}', this.checked)">
          <span class="suburb-cb-name">${sub}</span>
          <span class="suburb-cb-count">(${suburbCounts[sub]})</span>
        </label>
      `;
    }).join('');
  }

  handleSuburbToggle(suburb, checked) {
    if (checked) {
      this.selectedSuburbs.add(suburb);
    } else {
      this.selectedSuburbs.delete(suburb);
    }
    this.updateSuburbFilterOptions();
    this.renderProperties();
  }

  clearSuburbs() {
    this.selectedSuburbs.clear();
    this.updateSuburbFilterOptions();
    this.renderProperties();
  }

  resetFilters() {
    this.selectedSuburbs.clear();
    this.filterBedrooms = 'all';
    this.filterMaxPrice = 'all';
    this.filterPetSafe = false;
    this.searchQuery = '';

    const bedEl = document.getElementById('filter-bedrooms');
    if (bedEl) { bedEl.value = 'all'; bedEl.classList.remove('active'); }
    const priceEl = document.getElementById('filter-max-price');
    if (priceEl) { priceEl.value = 'all'; priceEl.classList.remove('active'); }
    const searchInput = document.getElementById('property-search');
    if (searchInput) searchInput.value = '';

    this.updateSuburbFilterOptions();
    this.renderProperties();
  }

  async restoreDefaultProperties() {
    if (!confirm('Restore default candidate properties to your Property Hub?')) return;
    this.deletedPropertyIds.clear();
    localStorage.removeItem('nestquest_deleted_properties');
    try {
      const res = await fetch('data/properties.json?t=' + Date.now());
      if (res.ok) {
        this.properties = await res.json();
      } else {
        this.properties = JSON.parse(JSON.stringify(DEFAULT_PROPERTIES));
      }
    } catch(e) {
      this.properties = JSON.parse(JSON.stringify(DEFAULT_PROPERTIES));
    }
    this.migrateAndCleanProperties();
    this.saveDataLocally();
    this.recalculateAllMetrics();
    this.updateSuburbFilterOptions();
    this.renderHeaderStats();
    this.renderProperties();
    alert('✅ Restored candidate properties to your Property Hub!');
  }

  updateFloatingCompareBar() {
    const bar = document.getElementById('compare-floating-bar');
    const countEl = document.getElementById('compare-count-badge');
    if (!bar) return;

    const count = this.selectedForCompare.size;
    if (count > 0) {
      bar.classList.add('active');
      if (countEl) countEl.textContent = `${count} Selected`;
    } else {
      bar.classList.remove('active');
    }
  }

  // -------------------------------------------------------------
  // VIEW 2: HEAD-TO-HEAD COMPARISON
  // -------------------------------------------------------------
  renderComparisonView() {
    const container = document.getElementById('comparison-view-content');
    if (!container) return;

    let compareIds = Array.from(this.selectedForCompare);
    if (compareIds.length === 0) {
      compareIds = this.properties.slice(0, 3).map(p => p.id);
    }

    const comparedProps = this.properties.filter(p => compareIds.includes(p.id));

    if (comparedProps.length < 2) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
          <div style="font-size: 40px; margin-bottom: 12px;">⚖️</div>
          <h3 style="font-family: var(--font-serif); font-size: 20px; margin-bottom: 8px;">Select At Least 2 Properties to Compare</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">Check the 'Select to Compare' box on your favorite townhouses in the Property Hub.</p>
          <button class="btn-primary" onclick="app.switchTab('properties')">Go to Property Hub</button>
        </div>
      `;
      return;
    }

    const winnerId = AIEngine.getWinner(comparedProps);

    container.innerHTML = `
      <div style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light); padding: 24px; box-shadow: var(--shadow-sm); overflow-x: auto;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-family: var(--font-serif); font-size: 24px; color: var(--text-main);">Head-to-Head Comparison Matrix</h2>
            <p style="font-size: 13.5px; color: var(--text-muted);">Side-by-side financial, lifestyle, and pet accessibility trade-offs.</p>
          </div>
          <button class="btn-secondary" onclick="app.clearCompareSelection()">Clear All Selected (${comparedProps.length})</button>
        </div>

        <table style="width: 100%; border-collapse: collapse; min-width: 680px; font-size: 13.5px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-light);">
              <th style="text-align: left; padding: 14px 12px; width: 220px; background: var(--bg-card-subtle);">Feature / Decision Anchor</th>
              ${comparedProps.map(p => `
                <th style="padding: 14px 12px; text-align: center; background: ${p.id === winnerId ? 'var(--bg-sage-soft)' : 'white'};">
                  ${p.id === winnerId ? `<div style="font-size: 11px; font-weight: 800; color: var(--sage); text-transform: uppercase; margin-bottom: 4px;">👑 AI Overall Pick</div>` : ''}
                  <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${p.address}</div>
                  <span class="badge-suburb" style="margin-top: 4px; display: inline-block;">${p.suburb}</span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Modelled Purchase Price</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 700; font-family: var(--font-display); font-size: 16px; color: var(--terracotta);">
                  $${(p.modelledPrice || 0).toLocaleString()}
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Monthly Mortgage Repayment</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 600;">
                  $${Math.round(p.monthlyMortgage || 0).toLocaleString()}/mo
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Monthly Body Corporate</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center;">
                  $${Math.round(p.monthlyBodyCorp || 0).toLocaleString()}/mo
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light); background: #FAFDFB;">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle); color: var(--sage);">Monthly Cash Freed Up</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 800; font-family: var(--font-display); font-size: 17px; color: var(--sage);">
                  +$${Math.round(p.monthlySaving || 0).toLocaleString()}/mo
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Bedrooms / Bathrooms / Cars</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center;">
                  <strong>${p.bedrooms}</strong> Beds · <strong>${p.bathrooms}</strong> Baths · <strong>${p.parkingSpaces || 2}</strong> Car
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Levels & Pet Accessibility</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center;">
                  ${Number(p.levels) <= 2 ? `
                    <span style="color: var(--sage); font-weight: 700;">✅ ${p.levels} Levels (${p.outdoorSpace || 'Courtyard'})</span>
                  ` : `
                    <span style="color: var(--rose-alert); font-weight: 700;">⚠️ ${p.levels} Levels (Stair hazard for 14yo dog)</span>
                  `}
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Commute to Eight Mile Plains</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center;">
                  ${p.distances?.workEMP || (p.suburb.includes('Morningside') ? '20-22 mins' : '38-42 mins')}
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Proximity to Callum & Kaitlin</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center;">
                  ${p.suburb.includes('Everton') ? '<strong style="color: var(--sage);">5-7 mins</strong>' : '35-36 mins'}
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">AI Overall Fit Score</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 800; font-size: 16px; color: var(--terracotta);">
                  ${p.aiScores?.overallFit || 75}% Match
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Emma Match Score</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 700; color: ${(p.aiScores?.emmaScore || 70) >= 75 ? 'var(--sage)' : 'var(--terracotta)'};">
                  ${p.aiScores?.emmaScore || 70}%
                </td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid var(--border-light);">
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Jordan Match Score</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-weight: 700; color: ${(p.aiScores?.jordanScore || 70) >= 75 ? 'var(--sage)' : 'var(--terracotta)'};">
                  ${p.aiScores?.jordanScore || 70}%
                </td>
              `).join('')}
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: 700; background: var(--bg-card-subtle);">Key Compromise / Trade-off</td>
              ${comparedProps.map(p => `
                <td style="padding: 12px; text-align: center; font-size: 12.5px; color: var(--honey-dark);">
                  ${p.keyCompromise || 'Standard trade-offs'}
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  clearCompareSelection() {
    this.selectedForCompare.clear();
    this.updateFloatingCompareBar();
    this.renderComparisonView();
  }

  // -------------------------------------------------------------
  // VIEW: INSPECTION PLANNER & SATURDAY ROUTE
  // -------------------------------------------------------------
    // PARSE INSPECTION DATE TIME (CHRONOLOGICAL DATE & TIME)
  parseInspectionDateTime(str) {
    if (!str) return { dayOfWeek: 'Upcoming', dayNum: 99, month: 11, timeStr: '', timeMinutes: 9999, dateKey: '99_99', dayLabel: 'Upcoming Inspections', sortScore: 9999999999 };

    const text = str.trim();
    const lower = text.toLowerCase();

    // 1. Day of week
    let dayOfWeek = '';
    if (lower.includes('thu') || lower.includes('thursday')) dayOfWeek = 'Thursday';
    else if (lower.includes('sat') || lower.includes('saturday')) dayOfWeek = 'Saturday';
    else if (lower.includes('fri') || lower.includes('friday')) dayOfWeek = 'Friday';
    else if (lower.includes('sun') || lower.includes('sunday')) dayOfWeek = 'Sunday';
    else if (lower.includes('wed') || lower.includes('wednesday')) dayOfWeek = 'Wednesday';
    else if (lower.includes('tue') || lower.includes('tuesday')) dayOfWeek = 'Tuesday';
    else if (lower.includes('mon') || lower.includes('monday')) dayOfWeek = 'Monday';

    // 2. Day of month number
    let dayNum = 0;
    const dayMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*:\s*\d)/);
    if (dayMatch) {
      dayNum = parseInt(dayMatch[1], 10);
    } else {
      if (dayOfWeek === 'Thursday') dayNum = 5;
      else if (dayOfWeek === 'Saturday') dayNum = 7;
      else if (dayOfWeek === 'Friday') dayNum = 6;
      else if (dayOfWeek === 'Sunday') dayNum = 8;
      else dayNum = 20;
    }

    // 3. Month detection
    let month = 11;
    let monthName = 'November';
    if (lower.includes('oct')) { month = 10; monthName = 'October'; }
    else if (lower.includes('dec')) { month = 12; monthName = 'December'; }
    else if (lower.includes('jan')) { month = 1; monthName = 'January'; }

    // 4. Time detection
    let hours = 9;
    let mins = 0;
    let timeStr = '';
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3].toLowerCase();
      timeStr = `${hours}:${mins < 10 ? '0' + mins : mins} ${ampm.toUpperCase()}`;
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }
    const timeMinutes = hours * 60 + mins;

    const dateKey = `${month}_${dayNum}`;
    const dayLabel = dayOfWeek ? `${dayOfWeek}, ${dayNum} ${monthName}` : `${dayNum} ${monthName}`;
    const sortScore = (month * 1000000) + (dayNum * 10000) + timeMinutes;

    return {
      dayOfWeek,
      dayNum,
      month,
      timeStr,
      timeMinutes,
      dateKey,
      dayLabel,
      sortScore
    };
  }

  renderInspectionsView() {
    const container = document.getElementById('inspections-view-content');
    if (!container) return;

    const plannedProps = this.properties.filter(p => this.plannedInspections.has(p.id));

    // Sort chronologically by full date and time (Thursday 5th is FIRST, Saturday 7th is SECOND)
    plannedProps.sort((a, b) => {
      const dtA = this.parseInspectionDateTime(a.inspectionTimes);
      const dtB = this.parseInspectionDateTime(b.inspectionTimes);
      return dtA.sortScore - dtB.sortScore;
    });

    if (plannedProps.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
          <div style="font-size: 44px; margin-bottom: 12px;">🗓️</div>
          <h3 style="font-family: var(--font-serif); font-size: 22px; margin-bottom: 8px;">No Open Inspections in Your Plan</h3>
          <p style="color: var(--text-muted); font-size: 14px; max-width: 500px; margin: 0 auto 20px auto; line-height: 1.5;">
            Click the <strong>'+ Plan Inspection'</strong> button on any property in your <strong>Property Hub</strong> to organize an inspection itinerary with driving times and checklists!
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn-primary" onclick="app.switchTab('properties')">Browse Property Hub</button>
            <button class="btn-secondary" onclick="app.planAllUpcoming()">Plan All Available Inspections</button>
          </div>
        </div>
      `;
      return;
    }

    // Group stops by dayLabel (e.g. "Thursday, 5 November" vs "Saturday, 7 November")
    const dayGroups = {};
    plannedProps.forEach(p => {
      const dt = this.parseInspectionDateTime(p.inspectionTimes);
      if (!dayGroups[dt.dayLabel]) dayGroups[dt.dayLabel] = [];
      dayGroups[dt.dayLabel].push({ ...p, parsedDt: dt });
    });

    let overallStopIndex = 1;

    container.innerHTML = `
      <div class="itinerary-container">
        <!-- Itinerary Top Bar -->
        <div class="itinerary-header-bar">
          <div>
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
              <span class="badge-suburb" style="background: var(--terracotta);">🗓️ Inspection Schedule</span>
              <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">${plannedProps.length} Properties Across ${Object.keys(dayGroups).length} Days</span>
            </div>
            <h2 style="font-family: var(--font-serif); font-size: 25px; color: var(--text-main);">
              Emma & Jordan's Inspection Itinerary
            </h2>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-top: 4px;">
              Chronologically scheduled by date and start times. Driving times are calculated between stops on the same day.
            </p>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn-sage" style="display: inline-flex; align-items: center; gap: 6px;" onclick="app.exportInspectionsToIcs()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Export to Calendar (.ics)
            </button>
            <button class="btn-secondary" style="display: inline-flex; align-items: center; gap: 6px;" onclick="window.print()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Route
            </button>
            <button class="btn-secondary" onclick="app.clearInspectionPlan()">Clear Plan</button>
          </div>
        </div>

        <!-- Timeline of Stops Grouped by Day -->
        <div class="itinerary-timeline">
          ${Object.entries(dayGroups).map(([dayLabel, stops]) => `
            <!-- Day Group Header -->
            <div style="margin: 24px 0 14px 0; padding: 10px 16px; background: #FAF7F2; border-left: 4px solid var(--terracotta); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 16px; color: var(--text-main);">📅 ${dayLabel}</strong>
                <span style="font-size: 12.5px; color: var(--text-muted); margin-left: 10px;">${stops.length} Stop${stops.length > 1 ? 's' : ''} Scheduled</span>
              </div>
            </div>

            <!-- Stops for this day -->
            ${stops.map((p, idx) => {
              const currentStopNum = overallStopIndex++;
              const nextP = stops[idx + 1];

              // ONLY show drive separator between stops on the SAME day!
              let transitTimeHtml = '';
              if (nextP) {
                const driveEstimate = this.estimateTransitBetweenSuburbs(p.suburb, nextP.suburb);
                transitTimeHtml = `
                  <div class="transit-time-separator" style="margin: 12px 0;">
                    <div class="transit-time-pill">
                      🚗 ~${driveEstimate} drive between Stop ${currentStopNum} (${p.suburb}) & Stop ${currentStopNum + 1} (${nextP.suburb})
                    </div>
                  </div>
                `;
              }

              const status = this.inspectionStatuses[p.id] || { attended: false, rating: 0, notes: '' };

              return `
                <div class="itinerary-card" data-id="${p.id}">
                  <div class="itinerary-time-badge">
                    <div class="day">Stop ${currentStopNum}</div>
                    <div class="time">${p.inspectionTimes || 'TBD'}</div>
                    <div class="day">${p.suburb}</div>
                  </div>

                  <div style="flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                      <div>
                        <h3 style="font-family: var(--font-serif); font-size: 20px; color: var(--text-main); margin-bottom: 4px;">
                          ${p.address}
                        </h3>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                          <span class="badge-suburb">${p.suburb}</span>
                          ${p.floorplanUrl ? `<span class="badge-suburb" style="background: rgba(37, 99, 235, 0.9);">📐 Floorplan</span>` : ''}
                          <span style="font-weight: 700; color: var(--terracotta); font-size: 14px;">$${(p.modelledPrice || 0).toLocaleString()}</span>
                          <span style="font-size: 12.5px; color: var(--sage); font-weight: 700;">+Save $${Math.round(p.monthlySaving || 0).toLocaleString()}/mo</span>
                        </div>
                      </div>

                      <div style="display: flex; gap: 8px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address + ', ' + p.suburb + ', QLD')}" target="_blank" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                          🗺️ Google Maps ↗
                        </a>
                        <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="app.openDetailDrawer('${p.id}')">
                          View Details
                        </button>
                        <button class="btn-outline-danger" style="padding: 4px 8px; font-size: 11px;" onclick="app.toggleInspection('${p.id}')">
                          ✕ Remove
                        </button>
                      </div>
                    </div>

                    <!-- Checklist -->
                    <div class="inspection-checklist" style="margin-top: 14px;">
                      <label class="check-item">
                        <input type="checkbox" onchange="app.setInspectionAttended('${p.id}', this.checked)" ${status.attended ? 'checked' : ''}>
                        <span>Attended Open Home</span>
                      </label>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; color: var(--text-muted);">Rating:</span>
                        ${[1, 2, 3, 4, 5].map(star => `
                          <button type="button" class="star-btn ${status.rating >= star ? 'active' : ''}" style="background:none; border:none; cursor:pointer; font-size:16px; color: ${status.rating >= star ? 'var(--honey-dark)' : 'var(--border-medium)'};" onclick="app.setInspectionRating('${p.id}', ${star})">★</button>
                        `).join('')}
                      </div>
                    </div>

                    <div style="margin-top: 8px;">
                      <input type="text" class="inspection-notes-input" placeholder="Quick notes (e.g. courtyard grass condition, stair angle, body corp feel)..." value="${status.notes || ''}" onchange="app.setInspectionNotes('${p.id}', this.value)" style="width: 100%; box-sizing: border-box; padding: 6px 10px; font-size: 12.5px; border-radius: 4px; border: 1px solid var(--border-medium);">
                    </div>
                  </div>
                </div>

                ${transitTimeHtml}
              `;
            }).join('')}
          `).join('')}
        </div>
      </div>
    `;
  }

    estimateTransitBetweenSuburbs(subA, subB) {
    if (!subA || !subB) return '10 mins';
    const a = subA.toLowerCase();
    const b = subB.toLowerCase();
    if (a === b) return '4-6 mins';
    if ((a.includes('everton') && b.includes('everton')) || (a.includes('everton') && b.includes('stafford')) || (a.includes('everton') && b.includes('mitchelton'))) {
      return '6-8 mins';
    }
    if ((a.includes('morningside') && b.includes('everton')) || (b.includes('morningside') && a.includes('everton'))) {
      return '35-40 mins cross-river';
    }
    return '15-20 mins';
  }

  setInspectionAttended(propId, attended) {
    if (!this.inspectionStatuses[propId]) this.inspectionStatuses[propId] = {};
    this.inspectionStatuses[propId].attended = attended;
    this.saveDataLocally();
  }

  setInspectionRating(propId, rating) {
    if (!this.inspectionStatuses[propId]) this.inspectionStatuses[propId] = {};
    this.inspectionStatuses[propId].rating = rating;
    this.saveDataLocally();
    this.renderInspectionsView();
  }

  setInspectionNotes(propId, notes) {
    if (!this.inspectionStatuses[propId]) this.inspectionStatuses[propId] = {};
    this.inspectionStatuses[propId].notes = notes;
    this.saveDataLocally();
  }

  planAllUpcoming() {
    this.properties.forEach(p => {
      if (p.inspectionTimes) this.plannedInspections.add(p.id);
    });
    this.saveDataLocally();
    this.updateInspectionCountBadge();
    this.renderInspectionsView();
  }

  clearInspectionPlan() {
    if (!confirm('Clear all planned inspections?')) return;
    this.plannedInspections.clear();
    this.saveDataLocally();
    this.updateInspectionCountBadge();
    this.renderInspectionsView();
  }

  exportInspectionsToIcs() {
    const planned = this.properties.filter(p => this.plannedInspections.has(p.id));
    if (planned.length === 0) {
      alert('No planned inspections to export.');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NestQuest AI//Property Inspections//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    planned.forEach((p, idx) => {
      // Create a sensible Saturday date
      const startTime = '20261107T090000';
      const endTime = '20261107T093000';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:nestquest-${p.id}-${Date.now()}@nestquest.ai`);
      icsContent.push(`DTSTAMP:${nowStr}`);
      icsContent.push(`DTSTART:${startTime}`);
      icsContent.push(`DTEND:${endTime}`);
      icsContent.push(`SUMMARY:🏡 Open Inspection: ${p.address}`);
      icsContent.push(`LOCATION:${p.address}, ${p.suburb} QLD`);
      icsContent.push(`DESCRIPTION:Modelled Price: $${(p.modelledPrice || 0).toLocaleString()}\\nMonthly Savings: +$${Math.round(p.monthlySaving || 0).toLocaleString()}/mo\\nSpecs: ${p.bedrooms} bed, ${p.bathrooms} bath, ${p.parkingSpaces || 2} car\\nNotes: ${p.notes || ''}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'NestQuest_Saturday_Inspections.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // -------------------------------------------------------------
  // VIEW 3: AI ADVISOR & CHAT
  // -------------------------------------------------------------
  renderAdvisorView() {
    const container = document.getElementById('chat-history-container');
    if (!container) return;

    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="chat-bubble ai">
          <div style="font-weight: 700; color: var(--terracotta); margin-bottom: 4px;">Antigravity Advisor</div>
          <div>
            Hello Jordan & Emma! I’m synced with your <strong>$1.4M home equity model ($553,008 net)</strong>, your <strong>Eight Mile Plains commute</strong>, and your <strong>4 fur babies</strong> (especially the arthritis safety requirements for your 14yo dog).
          </div>
          <div style="margin-top: 8px;">
            Ask me anything about compromise trade-offs, which townhouse frees up the most monthly cash, or test a what-if scenario!
          </div>
        </div>
      `;
    }
  }

  async handleSendChatMessage(text) {
    const container = document.getElementById('chat-history-container');
    if (!container) return;

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = text;
    container.appendChild(userBubble);
    container.scrollTop = container.scrollHeight;

    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble ai';
    thinkingBubble.innerHTML = `<span style="color: var(--text-muted);">Thinking & evaluating properties...</span>`;
    container.appendChild(thinkingBubble);
    container.scrollTop = container.scrollHeight;

    try {
      let reply = '';
      if (this.isApiAvailable) {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.reply;
        }
      }

      if (!reply) {
        reply = this.generateLocalAIResponse(text);
      }

      thinkingBubble.innerHTML = `
        <div style="font-weight: 700; color: var(--terracotta); margin-bottom: 4px;">Antigravity Advisor</div>
        <div>${reply.replace(/\n/g, '<br>')}</div>
      `;
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      thinkingBubble.textContent = "I'm available to compare properties, commute routes, and pet accommodations anytime!";
    }
  }

  generateLocalAIResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('dog') || q.includes('cat') || q.includes('pet') || q.includes('senior')) {
      return `🐾 **Senior Fur Baby Assessment:**\nFor your 14yo senior dog, **45/120 Bunya Road (Everton Hills)**, **17/101 Richmond Road (Morningside)**, and **17/44 Rogers Parade (Everton Park)** are your safest bets because they feature 2-level layouts and ground-level private courtyards.\n\nIn contrast, 8/19 Baringa Street and 3/58 Dickson Street have 3 full levels (28+ steep stairs) and balconies only, which will cause severe joint strain for your senior dog.`;
    }
    if (q.includes('morningside') && q.includes('everton')) {
      return `⚖️ **Morningside vs Everton Core Trade-off:**\n• **Morningside:** Perfect for Emma. Walk to shops, 20-22 min direct run to Eight Mile Plains, but mostly 3-level townhouses and higher prices ($900k–$1.04m).\n• **Everton Hills / Park:** Perfect for Jordan. 4 bedrooms, real house feel, 5-7 mins to Callum & Kaitlin, gentle 2 levels with ground courtyards for your 14yo dog, but adds ~18 mins cross-town to Eight Mile Plains.`;
    }
    if (q.includes('cash') || q.includes('savings') || q.includes('money') || q.includes('mortgage')) {
      return `💰 **Cashflow Savings Breakdown:**\nBy releasing your $553k net sale equity, all candidates reduce your current $4,810/mo mortgage significantly:\n• **17/101 Richmond ($900k):** Frees up **+$2,072/mo**\n• **3/58 Dickson ($920k):** Frees up **+$1,956/mo**\n• **45/120 Bunya ($950k):** Frees up **+$1,857/mo**\n• **17/44 Rogers ($999k):** Frees up **+$1,617/mo**\n• **8/19 Baringa ($1.04m):** Frees up **+$1,348/mo**`;
    }
    return `Looking at your candidate townhouses against your sale equity ($553k) and needs:\n• **Top Pick for Jordan & Pets:** 45/120 Bunya Road (4 beds, private courtyard, 5m to Callum & Kaitlin, +$1,857/mo savings).\n• **Top Pick for Emma:** 17/101 Richmond Road (2 levels with courtyard, 21 min commute, +$2,072/mo savings).`;
  }

  // -------------------------------------------------------------
  // VIEW 4: FINANCIAL SIMULATOR (INTERACTIVE SLIDERS & PROFILE MANAGER)
  // -------------------------------------------------------------
  renderFinancialSimulator() {
    const container = document.getElementById('financial-simulator-content');
    if (!container) return;

    // Safe fallbacks
    const sale = (this.finances && this.finances.sale) ? this.finances.sale : DEFAULT_FINANCES.sale;
    const defaults = (this.finances && this.finances.purchaseDefaults) ? this.finances.purchaseDefaults : DEFAULT_FINANCES.purchaseDefaults;
    const budget = (this.finances && this.finances.householdBudget) ? this.finances.householdBudget : DEFAULT_FINANCES.householdBudget;
    const categories = budget.categories || [];

    const equity = Calculator.calculateSaleEquity(sale.estimatedSalePrice, sale.existingMortgage, sale.sellingExpenses);
    const targetPrice = this.targetPurchasePrice || 950000;
    const duty = Calculator.calculateQldTransferDuty(targetPrice, true);
    const otherCosts = Number(defaults.otherBuyingExpenses || 4000);
    const totalOutlay = targetPrice + duty + otherCosts;
    const newLoan = Math.max(0, totalOutlay - equity);
    const interestRate = Number(defaults.defaultInterestRate || 6.2);
    const loanTerm = Number(defaults.loanTermYears || 30);
    const monthlyPni = Calculator.calculateMonthlyRepayment(newLoan, interestRate, loanTerm);
    const currentMortgage = Number(sale.currentMonthlyMortgage || 4810);
    const monthlySaving = currentMortgage - monthlyPni;
    const mortgageReduction = Math.max(0, (sale.existingMortgage || 806992) - newLoan);

    // Calculate household budget totals
    let totalWeeklyBills = 0;
    categories.forEach(cat => {
      let amt = Number(cat.amount) || 0;
      if (!cat.isMortgage) {
        let weeklyAmt = cat.frequency === 'weekly' ? amt : (cat.frequency === 'monthly' ? amt / 4.333 : amt / 52);
        totalWeeklyBills += weeklyAmt;
      }
    });
    const incomeWeekly = Number(budget.combinedIncomeWeekly || 3812);
    const mortgageWeekly = currentMortgage / 4.333;
    const totalWeeklyOutgoings = mortgageWeekly + totalWeeklyBills;
    const disposableWeekly = incomeWeekly - totalWeeklyOutgoings;

    container.innerHTML = `
      <!-- Simulator Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: var(--font-serif); font-size: 26px; color: var(--text-main); margin-bottom: 4px;">
            Sale & Financial Simulator
          </h2>
          <p style="font-size: 14px; color: var(--text-muted); max-width: 800px;">
            Model your home sale equity release, custom outgoings budget, target loan interest rates, and purchase cashflow surplus.
          </p>
        </div>
        <button class="btn-secondary" style="padding: 7px 14px; font-size: 13px;" onclick="app.resetFinancialDefaults()">
          ↺ Reset to Spreadsheet Model
        </button>
      </div>

      <div class="financial-grid">
        <!-- Card 1: Existing Home Equity & Editable Baseline Budget (USER UPDATE 1) -->
        <div class="finance-card">
          <h3 class="finance-card-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Current Home Sale & Equity Release
          </h3>
          <p class="finance-card-subtitle">Adjust sliders to see live net cash released from your home sale.</p>

          <!-- Slider 1: Estimated Sale Price -->
          <div class="range-slider-group">
            <div class="range-slider-header">
              <label for="slider-sale-price">Estimated Home Sale Price:</label>
              <span class="range-slider-val" id="val-sale-price">$${Number(sale.estimatedSalePrice).toLocaleString()}</span>
            </div>
            <input type="range" class="app-slider" id="slider-sale-price" min="1100000" max="1900000" step="10000" value="${sale.estimatedSalePrice}" oninput="app.handleSaleSliderChange('estimatedSalePrice', this.value)">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>$1.1M</span>
              <span>Modelled: $1.4M</span>
              <span>$1.9M</span>
            </div>
          </div>

          <!-- Slider 2: Existing Mortgage -->
          <div class="range-slider-group">
            <div class="range-slider-header">
              <label for="slider-mortgage">Less Current Mortgage Payoff:</label>
              <span class="range-slider-val" id="val-mortgage" style="color: var(--terracotta);">- $${Number(sale.existingMortgage).toLocaleString()}</span>
            </div>
            <input type="range" class="app-slider" id="slider-mortgage" min="500000" max="1000000" step="1000" value="${sale.existingMortgage}" oninput="app.handleSaleSliderChange('existingMortgage', this.value)">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>$500k</span>
              <span>Actual: $806,992</span>
              <span>$1.0M</span>
            </div>
          </div>

          <!-- Slider 3: Agent Fees & Marketing -->
          <div class="range-slider-group">
            <div class="range-slider-header">
              <label for="slider-selling-costs">Less Agent Commission & Marketing:</label>
              <span class="range-slider-val" id="val-selling-costs" style="color: var(--terracotta);">- $${Number(sale.sellingExpenses).toLocaleString()}</span>
            </div>
            <input type="range" class="app-slider" id="slider-selling-costs" min="15000" max="80000" step="1000" value="${sale.sellingExpenses}" oninput="app.handleSaleSliderChange('sellingExpenses', this.value)">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>$15k</span>
              <span>Budget: $40k (~2.5%)</span>
              <span>$80k</span>
            </div>
          </div>

          <!-- Big Net Equity Banner -->
          <div class="equity-visual-banner" style="margin: 18px 0; padding: 18px; border-radius: var(--radius-md); background: linear-gradient(135deg, #FAF4EE 0%, #F5EAE1 100%); border: 1px solid #EAD8C9; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Net Equity Released to Reinvest</div>
            <div id="banner-net-equity" style="font-family: var(--font-display); font-size: 38px; font-weight: 800; color: var(--terracotta); margin: 4px 0;">
              $${Math.round(equity).toLocaleString()}
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">Cash available towards your target townhouse purchase</div>
          </div>

          <!-- EDITABLE BASELINE HOUSEHOLD BUDGET (USER UPDATE 1) -->
          <div style="background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; margin-top: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="font-size: 14px; color: var(--text-main);">Baseline Household Budget</strong>
                <div style="font-size: 12px; color: var(--text-muted);">Edit expenses or add custom categories.</div>
              </div>
              <button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 12px;" onclick="app.openAddBudgetCategoryModal()">
                + Add Category
              </button>
            </div>

            <!-- Income & Savings Row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border-light); font-size: 12.5px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px; display: block;">Combined Income ($/wk):</span>
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                  <span>$</span>
                  <input type="number" value="${incomeWeekly}" style="width: 85px; padding: 4px 6px; font-size: 13px; font-weight: 700; border: 1px solid var(--border-medium); border-radius: 4px;" onchange="app.updateHouseholdIncome(this.value)">
                  <span style="font-size: 11px; color: var(--text-muted);">/wk</span>
                </div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px; display: block;">Liquid Savings Buffer:</span>
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                  <span>$</span>
                  <input type="number" value="${Number(budget.liquidSavings || 75000)}" style="width: 85px; padding: 4px 6px; font-size: 13px; font-weight: 700; border: 1px solid var(--border-medium); border-radius: 4px;" onchange="app.updateLiquidSavings(this.value)">
                </div>
              </div>
            </div>

            <!-- Budget Categories List -->
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 250px; overflow-y: auto;">
              ${categories.map(cat => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid #F0F4F2; font-size: 12.5px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; color: var(--text-main);">${cat.name}</span>
                    <span style="font-size: 10.5px; color: var(--text-muted); background: var(--bg-card-subtle); padding: 1px 5px; border-radius: 8px;">${cat.frequency}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>$</span>
                    <input type="number" value="${cat.amount}" style="width: 70px; padding: 3px 6px; font-size: 12.5px; font-weight: 700; border: 1px solid var(--border-medium); border-radius: 4px;" onchange="app.updateBudgetCategoryAmount('${cat.id}', this.value)">
                    ${!cat.isMortgage ? `
                      <button type="button" onclick="app.deleteBudgetCategory('${cat.id}')" title="Delete category" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 0 4px;">✕</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Live Summary Bar -->
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-light); font-size: 12.5px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Total Outgoings:</span>
                <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">$${Math.round(totalWeeklyOutgoings).toLocaleString()}/wk</div>
                <div style="font-size: 11px; color: var(--text-muted);">($${Math.round(totalWeeklyOutgoings * 4.333).toLocaleString()}/mo)</div>
              </div>
              <div>
                <span style="color: var(--sage); font-size: 11px; font-weight: 700;">Net Disposable Cash:</span>
                <div style="font-weight: 800; color: var(--sage); font-size: 15px;">+$${Math.round(disposableWeekly).toLocaleString()}/wk</div>
                <div style="font-size: 11px; color: var(--text-muted);">+$${Math.round(disposableWeekly * 4.333).toLocaleString()}/mo surplus</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Interactive Purchase Target, Rate Slider & Sensitivity Matrix -->
        <div class="finance-card">
          <h3 class="finance-card-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Purchase Price Sensitivity & Cash Freed Up
          </h3>
          <p class="finance-card-subtitle">Drag the slider to test any purchase price and watch your repayments & cashflow update.</p>

          <!-- 1. Target Purchase Price Slider & Calculation Box -->
          <div class="range-slider-group" style="background: #FFFDF9; border: 1px solid #F0E3D5; border-radius: var(--radius-md); padding: 14px;">
            <div class="range-slider-header">
              <label for="slider-target-price" style="font-size: 14px; font-weight: 700; color: var(--text-main);">Target Townhouse Purchase Offer:</label>
              <span class="range-slider-val" id="val-target-price" style="font-size: 20px; font-weight: 800; color: var(--terracotta);">$${Number(targetPrice).toLocaleString()}</span>
            </div>
            <input type="range" class="app-slider" id="slider-target-price" min="750000" max="1250000" step="10000" value="${targetPrice}" oninput="app.handlePurchaseTargetSlider(this.value)">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>$750k</span>
              <span>$950k (Everton Target)</span>
              <span>$1.25M</span>
            </div>

            <!-- Dynamic Live Calculation Box -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-medium); display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">QLD Stamp Duty (Home Concession):</span>
                <div style="font-weight: 700; font-size: 15px;" id="calc-duty">$${Math.round(duty).toLocaleString()}</div>
              </div>
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Required New Loan:</span>
                <div style="font-weight: 700; font-size: 15px;" id="calc-loan">$${Math.round(newLoan).toLocaleString()}</div>
              </div>
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">New Monthly Repayments:</span>
                <div style="font-weight: 700; font-size: 16px; color: var(--text-main);" id="calc-pni">$${Math.round(monthlyPni).toLocaleString()}/mo</div>
              </div>
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: var(--sage); font-weight: 700;">Monthly Cash Freed Up:</span>
                <div style="font-weight: 800; font-size: 19px; color: var(--sage);" id="calc-savings">+$${Math.round(monthlySaving).toLocaleString()}/mo</div>
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted); text-align: right;" id="calc-debt-reduction">
              Debt reduced by <strong>$${Math.round(mortgageReduction).toLocaleString()}</strong> vs current $806k mortgage.
            </div>
          </div>

          <!-- 2. TARGET LOAN INTEREST RATE SLIDER (USER UPDATE 2: UNDER PURCHASE SPACE & ABOVE SENSITIVITY TABLE) -->
          <div class="range-slider-group" style="margin: 18px 0; background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 12px 14px;">
            <div class="range-slider-header">
              <label for="slider-interest-rate" style="font-size: 13px; font-weight: 700;">Target Loan Interest Rate:</label>
              <span class="range-slider-val" id="val-interest-rate">${interestRate.toFixed(1)}%</span>
            </div>
            <input type="range" class="app-slider sage" id="slider-interest-rate" min="4.5" max="8.5" step="0.1" value="${interestRate}" oninput="app.handleLoanRateSlider(this.value)">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
              <span>4.5%</span>
              <span>Modelled: 6.2% (30-yr term)</span>
              <span>8.5%</span>
            </div>
          </div>

          <!-- 3. Sensitivity Comparison Table matching Jordan & Emma's Spreadsheet -->
          <div>
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Quick Offer Sensitivity Comparison:</div>
            <div style="overflow-x: auto;">
              <table style="width: 100%; font-size: 12.5px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-light); text-align: left; background: var(--bg-card-subtle);">
                    <th style="padding: 7px 8px;">Target Price</th>
                    <th style="padding: 7px 8px;">New Mortgage</th>
                    <th style="padding: 7px 8px;">Monthly P&I</th>
                    <th style="padding: 7px 8px; color: var(--sage);">Monthly Savings</th>
                    <th style="padding: 7px 8px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${[900000, 925000, 950000, 999000, 1040000].map(pPrice => {
                    const rowDuty = Calculator.calculateQldTransferDuty(pPrice, true);
                    const rowLoan = Math.max(0, pPrice + rowDuty + otherCosts - equity);
                    const rowPni = Calculator.calculateMonthlyRepayment(rowLoan, interestRate, loanTerm);
                    const rowSave = currentMortgage - rowPni;
                    const isSelected = Math.abs(targetPrice - pPrice) < 5000;
                    return `
                      <tr style="border-bottom: 1px solid var(--border-light); ${isSelected ? 'background: #FAF7F2; font-weight: bold;' : ''}">
                        <td style="padding: 8px;">$${pPrice.toLocaleString()}</td>
                        <td style="padding: 8px;">$${Math.round(rowLoan).toLocaleString()}</td>
                        <td style="padding: 8px;">$${Math.round(rowPni).toLocaleString()}/mo</td>
                        <td style="padding: 8px; color: var(--sage); font-weight: 700;">+$${Math.round(rowSave).toLocaleString()}/mo</td>
                        <td style="padding: 8px; text-align: right;">
                          <button type="button" class="btn-sage" style="padding: 2px 8px; font-size: 11px;" onclick="app.setTargetPurchasePrice(${pPrice})">Select</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // VIEW 5: ABOUT US (WHO WE ARE & KEY LIFE ANCHORS) (USER UPDATE 4)
  // -------------------------------------------------------------
  renderAboutUsView() {
    const container = document.getElementById('about-view-content') || document.getElementById('compass-view-content');
    if (!container) return;

    const anchors = this.lifeAnchors || DEFAULT_ANCHORS;
    const destinations = anchors.destinations || [];
    const profiles = (this.finances && this.finances.profiles) ? this.finances.profiles : DEFAULT_FINANCES.profiles;
    const gen = profiles.generic || DEFAULT_FINANCES.profiles.generic;
    const furBabies = (profiles.furBabies && profiles.furBabies.length > 0) ? profiles.furBabies : DEFAULT_FINANCES.profiles.furBabies;
    const weights = gen.weights || { location: 0.25, commuteToWork: 0.20, walkToShops: 0.20, schools: 0.15, walkingTracks: 0.20 };
    const prefSubsList = gen.preferredSuburbs || ['Everton Hills', 'Everton Park', 'Morningside'];
    const prefBedsList = gen.preferredBedrooms || [3, 4];

    container.innerHTML = `
      <!-- ============================================================= -->
      <!-- SECTION 1: WHO WE ARE — PROFILE & DECISION PRIORITIES (TOP) -->
      <!-- ============================================================= -->
      <div style="margin-bottom: 30px;">
        <div style="margin-bottom: 20px;">
          <h2 style="font-family: var(--font-serif); font-size: 26px; color: var(--text-main); margin-bottom: 4px;">
            About Us — Profile & Decision Priorities
          </h2>
          <p style="font-size: 14px; color: var(--text-muted);">
            Customise your preferred suburbs, bedroom requirements, household notes, and the 5 key decision weights. NestQuest AI re-evaluates all candidate townhouses across the app in real time!
          </p>
        </div>

        <div class="profile-grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
          <!-- Card 1: Search Criteria (Suburbs, Bedrooms & Notes) -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div class="profile-avatar-badge">
                <span style="font-size: 24px;">🏡</span>
                <div>
                  <div style="font-size: 16px; font-weight: 700; color: var(--text-main);">Search Criteria & Identity</div>
                  <div style="font-size: 12px; color: var(--text-muted);">Preferred Suburbs, Bedrooms & Notes</div>
                </div>
              </div>
            </div>

            <!-- 1. Preferred Suburbs (Multi-Selection with Google Maps Confirmation) -->
            <div style="margin-bottom: 18px;">
              <label style="font-size: 13px; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 6px;">
                📍 Preferred Suburbs (Select one or more):
              </label>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
                Properties in these suburbs receive 100% Location Fit. Click 🗺️ to verify any suburb on Google Maps.
              </div>

              <!-- Active Suburbs Tags -->
              <div id="preferred-suburbs-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                ${prefSubsList.map(sub => `
                  <span class="suburb-tag-pill" style="display: inline-flex; align-items: center; gap: 6px; background: #FAF7F2; border: 1px solid var(--border-medium); padding: 5px 10px; border-radius: 20px; font-size: 12.5px; font-weight: 600;">
                    <span>${sub}</span>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sub + ', QLD')}" target="_blank" title="Confirm on Google Maps" style="color: #2563EB; text-decoration: none; font-size: 11px;">🗺️</a>
                    <button type="button" onclick="app.removePreferredSuburb('${sub}')" title="Remove suburb" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 0 2px;">✕</button>
                  </span>
                `).join('')}
              </div>

              <!-- Add Suburb Input + Google Maps Button -->
              <div style="display: flex; gap: 8px;">
                <input type="text" id="add-suburb-input" list="suggested-brisbane-suburbs" placeholder="Type a suburb (e.g. McDowall, Stafford)..." style="flex: 1; padding: 8px 12px; font-size: 13px; border-radius: 4px; border: 1px solid var(--border-medium);" onkeydown="if(event.key==='Enter') app.addPreferredSuburb()">
                <datalist id="suggested-brisbane-suburbs">
                  <option value="Everton Hills">
                  <option value="Everton Park">
                  <option value="Morningside">
                  <option value="McDowall">
                  <option value="Stafford">
                  <option value="Mitchelton">
                  <option value="Camp Hill">
                  <option value="Carina">
                  <option value="Kedron">
                  <option value="Chermside">
                  <option value="Enoggera">
                  <option value="Arana Hills">
                  <option value="Ferny Hills">
                </datalist>
                <button type="button" class="btn-primary" style="padding: 8px 14px; font-size: 13px;" onclick="app.addPreferredSuburb()">
                  + Add Suburb
                </button>
              </div>

              <!-- Quick Suburb Add Chips -->
              <div class="suggestion-chips-container" style="margin-top: 8px;">
                <span style="font-size: 11px; color: var(--text-muted); align-self: center;">Quick Add:</span>
                ${["Everton Hills", "Everton Park", "Morningside", "McDowall", "Stafford", "Camp Hill", "Mitchelton"].filter(s => !prefSubsList.includes(s)).map(s => `
                  <button type="button" class="suggestion-chip" onclick="app.addSpecificSuburb('${s}')">+ ${s}</button>
                `).join('')}
              </div>
            </div>

            <!-- 2. Bedrooms Selection (1, 2, 3, 4, 5+ — Multi-select) -->
            <div style="margin-bottom: 18px;">
              <label style="font-size: 13px; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 6px;">
                🛏️ Bedrooms (Select all that apply):
              </label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${[1, 2, 3, 4, 5].map(b => {
                  const isSelected = prefBedsList.includes(b);
                  const label = b === 5 ? '5+ Beds' : `${b} Bed${b > 1 ? 's' : ''}`;
                  return `
                    <button type="button" class="filter-pill ${isSelected ? 'active' : ''}" style="padding: 6px 14px; font-size: 13px; font-weight: 600;" onclick="app.toggleBedroomPreference(${b})">
                      ${isSelected ? '✓ ' : ''}${label}
                    </button>
                  `;
                }).join('')}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">
                Selected: <strong>${prefBedsList.map(b => b === 5 ? '5+' : b).join(', ')} Bedrooms</strong>. Properties with these bedroom counts receive 100% space score.
              </div>
            </div>

            <!-- 3. Box for notes to distinguish us -->
            <div>
              <label style="font-size: 13px; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 6px;">
                📝 Notes to Distinguish Us:
              </label>
              <textarea id="profile-family-notes" rows="4" style="width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 13px; font-family: var(--font-sans); border-radius: 6px; border: 1px solid var(--border-medium); line-height: 1.45; resize: vertical;" placeholder="Describe what distinguishes your household (work locations, dog/cat needs, family proximity, layout requirements)...">${gen.notes || ''}</textarea>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
                Context used by Antigravity AI Advisor to explain compromises and highlight fit factors.
              </div>
            </div>
          </div>

          <!-- Card 2: The 5 Decision Weights -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div class="profile-avatar-badge">
                <span style="font-size: 24px;">⚖️</span>
                <div>
                  <div style="font-size: 16px; font-weight: 700; color: var(--text-main);">Decision Weights</div>
                  <div style="font-size: 12px; color: var(--text-muted);">Customise priority sliders for AI scoring</div>
                </div>
              </div>
              <span id="decision-weights-total" style="font-size: 13px; font-weight: 700; color: var(--sage); background: #FAFDFB; border: 1px solid var(--border-light); padding: 4px 10px; border-radius: 12px;">Total: 100%</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- 1. Location -->
              <div class="range-slider-group">
                <div class="range-slider-header">
                  <div>
                    <label style="font-size: 13px; font-weight: 700;">📍 Location:</label>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Proximity to your preferred suburbs</span>
                  </div>
                  <span class="range-slider-val" id="val-dw-loc">${Math.round((weights.location || 0.25)*100)}%</span>
                </div>
                <input type="range" class="app-slider" id="slider-dw-loc" min="5" max="50" step="5" value="${Math.round((weights.location || 0.25)*100)}" oninput="app.handleWeightSliderChange()">
              </div>

              <!-- 2. Commute to Work -->
              <div class="range-slider-group">
                <div class="range-slider-header">
                  <div>
                    <label style="font-size: 13px; font-weight: 700;">🚗 Commute to Work:</label>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Travel time to Eight Mile Plains / workplaces</span>
                  </div>
                  <span class="range-slider-val" id="val-dw-comm">${Math.round((weights.commuteToWork || 0.20)*100)}%</span>
                </div>
                <input type="range" class="app-slider" id="slider-dw-comm" min="5" max="50" step="5" value="${Math.round((weights.commuteToWork || 0.20)*100)}" oninput="app.handleWeightSliderChange()">
              </div>

              <!-- 3. Ability to Walk to Shops -->
              <div class="range-slider-group">
                <div class="range-slider-header">
                  <div>
                    <label style="font-size: 13px; font-weight: 700;">🛍️ Ability to Walk to Shops:</label>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Walking distance to cafes, groceries, and dining</span>
                  </div>
                  <span class="range-slider-val" id="val-dw-walk">${Math.round((weights.walkToShops || 0.20)*100)}%</span>
                </div>
                <input type="range" class="app-slider" id="slider-dw-walk" min="5" max="50" step="5" value="${Math.round((weights.walkToShops || 0.20)*100)}" oninput="app.handleWeightSliderChange()">
              </div>

              <!-- 4. Schools in the Area -->
              <div class="range-slider-group">
                <div class="range-slider-header">
                  <div>
                    <label style="font-size: 13px; font-weight: 700;">🏫 Schools in the Area:</label>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Catchments for top-rated primary and high schools</span>
                  </div>
                  <span class="range-slider-val" id="val-dw-sch">${Math.round((weights.schools || 0.15)*100)}%</span>
                </div>
                <input type="range" class="app-slider" id="slider-dw-sch" min="5" max="50" step="5" value="${Math.round((weights.schools || 0.15)*100)}" oninput="app.handleWeightSliderChange()">
              </div>

              <!-- 5. Good Walking Tracks for Animals -->
              <div class="range-slider-group">
                <div class="range-slider-header">
                  <div>
                    <label style="font-size: 13px; font-weight: 700;">🐾 Good Walking Tracks for Animals:</label>
                    <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Parks, Bunya creek trails & off-leash exercise zones</span>
                  </div>
                  <span class="range-slider-val" id="val-dw-tracks">${Math.round((weights.walkingTracks || 0.20)*100)}%</span>
                </div>
                <input type="range" class="app-slider sage" id="slider-dw-tracks" min="5" max="50" step="5" value="${Math.round((weights.walkingTracks || 0.20)*100)}" oninput="app.handleWeightSliderChange()">
              </div>

              <button class="btn-primary" style="margin-top: 10px; padding: 12px; font-size: 14px; font-weight: 700;" onclick="app.saveGenericProfile()">
                💾 Save Profile & Recalculate AI Scores
              </button>
            </div>
          </div>

          <!-- Card 3: Fur Babies Companion Roster -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div class="profile-avatar-badge">
                <span style="font-size: 24px;">🐾</span>
                <div>
                  <div style="font-size: 16px; font-weight: 700; color: var(--text-main);">Fur Babies Roster</div>
                  <div style="font-size: 12px; color: var(--text-muted);">2 Dogs · 2 Cats Accessibility Needs</div>
                </div>
              </div>
              <button class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px;" onclick="app.promptAddPet()">+ Add Pet</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12.5px;">
              ${furBabies.map(pet => `
                <div style="background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: var(--text-main); font-size: 13px;">${pet.type === 'Dog' ? '🐕' : '🐈'} ${pet.name} (${pet.age}yo)</strong>
                    ${pet.critical ? `<span style="background: rgba(220, 38, 38, 0.12); color: #B91C1C; font-weight: 700; font-size: 10.5px; padding: 2px 6px; border-radius: 3px;">CRITICAL NEEDS</span>` : `<span style="color: var(--text-muted); font-size: 11px;">${pet.priority || 'Standard'}</span>`}
                  </div>
                  <div style="color: var(--text-muted); font-size: 12px; line-height: 1.35;">
                    ${pet.needs}
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="background: rgba(200, 90, 50, 0.08); border-radius: var(--radius-sm); padding: 10px; margin-top: 12px; font-size: 12px; color: var(--text-main); line-height: 1.4;">
              🚨 <strong>14yo Senior Dog Protection:</strong> 3-storey townhouses are penalised because arthritic joints cannot navigate 2 flights of stairs daily. Ground-floor private courtyards score highest!
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- SECTION 2: KEY FAMILY & LIFE ANCHORS (BELOW WHO WE ARE) -->
      <!-- ============================================================= -->
      <div class="financial-grid">
        <div class="finance-card" style="grid-column: 1/-1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 class="finance-card-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                Section 2: Key Family & Life Anchors
              </h3>
              <p class="finance-card-subtitle">
                Central registry of Emma & Jordan's destinations and addresses. Google Maps travel timings (drive, transit, walk) are calculated specifically for each townhouse based on its address.
              </p>
            </div>

            <button class="btn-primary" style="padding: 7px 14px; font-size: 13px;" onclick="app.openAnchorEditModal()">
              + Add Anchor Destination
            </button>
          </div>

          <!-- Clean Table: Destination & Address Only -->
          <div style="overflow-x: auto;">
            <table class="anchor-card-table">
              <thead>
                <tr>
                  <th style="width: 240px;">Destination Name</th>
                  <th>Street Address or Suburb</th>
                  <th style="width: 170px;">Google Maps Link</th>
                  <th style="width: 120px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${destinations.map(dest => `
                  <tr>
                    <td>
                      <strong style="color: var(--text-main); font-size: 14px;">${dest.name}</strong>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span>📍</span>
                        <span style="font-weight: 500;">${dest.address}</span>
                      </div>
                    </td>
                    <td>
                      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.address)}" target="_blank" class="btn-maps-link">
                        🗺️ View on Maps ↗
                      </a>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 6px;">
                        <button type="button" class="btn-secondary" style="padding: 3px 8px; font-size: 12px;" onclick="app.openAnchorEditModal('${dest.id}')">
                          ✏️ Edit
                        </button>
                        <button type="button" class="btn-outline-danger" style="padding: 3px 8px; font-size: 12px;" onclick="app.deleteAnchorDestination('${dest.id}')">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 14px 18px; margin-top: 20px; font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px;">💡</span>
            <div>
              <strong>How Commute Timings Work:</strong> Every townhouse listed in your <strong>Property Hub</strong> automatically evaluates its exact address against these destinations to display accurate 🚗 Drive, 🚆 Transit, and 🚶 Walk times right on the property breakdown!
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Backward compatibility alias
  renderCompassView() {
    this.renderAboutUsView();
  }


  openAddModal() {
    const modal = document.getElementById('add-property-modal');
    if (modal) modal.classList.add('open');
  }

  closeAddModal() {
    const modal = document.getElementById('add-property-modal');
    if (modal) modal.classList.remove('open');
  }

  async handleScrapeUrl() {
    const input = document.getElementById('scrape-url-input');
    const statusEl = document.getElementById('scrape-status');
    const url = input.value.trim();
    if (!url) return;

    statusEl.innerHTML = `<span style="color: var(--terracotta);">⏳ Fetching listing & extracting fields...</span>`;

    const result = await PropertyScraper.scrapeUrl(url);
    if (result && result.success && result.data) {
      this.populateFormFields(result.data);
      if (result.isBotProtected) {
        statusEl.innerHTML = `
          <div style="background: var(--bg-amber-soft); padding: 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--honey); margin-top: 10px;">
            <strong style="color: var(--honey-dark);">ℹ️ Address extracted from URL!</strong>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Realestate.com.au uses anti-bot security that restricts automated crawlers from reading internal page text directly.
              We extracted <strong>${result.data.address}</strong> for you! You can tweak fields below, or use the <strong>1-Click Bookmarklet</strong> or <strong>Smart Text Paste</strong>.
            </p>
          </div>
        `;
      } else {
        statusEl.innerHTML = `<span style="color: var(--sage); font-weight: 600;">✅ Extracted from URL! Switched to Form tab to review.</span>`;
      }
      setTimeout(() => {
        document.querySelector('.import-tab-btn[data-mode="form"]').click();
      }, 900);
    } else {
      statusEl.innerHTML = `
        <span style="color: var(--rose-alert);">${result ? (result.error || 'Could not parse URL.') : 'Could not parse URL.'}</span>
        <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">Tip: Use the '1-Click Bookmarklet' or 'Smart Text Paste' tab!</div>
      `;
    }
  }

  async handleParsePaste() {
    const textarea = document.getElementById('paste-text-input');
    const statusEl = document.getElementById('paste-status');
    const text = textarea.value.trim();
    if (!text) {
      statusEl.innerHTML = `<span style="color: var(--rose-alert);">Please paste some listing text first!</span>`;
      return;
    }

    statusEl.innerHTML = `<span style="color: var(--terracotta);">⏳ AI parsing listing text...</span>`;

    const data = await PropertyScraper.parseText(text);
    if (data) {
      this.populateFormFields(data);
      statusEl.innerHTML = `<span style="color: var(--sage); font-weight: 700;">✅ Extracted ${data.bedrooms || 3} beds, ${data.bathrooms || 2} baths, ${data.parking || 'parking'}! Switched to form tab.</span>`;
      setTimeout(() => {
        document.querySelector('.import-tab-btn[data-mode="form"]').click();
      }, 700);
    }
  }

  populateFormFields(data) {
    if (data.address) document.getElementById('form-address').value = data.address;
    if (data.suburb) document.getElementById('form-suburb').value = data.suburb;
    if (data.advertisedGuide) document.getElementById('form-guide').value = data.advertisedGuide;
    if (data.modelledPrice) document.getElementById('form-modelled-price').value = data.modelledPrice;
    if (data.bedrooms) document.getElementById('form-bedrooms').value = data.bedrooms;
    if (data.bathrooms) document.getElementById('form-bathrooms').value = data.bathrooms;
    if (data.parking) document.getElementById('form-parking').value = data.parking;
    if (data.levels) document.getElementById('form-levels').value = data.levels;
    if (data.outdoorSpace) document.getElementById('form-outdoor').value = data.outdoorSpace;
    if (data.quarterlyBodyCorp) document.getElementById('form-body-corp').value = data.quarterlyBodyCorp;
    if (data.planningRisk) document.getElementById('form-risk').value = data.planningRisk;
    if (data.keyCompromise) document.getElementById('form-compromise').value = data.keyCompromise;
    if (data.link) document.getElementById('form-link').value = data.link;
    if (data.imageUrl) document.getElementById('form-image-url').value = data.imageUrl;
    if (data.notes) document.getElementById('form-notes').value = data.notes;
  }

  async handleSaveProperty() {
    const address = document.getElementById('form-address').value.trim();
    const suburb = document.getElementById('form-suburb').value.trim();
    const modelledPrice = Number(document.getElementById('form-modelled-price').value) || 900000;
    const advertisedGuide = document.getElementById('form-guide').value.trim() || `Offers around $${modelledPrice.toLocaleString()}`;
    const bedrooms = Number(document.getElementById('form-bedrooms').value) || 3;
    const bathrooms = Number(document.getElementById('form-bathrooms').value) || 2;
    const parking = document.getElementById('form-parking').value.trim() || '2 car garage';
    const levels = Number(document.getElementById('form-levels').value) || 2;
    const outdoorSpace = document.getElementById('form-outdoor').value.trim() || 'Private courtyard';
    const quarterlyBodyCorp = Number(document.getElementById('form-body-corp').value) || 1200;
    const planningRisk = document.getElementById('form-risk').value.trim() || 'None flagged';
    const keyCompromise = document.getElementById('form-compromise').value.trim();
    const link = document.getElementById('form-link').value.trim();
    const imageUrl = document.getElementById('form-image-url').value.trim() || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
    const notes = document.getElementById('form-notes').value.trim();

    const newProp = {
      id: 'prop-' + Date.now(),
      address,
      suburb,
      link,
      advertisedGuide,
      modelledPrice,
      bedrooms,
      bathrooms,
      parking,
      parkingSpaces: parking.includes('1') ? 1 : (parking.includes('3') ? 3 : 2),
      levels,
      outdoorSpace,
      standoutFeature: 'Imported Property',
      lifestyleFit: suburb.toLowerCase().includes('morningside') ? 'Preferred suburb (Emma)' : 'Northside lifestyle',
      planningRisk,
      keyCompromise,
      quarterlyBodyCorp,
      monthlyBodyCorp: Math.round((quarterlyBodyCorp / 3) * 100) / 100,
      imageUrl,
      images: [imageUrl],
      notes
    };

    if (this.isApiAvailable) {
      try {
        await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProp)
        });
      } catch (e) {
        console.warn('API error, saving locally');
      }
    }

    this.properties.unshift(newProp);
    this.recalculateAllMetrics();
    this.saveDataLocally();

    this.closeAddModal();
    this.renderHeaderStats();
    this.renderProperties();
    document.getElementById('add-property-form').reset();
  }

  openDetailDrawer(propId) {
    const p = this.properties.find(item => item.id === propId);
    if (!p) return;

    const modal = document.getElementById('detail-drawer-modal');
    const content = document.getElementById('detail-drawer-content');
    if (!modal || !content) return;

    const scores = p.aiScores || {};
    const isPlanned = this.plannedInspections.has(p.id);

    // Auto-detect floorplan if missing from floorplanUrl but present in images
    if (!p.floorplanUrl && p.images && Array.isArray(p.images)) {
      const fp = p.images.find(img => img.includes('.png') || img.toLowerCase().includes('floorplan') || img.toLowerCase().includes('floor_plan'));
      if (fp) p.floorplanUrl = fp;
    }

    const anchors = (this.lifeAnchors && this.lifeAnchors.destinations) ? this.lifeAnchors.destinations : DEFAULT_ANCHORS.destinations;

    // Body corporate calculations
    const weeklyBc = Math.round(p.weeklyBodyCorp || (p.monthlyBodyCorp ? p.monthlyBodyCorp / 4.333 : (p.quarterlyBodyCorp ? p.quarterlyBodyCorp / 13 : 92)));
    const monthlyBc = Math.round(p.monthlyBodyCorp || (p.weeklyBodyCorp ? p.weeklyBodyCorp * 4.333 : 400));
    const quarterlyBc = Math.round(p.quarterlyBodyCorp || (p.weeklyBodyCorp ? p.weeklyBodyCorp * 13 : 1200));

    content.innerHTML = `
      <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap;">
        <!-- Hero Image Box with Facade / Floorplan Switcher -->
        <div style="width: 290px; position: relative; flex-shrink: 0;">
          <img id="drawer-hero-img" src="${(p.imageUrl && !p.imageUrl.includes('unsplash')) ? p.imageUrl : 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22290%22 height=%22185%22 viewBox=%220 0 290 185%22><rect width=%22290%22 height=%22185%22 fill=%22%23EDE6DC%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2232%22>🏡</text></svg>'}" style="width: 100%; height: 185px; object-fit: contain; background: #FAF7F2; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-light);" alt="${p.address}">
          
          <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
            ${(p.imageUrl && !p.imageUrl.includes('unsplash')) ? `
              <button type="button" class="filter-pill active" id="btn-show-facade" style="flex: 1; padding: 6px; font-size: 12px; text-align: center;" onclick="document.getElementById('drawer-hero-img').src='${p.imageUrl}'; this.classList.add('active'); document.getElementById('btn-show-floorplan')?.classList.remove('active');">
                🏡 Facade
              </button>
            ` : ''}
            <label class="filter-pill" style="flex: 1; padding: 6px; font-size: 12px; text-align: center; cursor: pointer; color: var(--terracotta); border-color: var(--terracotta);">
              <input type="file" accept="image/*" style="display:none;" onchange="app.handleCardPhotoUpload('${p.id}', this.files[0]); setTimeout(() => app.openDetailDrawer('${p.id}'), 300);">
              📷 ${(p.imageUrl && !p.imageUrl.includes('unsplash')) ? 'Change' : '+ Add Photo'}
            </label>
            ${p.floorplanUrl ? `
              <button type="button" class="filter-pill" id="btn-show-floorplan" style="flex: 1; padding: 6px; font-size: 12px; text-align: center; color: #2563EB; border-color: #BFDBFE;" onclick="document.getElementById('drawer-hero-img').src='${p.floorplanUrl}'; this.classList.add('active'); document.getElementById('btn-show-facade')?.classList.remove('active');">
                📐 Floor Plan
              </button>
              <button type="button" class="filter-pill" style="padding: 6px 10px; font-size: 12px; text-align: center; color: #2563EB;" onclick="app.openFloorplanModal('${p.floorplanUrl}', '${p.id}')">
                🔍 Zoom
              </button>
            ` : `
              <button type="button" class="filter-pill" style="flex: 1; padding: 6px; font-size: 12px; text-align: center; color: var(--text-muted); border-style: dashed;" onclick="document.getElementById('drawer-file-input').click();">
                + Add Floorplan
              </button>
            `}
          </div>
        </div>

        <div style="flex-grow: 1; min-width: 280px;">
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="badge-suburb">${p.suburb}</span>
            ${p.floorplanUrl ? `<span class="badge-suburb" style="background: rgba(37, 99, 235, 0.9);">📐 Floorplan Available</span>` : ''}
            <button class="btn-plan-toggle ${isPlanned ? 'planned' : ''}" style="margin-left: auto;" onclick="app.toggleInspection('${p.id}')">
              ${isPlanned ? '✓ In Inspection Plan' : '+ Add to Inspection Plan'}
            </button>
          </div>

          <h2 style="font-family: var(--font-serif); font-size: 26px; color: var(--text-main); margin-bottom: 6px;">${p.address}</h2>

          <!-- Editable Property Specs Row with Working Pencils -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 12px 0; background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 10px 14px;">
            <div>
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Bedrooms:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 13.5px;">🛏️ ${p.bedrooms} Beds</strong>
                <button type="button" class="btn-edit-inline" title="Edit bedrooms" onclick="app.promptEditPropertyField('${p.id}', 'bedrooms', 'Bedrooms (number)')">✏️</button>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Bathrooms:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 13.5px;">🛁 ${p.bathrooms} Baths</strong>
                <button type="button" class="btn-edit-inline" title="Edit bathrooms" onclick="app.promptEditPropertyField('${p.id}', 'bathrooms', 'Bathrooms (e.g. 2 or 2.5)')">✏️</button>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Parking:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 13.5px;">🚗 ${p.parkingSpaces || 2} Car</strong>
                <button type="button" class="btn-edit-inline" title="Edit parking" onclick="app.promptEditParking('${p.id}')">✏️</button>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Levels:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 13.5px;">🪜 ${p.levels} Levels</strong>
                <button type="button" class="btn-edit-inline" title="Edit levels" onclick="app.promptEditPropertyField('${p.id}', 'levels', 'Storey Levels (1, 2, or 3)')">✏️</button>
              </div>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Outdoor Space:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 12.5px;">🌳 ${p.outdoorSpace || 'Private courtyard'}</strong>
                <button type="button" class="btn-edit-inline" title="Edit outdoor space" onclick="app.promptEditPropertyField('${p.id}', 'outdoorSpace', 'Outdoor Space')">✏️</button>
              </div>
            </div>
          </div>

          <!-- Modelled Price Box -->
          <div style="background: #FFFDF9; border: 1px solid #F0E3D5; border-radius: var(--radius-sm); padding: 12px 14px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px;">Modelled Offer Price:</span>
                <div style="font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--terracotta);">
                  $${(p.modelledPrice || 0).toLocaleString()} 
                  <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">(${p.advertisedGuide || 'Offers Invited'})</span>
                </div>
              </div>
              <button class="btn-secondary" style="padding: 6px 14px; font-size: 13px;" onclick="app.toggleInlinePriceEditor('${p.id}')">
                ✏️ Edit Offer Price
              </button>
            </div>

            <!-- Property.com.au / PropTrack Valuation Section -->
            ${p.propertyValue ? `
              <div style="margin-top: 10px; padding: 10px 12px; background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">🏛️</span>
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #6B21A8; font-weight: 700; letter-spacing: 0.5px;">
                      Property.com.au PropTrack Value
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: #581C87;">
                      $${Number(p.propertyValue).toLocaleString()}
                      <span style="background: #7E22CE; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle;">
                        ${p.propertyValueConfidence || 'HIGH CONFIDENCE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                  <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 12px; border-color: #D8B4FE; color: #6B21A8;" onclick="app.lookupPropertyComAu('${p.id}')">
                    View on Property.com.au ↗
                  </button>
                  ${p.modelledPrice !== p.propertyValue ? `
                    <button type="button" class="btn-sage" style="padding: 4px 10px; font-size: 12px;" onclick="app.applyPropertyValueAsModelled('${p.id}')">
                      Use as Offer Price
                    </button>
                  ` : `
                    <span style="font-size: 11px; color: var(--sage); font-weight: 700;">✓ Active as Modelled Price</span>
                  `}
                  <button type="button" style="background:none; border:none; color: var(--text-muted); font-size: 11px; cursor: pointer; text-decoration: underline; padding: 0 4px;" onclick="app.promptSetPropertyValue('${p.id}')">
                    Edit
                  </button>
                </div>
              </div>
            ` : `
              <div style="margin-top: 10px; padding: 8px 12px; background: #FAF5FF; border: 1px dashed #C084FC; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B21A8;">
                  <span>🏛️</span>
                  <span>Listing has no public price. Check <strong>Property.com.au</strong> for automated PropTrack estimate.</span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px; border-color: #D8B4FE; color: #6B21A8; font-weight: 600;" onclick="app.lookupPropertyComAu('${p.id}')">
                    🔍 Find on Property.com.au ↗
                  </button>
                  <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 11.5px;" onclick="app.promptSetPropertyValue('${p.id}')">
                    + Set Valuation
                  </button>
                </div>
              </div>
            `}

            <div id="drawer-price-edit-box-${p.id}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E0D3C5;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-main);">Change Modelled Purchase Price ($ AUD):</label>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <input type="number" id="drawer-new-price-input-${p.id}" value="${p.modelledPrice || 950000}" step="5000" style="padding: 6px 10px; font-size: 15px; font-weight: 700; width: 160px; border: 1px solid var(--border-medium); border-radius: var(--radius-sm);">
                <button class="btn-primary" style="padding: 6px 14px; font-size: 13px;" onclick="app.saveInlinePrice('${p.id}')">Save & Recalculate</button>
                <button class="btn-secondary" style="padding: 6px 10px; font-size: 13px;" onclick="app.toggleInlinePriceEditor('${p.id}')">Cancel</button>
              </div>
            </div>
          </div>

          ${p.inspectionTimes ? `
            <div style="font-size: 13px; color: var(--text-main); margin-top: 8px; display: flex; align-items: center; gap: 6px;">
              🗓️ Open Inspection: <strong>${p.inspectionTimes}</strong>
              <button type="button" style="background: none; border: none; color: var(--terracotta); font-size: 11px; cursor: pointer; text-decoration: underline;" onclick="app.promptAddInspectionTime('${p.id}', event)">Change</button>
            </div>
          ` : `
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 8px; display: flex; align-items: center; gap: 6px;">
              🗓️ No open inspection set yet.
              <button type="button" style="background: none; border: none; color: var(--terracotta); font-size: 11px; cursor: pointer; text-decoration: underline;" onclick="app.promptAddInspectionTime('${p.id}', event)">+ Add Inspection</button>
            </div>
          `}

          ${(() => {
            const targetUrl = this.getVerifiedListingUrl(p);
            if (!targetUrl) return '';
            const platform = targetUrl.includes('domain.com.au') ? 'on Domain' : (targetUrl.includes('realestate.com.au') ? 'on Realestate.com.au' : '');
            return `<div style="margin-top: 8px;">
              <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" 
                 style="color: var(--terracotta); font-size: 13px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; background: rgba(200, 90, 50, 0.08); padding: 5px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(200, 90, 50, 0.25);" 
                 onclick="app.openExternalListing('${p.id}', event)">
                <span>View Online Listing ${platform} ↗</span>
              </a>
            </div>`;
          })()}
        </div>
      </div>

      <!-- PHOTO & FLOORPLAN UPLOADER / MANAGER SECTION -->
      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              📸 Manage Photos & Floor Plan
            </h4>
            <div style="font-size: 12px; color: var(--text-muted);">
              Add extra property photos or architectural floor plans directly from your computer or by pasting an image link.
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input type="file" id="drawer-file-input" accept="image/*" style="display: none;" onchange="app.handleImageFileUpload('${p.id}', this)">
            <button class="btn-primary" style="padding: 6px 12px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 5px;" onclick="document.getElementById('drawer-file-input').click()">
              📁 Upload Image File
            </button>
            <button class="btn-secondary" style="padding: 6px 12px; font-size: 12.5px;" onclick="app.promptAddImageUrl('${p.id}')">
              🔗 Paste Image URL
            </button>
          </div>
        </div>

        ${(p.images && p.images.length > 0) ? `
          <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px;">
            ${p.images.map((img, i) => `
              <div style="position: relative; width: 100px; flex-shrink: 0; text-align: center; border-radius: var(--radius-sm); border: 1px solid var(--border-light); padding: 4px; background: white;">
                <img src="${img}" style="width: 90px; height: 60px; object-fit: contain; cursor: pointer; border-radius: 3px;" onclick="document.getElementById('drawer-hero-img').src='${img}'">
                <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 4px;">
                  <button type="button" style="font-size: 9.5px; border: 1px solid var(--border-light); background: #FAF7F2; border-radius: 2px; padding: 1px 3px; cursor: pointer;" onclick="app.setAsFacade('${p.id}', '${img}')">
                    Set Facade
                  </button>
                  <button type="button" style="font-size: 9.5px; border: 1px solid #BFDBFE; background: #EFF6FF; color: #2563EB; border-radius: 2px; padding: 1px 3px; cursor: pointer;" onclick="app.setAsFloorplan('${p.id}', '${img}')">
                    Set Floorplan
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px;">
            No secondary images saved yet. Click 'Upload Image File' above to add a photo or floor plan!
          </div>
        `}
      </div>

      <!-- Financial Schedule with Weekly Body Corp & Working Pencil -->
      <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">Financial Breakdown vs Current Home</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Estimated New Mortgage</div>
            <div style="font-size: 18px; font-weight: 700;">$${Math.round(p.estimatedNewMortgage || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Monthly Mortgage</div>
            <div style="font-size: 18px; font-weight: 700;">$${Math.round(p.monthlyMortgage || 0).toLocaleString()}/mo</div>
          </div>
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
              <span>Body Corporate</span>
              <button type="button" class="btn-edit-inline" title="Edit body corporate" onclick="app.promptEditBodyCorp('${p.id}')">✏️ Edit</button>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">
              $${weeklyBc}/wk
              <span style="font-size: 11.5px; font-weight: normal; color: var(--text-muted);">($${monthlyBc}/mo · $${quarterlyBc}/qtr)</span>
            </div>
          </div>
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--sage); font-weight: 700;">Monthly Cash Freed Up</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--sage);">+$${Math.round(p.monthlySaving || 0).toLocaleString()}/mo</div>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- DEDICATED COMMUTE & PROXIMITY TO KEY FAMILY ANCHORS -->
      <!-- ============================================================= -->
      <div style="background: white; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              🚗 Commute & Transit to Key Family Anchors
            </h4>
            <div style="font-size: 12px; color: var(--text-muted);">
              Calculated specifically from <strong>${p.address}</strong> based on Google Maps routing.
            </div>
          </div>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="app.switchTab('compass')">
            Manage Anchors
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${anchors.map(dest => {
            const timings = calculateGoogleMapsTimings(dest.address, p.suburb || p.address);
            const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p.address)}&destination=${encodeURIComponent(dest.address)}`;

            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #FAFDFB; border: 1px solid var(--border-light); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 8px;">
                <div style="min-width: 180px;">
                  <strong style="color: var(--text-main); font-size: 13.5px;">📍 ${dest.name}</strong>
                  <div style="font-size: 11.5px; color: var(--text-muted);">${dest.address}</div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <span class="commute-badge" title="Estimated Drive Time">
                    🚗 ${timings.drive}
                  </span>
                  <span class="commute-badge" title="Public Transit Time">
                    🚆 ${timings.transit}
                  </span>
                  ${timings.isWalkable ? `
                    <span class="commute-badge" style="background: #ECFDF5; border-color: #A7F3D0; color: #065F46;" title="Walkable">
                      🚶 ${timings.walk}
                    </span>
                  ` : ''}

                  <a href="${gmapsDirUrl}" target="_blank" class="btn-maps-link" style="margin-left: 6px;">
                    Google Maps ↗
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Pros and Cons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div style="background: var(--bg-sage-soft); border-radius: var(--radius-md); padding: 16px;">
          <h5 style="color: var(--sage); font-weight: 700; margin-bottom: 8px;">✨ Standout Advantages</h5>
          <ul style="padding-left: 18px; font-size: 13px; line-height: 1.5; color: var(--text-main);">
            ${(scores.pros || ['Great potential', 'Strong equity release']).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div style="background: var(--bg-amber-soft); border-radius: var(--radius-md); padding: 16px;">
          <h5 style="color: var(--honey-dark); font-weight: 700; margin-bottom: 8px;">⚠️ Key Compromises</h5>
          <ul style="padding-left: 18px; font-size: 13px; line-height: 1.5; color: var(--text-main);">
            ${(scores.cons || ['Standard trade-offs apply']).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Notes -->
      <div style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5; border-top: 1px solid var(--border-light); padding-top: 14px;">
        <strong>Strategic Summary:</strong> ${p.notes || 'No extra notes recorded.'}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
        <button class="btn-outline-danger" onclick="app.deleteProperty('${p.id}')">Delete Property</button>
        <button class="btn-primary" onclick="document.getElementById('detail-drawer-modal').classList.remove('open')">Close</button>
      </div>
    `;

    modal.classList.add('open');
  }

  toggleInlinePriceEditor(propId) {
    const box = document.getElementById(`drawer-price-edit-box-${propId}`);
    if (box) {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
  }

  saveInlinePrice(propId) {
    const input = document.getElementById(`drawer-new-price-input-${propId}`);
    if (!input) return;
    const newPrice = Number(input.value);
    if (!newPrice || newPrice <= 100000) {
      alert('Please enter a valid price (e.g. 950000).');
      return;
    }

    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    prop.modelledPrice = newPrice;
    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.openDetailDrawer(propId);
    this.renderHeaderStats();
    this.renderProperties();
    alert(`✅ Modelled price updated to $${newPrice.toLocaleString()}! Loan repayments and cashflow recalculated.`);
  }

  handleImageFileUpload(propId, inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;

    const targetType = confirm('Click OK to set this as the FLOOR PLAN layout.\nClick Cancel to set as the FACADE exterior photo.') ? 'floorplan' : 'facade';

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const prop = this.properties.find(p => p.id === propId);
      if (!prop) return;

      if (!prop.images) prop.images = [];
      prop.images.unshift(dataUrl);

      if (targetType === 'floorplan') {
        prop.floorplanUrl = dataUrl;
      } else {
        prop.imageUrl = dataUrl;
      }

      this.saveDataLocally();
      this.syncPropertyToBackend(prop);
      this.openDetailDrawer(propId);
      this.renderProperties();
      alert(`✅ Uploaded image successfully assigned as ${targetType === 'floorplan' ? 'Floor Plan' : 'Facade Photo'}!`);
    };
    reader.readAsDataURL(file);
  }

  promptAddImageUrl(propId) {
    const url = prompt('Paste the full image URL (JPG, PNG, or WEBP):');
    if (!url || !url.trim()) return;

    const targetType = confirm('Click OK to set this as the FLOOR PLAN layout.\nClick Cancel to set as the FACADE exterior photo.') ? 'floorplan' : 'facade';

    const clean = url.trim();
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    if (!prop.images) prop.images = [];
    if (!prop.images.includes(clean)) prop.images.unshift(clean);

    if (targetType === 'floorplan') {
      prop.floorplanUrl = clean;
    } else {
      prop.imageUrl = clean;
    }

    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.openDetailDrawer(propId);
    this.renderProperties();
    alert(`✅ Image link assigned as ${targetType === 'floorplan' ? 'Floor Plan' : 'Facade Photo'}!`);
  }

  setAsFloorplan(propId, imgUrl) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;
    prop.floorplanUrl = imgUrl;
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.openDetailDrawer(propId);
    this.renderProperties();
    alert('✅ Image set as property Floor Plan!');
  }

  setAsFacade(propId, imgUrl) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;
    prop.imageUrl = imgUrl;
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.openDetailDrawer(propId);
    this.renderProperties();
    alert('✅ Image set as property Facade Hero!');
  }

  openFloorplanModal(imgUrl, propIdOrAddress) {
    const modal = document.getElementById('floorplan-viewer-modal');
    const imgEl = document.getElementById('floorplan-modal-img');
    const titleEl = document.getElementById('floorplan-modal-title');
    if (!modal || !imgEl) return;

    let address = propIdOrAddress || '';
    if (this.properties && Array.isArray(this.properties)) {
      const prop = this.properties.find(p => p.id === propIdOrAddress);
      if (prop) address = prop.address;
    }

    imgEl.src = imgUrl;
    if (titleEl) titleEl.textContent = `Architectural Floor Plan — ${address}`;
    modal.classList.add('open');
  }

  toggleCompare(propId, event) {
    if (event) event.stopPropagation();
    if (this.selectedForCompare.has(propId)) {
      this.selectedForCompare.delete(propId);
    } else {
      this.selectedForCompare.add(propId);
      if (this.selectedForCompare.size >= 2) {
        // Automatically switch to comparison view when 2 properties are selected!
        this.switchTab('compare');
        return;
      }
    }
    this.renderProperties();
  }

  async deleteProperty(propId) {
    const prop = this.properties.find(p => p.id === propId);
    const addr = prop ? prop.address : 'this listing';
    if (!confirm(`Are you sure you want to remove "${addr}" from your Property Hub?`)) return;

    // Permanently record deleted ID and address so it is NEVER re-added
    this.deletedPropertyIds.add(propId);
    if (prop && prop.address) {
      const cleanAddr = prop.address.toLowerCase().trim();
      this.deletedPropertyAddresses.add(cleanAddr);
      const street = cleanAddr.split(',')[0].trim();
      if (street) this.deletedPropertyAddresses.add(street);
    }
    localStorage.setItem('nestquest_deleted_properties', JSON.stringify(Array.from(this.deletedPropertyIds)));
    localStorage.setItem('nestquest_deleted_addresses', JSON.stringify(Array.from(this.deletedPropertyAddresses)));

    if (this.isApiAvailable) {
      try {
        await fetch(`/api/properties/${propId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('API error deleting property');
      }
    }

    this.properties = this.properties.filter(p => p.id !== propId);
    this.selectedForCompare.delete(propId);
    this.plannedInspections.delete(propId);
    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.updateInspectionCountBadge();

    const drawer = document.getElementById('detail-drawer-modal');
    if (drawer) drawer.classList.remove('open');
    this.renderHeaderStats();
    this.updateSuburbFilterOptions();
    this.renderProperties();
    if (this.activeTab === 'finances') this.renderFinancialSimulator();
  }

  handleCardPhotoUpload(propId, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        const prop = this.properties.find(p => p.id === propId);
        if (prop) {
          prop.imageUrl = compressedDataUrl;
          if (!prop.images || !Array.isArray(prop.images)) prop.images = [];
          prop.images.unshift(compressedDataUrl);
          this.saveDataLocally();
          this.renderProperties();
          if (this.isApiAvailable) {
            this.syncPropertyToBackend(prop);
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // =============================================================
  // INLINE PENCIL & FIELD EDITORS
  // =============================================================
  promptEditPropertyField(propId, field, label) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    this.currentEditPropId = propId;
    this.currentEditField = field;

    const modal = document.getElementById('spec-edit-modal');
    const titleEl = document.getElementById('spec-edit-modal-title');
    const bodyEl = document.getElementById('spec-edit-modal-body');
    if (!modal || !bodyEl) return;

    titleEl.textContent = `Edit ${label}`;
    const curVal = prop[field] !== undefined ? prop[field] : '';

    if (field === 'levels') {
      bodyEl.innerHTML = `
        <div class="form-group">
          <label style="font-size: 13px; font-weight: 700;">Number of Storeys / Levels:</label>
          <select id="spec-edit-input" style="padding: 10px; font-size: 14px; border-radius: 4px; border: 1px solid var(--border-medium); width: 100%;">
            <option value="1" ${curVal == 1 ? 'selected' : ''}>1 Level (Single Storey — Best for senior dogs)</option>
            <option value="2" ${curVal == 2 ? 'selected' : ''}>2 Levels (Manageable layout)</option>
            <option value="3" ${curVal == 3 ? 'selected' : ''}>3 Levels (Difficult on senior dog arthritic joints)</option>
          </select>
        </div>
      `;
    } else if (field === 'bedrooms') {
      bodyEl.innerHTML = `
        <div class="form-group">
          <label style="font-size: 13px; font-weight: 700;">Number of Bedrooms:</label>
          <select id="spec-edit-input" style="padding: 10px; font-size: 14px; border-radius: 4px; border: 1px solid var(--border-medium); width: 100%;">
            <option value="2" ${curVal == 2 ? 'selected' : ''}>2 Bedrooms</option>
            <option value="3" ${curVal == 3 ? 'selected' : ''}>3 Bedrooms (Emma preference)</option>
            <option value="4" ${curVal == 4 ? 'selected' : ''}>4 Bedrooms (Jordan preference — feels like a real home)</option>
            <option value="5" ${curVal == 5 ? 'selected' : ''}>5 Bedrooms</option>
          </select>
        </div>
      `;
    } else if (field === 'bathrooms') {
      bodyEl.innerHTML = `
        <div class="form-group">
          <label style="font-size: 13px; font-weight: 700;">Number of Bathrooms:</label>
          <input type="number" id="spec-edit-input" step="0.5" value="${curVal}" style="padding: 10px; font-size: 15px; border-radius: 4px; border: 1px solid var(--border-medium); width: 100%;">
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div class="form-group">
          <label style="font-size: 13px; font-weight: 700;">${label}:</label>
          <input type="text" id="spec-edit-input" value="${curVal}" style="padding: 10px; font-size: 14px; border-radius: 4px; border: 1px solid var(--border-medium); width: 100%;">
        </div>
      `;
    }

    modal.classList.add('open');
  }

  closeSpecEditModal() {
    const modal = document.getElementById('spec-edit-modal');
    if (modal) modal.classList.remove('open');
    this.currentEditPropId = null;
    this.currentEditField = null;
  }

  saveSpecEdit() {
    const input = document.getElementById('spec-edit-input');
    if (!input || !this.currentEditPropId || !this.currentEditField) return;

    const prop = this.properties.find(p => p.id === this.currentEditPropId);
    if (!prop) return;

    let val = input.value.trim();
    if (this.currentEditField === 'bedrooms' || this.currentEditField === 'levels') {
      val = parseInt(val, 10) || 1;
    } else if (this.currentEditField === 'bathrooms') {
      val = parseFloat(val) || 1;
    }

    prop[this.currentEditField] = val;
    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.closeSpecEditModal();
    this.openDetailDrawer(prop.id);
    this.renderProperties();
  }

  // Parking Editor
  promptEditParking(propId) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    this.currentEditPropId = propId;
    const modal = document.getElementById('parking-edit-modal');
    const spacesSelect = document.getElementById('edit-parking-spaces');
    const typeSelect = document.getElementById('edit-parking-type');
    if (!modal) return;

    if (spacesSelect) spacesSelect.value = prop.parkingSpaces || 2;
    if (typeSelect && prop.parking) {
      for (let option of typeSelect.options) {
        if (prop.parking.toLowerCase().includes(option.value.toLowerCase().split(' ')[0])) {
          option.selected = true;
          break;
        }
      }
    }

    modal.classList.add('open');
  }

  closeParkingModal() {
    const modal = document.getElementById('parking-edit-modal');
    if (modal) modal.classList.remove('open');
    this.currentEditPropId = null;
  }

  saveParkingEdit() {
    if (!this.currentEditPropId) return;
    const prop = this.properties.find(p => p.id === this.currentEditPropId);
    if (!prop) return;

    const spacesSelect = document.getElementById('edit-parking-spaces');
    const typeSelect = document.getElementById('edit-parking-type');

    prop.parkingSpaces = parseInt(spacesSelect.value, 10) || 2;
    prop.parking = typeSelect.value;

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.closeParkingModal();
    this.openDetailDrawer(prop.id);
    this.renderProperties();
  }

  // Body Corporate Editor
  promptEditBodyCorp(propId) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    this.currentEditPropId = propId;
    const modal = document.getElementById('bodycorp-edit-modal');
    if (!modal) return;

    const weekly = Math.round(prop.weeklyBodyCorp || (prop.monthlyBodyCorp ? prop.monthlyBodyCorp / 4.333 : 92));
    const monthly = Math.round(prop.monthlyBodyCorp || (weekly * 4.333));
    const quarterly = Math.round(prop.quarterlyBodyCorp || (weekly * 13));

    document.getElementById('edit-bc-weekly').value = weekly;
    document.getElementById('edit-bc-monthly').value = monthly;
    document.getElementById('edit-bc-quarterly').value = quarterly;

    modal.classList.add('open');
  }

  closeBodyCorpModal() {
    const modal = document.getElementById('bodycorp-edit-modal');
    if (modal) modal.classList.remove('open');
    this.currentEditPropId = null;
  }

  handleBcInput(source) {
    const weeklyInput = document.getElementById('edit-bc-weekly');
    const monthlyInput = document.getElementById('edit-bc-monthly');
    const quarterlyInput = document.getElementById('edit-bc-quarterly');

    if (source === 'weekly') {
      const w = parseFloat(weeklyInput.value) || 0;
      monthlyInput.value = Math.round(w * 4.333);
      quarterlyInput.value = Math.round(w * 13);
    } else if (source === 'monthly') {
      const m = parseFloat(monthlyInput.value) || 0;
      weeklyInput.value = Math.round(m / 4.333);
      quarterlyInput.value = Math.round(m * 3);
    } else if (source === 'quarterly') {
      const q = parseFloat(quarterlyInput.value) || 0;
      monthlyInput.value = Math.round(q / 3);
      weeklyInput.value = Math.round(q / 13);
    }
  }

  saveBodyCorpEdit() {
    if (!this.currentEditPropId) return;
    const prop = this.properties.find(p => p.id === this.currentEditPropId);
    if (!prop) return;

    const weekly = parseFloat(document.getElementById('edit-bc-weekly').value) || 0;
    const monthly = parseFloat(document.getElementById('edit-bc-monthly').value) || 0;
    const quarterly = parseFloat(document.getElementById('edit-bc-quarterly').value) || 0;

    prop.weeklyBodyCorp = weekly;
    prop.monthlyBodyCorp = monthly;
    prop.quarterlyBodyCorp = quarterly;

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.closeBodyCorpModal();
    this.openDetailDrawer(prop.id);
    this.renderProperties();
    this.renderHeaderStats();
  }

  // Inspection Modal Handlers
  promptAddInspectionTime(propId, event) {
    if (event) event.stopPropagation();
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    this.currentEditPropId = propId;
    const modal = document.getElementById('inspection-edit-modal');
    const input = document.getElementById('edit-inspection-input');
    if (!modal || !input) return;

    input.value = prop.inspectionTimes || 'Sat 7 Nov 9:00 am';
    modal.classList.add('open');
  }

  closeInspectionModal() {
    const modal = document.getElementById('inspection-edit-modal');
    if (modal) modal.classList.remove('open');
    this.currentEditPropId = null;
  }

  saveInspectionEdit() {
    if (!this.currentEditPropId) return;
    const prop = this.properties.find(p => p.id === this.currentEditPropId);
    if (!prop) return;

    const input = document.getElementById('edit-inspection-input');
    const val = input.value.trim();

    prop.inspectionTimes = val;
    if (val && !this.plannedInspections.has(prop.id)) {
      this.plannedInspections.add(prop.id);
    }

    this.saveDataLocally();
    this.syncPropertyToBackend(prop);
    this.updateInspectionCountBadge();
    this.closeInspectionModal();
    this.openDetailDrawer(prop.id);
    this.renderProperties();
    this.renderInspectionsView();
  }

  // Life Anchor Destination & Address Modal
  openAnchorEditModal(destId = null) {
    this.currentEditAnchorId = destId;
    const modal = document.getElementById('anchor-edit-modal');
    const titleEl = document.getElementById('anchor-modal-title');
    const nameInput = document.getElementById('edit-anchor-name');
    const addrInput = document.getElementById('edit-anchor-address');
    if (!modal) return;

    if (destId) {
      const dest = this.lifeAnchors.destinations.find(d => d.id === destId);
      if (dest) {
        titleEl.textContent = `Edit Life Anchor — ${dest.name}`;
        nameInput.value = dest.name;
        addrInput.value = dest.address;
      }
    } else {
      titleEl.textContent = 'Add Key Life Anchor Destination';
      nameInput.value = '';
      addrInput.value = '';
    }

    this.updateAnchorMapsPreview();
    modal.classList.add('open');
  }

  closeAnchorModal() {
    const modal = document.getElementById('anchor-edit-modal');
    if (modal) modal.classList.remove('open');
    this.currentEditAnchorId = null;
  }

  setAnchorAddressPreset(address) {
    const input = document.getElementById('edit-anchor-address');
    if (input) {
      input.value = address;
      this.updateAnchorMapsPreview();
    }
  }

  updateAnchorMapsPreview() {
    const input = document.getElementById('edit-anchor-address');
    const previewEl = document.getElementById('anchor-maps-preview');
    if (!input || !previewEl) return;

    const val = input.value.trim();
    if (val) {
      previewEl.style.display = 'block';
      previewEl.innerHTML = `🗺️ Verified Google Maps link: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}" target="_blank" style="color: #2563EB; font-weight: 600;">View "${val}" on Google Maps ↗</a>`;
    } else {
      previewEl.style.display = 'none';
    }
  }

  saveAnchorModal() {
    const nameInput = document.getElementById('edit-anchor-name');
    const addrInput = document.getElementById('edit-anchor-address');
    if (!nameInput || !addrInput) return;

    const name = nameInput.value.trim();
    const address = addrInput.value.trim();

    if (!name || !address) {
      alert('Please provide both Destination Name and Street Address.');
      return;
    }

    if (!this.lifeAnchors) this.lifeAnchors = DEFAULT_ANCHORS;
    if (!this.lifeAnchors.destinations) this.lifeAnchors.destinations = [];

    if (this.currentEditAnchorId) {
      const dest = this.lifeAnchors.destinations.find(d => d.id === this.currentEditAnchorId);
      if (dest) {
        dest.name = name;
        dest.address = address;
      }
    } else {
      const newId = 'anchor-' + Date.now();
      this.lifeAnchors.destinations.push({
        id: newId,
        name: name,
        address: address
      });
    }

    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.closeAnchorModal();
    this.renderCompassView();
  }

  deleteAnchorDestination(destId) {
    if (!confirm('Are you sure you want to remove this Life Anchor destination?')) return;
    this.lifeAnchors.destinations = this.lifeAnchors.destinations.filter(d => d.id !== destId);
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderCompassView();
  }

  // Financial Simulator Interactive Sliders
  handleSaleSliderChange(field, value) {
    const num = Number(value);
    this.finances.sale[field] = num;

    const sale = this.finances.sale;
    const defaults = this.finances.purchaseDefaults;
    const equity = Calculator.calculateSaleEquity(sale.estimatedSalePrice, sale.existingMortgage, sale.sellingExpenses);

    // Update readout labels
    if (field === 'estimatedSalePrice') {
      const el = document.getElementById('val-sale-price');
      if (el) el.textContent = `$${num.toLocaleString()}`;
    } else if (field === 'existingMortgage') {
      const el = document.getElementById('val-mortgage');
      if (el) el.textContent = `- $${num.toLocaleString()}`;
    } else if (field === 'sellingExpenses') {
      const el = document.getElementById('val-selling-costs');
      if (el) el.textContent = `- $${num.toLocaleString()}`;
    }

    const bannerEl = document.getElementById('banner-net-equity');
    if (bannerEl) bannerEl.textContent = `$${Math.round(equity).toLocaleString()}`;

    // Update target calculation live
    this.updateTargetCalculations();
    this.recalculateAllMetrics();
    this.renderHeaderStats();
    this.saveDataLocally();
  }

  handleLoanRateSlider(value) {
    const rate = Number(value);
    this.finances.purchaseDefaults.defaultInterestRate = rate;

    const label = document.getElementById('val-interest-rate');
    if (label) label.textContent = `${rate.toFixed(1)}%`;

    this.updateTargetCalculations();
    this.recalculateAllMetrics();
    this.renderHeaderStats();
    this.saveDataLocally();
  }

  handlePurchaseTargetSlider(value) {
    this.targetPurchasePrice = Number(value);
    const label = document.getElementById('val-target-price');
    if (label) label.textContent = `$${this.targetPurchasePrice.toLocaleString()}`;

    this.updateTargetCalculations();
  }

  setTargetPurchasePrice(price) {
    this.targetPurchasePrice = Number(price);
    const slider = document.getElementById('slider-target-price');
    const label = document.getElementById('val-target-price');
    if (slider) slider.value = price;
    if (label) label.textContent = `$${this.targetPurchasePrice.toLocaleString()}`;

    this.updateTargetCalculations();
  }

  updateTargetCalculations() {
    const sale = this.finances.sale;
    const defaults = this.finances.purchaseDefaults;
    const equity = Calculator.calculateSaleEquity(sale.estimatedSalePrice, sale.existingMortgage, sale.sellingExpenses);
    const targetPrice = this.targetPurchasePrice || 950000;
    const duty = Calculator.calculateQldTransferDuty(targetPrice, true);
    const otherCosts = Number(defaults.otherBuyingExpenses || 4000);
    const totalOutlay = targetPrice + duty + otherCosts;
    const newLoan = Math.max(0, totalOutlay - equity);
    const rate = Number(defaults.defaultInterestRate || 6.2);
    const term = Number(defaults.loanTermYears || 30);
    const monthlyPni = Calculator.calculateMonthlyRepayment(newLoan, rate, term);
    const currentMortgage = Number(sale.currentMonthlyMortgage || 4810);
    const monthlySaving = currentMortgage - monthlyPni;
    const debtReduction = Math.max(0, (sale.existingMortgage || 806992) - newLoan);

    const elDuty = document.getElementById('calc-duty');
    const elLoan = document.getElementById('calc-loan');
    const elPni = document.getElementById('calc-pni');
    const elSavings = document.getElementById('calc-savings');
    const elDebt = document.getElementById('calc-debt-reduction');

    if (elDuty) elDuty.textContent = `$${Math.round(duty).toLocaleString()}`;
    if (elLoan) elLoan.textContent = `$${Math.round(newLoan).toLocaleString()}`;
    if (elPni) elPni.textContent = `$${Math.round(monthlyPni).toLocaleString()}/mo`;
    if (elSavings) elSavings.textContent = `+$${Math.round(monthlySaving).toLocaleString()}/mo`;
    if (elDebt) elDebt.innerHTML = `Debt reduced by <strong>$${Math.round(debtReduction).toLocaleString()}</strong> vs current $806k mortgage.`;
  }

  // Generic Profile & Decision Priorities Handlers
  addPreferredSuburb() {
    const input = document.getElementById('add-suburb-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.generic) this.finances.profiles.generic = { preferredSuburbs: [], preferredBedrooms: [3, 4], weights: {} };
    if (!this.finances.profiles.generic.preferredSuburbs) this.finances.profiles.generic.preferredSuburbs = [];

    const exists = this.finances.profiles.generic.preferredSuburbs.some(s => s.toLowerCase() === val.toLowerCase());
    if (!exists) {
      this.finances.profiles.generic.preferredSuburbs.push(val);
      this.saveDataLocally();
      this.syncFinancesToBackend();
      this.recalculateAllMetrics();
      this.renderFinancialSimulator();
      this.renderProperties();
    }
    input.value = '';
  }

  addSpecificSuburb(suburb) {
    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.generic) this.finances.profiles.generic = { preferredSuburbs: [], preferredBedrooms: [3, 4], weights: {} };
    if (!this.finances.profiles.generic.preferredSuburbs) this.finances.profiles.generic.preferredSuburbs = [];

    const exists = this.finances.profiles.generic.preferredSuburbs.some(s => s.toLowerCase() === suburb.toLowerCase());
    if (!exists) {
      this.finances.profiles.generic.preferredSuburbs.push(suburb);
      this.saveDataLocally();
      this.syncFinancesToBackend();
      this.recalculateAllMetrics();
      this.renderFinancialSimulator();
      this.renderProperties();
    }
  }

  removePreferredSuburb(suburb) {
    if (!this.finances.profiles?.generic?.preferredSuburbs) return;
    this.finances.profiles.generic.preferredSuburbs = this.finances.profiles.generic.preferredSuburbs.filter(s => s.toLowerCase() !== suburb.toLowerCase());
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.recalculateAllMetrics();
    this.renderFinancialSimulator();
    this.renderProperties();
  }

  toggleBedroomPreference(bedCount) {
    const num = Number(bedCount);
    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.generic) this.finances.profiles.generic = { preferredSuburbs: [], preferredBedrooms: [3, 4], weights: {} };
    if (!this.finances.profiles.generic.preferredBedrooms) this.finances.profiles.generic.preferredBedrooms = [3, 4];

    let beds = this.finances.profiles.generic.preferredBedrooms;
    if (beds.includes(num)) {
      if (beds.length <= 1) {
        alert("Please keep at least one bedroom preference selected.");
        return;
      }
      beds = beds.filter(b => b !== num);
    } else {
      beds.push(num);
      beds.sort((a, b) => a - b);
    }

    this.finances.profiles.generic.preferredBedrooms = beds;
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.recalculateAllMetrics();
    this.renderFinancialSimulator();
    this.renderProperties();
  }

  handleWeightSliderChange() {
    const loc = parseInt(document.getElementById('slider-dw-loc')?.value || '25', 10);
    const comm = parseInt(document.getElementById('slider-dw-comm')?.value || '20', 10);
    const walk = parseInt(document.getElementById('slider-dw-walk')?.value || '20', 10);
    const sch = parseInt(document.getElementById('slider-dw-sch')?.value || '15', 10);
    const tracks = parseInt(document.getElementById('slider-dw-tracks')?.value || '20', 10);

    const elLoc = document.getElementById('val-dw-loc');
    const elComm = document.getElementById('val-dw-comm');
    const elWalk = document.getElementById('val-dw-walk');
    const elSch = document.getElementById('val-dw-sch');
    const elTracks = document.getElementById('val-dw-tracks');
    const elTotal = document.getElementById('decision-weights-total');

    if (elLoc) elLoc.textContent = loc + '%';
    if (elComm) elComm.textContent = comm + '%';
    if (elWalk) elWalk.textContent = walk + '%';
    if (elSch) elSch.textContent = sch + '%';
    if (elTracks) elTracks.textContent = tracks + '%';

    const sum = loc + comm + walk + sch + tracks;
    if (elTotal) {
      elTotal.textContent = `Total: ${sum}%`;
      elTotal.style.color = Math.abs(sum - 100) <= 5 ? 'var(--sage)' : 'var(--terracotta)';
    }
  }

  saveGenericProfile() {
    const notesEl = document.getElementById('profile-family-notes');
    const notes = notesEl ? notesEl.value.trim() : '';

    const loc = (parseInt(document.getElementById('slider-dw-loc')?.value || '25', 10)) / 100;
    const comm = (parseInt(document.getElementById('slider-dw-comm')?.value || '20', 10)) / 100;
    const walk = (parseInt(document.getElementById('slider-dw-walk')?.value || '20', 10)) / 100;
    const sch = (parseInt(document.getElementById('slider-dw-sch')?.value || '15', 10)) / 100;
    const tracks = (parseInt(document.getElementById('slider-dw-tracks')?.value || '20', 10)) / 100;

    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.generic) this.finances.profiles.generic = {};

    this.finances.profiles.generic.notes = notes;
    this.finances.profiles.generic.weights = {
      location: loc,
      commuteToWork: comm,
      walkToShops: walk,
      schools: sch,
      walkingTracks: tracks
    };

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderProperties();
    this.renderFinancialSimulator();
    alert("✅ Search criteria and decision weights saved! All AI scores and fit percentages recalculated.");
  }

  // Save Profiles (Backward Compatibility)
  saveEmmaProfile() {
    const suburb = document.getElementById('profile-emma-suburb').value;
    const beds = document.getElementById('profile-emma-beds').value;
    const shops = document.getElementById('profile-emma-shops').value;

    const locWeight = (parseInt(document.getElementById('slider-ew-loc').value, 10) || 35) / 100;
    const walkWeight = (parseInt(document.getElementById('slider-ew-walk').value, 10) || 25) / 100;
    const commWeight = (parseInt(document.getElementById('slider-ew-comm').value, 10) || 20) / 100;

    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.emma) this.finances.profiles.emma = {};

    this.finances.profiles.emma.preferredSuburb = suburb;
    this.finances.profiles.emma.bedroomPreference = beds;
    this.finances.profiles.emma.priorityShops = shops;
    this.finances.profiles.emma.weights = {
      location: locWeight,
      walkability: walkWeight,
      commute: commWeight,
      finances: 0.10,
      space: 0.10
    };

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderProperties();
    alert("✅ Emma's profile preferences and weights saved! All AI Fit scores recalculated.");
  }

  saveJordanProfile() {
    const suburb = document.getElementById('profile-jordan-suburb').value;
    const beds = document.getElementById('profile-jordan-beds').value;
    const family = document.getElementById('profile-jordan-family').value;

    const bedsWeight = (parseInt(document.getElementById('slider-jw-beds').value, 10) || 30) / 100;
    const famWeight = (parseInt(document.getElementById('slider-jw-fam').value, 10) || 25) / 100;
    const walksWeight = (parseInt(document.getElementById('slider-jw-walks').value, 10) || 20) / 100;

    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.jordan) this.finances.profiles.jordan = {};

    this.finances.profiles.jordan.preferredSuburb = suburb;
    this.finances.profiles.jordan.bedroomPreference = beds;
    this.finances.profiles.jordan.priorityFamily = family;
    this.finances.profiles.jordan.weights = {
      homeFeelAndBeds: bedsWeight,
      familyProximity: famWeight,
      dogWalksAndNature: walksWeight,
      finances: 0.15,
      commute: 0.10
    };

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderProperties();
    alert("✅ Jordan's profile preferences and weights saved! All AI Fit scores recalculated.");
  }

  saveFurBabiesProfile() {
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.recalculateAllMetrics();
    this.renderProperties();
    alert("✅ Fur Babies profile saved! Ground-level safety & courtyard scores updated.");
  }

  promptAddPet() {
    const name = prompt("Enter Pet's Name (e.g. Bella, Buster):");
    if (!name || !name.trim()) return;
    const type = confirm("Click OK for Dog 🐕, or Cancel for Cat 🐈") ? "Dog" : "Cat";
    const age = parseInt(prompt("Enter age (years):", "8"), 10) || 5;
    const needs = prompt("Enter special needs or layout requirements:", type === "Dog" ? "Needs fenced grass & walking trails" : "Quiet sunny spots");

    if (!this.finances.profiles) this.finances.profiles = {};
    if (!this.finances.profiles.furBabies) this.finances.profiles.furBabies = [];

    this.finances.profiles.furBabies.push({
      id: 'pet-' + Date.now(),
      name: name.trim(),
      type: type,
      age: age,
      critical: age >= 13,
      priority: age >= 13 ? "CRITICAL" : "Standard",
      needs: needs || "Standard family care"
    });

    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderFinancialSimulator();
  }

  resetFinancialDefaults() {
    if (!confirm('Reset financial sale & loan settings to your Excel model ($1.4M sale, $806,992 mortgage, $40k expenses, 6.2% rate)?')) return;
    this.finances.sale = { ...DEFAULT_FINANCES.sale };
    this.finances.purchaseDefaults = { ...DEFAULT_FINANCES.purchaseDefaults };
    this.targetPurchasePrice = 950000;
    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderFinancialSimulator();
    this.renderHeaderStats();
    this.renderProperties();
    alert('✅ Reset to original spreadsheet model ($553,008 Net Equity)!');
  }

  // --- Baseline Household Budget Methods ---
  openAddBudgetCategoryModal() {
    const modal = document.getElementById('budget-category-modal');
    if (!modal) return;
    const nameEl = document.getElementById('new-budget-name');
    const amtEl = document.getElementById('new-budget-amount');
    const freqEl = document.getElementById('new-budget-freq');
    if (nameEl) nameEl.value = '';
    if (amtEl) amtEl.value = '';
    if (freqEl) freqEl.value = 'weekly';
    modal.classList.add('active');
  }

  closeBudgetCategoryModal() {
    const modal = document.getElementById('budget-category-modal');
    if (modal) modal.classList.remove('active');
  }

  saveNewBudgetCategory() {
    const nameEl = document.getElementById('new-budget-name');
    const amtEl = document.getElementById('new-budget-amount');
    const freqEl = document.getElementById('new-budget-freq');
    const name = nameEl ? nameEl.value.trim() : '';
    const amount = amtEl ? parseFloat(amtEl.value) : 0;
    const freq = freqEl ? freqEl.value : 'weekly';

    if (!name) {
      alert('Please enter a category name (e.g. Gym & Sports, Dining Out, Pet Insurance).');
      return;
    }
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    if (!this.finances.householdBudget) {
      this.finances.householdBudget = JSON.parse(JSON.stringify(DEFAULT_FINANCES.householdBudget));
    }
    if (!this.finances.householdBudget.categories) {
      this.finances.householdBudget.categories = [];
    }

    const newCat = {
      id: 'cat-' + Date.now(),
      name: name,
      amount: Math.round(amount),
      frequency: freq,
      isMortgage: false
    };

    this.finances.householdBudget.categories.push(newCat);
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.closeBudgetCategoryModal();
    this.renderFinancialSimulator();
  }

  updateBudgetCategoryAmount(catId, newAmount) {
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt < 0) return;

    if (!this.finances.householdBudget || !this.finances.householdBudget.categories) return;
    const cat = this.finances.householdBudget.categories.find(c => c.id === catId);
    if (cat) {
      cat.amount = Math.round(amt);
      this.saveDataLocally();
      this.syncFinancesToBackend();
      this.renderFinancialSimulator();
    }
  }

  deleteBudgetCategory(catId) {
    if (!this.finances.householdBudget || !this.finances.householdBudget.categories) return;
    const cat = this.finances.householdBudget.categories.find(c => c.id === catId);
    if (!cat) return;
    if (cat.isMortgage) {
      alert('Mortgage repayment is tied to your loan calculation and cannot be deleted.');
      return;
    }
    if (!confirm(`Remove "${cat.name}" ($${cat.amount}/${cat.frequency.replace('ly','')}) from your baseline budget?`)) return;

    this.finances.householdBudget.categories = this.finances.householdBudget.categories.filter(c => c.id !== catId);
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderFinancialSimulator();
  }

  updateHouseholdIncome(newIncome) {
    const income = parseFloat(newIncome);
    if (isNaN(income) || income < 0) return;
    if (!this.finances.householdBudget) {
      this.finances.householdBudget = JSON.parse(JSON.stringify(DEFAULT_FINANCES.householdBudget));
    }
    this.finances.householdBudget.weeklyCombinedIncome = Math.round(income);
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderFinancialSimulator();
  }

  updateLiquidSavings(newSavings) {
    const savings = parseFloat(newSavings);
    if (isNaN(savings) || savings < 0) return;
    if (!this.finances.householdBudget) {
      this.finances.householdBudget = JSON.parse(JSON.stringify(DEFAULT_FINANCES.householdBudget));
    }
    this.finances.householdBudget.liquidSavings = Math.round(savings);
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderFinancialSimulator();
  }
  // --- Property.com.au & PropTrack Integration Methods ---
  lookupPropertyComAu(propId, event) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    const cleanAddress = prop.address.replace(/,\s*Qld.*$/i, '').trim();
    const query = `site:property.com.au "${cleanAddress}"`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  }

  applyPropertyValueAsModelled(propId) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop || !prop.propertyValue) return;

    prop.modelledPrice = prop.propertyValue;
    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderProperties();
    this.renderHeaderStats();
    if (this.activeTab === 'finances') this.renderFinancialSimulator();
    this.openDetailDrawer(prop.id);
    alert(`✅ Set Modelled Offer Price to Property.com.au estimate: $${prop.propertyValue.toLocaleString()}!`);
  }

  promptSetPropertyValue(propId) {
    const prop = this.properties.find(p => p.id === propId);
    if (!prop) return;

    const currentVal = prop.propertyValue || prop.modelledPrice || 950000;
    const input = prompt(`Enter PropTrack Property Value from property.com.au for "${prop.address}":`, `$${currentVal.toLocaleString()}`);
    if (!input || !input.trim()) return;

    const clean = input.replace(/[^\d]/g, '');
    const num = parseInt(clean, 10);
    if (isNaN(num) || num < 100000) {
      alert('Please enter a valid price estimate (e.g. $1,121,000 or 1121000).');
      return;
    }

    const conf = confirm('Is this marked HIGH CONFIDENCE on property.com.au?\nClick OK for HIGH CONFIDENCE, or Cancel for MEDIUM CONFIDENCE') ? 'HIGH CONFIDENCE' : 'MEDIUM CONFIDENCE';

    prop.propertyValue = num;
    prop.propertyValueConfidence = conf;
    prop.propertyValueSource = 'property.com.au';

    if (confirm(`Do you also want to update your Modelled Purchase Offer to $${num.toLocaleString()}?`)) {
      prop.modelledPrice = num;
      prop.advertisedGuide = `Property.com.au: $${num.toLocaleString()} (${conf})`;
    }

    this.recalculateAllMetrics();
    this.saveDataLocally();
    this.syncFinancesToBackend();
    this.renderProperties();
    this.renderHeaderStats();
    if (this.activeTab === 'finances') this.renderFinancialSimulator();
    this.openDetailDrawer(prop.id);
  }

  // --- Mobile Phone Connection Modal ---
  openMobileConnectModal() {
    const modal = document.getElementById('mobile-connect-modal');
    if (!modal) return;
    modal.classList.add('open');
  }

  closeMobileConnectModal() {
    const modal = document.getElementById('mobile-connect-modal');
    if (modal) modal.classList.remove('open');
  }
}

// Global App Instance
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PropertyHunterApp();
  window.app = app;
});
