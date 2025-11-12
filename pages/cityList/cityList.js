// 导入城市数据
import citiesByProvince from '../../data/citiesByProvince'
Page({
  data: {
    citiesData: [],
    displayData: [],
    zxs: [],
    searchText: '',
    visitedCount: 0,
    totalCount: 0,
    visitedPercent: 0,
    zxsVCount: 0,

    currentCity: null
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
    const zxs = processedData.filter(item => item.provinceCode == "110000" || item.provinceCode == "120000" || item.provinceCode == "310000" || item.provinceCode == "500000" )
    const zxsVCount = zxs.reduce((count,province)=>{
      return Number(count) + Number(province.visitedCount)
    },0)
    this.setData({
      citiesData: processedData,
      displayData: processedData,
      zxs: zxs,
      zxsVCount
    });

    this.calculateTotalCount();
    this.loadVisitedStatus();
  },

  // 计算总数
  calculateTotalCount() {
    let total = 0;
    this.data.citiesData.forEach(province => {
      total += province.cities.length;
    });
    this.setData({ totalCount: total });
  },

  // 加载已访问状态
  loadVisitedStatus() {
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    const updatedData = this.data.citiesData.map(province => {
      let visitedCount = 0;
      const cities = province.cities.map(city => {
        const isVisited = visitedCities[`${province.provinceCode}-${city.name}`] || false;
        if (isVisited) visitedCount++;
        return { ...city, visited: isVisited };
      });
      return { ...province, cities, visitedCount };
    });
    const zxs = updatedData.filter(item => item.provinceCode == "110000" || item.provinceCode == "120000" || item.provinceCode == "310000" || item.provinceCode == "500000" )
    const zxsVCount = zxs.reduce((count,province)=>{
      return Number(count) + Number(province.visitedCount)
    },0)
    this.setData({
      citiesData: updatedData,
      displayData: updatedData,
      zxs: zxs,
      zxsVCount
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
    
    // 更新显示数据
    this.loadVisitedStatus();
    
    // 显示提示
    wx.showToast({
      title: newVisitedState ? `点亮了${cityName}` : `取消了${cityName}`,
      icon: 'success',
      duration: 1000
    });
  },

  onCityTap(e) {
    const city = e.currentTarget.dataset.city;
    this.setData({ currentCity: city });

    // 通过组件实例 open 并传初始数据
    const modal = this.selectComponent('#infoModal');
    modal.open({
      on: !!city.lit,
      // 填默认日期为今天
      date: this._todayDate(),
      time: this._nowTime(),
      note: city.note || ''
    });
  },

  onModalCancel() {
    console.log('用户取消');
  },

  onModalConfirm(e) {
    const detail = e.detail; // { on, date, time, datetime, note }
    console.log('保存结果：', detail);

    // 保存到页面数据或云端（示例：更新 cities 数组）
    const city = this.data.currentCity;
    if (!city) return;
    const cities = this.data.cities.map(c => {
      if (c.id === city.id) {
        return Object.assign({}, c, {
          lit: detail.on,
          note: detail.note,
          lastTime: detail.datetime
        });
      }
      return c;
    });
    this.setData({ cities });

    // 同步保存到云或后端的代码放这里
  },

  _todayDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  },

  _nowTime() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    return `${h}:${m}`;
  },

  // 搜索输入处理
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });

    if (!searchText.trim()) {
      this.setData({ displayData: this.data.citiesData });
      return;
    }

    const filteredData = this.data.citiesData.map(province => {
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
          expanded: true,
          cities: provinceMatch ? province.cities : filteredCities
        };
      }
      
      return null;
    }).filter(province => province !== null);

    this.setData({ displayData: filteredData });
  }
});