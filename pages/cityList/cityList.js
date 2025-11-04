// pages/cityList/cityList.js
// 导入城市数据
import citiesByProvince from '../../data/citiesByProvince'
Page({
  data: {
    displayData: [],  // 只维护一套数据
    searchText: '',
    visitedCount: 0,
    totalCount: 0,
    visitedPercent: 0
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    this.loadVisitedStatus();
    this.calculateStats();
  },

  // 初始化数据
  initData() {
    const processedData = citiesByProvince.map(province => ({
      ...province,
      expanded: false,
      visitedCount: 0
    }));

    this.setData({
      displayData: processedData
    });

    this.calculateTotalCount();
    this.loadVisitedStatus();
  },

  // 计算总数
  calculateTotalCount() {
    let total = 0;
    this.data.displayData.forEach(province => {
      total += province.cities.length;
    });
    this.setData({ totalCount: total });
  },

  // 加载已访问状态
  loadVisitedStatus() {
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    const updatedData = this.data.displayData.map(province => {
      let visitedCount = 0;
      const cities = province.cities.map(city => {
        const isVisited = visitedCities[`${province.provinceCode}-${city.name}`] || false;
        if (isVisited) visitedCount++;
        return { ...city, visited: isVisited };
      });
      return { ...province, cities, visitedCount };
    });

    this.setData({
      displayData: updatedData
    });
    this.calculateStats();
  },

  // 计算统计信息
  calculateStats() {
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    const visitedCount = Object.keys(visitedCities).filter(key => visitedCities[key]).length;
    const visitedPercent = this.data.totalCount > 0 ? 
      Math.round((visitedCount / this.data.totalCount) * 100) : 0;

    this.setData({
      visitedCount,
      visitedPercent
    });
  },

  // 获取显示数据（动态计算，支持搜索过滤）
  getDisplayData() {
    const { displayData, searchText } = this.data;
    
    if (!searchText.trim()) {
      return displayData;
    }

    return displayData.map(province => {
      // 检查省份名称是否匹配
      const provinceMatch = province.province.includes(searchText);
      
      // 检查城市名称是否匹配
      const filteredCities = province.cities.filter(city => 
        city.name.includes(searchText)
      );
      
      // 如果省份匹配或城市匹配，则显示该省份
      if (provinceMatch || filteredCities.length > 0) {
        return {
          ...province,
          expanded: true, // 搜索时自动展开匹配的省份
          cities: provinceMatch ? province.cities : filteredCities
        };
      }
      
      return null;
    }).filter(province => province !== null);
  },

  // 切换省份展开/收起
  toggleProvince(e) {
    const provinceCode = e.currentTarget.dataset.province;
    const displayData = this.data.displayData.map(province => {
      if (province.provinceCode === provinceCode) {
        return { ...province, expanded: !province.expanded };
      }
      return province;
    });

    this.setData({ displayData });
  },

  // 切换城市访问状态
  toggleCity(e) {
    const { province: provinceCode, city: cityName } = e.currentTarget.dataset;
    
    // 获取当前存储的访问状态
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    const cityKey = `${provinceCode}-${cityName}`;
    const newVisitedState = !visitedCities[cityKey];
    
    // 更新存储
    visitedCities[cityKey] = newVisitedState;
    wx.setStorageSync('visitedCities', visitedCities);
    
    // 更新数据
    this.loadVisitedStatus();
    
    // 显示提示
    wx.showToast({
      title: newVisitedState ? `点亮了${cityName}` : `取消了${cityName}`,
      icon: 'success',
      duration: 1000
    });
  },

  // 搜索输入处理
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    
    // 触发视图更新，getDisplayData会在wxml中调用
    this.setData({});
  }
});