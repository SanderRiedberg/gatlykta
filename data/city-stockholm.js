// Gatlykta — Stockholm city configuration.
// Keep true geography in OSM/fallback data. These bounds are only the current
// prototype's rough area and district classifiers.

var STOCKHOLM_CITY = {
  id: 'stockholm-innerstad',
  name: 'Stockholm innanför tullarna',
  bbox: [59.299, 17.990, 59.356, 18.120], // [south, west, north, east]
  view: { center: [59.328, 18.054], zoom: 13 },
  districts: [
    {
      id: 'gamla-stan',
      name: 'Gamla Stan',
      nameEn: 'Old Town',
      bounds: [[59.3215, 18.0610], [59.3290, 18.0810]],
      center: [59.3253, 18.0710],
      zoom: 16,
    },
    {
      id: 'norrmalm',
      name: 'Norrmalm',
      nameEn: 'Norrmalm',
      bounds: [[59.3285, 18.0530], [59.3450, 18.0830]],
      center: [59.3360, 18.0680],
      zoom: 15,
    },
    {
      id: 'ostermalm',
      name: 'Östermalm',
      nameEn: 'Östermalm',
      bounds: [[59.3300, 18.0740], [59.3530, 18.1170]],
      center: [59.3400, 18.0940],
      zoom: 14,
    },
    {
      id: 'vasastan',
      name: 'Vasastan',
      nameEn: 'Vasastan',
      bounds: [[59.3380, 18.0220], [59.3550, 18.0760]],
      center: [59.3450, 18.0470],
      zoom: 14,
    },
    {
      id: 'kungsholmen',
      name: 'Kungsholmen',
      nameEn: 'Kungsholmen',
      bounds: [[59.3210, 17.9920], [59.3400, 18.0560]],
      center: [59.3310, 18.0230],
      zoom: 14,
    },
    {
      id: 'sodermalm',
      name: 'Södermalm',
      nameEn: 'Södermalm',
      bounds: [[59.3000, 18.0380], [59.3220, 18.1100]],
      center: [59.3140, 18.0760],
      zoom: 14,
    },
  ],
};

var DISTRICTS = STOCKHOLM_CITY.districts;
var INNER_BBOX = STOCKHOLM_CITY.bbox;
var CITY_VIEW = STOCKHOLM_CITY.view;

Object.assign(window, {
  STOCKHOLM_CITY,
  DISTRICTS,
  INNER_BBOX,
  CITY_VIEW,
});
