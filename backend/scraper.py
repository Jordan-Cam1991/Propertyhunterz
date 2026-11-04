import re
import json
import urllib.request
import urllib.parse
from html.parser import HTMLParser

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Upgrade-Insecure-Requests': '1'
}

class MetaExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta_tags = {}
        self.json_ld_scripts = []
        self._in_script = False
        self._script_type = ""
        self._script_buffer = []
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == 'meta':
            prop = attr_dict.get('property') or attr_dict.get('name')
            content = attr_dict.get('content')
            if prop and content:
                self.meta_tags[prop.lower()] = content
        elif tag == 'title':
            self._in_title = True
        elif tag == 'script':
            script_type = attr_dict.get('type', '').lower()
            if 'application/ld+json' in script_type:
                self._in_script = True
                self._script_type = script_type
                self._script_buffer = []

    def handle_endtag(self, tag):
        if tag == 'title':
            self._in_title = False
        elif tag == 'script' and self._in_script:
            self._in_script = False
            raw = "".join(self._script_buffer).strip()
            if raw:
                try:
                    parsed = json.loads(raw)
                    self.json_ld_scripts.append(parsed)
                except Exception:
                    pass
            self._script_buffer = []

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._in_script:
            self._script_buffer.append(data)


def parse_price_to_number(text):
    if not text:
        return 0
    clean = text.lower().replace(',', '').replace('$', '')
    # Match patterns like 1.04m or 1.04 million
    m_match = re.search(r'(\d+\.?\d*)\s*(?:m|mil|million)', clean)
    if m_match:
        try:
            return int(float(m_match.group(1)) * 1_000_000)
        except ValueError:
            pass
    # Match patterns like 900k or 999k
    k_match = re.search(r'(\d+\.?\d*)\s*k', clean)
    if k_match:
        try:
            return int(float(k_match.group(1)) * 1_000)
        except ValueError:
            pass
    # Match raw 6 or 7 digit numbers
    num_match = re.search(r'(\d{6,7})', clean)
    if num_match:
        try:
            return int(num_match.group(1))
        except ValueError:
            pass
    return 0


