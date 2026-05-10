
var table = ee.FeatureCollection(
  "projects/plenary-glass-467416-q1/assets/Arkansas_full_clean"
);
var points = table;


var dem = ee.Image("USGS/SRTMGL1_003");
var elevation = dem.select('elevation');
var landforms = ee.Image("CSP/ERGo/1_0/Global/ALOS_landforms");

var soc  = ee.Image("projects/soilgrids-isric/soc_mean");
var clay = ee.Image("projects/soilgrids-isric/clay_mean");
var ph   = ee.Image("projects/soilgrids-isric/phh2o_mean");


var baseImage = elevation
  .addBands(landforms)
  .addBands(soc)
  .addBands(ph)
  .addBands(clay);


var climate = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR");
var year = 2021;
var yearStart = ee.Date.fromYMD(year, 1, 1);

var fallback1Band = ee.Image.constant(0).toFloat();

function getDecade(dayOffset, suffix) {
  var start  = yearStart.advance(dayOffset, 'day');
  var end    = yearStart.advance(Math.min(dayOffset + 10, 365), 'day');
  var subset = climate.filterDate(start, end).filterBounds(points);

  var precip = subset.select('total_precipitation_sum')
    .sum()
    .multiply(1000)
    .unmask(0)    
    .toFloat()
    .rename('precip_' + suffix);

  var tmin = subset.select('temperature_2m_min')
    .min()
    .subtract(273.15)
    .unmask(-9999)
    .toFloat()
    .rename('tmin_' + suffix);

  var tmax = subset.select('temperature_2m_max')
    .mean()
    .subtract(273.15)
    .unmask(-9999)
    .toFloat()
    .rename('tmax_' + suffix);

  return precip.addBands(tmin).addBands(tmax);
}

var climateBands = getDecade(0, '00'); 

for (var d = 1; d < 36; d++) {
  var suffix = d < 10 ? '0' + d : '' + d;
  climateBands = climateBands.addBands(getDecade(d * 10, suffix));
}

print('Bandes climat :', climateBands.bandNames());
print('Nombre bandes climat :', climateBands.bandNames().size());

var testPt = ee.Geometry.Point([-91.5, 34.5]);
print('Test climat :', climateBands.sample(testPt, 9000).first());

var finalImage = baseImage.addBands(climateBands);

print('Nombre de bandes :', finalImage.bandNames().size());
print('Noms des bandes  :', finalImage.bandNames());
print('Nombre de points :', points.size());

var testPoint = ee.Geometry.Point([-91.5, 34.5]);
print('Test valeurs (1 point) :', finalImage.sample(testPoint, 1000).first());


var enriched = finalImage.sampleRegions({
  collection: points,
  scale: 1000,
  geometries: false
});

print('Nombre de features enrichies :', enriched.size());


Export.table.toDrive({
  collection: enriched,
  description: 'dataset_enriched',
  fileNamePrefix: 'arkansas_partie2',
  folder: 'gee_arkansas_partie2',
  fileFormat: 'CSV'
});