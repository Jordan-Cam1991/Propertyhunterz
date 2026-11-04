(function(){
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

    // 5. Property.com.au & PropTrack automated valuation
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

      if (s.includes('logo') || s.includes('agency') || s.includes('agent') || s.includes('branding') || s.includes('banner') || s.includes('avatar') || s.includes('place.p') || s.includes('icon') || s.includes('.svg') || s.includes('place_') || alt.includes('logo') || alt.includes('agency') || cls.includes('logo') || cls.includes('agency') || cls.includes('branding')) continue;
      try {
        if (el.closest('header, nav, aside, [data-testid*="agency"], [data-testid*="agent"], [class*="agency"], [class*="branding"]')) continue;
      } catch(e) {}

      var hiRes = src.replace(/\d+x\d+/, '1140x640');
      if (!floorplan && (alt.includes('floorplan') || alt.includes('floor plan') || s.includes('floorplan') || s.includes('floor_plan') || s.includes('.png') || alt.includes('plan 1') || s.includes('plan-1'))) floorplan = hiRes;
      if (!photoList.includes(hiRes) && (s.includes('reastatic') || s.includes('epc.ms') || s.includes('domain.com.au') || s.includes('property.com.au') || s.includes('format=webp') || s.includes('photo') || s.includes('.jpg') || s.includes('.png'))) photoList.push(hiRes);
      if (!facade && (s.includes('1140x') || s.includes('800x') || s.includes('format=webp') || s.includes('photo')) && !s.includes('.png') && !alt.includes('floorplan')) facade = hiRes;
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
    var targetOrigin = 'https://propertyhunterz.netlify.app';
    var u = targetOrigin + '/?import=' + encodeURIComponent(JSON.stringify(p));
    var w = null;
    try { w = window.open(u, '_blank'); } catch(e) {}
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.location.href = u;
    }
  } catch(err) {
    alert('Extraction notice: ' + err.message);
  }
})();
