const chinaGeoJSON = require('../../data/china.js');
import { geojson } from '../../api/getGeoJson'
import citiesByProvince from '../../data/citiesByProvince'
import * as echarts from '../../ec-canvas/echarts';
var GENJSON = chinaGeoJSON
// 简化省份名称的辅助函数
function simplifyProvinceName(fullName) {
  const simplifications = {
    '北京市': '北京',
    '天津市': '天津',
    '上海市': '上海',
    '重庆市': '重庆',
    '河北省': '河北',
    '山西省': '山西',
    '辽宁省': '辽宁',
    '吉林省': '吉林',
    '黑龙江省': '黑龙江',
    '江苏省': '江苏',
    '浙江省': '浙江',
    '安徽省': '安徽',
    '福建省': '福建',
    '江西省': '江西',
    '山东省': '山东',
    '河南省': '河南',
    '湖北省': '湖北',
    '湖南省': '湖南',
    '广东省': '广东',
    '海南省': '海南',
    '四川省': '四川',
    '贵州省': '贵州',
    '云南省': '云南',
    '陕西省': '陕西',
    '甘肃省': '甘肃',
    '青海省': '青海',
    '台湾省': '台湾',
    '内蒙古自治区': '内蒙古',
    '广西壮族自治区': '广西',
    '西藏自治区': '西藏',
    '宁夏回族自治区': '宁夏',
    '新疆维吾尔自治区': '新疆',
    '香港特别行政区': '香港',
    '澳门特别行政区': '澳门'
  };
  
  return simplifications[fullName] || fullName;
}

