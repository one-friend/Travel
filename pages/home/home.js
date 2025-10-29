const chinaGeoJSON = require('../../data/china.js');
Page({
  data: {
    currentTime: '09:34',
    centerLat: 35, // 地图中心纬度 - 中国中部
    centerLng: 105, // 地图中心经度
    scale: 3, // 地图缩放级别
    polygons: [], // 高亮区域数据
    visitedCount: 0,
    totalDays: 0,
    totalArea: 0,
    visitedRegions: [], // 已访问地区列表
    mapHeight: 400 // 固定地图高度，避免尺寸过大
  },

  onLoad: function() {
    // 初始化时间显示
    this.updateTime()
    
    // 计算合适的地图高度
    this.calculateMapHeight()
    
    // 加载已访问数据
    this.loadVisitedData()
    
    // 初始化地图高亮
    this.initMapHighlights()
  },

  // 计算合适的地图高度
  calculateMapHeight: function() {
    const systemInfo = wx.getSystemInfoSync()
    // 屏幕高度减去头部和底部高度
    const headerHeight = 60 // 头部大概高度
    const statsHeight = 80 // 底部统计高度
    const mapHeight = systemInfo.windowHeight - headerHeight - statsHeight - 20 // 留一些边距
    
    this.setData({
      mapHeight: Math.min(mapHeight, 600) // 限制最大高度，避免纹理过大
    })
  },

  // 更新当前时间
  updateTime: function() {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    this.setData({
      currentTime: `${hours}:${minutes}`
    })
  },

  // 加载已访问地区数据
  loadVisitedData: function() {
    try {
      // 尝试从本地存储加载数据
      const storedData = wx.getStorageSync('visitedRegions')
      if (storedData) {
        this.setData({
          visitedRegions: storedData.regions || [],
          visitedCount: storedData.visitedCount || 0,
          totalDays: storedData.totalDays || 0,
          totalArea: storedData.totalArea || 0
        })
      } else {
        // 如果没有存储数据，使用默认示例数据
        this.initDefaultData()
      }
    } catch (e) {
      console.error('加载数据失败:', e)
      this.initDefaultData()
    }
  },

  // 初始化默认数据（示例）
  initDefaultData: function() {
    const defaultRegions = [
      { name: '北京', area: 16410, days: 5 },
      { name: '上海', area: 6340, days: 3 },
      { name: '天津', area: 14335, days: 4 },
      // { name: '河北', area: 14335, days: 4 }
    ]
    
    this.setData({
      visitedRegions: defaultRegions
    })
    
    this.calculateStats(defaultRegions)
    // this.saveVisitedData()
  },

  // 计算统计数据
  calculateStats: function(regions) {
    const visitedCount = regions.length
    const totalDays = regions.reduce((sum, region) => sum + (region.days || 1), 0)
    const totalArea = regions.reduce((sum, region) => sum + (region.area || 0), 0)
    
    this.setData({
      visitedCount,
      totalDays,
      totalArea: Math.round(totalArea)
    })
  },

  // 保存数据到本地存储
  saveVisitedData: function() {
    try {
      wx.setStorageSync('visitedRegions', {
        regions: this.data.visitedRegions,
        visitedCount: this.data.visitedCount,
        totalDays: this.data.totalDays,
        totalArea: this.data.totalArea
      })
    } catch (e) {
      console.error('保存数据失败:', e)
    }
  },

  // 初始化地图高亮区域
  initMapHighlights: function() {
    this.processGeoJSON(chinaGeoJSON)
  },

  // 验证多边形数据是否有效
  isValidPolygon: function(polygon) {
    if (!polygon || !polygon.points || !Array.isArray(polygon.points)) {
      return false
    }
    
    for (let point of polygon.points) {
      if (isNaN(point.latitude) || isNaN(point.longitude)) {
        console.error('无效的坐标点:', point)
        return false
      }
    }
    
    return true
  },

  // 处理GeoJSON数据的函数
  // 处理GeoJSON数据的函数 - 修正版
processGeoJSON: function(geoJSONData) {
  if (!geoJSONData || !geoJSONData.features) {
    console.error('无效的GeoJSON数据')
    return
  }
  
  const polygons = []
  
  geoJSONData.features.forEach(feature => {
    const regionName = feature.properties && feature.properties.name
    
    // 检查这个地区是否在已访问列表中
    if (regionName && this.data.visitedRegions.some(region => region.name === regionName)) {
      const geometryType = feature.geometry.type
      const coordinates = feature.geometry.coordinates
      
      try {
        if (geometryType === 'Polygon') {
          // 单个多边形
          const points = coordinates[0].map(coord => ({
            longitude: coord[0],
            latitude: coord[1]
          }))
          
          if (this.isValidCoordinates(points)) {
            polygons.push({
              points: points,
              strokeWidth: 1,
              strokeColor: '#00FF00',
              fillColor: '#00FF007F',
              zIndex: 1
            })
          }
        } else if (geometryType === 'MultiPolygon') {
          // 多多边形：为每个多边形创建独立的polygon对象
          // MultiPolygon的结构: [[[多边形1坐标], [多边形2坐标], ...]]
          for (let i = 0; i < coordinates.length; i++) {
            const polygon = coordinates[i]
            // 每个多边形的第一个环是外环
            if (polygon && polygon[0]) {
              const points = polygon[0].map(coord => ({
                longitude: coord[0],
                latitude: coord[1]
              }))
              
              if (this.isValidCoordinates(points)) {
                polygons.push({
                  points: points,
                  strokeWidth: 1,
                  strokeColor: '#00FF00',
                  fillColor: '#00FF007F',
                  zIndex: 1
                })
              }
            }
          }
        } else if (geometryType === 'Point') {
          // 点：创建一个小矩形区域来表示
          const [lng, lat] = coordinates
          const points = [
            {longitude: lng - 0.1, latitude: lat - 0.05},
            {longitude: lng + 0.1, latitude: lat - 0.05},
            {longitude: lng + 0.1, latitude: lat + 0.05},
            {longitude: lng - 0.1, latitude: lat + 0.05}
          ]
          
          if (this.isValidCoordinates(points)) {
            polygons.push({
              points: points,
              strokeWidth: 1,
              strokeColor: '#00FF00',
              fillColor: '#00FF007F',
              zIndex: 1
            })
          }
        }
      } catch (e) {
        console.error('解析GeoJSON要素失败:', e, feature)
      }
    }
  })
  
  this.setData({ polygons })
},

  // 从GeoJSON要素中提取坐标
  extractCoordinatesFromGeoJSON: function(feature) {
    if (!feature.geometry) return null
    
    const geometryType = feature.geometry.type
    const coordinates = feature.geometry.coordinates
    
    try {
      if (geometryType === 'Polygon') {
        // 多边形：取第一个环（外环）
        return coordinates[0].map(coord => ({
          longitude: coord[0],
          latitude: coord[1]
        }))
      } else if (geometryType === 'MultiPolygon') {
        // 多多边形：取第一个多边形的第一个环
        return coordinates[0][0].map(coord => ({
          longitude: coord[0],
          latitude: coord[1]
        }))
      } else if (geometryType === 'Point') {
        // 点：创建一个小矩形区域来表示
        const [lng, lat] = coordinates
        return [
          {longitude: lng - 0.1, latitude: lat - 0.05},
          {longitude: lng + 0.1, latitude: lat - 0.05},
          {longitude: lng + 0.1, latitude: lat + 0.05},
          {longitude: lng - 0.1, latitude: lat + 0.05}
        ]
      }
    } catch (e) {
      console.error('解析GeoJSON坐标失败:', e)
      return null
    }
    
    return null
  },

  // 验证坐标数组是否有效
  isValidCoordinates: function(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      return false
    }
    
    for (let coord of coordinates) {
      if (isNaN(coord.latitude) || isNaN(coord.longitude)) {
        console.error('无效的GeoJSON坐标:', coord)
        return false
      }
    }
    
    return true
  }
})