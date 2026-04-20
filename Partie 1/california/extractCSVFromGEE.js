// ===========================
// Zones Californie - calées sur la carte
// ===========================

// Zone 1 : Sacramento Valley / Delta (nord, point rouge 1)
var zone1 = ee.Geometry.Rectangle([-122.20, 38.20, -121.40, 38.80]);

// Zone 2 : San Joaquin Valley / Fresno (centre, point rouge 2)
var zone2 = ee.Geometry.Rectangle([-120.50, 36.40, -119.60, 37.00]);

var california = zone1.union(zone2);

var startDate = '2021-01-01';
var endDate   = '2021-12-31';
var bands     = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];

function maskClouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
  return image.updateMask(mask).select(bands);
}

// ===========================
// CDL + points
// ===========================
var cdl = ee.Image("USDA/NASS/CDL/2021").select('cropland');

var cropCodes = [1, 2, 3, 4, 5, 6, 12, 21, 22, 23, 24, 26, 28,
                 36, 41, 42, 43, 54, 55, 66, 67, 68, 69, 72, 75, 76, 77,204];

var cropMask = cdl.remap(cropCodes, ee.List.repeat(1, cropCodes.length), 0).eq(1);

var points = cdl.updateMask(cropMask).clip(california).sample({
  region: california,
  scale: 30,
  numPixels: 25000,
  seed: 42,
  geometries: true
});

// ===========================
// Collection S2
// ===========================
var collection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filterBounds(california)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90))
  .map(maskClouds);

// ===========================
// Image vide de référence
// ===========================
var emptyImage = ee.Image.constant(ee.List.repeat(0, bands.length))
  .rename(bands)
  .toFloat();

// ===========================
// Stack 360 bandes
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
// Extraire aux points
// ===========================
var finalPoints = imageWithLabel.reduceRegions({
  collection: points,
  reducer: ee.Reducer.first(),
  scale: 20,
  tileScale: 8
});

finalPoints = finalPoints
  .filter(ee.Filter.notNull(['crop_label']))
  .map(function(f) {
    var coords = f.geometry().coordinates();
    return f
      .set('longitude', coords.get(0))
      .set('latitude',  coords.get(1));
  });

print('Points finaux:', finalPoints.size());
print('Premier point:', finalPoints.first());

// ===========================
// Export en 2 parties
// ===========================
var pointsList = finalPoints.toList(finalPoints.size());
var points_part1 = ee.FeatureCollection(pointsList.slice(0, 5000));
var points_part2 = ee.FeatureCollection(pointsList.slice(5000, 10000));

Export.table.toDrive({
  collection: points_part1,
  description: 'California_part1_5000pts',
  folder: 'GEE',
  fileNamePrefix: 'California_part1-1',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: points_part2,
  description: 'California_part2_5000pts',
  folder: 'GEE',
  fileNamePrefix: 'California_part2-2',
  fileFormat: 'CSV'
});

print('Points avant filtre crop_label:', points.size());
print('Points après filtre crop_label:', finalPoints.size());