def extract_property_from_text(raw_text):
    """
    Intelligently parses unstructured listing text or copied real estate snippets
    into clean, normalized property fields.
    """
    result = {
        "address": "",
        "suburb": "",
        "advertisedGuide": "",
        "modelledPrice": 0,
        "bedrooms": 3,
        "bathrooms": 2,
        "parking": "",
        "parkingSpaces": 2,
        "levels": 2,
        "outdoorSpace": "Courtyard / Balcony",
        "standoutFeature": "",
        "planningRisk": "None flagged",
        "keyCompromise": "",
        "bodyCorporateQuarterly": 1200,
        "inspectionTimes": "",
        "notes": ""
    }

    text = raw_text.strip()
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    # 1. Address detection
    # Common formats: "8/19 Baringa Street, Morningside QLD 4170" or "17/44 Rogers Parade West"
    address_match = re.search(r'(?:unit\s+)?(\d+[\w\/\-]*\s+[A-Z][a-zA-Z0-9\s]+(?:Street|St|Road|Rd|Avenue|Ave|Parade|Pde|West|Way|Circuit|Cct|Crescent|Cres|Lane|Ln|Drive|Dr|Place|Pl|Court|Ct|Bvd|Boulevard)[^\n,]*)', text, re.IGNORECASE)
    if address_match:
        result["address"] = address_match.group(1).strip()
    elif len(lines) > 0 and len(lines[0]) < 80:
        result["address"] = lines[0]

    # Suburb detection
    suburb_match = re.search(r'\b(Ashgrove|Everton Hills|Everton Park|Morningside|Stafford|Mitchelton|Kedron|Camp Hill|Coorparoo|Norman Park|Bulimba|Hawthorne|Cannon Hill|Carina|Chermside|Enoggera|McDowall|Arana Hills|Paddington|Bardon|Red Hill|Kelvin Grove|Newmarket|Alderley|Grange|Wilston|Windsor|Lutwyche|Tingalpa|Murarrie|Toowong|Taringa|Indooroopilly|New Farm|Hamilton|Ascot|Clayfield)\b', text, re.IGNORECASE)
    if suburb_match:
        result["suburb"] = suburb_match.group(1).title()
    elif "ashgrove" in text.lower():
        result["suburb"] = "Ashgrove"
    elif "morningside" in text.lower():
        result["suburb"] = "Morningside"
    elif "everton park" in text.lower():
        result["suburb"] = "Everton Park"
    elif "everton hills" in text.lower():
        result["suburb"] = "Everton Hills"

    # 2. Price guide
    # 2a. Check for Property.com.au / PropTrack Automated Valuation
    # e.g.:
    # Estimated value
    # Property value
    # HIGH CONFIDENCE
    # $1,121,000
    pv_conf_match = re.search(r'(high|medium|low)\s+confidence[\s\S]{0,120}?\$([0-9]{1,3}(?:,[0-9]{3})+)', text, re.IGNORECASE)
    pv_match = re.search(r'(?:property\s+value|estimated\s+value)[\s\S]{0,200}?\$([0-9]{1,3}(?:,[0-9]{3})+)', text, re.IGNORECASE)

    if pv_conf_match:
        conf = pv_conf_match.group(1).title() + " Confidence"
        val_num = int(pv_conf_match.group(2).replace(',', ''))
        result["propertyValue"] = val_num
        result["propertyValueConfidence"] = conf
        result["propertyValueSource"] = "property.com.au"
        if not result["modelledPrice"] or result["modelledPrice"] == 0:
            result["modelledPrice"] = val_num
            result["advertisedGuide"] = f"Property.com.au: ${val_num:,} ({conf})"
    elif pv_match:
        val_num = int(pv_match.group(1).replace(',', ''))
        result["propertyValue"] = val_num
        result["propertyValueConfidence"] = "High Confidence"
        result["propertyValueSource"] = "property.com.au"
        if not result["modelledPrice"] or result["modelledPrice"] == 0:
            result["modelledPrice"] = val_num
            result["advertisedGuide"] = f"Property.com.au: ${val_num:,} (High Confidence)"

    # Look first for explicit price patterns like Offers over $950,000, Guide $1m, etc.
    price_patterns = [
        r'(?:offers\s+(?:over|from|above)|guide|price|inviting\s+buyers|buyers\s+from|contact\s+agent)[:\s]*([\$]?\s*\d[^\n\r,]*[\d,\.kKmM\s\+to\-]+)',
        r'(\$\s*\d{1,3}(?:,\d{3})+(?:\s*(?:m|k|mil|million|thousand))?)',
        r'(\$\s*\d+\.?\d*\s*(?:m|mil|million|k))',
        r'(\b\d{3,4}\s*k\b)'
    ]
    for pattern in price_patterns:
        pm = re.search(pattern, text, re.IGNORECASE)
        if pm:
            candidate_guide = pm.group(0).strip()
            candidate_price = parse_price_to_number(candidate_guide)
            # Only accept prices >= 100,000 so body corp / rent isn't mistaken for property price
            if candidate_price >= 100000:
                result["advertisedGuide"] = candidate_guide
                result["modelledPrice"] = candidate_price
                break
            elif not result["advertisedGuide"] and candidate_price > 0:
                result["advertisedGuide"] = candidate_guide
                result["modelledPrice"] = candidate_price

    # 3. Bedrooms, Bathrooms, Car
    bed_match = re.search(r'(\d+)\s*(?:bed|bedroom|br\b)', text, re.IGNORECASE)
    if bed_match:
        result["bedrooms"] = int(bed_match.group(1))

    bath_match = re.search(r'(\d+(?:\.5)?)\s*(?:bath|bathroom)', text, re.IGNORECASE)
    if bath_match:
        val = bath_match.group(1)
        result["bathrooms"] = float(val) if '.' in val else int(val)

    car_match = re.search(r'(\d+)\s*(?:car|garage|space|parking|lock\s*up)', text, re.IGNORECASE)
    if car_match:
        result["parkingSpaces"] = int(car_match.group(1))
        if "tandem" in text.lower():
            result["parking"] = f"{result['parkingSpaces']} tandem spaces"
        elif "side-by-side" in text.lower() or "double" in text.lower():
            result["parking"] = f"Side-by-side garage ({result['parkingSpaces']} cars)"
        else:
            result["parking"] = f"{result['parkingSpaces']} car garage"

    # 4. Levels / Storeys
    level_match = re.search(r'(\d+)\s*(?:level|storey|story|stories)', text, re.IGNORECASE)
    if level_match:
        result["levels"] = int(level_match.group(1))
    elif "three level" in text.lower() or "tri-level" in text.lower() or "3-level" in text.lower():
        result["levels"] = 3
    elif "two level" in text.lower() or "dual level" in text.lower() or "2-level" in text.lower() or "townhouse" in text.lower():
        result["levels"] = 2
    elif "single level" in text.lower() or "ground floor" in text.lower():
        result["levels"] = 1

    # 5. Outdoor space
    if "private courtyard" in text.lower() or "grassed courtyard" in text.lower() or "courtyard" in text.lower():
        result["outdoorSpace"] = "Private courtyard"
    elif "fenced yard" in text.lower() or "backyard" in text.lower() or "garden" in text.lower():
        result["outdoorSpace"] = "Private yard / garden"
    elif "balcony" in text.lower() or "deck" in text.lower():
        result["outdoorSpace"] = "Balconies only (no private yard)"

    # 6. Body corporate / strata
    bc_match = re.search(r'(?:body\s*corp|strata|admin\s*fund|levies)[^\d]*\$?(\d[\d,]+)', text, re.IGNORECASE)
    if bc_match:
        raw_bc = int(bc_match.group(1).replace(',', ''))
        # If > 500, likely quarterly; if > 3000, likely annual
        if raw_bc > 3000:
            result["bodyCorporateQuarterly"] = round(raw_bc / 4)
        elif raw_bc < 300:
            result["bodyCorporateQuarterly"] = round(raw_bc * 3)
        else:
            result["bodyCorporateQuarterly"] = raw_bc

    # 7. Inspection times
    insp_match = re.search(r'(?:inspection|open\s*home|open\s*for\s*inspection)[:\s]*([^\n]+(?:am|pm)[^\n]*)', text, re.IGNORECASE)
    if insp_match:
        result["inspectionTimes"] = insp_match.group(1).strip()

    # 8. Risk overlays detection
    risks = []
    if "flood" in text.lower():
        risks.append("Flood overlay flagged")
    if "overland" in text.lower():
        risks.append("Overland flow flagged")
    if "bushfire" in text.lower():
        risks.append("Bushfire overlay flagged")
    if risks:
        result["planningRisk"] = ", ".join(risks)

    # Standout features extraction
    features = []
    if "second living" in text.lower() or "media room" in text.lower():
        features.append("Second living area")
    if "double garage" in text.lower() or "side-by-side" in text.lower():
        features.append("Side-by-side double garage")
    if "pool" in text.lower():
        features.append("Complex swimming pool")
    if "ducted air" in text.lower() or "air conditioning" in text.lower():
        features.append("Air conditioning")
    if "courtyard" in text.lower():
        features.append("Private courtyard")
    if features:
        result["standoutFeature"] = ", ".join(features[:3])

    result["notes"] = text[:300] + ("..." if len(text) > 300 else "")
    return result


