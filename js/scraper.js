/**
 * Enhanced Client-Side Scraper & Smart Text Parser
 * Intelligently handles Realestate.com.au & Domain listing structures,
 * extracts deep metadata from URLs, and parses raw text snippets with regex NLP.
 */

const PropertyScraper = {
  async scrapeUrl(url) {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) {
      return { success: false, error: "Please enter a valid URL." };
    }

    // First try extracting directly from the URL pattern itself (instant & immune to bot blocks)
    const urlPatternData = this.parseUrlString(cleanUrl);

    // Try backend scraper if accessible
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.address) {
          return result;
        } else if (result.error && result.error.includes("403")) {
          // Realestate.com.au anti-bot block (HTTP 403)
          return {
            success: true,
            data: urlPatternData.data,
            source: "url_heuristics",
            isBotProtected: true,
            message: "Realestate.com.au anti-bot protection prevented reading internal page data. We extracted the address from the URL for you!"
          };
        }
      }
    } catch (e) {
      // Backend unavailable or running from static file/different port
      console.warn("Backend scraper offline or blocked, using client-side URL extractor");
    }

    // Return the intelligent URL pattern extraction
    return urlPatternData;
  },

  async parseText(text) {
    try {
      const response = await fetch('/api/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const res = await response.json();
        if (res.data) return res.data;
      }
    } catch (e) {
      console.warn("Backend text parser unavailable, using browser NLP parser");
    }

    return this.localTextExtract(text);
  },

  /**
   * Intelligently parses Realestate.com.au and Domain URL structures
   * Examples:
   * - realestate.com.au/property/unit-8-19-baringa-st-morningside-qld-4170
   * - realestate.com.au/property-townhouse-qld-morningside-146312456
   * - domain.com.au/8-19-baringa-street-morningside-qld-4170-2018899823
   */
  parseUrlString(url) {
    let clean = url.trim().split('?')[0].replace(/\/+$/, '');
    let address = "";
    let suburb = "Morningside";
    let propertyType = "Townhouse";

    // Standard suburb dictionary for Brisbane
    const suburbs = [
      "Ashgrove", "Everton Hills", "Everton Park", "Morningside", "Stafford", "Mitchelton",
      "Kedron", "Camp Hill", "Coorparoo", "Norman Park", "Bulimba", "Hawthorne",
      "Cannon Hill", "Carina", "Chermside", "Enoggera", "McDowall", "Arana Hills",
      "Paddington", "Bardon", "Red Hill", "Kelvin Grove", "Newmarket", "Alderley",
      "Grange", "Wilston", "Windsor", "Lutwyche", "Tingalpa", "Murarrie", "Toowong",
      "Taringa", "Indooroopilly", "Auchenflower", "Milton", "New Farm", "Hamilton", "Ascot", "Clayfield"
    ];

    // Detect suburb in URL
    const lowerUrl = clean.toLowerCase();
    for (const sub of suburbs) {
      const slug = sub.toLowerCase().replace(/\s+/g, '-');
      const slugPlus = sub.toLowerCase().replace(/\s+/g, '+');
      if (lowerUrl.includes(slug) || lowerUrl.includes(slugPlus)) {
        suburb = sub;
        break;
      }
    }

    // Detect property type
    if (lowerUrl.includes("townhouse")) propertyType = "Townhouse";
    else if (lowerUrl.includes("apartment") || lowerUrl.includes("unit")) propertyType = "Unit / Townhouse";
    else if (lowerUrl.includes("house")) propertyType = "House";

    // 1. REA Property format: /property/unit-8-19-baringa-st-morningside-qld-4170
    const reaPropMatch = clean.match(/\/property\/(?:unit-|apartment-)?([\w\-]+)-([a-z]{2,3})-(\d{4})/i);
    if (reaPropMatch) {
      let rawAddr = reaPropMatch[1].replace(/-/g, ' ');
      // Fix unit slash pattern: "8 19 Baringa" -> "8/19 Baringa"
      rawAddr = rawAddr.replace(/^(\d+)\s+(\d+)\s+/, '$1/$2 ');
      // Capitalize
      address = this.titleCase(rawAddr);
    }

    // 2. Domain format: domain.com.au/8-19-baringa-street-morningside-qld-4170-12345
    const domainMatch = clean.match(/domain\.com\.au\/([\w\-]+)-([a-z]{3})-(\d{4})-\d+/i);
    if (domainMatch) {
      let rawAddr = domainMatch[1].replace(/-/g, ' ');
      rawAddr = rawAddr.replace(/^(\d+)\s+(\d+)\s+/, '$1/$2 ');
      address = this.titleCase(rawAddr);
    }

    // 3. Fallback generic slug match
    if (!address) {
      const parts = clean.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length > 5) {
        let cleanSlug = lastPart.replace(/qld-\d+/i, '').replace(/-\d{6,}/, '').replace(/-/g, ' ').trim();
        cleanSlug = cleanSlug.replace(/^property\s+/i, '');
        address = this.titleCase(cleanSlug);
      }
    }

    if (!address) {
      address = `Property in ${suburb}`;
    }

    return {
      success: true,
      source: "url_parse",
      data: {
        link: clean,
        address: address,
        suburb: suburb,
        advertisedGuide: "Offers Invited",
        modelledPrice: 950000,
        bedrooms: 3,
        bathrooms: 2,
        parkingSpaces: 2,
        parking: "Side-by-side double garage",
        levels: 2,
        outdoorSpace: "Private courtyard",
        planningRisk: "None flagged",
        standoutFeature: `${propertyType} in ${suburb}`,
        notes: `Imported via listing URL: ${clean}`
      }
    };
  },

  localTextExtract(text) {
    const raw = text.trim();
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const result = {
      address: "",
      suburb: "Morningside",
      advertisedGuide: "",
      modelledPrice: 950000,
      bedrooms: 3,
      bathrooms: 2,
      parking: "2 car garage",
      parkingSpaces: 2,
      levels: 2,
      outdoorSpace: "Private courtyard",
      standoutFeature: "",
      planningRisk: "None flagged",
      keyCompromise: "",
      quarterlyBodyCorp: 1200,
      inspectionTimes: "",
      notes: raw.slice(0, 350)
    };

    // Suburb
    const subMatch = raw.match(/\b(Ashgrove|Everton Hills|Everton Park|Morningside|Stafford|Mitchelton|Kedron|Camp Hill|Coorparoo|Norman Park|Bulimba|Hawthorne|Cannon Hill|Carina|Chermside|Enoggera|McDowall|Arana Hills|Paddington|Bardon|Red Hill|Kelvin Grove|Newmarket|Alderley|Grange|Wilston|Windsor|Lutwyche|Tingalpa|Murarrie|Toowong|Taringa|Indooroopilly|New Farm|Hamilton|Ascot|Clayfield)\b/i);
    if (subMatch) result.suburb = this.titleCase(subMatch[1]);

    // Address extraction
    const addrMatch = raw.match(/(?:unit\s+)?(\d+[\w\/\-]*\s+[A-Z][a-zA-Z0-9\s]+(?:Street|St|Road|Rd|Avenue|Ave|Parade|Pde|West|Way|Circuit|Cct|Crescent|Cres|Lane|Ln|Drive|Dr|Place|Pl|Court|Ct)[^\n,]*)/i);
    if (addrMatch) {
      result.address = addrMatch[1].trim();
    } else if (lines.length > 0 && lines[0].length < 75 && !lines[0].toLowerCase().includes("offers") && !lines[0].toLowerCase().includes("for sale")) {
      result.address = lines[0];
    }

    // Property.com.au & PropTrack valuation detection (User Request)
    const pvConfMatch = raw.match(/(high|medium|low)\s+confidence[\s\S]{0,140}?\$([0-9]{1,3}(?:,[0-9]{3})+)/i);
    const pvMatch = raw.match(/(?:property\s+value|estimated\s+value)[\s\S]{0,220}?\$([0-9]{1,3}(?:,[0-9]{3})+)/i);
    if (pvConfMatch) {
      const val = parseInt(pvConfMatch[2].replace(/,/g, ''), 10);
      const conf = pvConfMatch[1].toUpperCase() + ' CONFIDENCE';
      result.propertyValue = val;
      result.propertyValueConfidence = conf;
      result.propertyValueSource = 'property.com.au';
      result.modelledPrice = val;
      result.advertisedGuide = `Property.com.au: $${val.toLocaleString()} (${conf})`;
    } else if (pvMatch) {
      const val2 = parseInt(pvMatch[1].replace(/,/g, ''), 10);
      result.propertyValue = val2;
      result.propertyValueConfidence = 'HIGH CONFIDENCE';
      result.propertyValueSource = 'property.com.au';
      result.modelledPrice = val2;
      result.advertisedGuide = `Property.com.au: $${val2.toLocaleString()}`;
    }

    // Price extraction
    const pricePatterns = [
      /(?:offers\s+(?:over|from|above)|guide|price|inviting\s+buyers|buyers\s+from)[:\s]*([\$]?\s*\d[^\n\r,]*[\d,\.kKmM\s\+to\-]+)/i,
      /(\$\s*\d{1,3}(?:,\d{3})+)/i,
      /(\$\s*\d+\.?\d*\s*(?:m|mil|million|k))/i
    ];
    for (const pat of pricePatterns) {
      const pm = raw.match(pat);
      if (pm) {
        result.advertisedGuide = pm[0].trim();
        const cleanPrice = pm[0].toLowerCase().replace(/[,\$\s]/g, '');
        if (cleanPrice.includes('m')) {
          const num = parseFloat(cleanPrice.replace('m', ''));
          if (num > 0) result.modelledPrice = Math.round(num * 1000000);
        } else if (cleanPrice.includes('k')) {
          const num = parseFloat(cleanPrice.replace('k', ''));
          if (num > 0) result.modelledPrice = Math.round(num * 1000);
        } else {
          const num = parseInt(cleanPrice.replace(/[^\d]/g, ''), 10);
          if (num >= 100000) result.modelledPrice = num;
        }
        break;
      }
    }

    // Bedrooms
    const bedMatch = raw.match(/(\d+)\s*(?:bed|bedroom|br\b)/i);
    if (bedMatch) result.bedrooms = parseInt(bedMatch[1], 10);

    // Bathrooms
    const bathMatch = raw.match(/(\d+(?:\.5)?)\s*(?:bath|bathroom)/i);
    if (bathMatch) result.bathrooms = parseFloat(bathMatch[1]);

    // Car spaces & Garage style
    const carMatch = raw.match(/(\d+)\s*(?:car|garage|space|parking|lock\s*up)/i);
    if (carMatch) {
      result.parkingSpaces = parseInt(carMatch[1], 10);
      if (raw.toLowerCase().includes("tandem")) {
        result.parking = `${result.parkingSpaces} tandem spaces`;
      } else if (raw.toLowerCase().includes("side-by-side") || raw.toLowerCase().includes("double")) {
        result.parking = `Side-by-side double garage (${result.parkingSpaces} cars)`;
      } else {
        result.parking = `${result.parkingSpaces} car garage`;
      }
    }

    // Levels / Storeys
    if (raw.match(/3\s*(?:level|storey|story)|three\s*(?:level|storey|story)|tri-level/i)) result.levels = 3;
    else if (raw.match(/1\s*(?:level|storey|story)|single\s*(?:level|storey)|ground\s*floor/i)) result.levels = 1;
    else result.levels = 2;

    // Body Corporate
    if (raw.match(/very\s+low\s+body\s+corp/i)) {
      result.quarterlyBodyCorp = 950;
    }

    // Outdoor space
    if (raw.match(/enclosed\s*(?:rear\s*)?courtyard|private\s*courtyard|grassed\s*courtyard|courtyard/i)) result.outdoorSpace = "Enclosed rear courtyard";
    else if (raw.match(/fenced\s*yard|backyard|garden/i)) result.outdoorSpace = "Fenced yard / garden";
    else if (raw.match(/balcon|deck/i)) result.outdoorSpace = "Balconies only";

    // Body Corporate
    const bcMatch = raw.match(/(?:body\s*corp|strata|admin\s*fund|levies)[^\d]*\$?(\d[\d,]+)/i);
    if (bcMatch) {
      const val = parseInt(bcMatch[1].replace(/,/g, ''), 10);
      result.quarterlyBodyCorp = val > 3000 ? Math.round(val / 4) : (val < 300 ? val * 3 : val);
    }

    // Inspection times
    const inspMatch = raw.match(/(?:inspection|open\s*home|open\s*for\s*inspection)[:\s]*([^\n]+(?:am|pm)[^\n]*)/i);
    if (inspMatch) {
      result.inspectionTimes = inspMatch[1].trim();
    }

    // Overlays
    const risks = [];
    if (raw.toLowerCase().includes("flood")) risks.push("Flood overlay flagged");
    if (raw.toLowerCase().includes("overland")) risks.push("Overland flow flagged");
    if (raw.toLowerCase().includes("bushfire")) risks.push("Bushfire overlay flagged");
    if (risks.length > 0) result.planningRisk = risks.join(", ");

    return result;
  },

  titleCase(str) {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PropertyScraper;
}
