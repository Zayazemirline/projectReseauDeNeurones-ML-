

// 1. Stuttgart (rice + soybeans)
var zone1 = ee.Geometry.Rectangle([-92.10, 34.20, -91.05, 34.85]);

// 2. Jonesboro (corn + soybeans)
var zone2 = ee.Geometry.Rectangle([-91.40, 35.35, -89.95, 36.30]);

// 3. Pine Bluff (cotton + mix crops)
var zone3 = ee.Geometry.Rectangle([-92.70, 33.85, -91.40, 34.65]);

// 4. Fruits zone (Ozarks / NW Arkansas)
var zone4 = ee.Geometry.Rectangle([-94.90, 35.60, -93.40, 36.80]);

// 5. Eastern Arkansas Soybean Belt
var zone5 = ee.Geometry.Rectangle([-91.30, 34.25, -90.55, 34.95]);

// 6. Mississippi Delta
var zone6 = ee.Geometry.Rectangle(-92.40, 33.80,-90.30, 35.40);

// 7.Northeast Arkansas Crop Extension Belt
var zone7 = ee.Geometry.Rectangle([-90.60, 35.50,-89.90, 36.05]);

// 8.Southeast Arkansas Crop Corridor
var zone8 = ee.Geometry.Rectangle([-91.90, 33.25,-91.00, 33.95]);

var zone9 = ee.Geometry.Rectangle([
  -91.85, 34.55,
  -91.25, 35.10
]);







// Fusion
var arkansas = zone1
  .union(zone2)
  .union(zone3)
  .union(zone4)
  .union(zone5)
  .union(zone6)
  .union(zone7)
  .union(zone8)
  .union(zone9);

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

// soybeans = 5    //a changer selon le crop qu'on souhaite extraire de notre zone
var soybeansMask = cdl.eq(5).and(confidence.gte(90));

// ===========================
// Sampling
// ===========================
var points = cdl.updateMask(soybeansMask).clip(arkansas).sample({
  region: arkansas,
  scale: 30,
  numPixels: 40000, 
  seed: 42,
  geometries: true
});

// ===========================
// Sentinel-2
// ===========================
var collection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filterBounds(arkansas)
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
  .clip(arkansas);

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


var final = finalPoints
  .randomColumn('random')
  .sort('random')
  .limit(4677);    //a changer selon le nombre d'echantillons par crop

print('Nombre final:', final.size());

// ===========================
// Export CSV
// ===========================
Export.table.toDrive({
  collection: final,
  description: 'arkansas_soybeans_4677pts',
  folder: 'GEE_arkansas',
  fileNamePrefix: 'arkansas_soybeans_4677',
  fileFormat: 'CSV'
});
