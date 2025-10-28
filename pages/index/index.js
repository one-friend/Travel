// index.js
import * as echarts from '../../ec-canvas/echarts';
const chinaGeoJSON = require('../../data/china.js');

Page({
  data: {
    ec: {
      lazyLoad: true
    },
    visitedCount: 0,
    wishCount: 0,
    totalProvinces: 34,
    showModal: false,
    provinces: [],
    provinceIndex: 0,
    selectedProvince: '',
    travelDate: '2023-01-01',
    notes: '',
    footprints: [],
    chart: null
  },

  onLoad: function() {
    // 初始化省份列表
    const provinces = chinaGeoJSON.features.map(feature => feature.properties.name);
    this.setData({
      provinces,
      selectedProvince: provinces[0]
    });
    
    // 初始化足迹数据
    this.initFootprints();
    
    // 初始化图表
    this.initChart();
  },

  initFootprints: function() {
    // 从本地存储加载足迹数据
    const footprints = wx.getStorageSync('footprints') || [];
    this.setData({ footprints });
    
    // 计算统计数据
    this.calcStats();
  },

  calcStats: function() {
    const visited = this.data.footprints.filter(f => f.type === 'visited').length;
    const wish = this.data.footprints.filter(f => f.type === 'wish').length;
    
    this.setData({
      visitedCount: visited,
      wishCount: wish
    });
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
      echarts.registerMap('china', chinaGeoJSON);
      
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
        
          // // 完全禁用交互相关的视觉反馈
          // selectedMode: false,
          
          // // 禁用悬停效果
          // emphasis: {
          //   disabled: true, // 完全禁用悬停效果
          //   label: {
          //     show: false
          //   }
          // },
          
          // // 禁用选中效果
          // select: {
          //   disabled: true,
          //   label: {
          //     show: false
          //   }
          // },
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
    const visitedProvinces = this.data.footprints
      .filter(f => f.type === 'visited')
      .map(f => f.province);
    
    return chinaGeoJSON.features.map(feature => {
      const provinceName = feature.properties.name;
      const isVisited = visitedProvinces.includes(provinceName) ? 1 : 0;
      
      return {
        name: provinceName,
        value: isVisited,
        status: isVisited ? '已到访' : '未到访'
      };
    });
  },

  onMapClick: function(provinceName) {
    // 检查是否已经记录过该省份
    const existingFootprint = this.data.footprints.find(
      f => f.province === provinceName && f.type === 'visited'
    );
    
    if (existingFootprint) {
      wx.showModal({
        title: provinceName,
        content: `到访时间: ${existingFootprint.date}\n备注: ${existingFootprint.notes || '无'}`,
        showCancel: false
      });
    } else {
      this.setData({
        showModal: true,
        selectedProvince: provinceName,
        provinceIndex: this.data.provinces.indexOf(provinceName)
      });
    }
  },

  addFootprint: function() {
    this.setData({
      showModal: true
    });
  },

  closeModal: function() {
    this.setData({
      showModal: false
    });
  },

  onProvinceChange: function(e) {
    const index = e.detail.value;
    this.setData({
      provinceIndex: index,
      selectedProvince: this.data.provinces[index]
    });
  },

  onDateChange: function(e) {
    this.setData({
      travelDate: e.detail.value
    });
  },

  onNotesChange: function(e) {
    this.setData({
      notes: e.detail.value
    });
  },

  saveFootprint: function() {
    const { selectedProvince, travelDate, notes } = this.data;
    
    if (!selectedProvince) {
      wx.showToast({
        title: '请选择省份',
        icon: 'none'
      });
      return;
    }
    
    // 添加新足迹
    const newFootprint = {
      province: selectedProvince,
      date: travelDate,
      notes: notes,
      type: 'visited'
    };
    
    const footprints = [...this.data.footprints, newFootprint];
    this.setData({ footprints });
    
    // 保存到本地存储
    wx.setStorageSync('footprints', footprints);
    
    // 更新统计数据
    this.calcStats();
    
    // 更新地图
    this.updateMap();
    
    // 关闭模态框
    this.closeModal();
    
    // 重置表单
    this.setData({
      travelDate: '2023-01-01',
      notes: ''
    });
    
    wx.showToast({
      title: '足迹添加成功',
      icon: 'success'
    });
  },

  updateMap: function() {
    if (this.chart) {
      const mapData = this.prepareMapData();
      this.chart.setOption({
        series: [{
          data: mapData
        }]
      });
    }
  },

  viewDetails: function() {
    wx.navigateTo({
      url: '/pages/detail/detail'
    });
  },


  // 取消地图高亮的方法
  downplayMap: function() {
    if (this.chart) { // 确保chart实例存在
      // 派发downplay动作取消所有高亮[citation:1][citation:6][citation:8]
      this.chart.dispatchAction({
        type: 'downplay'
      });
      console.log('已取消地图高亮');
    }
  },
});