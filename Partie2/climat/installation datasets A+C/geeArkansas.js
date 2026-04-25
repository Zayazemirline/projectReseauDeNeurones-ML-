// =============================
// 🔹 1. Charger les points
// =============================
var table = ee.FeatureCollection(
  "projects/plenary-glass-467416-q1/assets/Arkansas_full_clean"
);
var points = table;



// =============================
// 🔹 2. TOPOGRAPHIE
// =============================
var dem = ee.Image("USGS/SRTMGL1_003");
var elevation = dem.select('elevation');
var landforms = ee.Image("CSP/ERGo/1_0/Global/ALOS_landforms");

// =============================
// 🔹 3. SOL
// =============================
var soc  = ee.Image("projects/soilgrids-isric/soc_mean");
var clay = ee.Image("projects/soilgrids-isric/clay_mean");
var ph   = ee.Image("projects/soilgrids-isric/phh2o_mean");

// =============================
// 🔹 4. Fusion topo + sol
// =============================
var baseImage = elevation
  .addBands(landforms)
  .addBands(soc)
  .addBands(ph)
  .addBands(clay);

// =============================
// 🔹 5. CLIMAT décadal corrigé
// =============================
// =============================
// 🔹 5. CLIMAT décadal — VERSION ROBUSTE
// =============================
var climate = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR");
var year = 2021;
var yearStart = ee.Date.fromYMD(year, 1, 1);

// Image vide de fallback (une bande, valeur 0)
var fallback1Band = ee.Image.constant(0).toFloat();

function getDecade(dayOffset, suffix) {
  var start  = yearStart.advance(dayOffset, 'day');
  var end    = yearStart.advance(Math.min(dayOffset + 10, 365), 'day');
  var subset = climate.filterDate(start, end).filterBounds(points);

  // ✅ Construire chaque bande indépendamment avec unmask
  var precip = subset.select('total_precipitation_sum')
    .sum()
    .multiply(1000)
    .unmask(0)       // ← remplace les pixels null par 0
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

// Construction des décades
var climateBands = getDecade(0, '00');  // ← initialisation explicite

for (var d = 1; d < 36; d++) {
  var suffix = d < 10 ? '0' + d : '' + d;
  climateBands = climateBands.addBands(getDecade(d * 10, suffix));
}

// ✅ Vérifie que les bandes sont bien là
print('Bandes climat :', climateBands.bandNames());
print('Nombre bandes climat :', climateBands.bandNames().size());

// Test valeur sur un point Arkansas
var testPt = ee.Geometry.Point([-91.5, 34.5]);
print('Test climat :', climateBands.sample(testPt, 9000).first());
// =============================
// 🔹 6. Image finale
// =============================
var finalImage = baseImage.addBands(climateBands);

// =============================
// 🔹 7. Debug
// =============================
print('Nombre de bandes :', finalImage.bandNames().size());
print('Noms des bandes  :', finalImage.bandNames());
print('Nombre de points :', points.size());

var testPoint = ee.Geometry.Point([-91.5, 34.5]);
print('Test valeurs (1 point) :', finalImage.sample(testPoint, 1000).first());

// =============================
// 🔹 8. Extraction
// =============================
var enriched = finalImage.sampleRegions({
  collection: points,
  scale: 1000,
  geometries: false
});

print('Nombre de features enrichies :', enriched.size());

// =============================
// 🔹 9. Export CSV
// =============================
Export.table.toDrive({
  collection: enriched,
  description: 'dataset_enriched',
  fileNamePrefix: 'arkansas_partie2',
  folder: 'gee_arkansas_partie2',
  fileFormat: 'CSV'
});