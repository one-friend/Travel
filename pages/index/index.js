// index.js
import * as echarts from '../../ec-canvas/echarts';
const chinaGeoJSON = require('../../data/china.js');
import { geojson } from '../../api/getGeoJson'
var GENJSON = {}
Page({
  data: {
    ec: {
      lazyLoad: true
    },
    chart: null,

    formatRegions: [],
    defaultRegions: []
  },

  onLoad: function() {

    this.initDefaultData()
    // this.initMapHighlights()
    // 初始化图表
    setTimeout(()=>{
      this.initChart();
    },2000)
  },
  initDefaultData: function() {
    const defaultRegions = [
      {
        province: '北京',
        provinceCode: '16410',
      },
      {
        province: '上海',
        provinceCode: '6340',
      },
      {
        province: '天津',
        provinceCode: '14335',
      },
      {
        province: '河北',
        provinceCode: '130000',
        citys: [
          { name: '石家庄',area: 14335, days: 4 },
          { name: '衡水',area: 14335, days: 4 },
          { name: '保定',area: 14335, days: 4 },
        ]
      },
      {
        province: '内蒙古',
        provinceCode: '150000',
        citys: [
          { name: '乌兰察布',area: 14335, days: 4 },
          { name: '呼和浩特',area: 14335, days: 4 },
          { name: '赤峰',area: 14335, days: 4 },
        ]
      },
      {
        province: '山东',
        provinceCode: '370000',
        citys: [
          { name: '泰安',area: 14335, days: 4 },
          { name: '济南',area: 14335, days: 4 },
          { name: '青岛',area: 14335, days: 4 },
        ]
      },
    ]
    
    const formatRegions = defaultRegions.reduce((regions, reg) => {
      if(!reg.citys) {
        regions.push({
          name: reg.province,
          area: 14335, 
          days: 4 
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
    
   
  },
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
    GENJSON = geoJSON
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
});