// 判断是否为直辖市的辅助函数
function isMunicipality(provinceName) {
  const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
  return municipalities.includes(provinceName);
}
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
    mapHeight: 400, // 固定地图高度，避免尺寸过大
    citiesByProvince: citiesByProvince,

    ec: {
      lazyLoad: true
    },
    chart: null,
  },

  onLoad: function() {
    // 初始化时间显示
    this.updateTime()
    
    // 计算合适的地图高度
    this.calculateMapHeight()
    
    // 加载已访问数据
    this.loadVisitedData()
    
    // 初始化地图高亮
    // this.initMapHighlights()

    setTimeout(()=>{
      this.initChart();
    },2000)

  },

  // 计算合适的地图高度
  calculateMapHeight: function() {
    const systemInfo = wx.getSystemInfoSync()
    // 屏幕高度减去头部和底部高度
    const headerHeight = 60 // 头部大概高度
    const statsHeight = 80 // 底部统计高度
    const mapHeight = systemInfo.windowHeight - headerHeight - statsHeight - 20 // 留一些边距
    
    this.setData({
      mapHeight: Math.min(mapHeight, 400) // 限制最大高度，避免纹理过大
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
    const defaultRegions = this.convertVisitedCitiesToTargetFormat()
    
    const formatRegions = defaultRegions.reduce((regions, reg) => {
      if(!reg.citys) {
        regions.push({
          name: reg.province,
        })
      }else {
        regions.push(...reg.citys)
      }
      return regions
    },[])

    this.setData({
      visitedRegions: formatRegions,
      defaultRegions: defaultRegions
    })
    
    this.calculateStats(formatRegions)
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
  initMapHighlights: async function() {
    //获取地图数据
    const { defaultRegions } = this.data;
    const province_visitedRegions = defaultRegions.filter(reg => reg.citys)
    const features = []
    if(province_visitedRegions.length > 0) {
      for (let index = 0; index < province_visitedRegions.length; index++) {
        const reg = province_visitedRegions[index];
         const result = await geojson(reg.provinceCode);
         features.push(...result.features)
      }
    }
    // console.log(features)
    const geoJSON = chinaGeoJSON || {};
    geoJSON.features ? geoJSON.features.push(...features) : geoJSON.features = features
    //填充高亮区域
    this.processGeoJSON(geoJSON)

    GENJSON = geoJSON
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
  },

  // 将本地存储数据转换为目标数据结构的方法
  convertVisitedCitiesToTargetFormat: function() {
    // 从本地存储获取已访问的城市数据
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    // 完整的省份数据结构（使用您提供的数据）
    const citiesByProvince = this.data.citiesByProvince

    // 创建目标数据结构
    const targetData = [];
    
    // 遍历所有省份
    citiesByProvince.forEach(province => {
      // 获取该省份下已访问的城市
      const visitedCitiesInProvince = province.cities.filter(city => {
        const cityKey = `${province.provinceCode}-${city.name}`;
        return visitedCities[cityKey] === true;
      });
      
      // 如果该省份有已访问的城市，或者该省份是直辖市且已访问
      if (visitedCitiesInProvince.length > 0) {
        // 简化省份名称（去掉"市"、"省"、"自治区"等后缀）
        const simplifiedProvinceName = simplifyProvinceName(province.province);
        
        // 创建省份对象
        const provinceObj = {
          province: simplifiedProvinceName,
          provinceCode: province.provinceCode
        };
        
        // 如果不是直辖市，添加城市列表
        if (!isMunicipality(province.province)) {
          provinceObj.citys = visitedCitiesInProvince.map(city => ({
            name: city.name
          }));
        }
        
        targetData.push(provinceObj);
      }
    });
    
    return targetData;
  },

  initChart: function() {
    // 获取组件
    this.ecComponent = this.selectComponent('#map-canvas');
    
    // 初始化图表
    this.ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      
      // 注册地图
      echarts.registerMap('china', GENJSON);
      
      // 准备地图数据
      const mapData = this.prepareMapData();
      
      // 配置图表选项
      const option = {
        dataZoom:{
          type: 'inside'
        },
        backgroundColor: '#f5f5f5',
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            return `${params.name}:${params.data ? params.data.status : '未到访'}`;
          }
        },
        visualMap: {
          type: 'piecewise',
          pieces: [
            {min: 1, max: 1, label: '已到访', color: '#ff6b6b'},
            {min: 0, max: 0, label: '未到访', color: '#d9d9d9'}
          ],
          left: 'left',
          top: 'bottom',
          textStyle: {
            color: '#000'
          }
        },
        series: [{
          name: '旅行足迹',
          type: 'map',
          map: 'china',
          roam: 'scale',
          scaleLimit: {
            min: 1,
            max: 3
          },
          data: mapData,
          nameMap: {
            '新疆维吾尔自治区': '新疆',
            '西藏自治区': '西藏',
            '内蒙古自治区': '内蒙古',
            '广西壮族自治区': '广西',
            '宁夏回族自治区': '宁夏',
            '香港特别行政区': '香港',
            '澳门特别行政区': '澳门'
          }
        }]
      };
      
      chart.setOption(option);
      this.chart = chart;
      
      // 绑定点击事件
      chart.on('click', (params) => {
        if (params.componentType === 'series' && params.seriesType === 'map') {
          this.onMapClick(params.name);
        }
      });
      
      return chart;
    });
  },

  prepareMapData: function() {
    const geojson = GENJSON
    const visitedProvinces = this.data.visitedRegions.map(f => f.name);
    return geojson.features.map(feature => {
      const provinceName = feature.properties.name;
      const isVisited = visitedProvinces.includes(provinceName) ? 1 : 0;
      return {
        name: provinceName,
        value: isVisited,
        status: isVisited ? '已到访' : '未到访'
      };
    });
  },


  generateShareImage() {
    // 获取echarts实例
    const chart = this.chart;
    
    // 获取图表图片
    chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
      success: (res) => {
        // 这里res.tempFilePath是图表的临时图片路径
        // 然后可以创建一个Canvas，将图表图片和统计信息绘制到一起
        this.drawFullImage(res.tempFilePath);
      }
    });
  },

  drawFullImage(chartImagePath) {
    const ctx = wx.createCanvasContext('shareCanvas');
    const { windowWidth } = wx.getSystemInfoSync();
    
    // 绘制背景
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, windowWidth, 500);
    
    // 绘制头部
    const gradient = ctx.createLinearGradient(0, 0, 0, 80);
    gradient.addColorStop(0, '#1a6dfc');
    gradient.addColorStop(1, '#0d47a1');
    ctx.setFillStyle(gradient);
    ctx.fillRect(0, 0, windowWidth, 80);
    
    // 绘制标题
    ctx.setFillStyle('#ffffff');
    ctx.setFontSize(18);
    ctx.setTextAlign('center');
    ctx.fillText('我的旅行足迹', windowWidth / 2, 35);
    ctx.setFontSize(14);
    ctx.fillText('记录走过的每一个地方', windowWidth / 2, 55);
    
    // 绘制图表图片
    ctx.drawImage(chartImagePath, 10, 90, windowWidth - 20, 200);
    
    // 绘制统计信息
    ctx.setFillStyle('#f8f9fa');
    ctx.fillRect(10, 300, windowWidth - 20, 80);
    
    // 绘制统计数据
    ctx.setFillStyle('#1a6dfc');
    ctx.setFontSize(20);
    ctx.setTextAlign('center');
    ctx.fillText('28', 70, 335);
    ctx.fillText('156', windowWidth / 2, 335);
    ctx.fillText('42.5', windowWidth - 70, 335);
    
    ctx.setFillStyle('#666666');
    ctx.setFontSize(12);
    ctx.fillText('已点亮城市', 70, 355);
    ctx.fillText('历时天数', windowWidth / 2, 355);
    ctx.fillText('点亮面积(万km²)', windowWidth - 70, 355);
    
    // 绘制底部信息
    ctx.setFillStyle('#999999');
    ctx.setFontSize(12);
    ctx.fillText('长按图片保存分享', windowWidth / 2, 470);
    
    // 绘制
    ctx.draw(false, () => {
      // 生成图片
      wx.canvasToTempFilePath({
        canvasId: 'shareCanvas',
        success: (res) => {
          // 这里res.tempFilePath是最终生成的图片路径
          this.setData({
            shareImage: res.tempFilePath,
            showResult: true
          });
        }
      });
    });
  }
})