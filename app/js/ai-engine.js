/**
 * Client-Side AI Scoring & Decision Engine
 * Evaluates properties across the 5 Core Decision Pillars:
 * 1. Location (preferred suburbs)
 * 2. Commute to work (Eight Mile Plains / workplaces)
 * 3. Ability to walk to shops & cafes
 * 4. Schools in the area (catchments & ranking)
 * 5. Good walking tracks for animals (Bunya creek, parks, trails)
 * Plus bedroom requirements and senior pet safety.
 */

const AIEngine = {
  scoreProperty(property, finances) {
    const suburb = (property.suburb || "").trim().toLowerCase();
    const address = (property.address || "").trim().toLowerCase();
    const beds = Number(property.bedrooms) || 3;
    const baths = Number(property.bathrooms) || 2;
    const levels = Number(property.levels) || 2;
    const parking = (property.parking || "").toLowerCase();
    const outdoor = (property.outdoorSpace || "").toLowerCase();
    const feature = (property.standoutFeature || "").toLowerCase();
    const risk = (property.planningRisk || "").toLowerCase();
    const monthlySaving = Number(property.monthlySaving) || 0;
    const monthlyBc = Number(property.monthlyBodyCorp) || 400;

    // Generic Household Profile & Decision Weights
    const gen = finances?.profiles?.generic || {
      preferredSuburbs: ["Everton Hills", "Everton Park", "Morningside"],
      preferredBedrooms: [3, 4],
      notes: "",
      weights: {
        location: 0.25,
        commuteToWork: 0.20,
        walkToShops: 0.20,
        schools: 0.15,
        walkingTracks: 0.20
      }
    };

    const weights = gen.weights || {
      location: 0.25,
      commuteToWork: 0.20,
      walkToShops: 0.20,
      schools: 0.15,
      walkingTracks: 0.20
    };

    const prefSubs = (gen.preferredSuburbs || ["Everton Hills", "Everton Park", "Morningside"]).map(s => s.toLowerCase());
    const prefBeds = (gen.preferredBedrooms && gen.preferredBedrooms.length > 0) ? gen.preferredBedrooms.map(Number) : [3, 4];

    // 1. LOCATION SCORE (Does property match one of the preferred suburbs?)
    const isPreferredSub = prefSubs.some(ps => suburb.includes(ps) || address.includes(ps));
    const locationScore = isPreferredSub ? 100 : (suburb.includes('everton') || suburb.includes('morningside') || suburb.includes('mcdowall') || suburb.includes('stafford') || suburb.includes('camp hill') ? 75 : 50);

    // 2. COMMUTE TO WORK SCORE (Eight Mile Plains / workplace travel time)
    let commuteScore = 70;
    if (suburb.includes('morningside') || suburb.includes('camp hill') || suburb.includes('carina') || suburb.includes('coorparoo')) {
      commuteScore = 95; // 20-22 min direct drive
    } else if (suburb.includes('everton') || suburb.includes('mcdowall') || suburb.includes('stafford') || suburb.includes('mitchelton')) {
      commuteScore = 65; // 38-42 min cross-town drive
    } else {
      commuteScore = 75;
    }

    // 3. ABILITY TO WALK TO SHOPS SCORE
    let walkToShopsScore = 50;
    if (outdoor.includes('walk') || feature.includes('shops') || feature.includes('cafe') || suburb.includes('morningside')) {
      walkToShopsScore = 95; // e.g. Richmond Rd, Dickson St, Baringa St 6m to Wynnum Rd cafes
    } else if (suburb.includes('everton park') && (address.includes('rogers') || address.includes('flockton'))) {
      walkToShopsScore = 65; // short 2-3 min drive to Everton Plaza
    } else if (suburb.includes('everton hills')) {
      walkToShopsScore = 45; // 7m drive to Brookside / Arana Hills
    } else {
      walkToShopsScore = 60;
    }

    // 4. SCHOOLS IN THE AREA SCORE
    let schoolsScore = 80;
    if (suburb.includes('everton') || suburb.includes('mcdowall')) {
      schoolsScore = 95; // Top-ranked McDowall SS, Prince of Peace, Northside Christian
    } else if (suburb.includes('morningside') || suburb.includes('camp hill')) {
      schoolsScore = 90; // Camp Hill State Infants & Primary, Morningside State
    } else {
      schoolsScore = 75;
    }

    // 5. GOOD WALKING TRACKS FOR ANIMALS SCORE
    let walkingTracksScore = 70;
    if (suburb.includes('everton hills') || address.includes('bunya') || outdoor.includes('bunya creek')) {
      walkingTracksScore = 100; // Bunya creek nature trails, Bunyaville Conservation Park
    } else if (suburb.includes('everton park') || suburb.includes('mcdowall') || suburb.includes('stafford')) {
      walkingTracksScore = 90; // Kedron Brook bikeway and off-leash dog swimming zones
    } else if (suburb.includes('morningside')) {
      walkingTracksScore = 80; // Colmslie dog beach, Balmoral parklands
    } else {
      walkingTracksScore = 65;
    }

    // BEDROOM MATCH FACTOR
    const hasBedMatch = prefBeds.includes(beds);
    const bedScore = hasBedMatch ? 100 : (prefBeds.some(b => Math.abs(b - beds) === 1) ? 75 : 50);

    // FUR BABIES SAFETY SCORE (Senior Dog 14yo level living & private courtyard)
    let petLevels = levels === 1 ? 100 : (levels === 2 ? 85 : 38);
    let petOutdoor = (outdoor.includes("yard") || outdoor.includes("private courtyard")) ? 95 : (outdoor.includes("courtyard") ? 85 : 30);
    let petRiskPenalty = 0;
    if (risk.includes("flood")) petRiskPenalty += 15;
    if (risk.includes("overland")) petRiskPenalty += 10;
    const furBabiesScore = Math.max(25, Math.round((petLevels * 0.50) + (petOutdoor * 0.50) - petRiskPenalty));

    // FINANCIAL SCORE
    const savingNormalized = Math.min(100, Math.max(40, Math.round((monthlySaving / 2100) * 100)));
    const bcScore = monthlyBc < 350 ? 95 : (monthlyBc < 450 ? 80 : 55);
    const financialScore = Math.round((savingNormalized * 0.70) + (bcScore * 0.30));

    // TOTAL WEIGHTED DECISION SCORE
    const wTotal = (Number(weights.location) || 0.25) +
                   (Number(weights.commuteToWork) || 0.20) +
                   (Number(weights.walkToShops) || 0.20) +
                   (Number(weights.schools) || 0.15) +
                   (Number(weights.walkingTracks) || 0.20) || 1.0;

    const weightedBase = (
      (locationScore * (Number(weights.location) || 0.25)) +
      (commuteScore * (Number(weights.commuteToWork) || 0.20)) +
      (walkToShopsScore * (Number(weights.walkToShops) || 0.20)) +
      (schoolsScore * (Number(weights.schools) || 0.15)) +
      (walkingTracksScore * (Number(weights.walkingTracks) || 0.20))
    ) / wTotal;

    // Overall Fit combines weighted priorities (70%), bedroom fit (15%), and pet safety (15%)
    const overallFit = Math.min(99, Math.max(40, Math.round(
      (weightedBase * 0.70) +
      (bedScore * 0.15) +
      (furBabiesScore * 0.15)
    )));

    // Backward compatibility Emma & Jordan scores
    const emmaScore = Math.round((locationScore * 0.30) + (walkToShopsScore * 0.30) + (commuteScore * 0.25) + (financialScore * 0.15));
    const jordanScore = Math.round((bedScore * 0.35) + (walkingTracksScore * 0.25) + (schoolsScore * 0.20) + (locationScore * 0.20));

    // Pros & Cons
    const pros = [];
    const cons = [];

    if (isPreferredSub) {
      pros.push(`Located in preferred suburb (${property.suburb})`);
    }
    if (hasBedMatch) {
      pros.push(`Matches your bedroom requirement (${beds} Beds)`);
    }
    if (walkingTracksScore >= 90) {
      pros.push("Outstanding access to dog walking tracks & green park corridors");
    }
    if (walkToShopsScore >= 90) {
      pros.push("Exceptional walkability: stroll to cafes, retail & groceries");
    }
    if (schoolsScore >= 90) {
      pros.push("Located in top-rated school catchment zones");
    }
    if (petLevels >= 85) {
      pros.push("Manageable layout for senior pets (courtyard & ≤2 storeys)");
    } else {
      cons.push("3 levels: Challenging for senior 14yo dog's arthritic joints");
    }
    if (commuteScore < 70) {
      cons.push("38-42 min cross-town drive to Eight Mile Plains during peak");
    }
    if (walkToShopsScore < 60) {
      cons.push("Requires driving for daily groceries & retail (not walkable)");
    }

    return {
      overallFit,
      locationScore: Math.round(locationScore),
      commuteScore: Math.round(commuteScore),
      walkToShopsScore: Math.round(walkToShopsScore),
      schoolsScore: Math.round(schoolsScore),
      walkingTracksScore: Math.round(walkingTracksScore),
      bedScore: Math.round(bedScore),
      emmaScore,
      jordanScore,
      furBabiesScore,
      financialScore,
      pros,
      cons
    };
  },

  getWinner(properties) {
    if (!properties || properties.length === 0) return null;
    let best = properties[0];
    let bestScore = -1;
    for (const p of properties) {
      const score = Number(p.aiScores?.overallFit) || 0;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best ? best.id : null;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
}
