// ===========================
// ZONES ARKANSAS
// ===========================
var zone1 = ee.Geometry.Rectangle([-90.85, 35.55, -90.40, 35.85]);
var zone2 = ee.Geometry.Rectangle([-91.55, 34.20, -91.10, 34.50]);
var arkansas = zone1.union(zone2);

var startDate = '2021-01-01';
var endDate   = '2021-12-31';

var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'];

// ===========================
// MASQUE NUAGES
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
// CDL + POINTS
// ===========================
var cdl = ee.Image("USDA/NASS/CDL/2021").select('cropland');

var cropCodes = [1, 2, 3, 4, 5, 6, 12, 21, 22, 23, 24, 26, 28, 36, 41, 42, 43];

var cropMask = cdl.remap(cropCodes, ee.List.repeat(1, cropCodes.length), 0).eq(1);

var points = cdl.updateMask(cropMask).clip(arkansas).sample({
  region: arkansas,
  scale: 30,
  numPixels: 15000,
  seed: 42,
  geometries: true
});

// ===========================
// SENTINEL-2
// ===========================
var collection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filterBounds(arkansas)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 90))
  .map(maskClouds);

// ===========================
// IMAGE VIDE
// ===========================
var emptyImage = ee.Image.constant(ee.List.repeat(0, bands.length))
  .rename(bands)
  .toFloat();

// ===========================
// STACK TEMPOREL SENTINEL-2
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
  ));

  var s2Bands = composite.rename(bands.map(function(b) {
    return b + '_T' + i;
  }));

  stackedImage = stackedImage.addBands(s2Bands);
}

print('Nombre de bandes S2:', stackedImage.bandNames().size());

// ===========================
// ERA5 CLIMATE
// ===========================
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterDate(startDate, endDate)
  .filterBounds(arkansas);

// ===========================
// STACK CLIMAT (10 jours)
// ===========================
var climateStack = ee.Image([]);

for (var i = 0; i < 36; i++) {

  var start = ee.Date(startDate).advance(i * 10, 'day');
  var end   = ee.Date(startDate).advance((i + 1) * 10, 'day');

  var period = era5.filterDate(start, end);

  var climateImage = ee.Image(ee.Algorithms.If(
    period.size().gt(0),

    ee.Image.cat([

      // 🌧️ Précipitations (mm)
      period.select('total_precipitation_sum')
        .sum()
        .multiply(1000)
        .rename('precip_T' + i),

      // 🌡️ Temp min (°C)
      period.select('temperature_2m_min')
        .min()
        .subtract(273.15)
        .rename('tmin_T' + i),

      // 🌡️ Temp max moyenne (°C)
      period.select('temperature_2m_max')
        .mean()
        .subtract(273.15)
        .rename('tmax_T' + i)

    ]).toFloat(),

    ee.Image.constant([0, 0, 0])
      .rename(['precip_T' + i, 'tmin_T' + i, 'tmax_T' + i])
      .toFloat()
  ));

  climateStack = climateStack.addBands(climateImage);
}

print('Nombre de bandes climat:', climateStack.bandNames().size());

// ===========================
// COMBINAISON FINALE
// ===========================
var imageWithClimate = stackedImage.addBands(climateStack);

var imageWithLabel = imageWithClimate
  .addBands(cdl.rename('crop_label'))
  .clip(arkansas);

// ===========================
// EXTRACTION AUX POINTS
// ===========================
var finalPoints = imageWithLabel.reduceRegions({
  collection: points,
  reducer: ee.Reducer.first(),
  scale: 20,
  tileScale: 8
});

// ===========================
// COORDONNÉES + CLEAN
// ===========================
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
// EXPORT
// ===========================
var pointsList = finalPoints.toList(finalPoints.size());

var points_part1 = ee.FeatureCollection(pointsList.slice(0, 5000));
var points_part2 = ee.FeatureCollection(pointsList.slice(5000, 10000));

Export.table.toDrive({
  collection: points_part1,
  description: 'Arkansas_climate_part1',
  folder: 'GEE_Arkansas',
  fileNamePrefix: 'Arkansas_climate_part1',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: points_part2,
  description: 'Arkansas_climate_part2',
  folder: 'GEE_Arkansas',
  fileNamePrefix: 'Arkansas_climate_part2',
  fileFormat: 'CSV'
});