// 简单投影：按经纬度边界盒线性映射到画布坐标
function computeBounds(cities) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  cities.forEach(c => {
  c.polygon.forEach(([lon, lat]) => {
  if (lon < minLon) minLon = lon;
  if (lon > maxLon) maxLon = lon;
  if (lat < minLat) minLat = lat;
  if (lat > maxLat) maxLat = lat;
  });
  });
  return { minLon, maxLon, minLat, maxLat };
  }
  
  
  function lonLatToXY(lon, lat, bounds, canvasW, canvasH, padding = 20) {
  const lonRange = bounds.maxLon - bounds.minLon || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const availW = canvasW - padding * 2;
  const availH = canvasH - padding * 2;
  const scale = Math.min(availW / lonRange, availH / latRange);
  
  
  const x = (lon - bounds.minLon) * scale + padding + (availW - lonRange * scale) / 2;
  const y = (bounds.maxLat - lat) * scale + padding + (availH - latRange * scale) / 2;
  return { x, y };
  }
  
  
  module.exports = {
  computeBounds,
  lonLatToXY
  };