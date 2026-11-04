import json
import re

def calculate_property_scores(prop, finances):
    """
    Evaluates a property across Emma, Jordan, Fur Babies, and Financial dimensions.
    Returns calculated percentage scores (0-100), key compromises, and pros/cons.
    """
    suburb = (prop.get("suburb") or "").strip().lower()
    beds = int(prop.get("bedrooms") or 3)
    baths = float(prop.get("bathrooms") or 2)
    levels = int(prop.get("levels") or 2)
    parking = str(prop.get("parking") or "").lower()
    outdoor = str(prop.get("outdoorSpace") or "").lower()
    feature = str(prop.get("standoutFeature") or "").lower()
    risk = str(prop.get("planningRisk") or "").lower()
    monthly_saving = float(prop.get("monthlySaving") or 0)
    monthly_bc = float(prop.get("monthlyBodyCorp") or 400)
    
    # ----------------------------------------------------
    # 1. EMMA SCORE (Target: Morningside, walk to shops, easy EMP commute, city access)
    # ----------------------------------------------------
    emma_location = 100 if "morningside" in suburb else (45 if "everton" in suburb else 60)
    emma_walkability = 95 if ("walk" in outdoor or "shops" in feature or "morningside" in suburb) else 45
    emma_commute = 95 if "morningside" in suburb else 55  # Morningside is 20-22 mins to EMP; Everton is 38-42 mins
    emma_beds = 90 if beds >= 3 else 60
    emma_stairs = 95 if levels <= 2 else 65  # Less stairs is nicer
    
    emma_score = round(
        (emma_location * 0.35) +
        (emma_walkability * 0.25) +
        (emma_commute * 0.20) +
        (emma_beds * 0.10) +
        (emma_stairs * 0.10)
    )

    # ----------------------------------------------------
    # 2. JORDAN SCORE (Target: Everton Park/Hills, 4 beds, real home feel, family, dog walks)
    # ----------------------------------------------------
    jordan_location = 100 if "everton" in suburb else 55
    jordan_beds = 100 if beds >= 4 else (78 if beds == 3 else 45)
    jordan_family = 100 if "everton" in suburb else 45 # Everton Hills is 5 mins from Callum & Kaitlin
    jordan_home_feel = 95 if (beds >= 4 or "second living" in feature or "courtyard" in outdoor) else 60
    jordan_garage = 95 if ("side-by-side" in parking or "double" in parking) else (60 if "tandem" in parking else 50)
    
    jordan_score = round(
        (jordan_beds * 0.30) +
        (jordan_family * 0.25) +
        (jordan_location * 0.15) +
        (jordan_home_feel * 0.15) +
        (jordan_garage * 0.15)
    )

    # ----------------------------------------------------
    # 3. FUR BABIES SCORE (14yo Senior Dog, 16yo Senior Cat, 6yo Cat, 8yo Dog)
    # Critical: 3 levels is severe on 14yo dog's hips/arthritis. Courtyard is vital for toilet breaks.
    # ----------------------------------------------------
    if levels == 1:
        pet_levels = 100
    elif levels == 2:
        pet_levels = 85
    else: # 3 levels
        pet_levels = 38 # Major mobility barrier for 14yo dog
    
    if "yard" in outdoor or "private courtyard" in outdoor:
        pet_outdoor = 95
    elif "courtyard" in outdoor:
        pet_outdoor = 85
    else: # Balconies only
        pet_outdoor = 30 # No ground relief for dogs

    # Nature / dog walking areas
    pet_walks = 95 if "everton" in suburb else 75
    
    # Overlay risk penalty (flooding / overland flow can damp courtyards or pose escape/moisture hazards)
    pet_risk_penalty = 0
    if "flood" in risk:
        pet_risk_penalty += 15
    if "overland" in risk:
        pet_risk_penalty += 10

    fur_babies_score = max(20, round(
        (pet_levels * 0.45) +
        (pet_outdoor * 0.35) +
        (pet_walks * 0.20) -
        pet_risk_penalty
    ))

    # ----------------------------------------------------
    # 4. FINANCIAL HEALTH SCORE (Savings vs current $4,810/mo, Body Corp)
    # ----------------------------------------------------
    # Savings range: ~$933 up to $2,072/mo
    saving_normalized = min(100, max(40, round((monthly_saving / 2100) * 100)))
    bc_score = 95 if monthly_bc < 350 else (80 if monthly_bc < 450 else 55)
    
    financial_score = round((saving_normalized * 0.70) + (bc_score * 0.30))

    # ----------------------------------------------------
    # OVERALL WEIGHTED COMPATIBILITY
    # ----------------------------------------------------
    overall_fit = round(
        (emma_score * 0.32) +
        (jordan_score * 0.32) +
        (fur_babies_score * 0.20) +
        (financial_score * 0.16)
    )

    # ----------------------------------------------------
    # CURATED PROS & CONS / COMPROMISE ANALYSIS
    # ----------------------------------------------------
    pros = []
    cons = []

    # Location pros/cons
    if "morningside" in suburb:
        pros.append("Emma's preferred suburb with vibrant café culture & walking to shops")
        pros.append("Fast 20-22 min commute to Eight Mile Plains & 25 min train to Brisbane CBD")
        cons.append("35+ mins from Callum & Kaitlin, and further from Jordan's parents")
    elif "everton" in suburb:
        pros.append("5-7 mins from Callum & Kaitlin, and close to Jordan's parents")
        pros.append("Abundant green parks, Bunya creek trails & top-rated schools for future children")
        cons.append("Longer 38-42 min cross-town commute to Eight Mile Plains for Emma")
        cons.append("Requires driving for daily groceries and retail (not walkable)")

    # Space & layout pros/cons
    if beds >= 4:
        pros.append("Delivers Jordan's dream 4th bedroom for home office or future child")
    if "courtyard" in outdoor:
        pros.append("Private ground-level courtyard — fantastic for senior 14yo dog and cats")
    elif "balconies" in outdoor:
        cons.append("Balconies only: 14yo dog must be carried down stairs for every outdoor trip")

    if levels >= 3:
        cons.append("3 levels of stairs: High physical strain on 14yo senior dog and 16yo cat")
    else:
        pros.append("2 manageable levels: Gentle layout for senior fur babies")

    if "tandem" in parking:
        cons.append("Tandem car spaces require daily vehicle swapping")
    elif "side-by-side" in parking:
        pros.append("Convenient side-by-side double lockup garage")
    elif "1 garage" in parking and "additional" not in parking:
        cons.append("Only 1 car garage: One vehicle must park on driveway or street")

    # Financial pros/cons
    if monthly_saving >= 1900:
        pros.append(f"Huge monthly mortgage savings of ~${monthly_saving:,.0f}/month vs current")
    if monthly_bc > 550:
        cons.append(f"Higher body corporate levies (${monthly_bc:,.0f}/month)")
    elif monthly_bc < 350:
        pros.append(f"Very low body corporate fee (${monthly_bc:,.0f}/month)")

    # Planning risks
    if "flood" in risk:
        cons.append("Flagged flood overlay requires specialized insurer check")
    if "overland" in risk:
        cons.append("Overland flow path overlay flagged on Brisbane City Council map")
    if "bushfire" in risk:
        cons.append("Bushfire buffer overlay flagged due to nearby leafy reserve")

    return {
        "overallFit": overall_fit,
        "emmaScore": emma_score,
        "jordanScore": jordan_score,
        "furBabiesScore": fur_babies_score,
        "financialScore": financial_score,
        "pros": pros,
        "cons": cons,
        "seniorDogRisk": "High" if levels >= 3 and "balconies" in outdoor else ("Moderate" if levels >= 3 else "Low")
    }