def scrape_property_url(url):
    """
    Scrapes listing page data by checking JSON-LD, OpenGraph meta tags, and HTML body.
    Handles bot protection gracefully with detailed fallback clues.
    """
    clean_url = url.strip()
    if not clean_url.startswith('http://') and not clean_url.startswith('https://'):
        clean_url = 'https://' + clean_url

    req = urllib.request.Request(clean_url, headers=BROWSER_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            html = response.read().decode('utf-8', errors='ignore')
            parser = MetaExtractor()
            parser.feed(html)

            # Check JSON-LD first (Realestate & Domain frequently provide structured JSON-LD)
            extracted = {}
            for schema in parser.json_ld_scripts:
                if isinstance(schema, dict):
                    schema_type = schema.get('@type', '')
                    if any(t in str(schema_type) for t in ['SingleFamilyResidence', 'Residence', 'Apartment', 'RealEstateListing', 'Product']):
                        # Extract from schema
                        if 'name' in schema:
                            extracted['address'] = schema['name']
                        if 'numberOfBedrooms' in schema:
                            extracted['bedrooms'] = int(schema['numberOfBedrooms'])
                        if 'numberOfBathroomsTotal' in schema:
                            extracted['bathrooms'] = float(schema['numberOfBathroomsTotal'])
                        if 'image' in schema:
                            img = schema['image']
                            extracted['imageUrl'] = img[0] if isinstance(img, list) and img else img
                        if 'description' in schema:
                            extracted['notes'] = schema['description'][:300]
                        if 'offers' in schema and isinstance(schema['offers'], dict):
                            offers = schema['offers']
                            if 'price' in offers:
                                extracted['modelledPrice'] = parse_price_to_number(str(offers['price']))
                                extracted['advertisedGuide'] = f"${offers['price']:,}" if isinstance(offers['price'], (int, float)) else str(offers['price'])

            # Fallback to OpenGraph meta tags
            meta = parser.meta_tags
            og_title = meta.get('og:title', parser.title)
            og_desc = meta.get('og:description', '')
            og_image = meta.get('og:image', '')

            full_text = f"{og_title}\n{og_desc}\n{html[:65000]}"
            text_extracted = extract_property_from_text(full_text)

            # Combine best data
            merged = {**text_extracted, **extracted}
            if og_image and not merged.get('imageUrl'):
                merged['imageUrl'] = og_image
            if not merged.get('address') and og_title:
                merged['address'] = og_title.split('|')[0].split('-')[0].strip()
            merged['link'] = clean_url

            return {
                "success": True,
                "data": merged,
                "source": "live_scrape",
                "message": "Successfully parsed listing details from URL!"
            }

    except urllib.error.HTTPError as e:
        # Common when realestate.com.au blocks bot user-agents with 403 or 429
        return {
            "success": False,
            "errorCode": e.code,
            "error": f"The website returned HTTP {e.code} (Anti-bot protection active).",
            "suggestion": "No problem! Use the 'Smart Paste' tab to simply paste the listing text or description, and our AI will extract every field instantly."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "suggestion": "Could not access URL. You can paste the property description or address directly in the Smart Paste tab!"
        }
