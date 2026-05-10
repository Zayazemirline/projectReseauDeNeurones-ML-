// ===========================
//pour graspe
// J'ai fait ça pour chaque crop puis j'ai tt concaténé

// Napa Valley
var zone1 = ee.Geometry.Rectangle([-122.6, 38.2, -122.1, 38.7]);

// Sonoma
var zone2 = ee.Geometry.Rectangle([-123.0, 38.3, -122.4, 38.8]);

// Central Valley (Fresno)
var zone3 = ee.Geometry.Rectangle([-120.5, 36.4, -119.5, 37.2]);

// Bakersfield
var zone4 = ee.Geometry.Rectangle([-119.5, 35.0, -118.7, 35.7]);

// Fusion
var california = zone1
  .union(zone2)
  .union(zone3)
  .union(zone4);

// ===========================
var startDate = '2021-01-01';
var endDate   = '2021-12-31';

var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];

// ===========================
// Masque nuages
// ===========================
function maskClouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10));
    
  return image.updateMask(mask).select(bands);
}

// ===========================
// CDL + confidence ≥ 90
// ===========================
var cdlFull = ee.Image("USDA/NASS/CDL/2021");

var cdl = cdlFull.select('cropland');
var confidence = cdlFull.select('confidence');

// GRAPES = 69
var grapeMask = cdl.eq(69).and(confidence.gte(90));

// ===========================
// Sampling
// ===========================
var points = cdl.updateMask(grapeMask).clip(california).sample({
  region: california,
  scale: 30,
  numPixels: 40000, // augmenté (grapes plus dispersé que rice)
  seed: 42,
  geometries: true
});

// ===========================
// Sentinel-2
// ===========================
var collection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filterBounds(california)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90))
  .map(maskClouds);

// ===========================
// Image vide
// ===========================
var emptyImage = ee.Image.constant(ee.List.repeat(0, bands.length))
  .rename(bands)
  .toFloat();

// ===========================
// Stack temporel
// ===========================
var stackedImage = ee.Image([]);

for (var i = 0; i < 36; i++) {
  var start = ee.Date(startDate).advance(i * 10, 'day');
  var end   = ee.Date(startDate).advance((i + 1) * 10, 'day');

  var periodCollection = collection.filterDate(start, end);

  var composite = ee.Image(ee.Algorithms.If(
    periodCollection.size().gt(0),
    periodCollection.median().unmask(0).toFloat(),
    emptyImage
  )).rename(bands.map(function(b) {
    return b + '_T' + i;
  }));

  stackedImage = stackedImage.addBands(composite);
}

print('Nombre de bandes:', stackedImage.bandNames().size());

// ===========================
// Ajouter label
// ===========================
var imageWithLabel = stackedImage
  .addBands(cdl.rename('crop_label'))
  .clip(california);

// ===========================
// Extraction
// ===========================
var finalPoints = imageWithLabel.reduceRegions({
  collection: points,
  reducer: ee.Reducer.first(),
  scale: 20,
  tileScale: 8
});

// Nettoyage
finalPoints = finalPoints
  .filter(ee.Filter.notNull(['crop_label']))
  .map(function(f) {
    var coords = f.geometry().coordinates();
    return f
      .set('longitude', coords.get(0))
      .set('latitude', coords.get(1));
  });


var final2054 = finalPoints
  .randomColumn('random')
  .sort('random')
  .limit(2054);

print('Nombre final:', final2054.size());

// ===========================
// Export CSV
// ===========================
Export.table.toDrive({
  collection: final2054,
  description: 'California_Grapes_2054pts',
  folder: 'GEE',
  fileNamePrefix: 'California_Grapes_2054',
  fileFormat: 'CSV'
});