def compare_properties_ai(property_ids, all_properties, finances):
    """
    Generates a head-to-head AI verdict comparing 2 to 4 properties.
    """
    selected = [p for p in all_properties if p.get("id") in property_ids]
    if not selected:
        return {"error": "No properties found for comparison."}

    # Evaluate each
    evaluated = []
    for p in selected:
        scores = calculate_property_scores(p, finances)
        evaluated.append({
            "id": p.get("id"),
            "address": p.get("address"),
            "suburb": p.get("suburb"),
            "price": p.get("modelledPrice"),
            "saving": p.get("monthlySaving"),
            "beds": p.get("bedrooms"),
            "levels": p.get("levels"),
            "parking": p.get("parking"),
            "outdoor": p.get("outdoorSpace"),
            "scores": scores
        })

    # Find category winners
    best_cashflow = max(evaluated, key=lambda x: x["saving"])
    best_emma = max(evaluated, key=lambda x: x["scores"]["emmaScore"])
    best_jordan = max(evaluated, key=lambda x: x["scores"]["jordanScore"])
    best_pets = max(evaluated, key=lambda x: x["scores"]["furBabiesScore"])
    best_overall = max(evaluated, key=lambda x: x["scores"]["overallFit"])

    summary_paragraphs = []
    summary_paragraphs.append(
        f"**Head-to-Head Consensus:** The property with the highest balanced compatibility across your household is **{best_overall['address']} ({best_overall['suburb']})** with an overall score of **{best_overall['scores']['overallFit']}%**."
    )

    if best_emma['id'] != best_jordan['id']:
        summary_paragraphs.append(
            f"• **The Emma vs Jordan Dynamic:** Emma's clear favorite is **{best_emma['address']} ({best_emma['scores']['emmaScore']}%)** due to café walkability and a quick 20-min commute to Eight Mile Plains. Jordan's top pick is **{best_jordan['address']} ({best_jordan['scores']['jordanScore']}%)**, which delivers superior space, proximity to Callum & Kaitlin, and quiet nature walks."
        )
    
    summary_paragraphs.append(
        f"• **Fur Baby Alert (14yo Senior Dog):** **{best_pets['address']}** is the safest home for your senior dog and cats ({best_pets['scores']['furBabiesScore']}%). Avoid 3-level properties with balconies only, as they force you to carry a 14yo dog up and down flights of stairs multiple times a day."
    )

    summary_paragraphs.append(
        f"• **Financial Champion:** **{best_cashflow['address']}** frees up the most disposable income, returning **${best_cashflow['saving']:,.0f}/month** (or ${(best_cashflow['saving']*12):,.0f}/year) back into your savings account compared to your current mortgage."
    )

    return {
        "properties": evaluated,
        "winners": {
            "overall": best_overall,
            "cashflow": best_cashflow,
            "emma": best_emma,
            "jordan": best_jordan,
            "pets": best_pets
        },
        "aiSummary": "\n\n".join(summary_paragraphs)
    }


def ai_chat_response(message, all_properties, finances):
    """
    Intelligent conversational advisor answering specific user queries
    about their Brisbane property hunt, finances, and family needs.
    """
    msg = message.lower().strip()
    
    # 1. Pets query
    if any(k in msg for k in ["pet", "dog", "cat", "senior", "animal", "stairs"]):
        return (
            "### 🐾 Fur Babies & Senior Pet Assessment\n\n"
            "With a **14-year-old senior dog** and a **16-year-old cat**, your #1 structural priority must be **level living and direct outdoor access**:\n\n"
            "1. **Top Recommendation:** **45/120 Bunya Road (Everton Hills)** and **17/101 Richmond Road (Morningside)**.\n"
            "   - Both are 2-level townhouses featuring private ground-floor courtyards. Your senior dog can easily step out for bathroom breaks without climbing steep flights.\n"
            "   - Bunya Road also offers tranquil Bunya Creek walking trails for your active 8yo dog.\n\n"
            "2. **Warning on 3-Level Properties:** **8/19 Baringa Street** and **3/58 Dickson Street** are 3-level designs. Having only balconies means your 14yo dog would have to be carried down three flights of stairs multiple times every day, which will become increasingly painful for senior joints."
        )

    # 2. Financial / Savings query
    if any(k in msg for k in ["saving", "money", "mortgage", "equity", "cash", "budget", "cost", "afford"]):
        return (
            "### 💰 Financial & Cashflow Breakdown\n\n"
            "Selling your current home at **$1,400,000** releases **$553,008** in net equity after clearing your $806,992 mortgage and $40,000 selling costs. Here is how your monthly cashflow changes:\n\n"
            "- **Current Housing Cost:** **$4,810 / month**\n"
            "- **Best Cashflow Winner:** **17/101 Richmond Road ($900k)** → New mortgage $381,797, monthly total $2,738 → **Saves $2,072 / month** ($24,864/year extra into your savings!).\n"
            "- **Close Second:** **45/120 Bunya Road ($925k)** → Lowest body corp ($322/mo), monthly total $2,814 → **Saves $1,996 / month** ($23,952/year extra).\n"
            "- **Baringa St Warning:** At $1.04M + $667/mo body corp, monthly total is $3,877, saving 'only' $933/mo.\n\n"
            "By choosing Richmond Rd or Bunya Rd, your monthly disposable income almost doubles, allowing you to invest or boost your $75,000 cash savings rapidly."
        )

    # 3. Suburb compromise / Emma vs Jordan
    if any(k in msg for k in ["morningside", "everton", "compromise", "location", "commute", "suburb"]):
        return (
            "### ⚖️ The Morningside vs Everton Park / Hills Compromise\n\n"
            "This is the heart of your decision matrix:\n\n"
            "**The Case for Morningside (Emma's Preference):**\n"
            "- **Daily Lifestyle:** Walking distance to cafes, bakeries, and Coles/shops.\n"
            "- **Commute:** Quick 20-22 min direct run south to Eight Mile Plains for work, and 25 mins by train into the CBD.\n"
            "- **Downside:** Properties tend to be 3 bed, 1 car, smaller footprint, and 35+ mins from Callum & Kaitlin.\n\n"
            "**The Case for Everton Hills / Park (Jordan's Preference):**\n"
            "- **Family Proximity:** 5 mins from Callum & Kaitlin, 20 mins to Emma's parents, 30 mins to Jordan's parents.\n"
            "- **Space & Feel:** Feels much more like a standalone home (4 beds or dual living, side-by-side double garages, private courtyards).\n"
            "- **Downside:** Commute to Eight Mile Plains increases to ~38-42 mins across town, and daily errands require driving.\n\n"
            "**AI Suggested Compromise:** If Emma is willing to do the podcast commute a couple of days a week (or work hybrid), **Bunya Road** or **Rogers Parade** gives your future family and pets significantly higher long-term living quality."
        )

    # 4. Overlays & Planning risks
    if any(k in msg for k in ["overlay", "flood", "bushfire", "risk", "insurance"]):
        return (
            "### ⚠️ Planning Overlay & Insurance Analysis\n\n"
            "Several properties have Brisbane City Council overlays you should be aware of:\n\n"
            "1. **8/19 Baringa Street (Flood Overlay):**\n"
            "   - Flagged under Brisbane City Council flood planning. Townhouses in Morningside near creek gullies can attract higher building insurance premiums and require checking if the ground garage has historic inundation records.\n\n"
            "2. **3/58 Dickson Street (Overland Flow):**\n"
            "   - Overland flow indicates stormwater run-off path during heavy subtropical storms. Ensure the complex drainage systems are well-maintained by the body corporate.\n\n"
            "3. **17/44 Rogers Parade West (Bushfire Buffer):**\n"
            "   - Common in leafy northside pockets. Usually has minor insurance impact, but check ember attack ratings (BAL).\n\n"
            "4. **Zero Overlays:** **17/101 Richmond Road** and **45/120 Bunya Road** both have clean planning profiles without flood or flow overlays."
        )

    # 5. Default general assistant response
    return (
        f"### 🏡 Property Hunter AI Advisor\n\n"
        f"I've analyzed all 5 candidate properties against your family profile (Emma, Jordan, your Eight Mile Plains work hub, and your 4 beloved pets):\n\n"
        f"- **Best Overall Balance:** **45/120 Bunya Road** scores highest across space, senior pet safety (2 levels + courtyard), double garage, and nearly $2,000/mo in mortgage savings.\n"
        f"- **Best Inner-City Option:** **17/101 Richmond Road** keeps you in Morningside with a courtyard, 2 levels, and the single highest monthly savings ($2,072/mo).\n\n"
        f"Feel free to ask me about specific properties, what happens if your home sells for a different price, or commute comparisons!"
    )
