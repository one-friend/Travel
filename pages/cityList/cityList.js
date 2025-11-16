// pages/index/index.js
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
    this.refreshData();
  },

  /** 初始化基础数据 */
  initData() {
    const processedData = citiesByProvince.map(province => ({
      ...province,
      expanded: false,
      visitedCount: 0
    }));
    this.setData({
      citiesData: processedData,
      displayData: processedData
    });
    this.calculateTotalCount();
    this.refreshData();
  },

  /** 统一刷新展示数据（加载 visited 状态 + 统计） */
  refreshData() {
    //从本地存储获取当前访问的列表id
    const currentMapId = wx.getStorageSync('currentMapId') || 'map1';
    // 从本地存储获取已访问的城市数据
    const visitedCities = wx.getStorageSync(`visitedCities_${currentMapId}`) || {};
    const updatedData = this.data.citiesData.map(province => {
      let visitedCount = 0;
      const cities = province.cities.map(city => {
        const cityKey = `${province.provinceCode}-${city.name}`;
        const record = visitedCities[cityKey];
        const isVisited = !!record?.on;
        if (isVisited) visitedCount++;
        return { ...city, visited: isVisited, note: record?.note || '', lastTime: record?.datetime || '' };
      });
      return { ...province, cities, visitedCount };
    });

    const zxs = updatedData.filter(p => ["110000","120000","310000","500000"].includes(p.provinceCode));
    const zxsVCount = zxs.reduce((sum,p) => sum + p.visitedCount, 0);

    const totalVisited = updatedData.reduce((sum, p) => sum + p.visitedCount, 0);
    const visitedPercent = this.data.totalCount ? Math.round((totalVisited / this.data.totalCount) * 100) : 0;

    this.setData({
      citiesData: updatedData,
      displayData: updatedData,
      zxs,
      zxsVCount,
      visitedCount: totalVisited,
      visitedPercent
    });
  },

  /** 计算总城市数 */
  calculateTotalCount() {
    const total = this.data.citiesData.reduce((sum, p) => sum + p.cities.length, 0);
    this.setData({ totalCount: total });
  },

  /** 点击城市，打开弹层 */
  onCityTap(e) {
    const city = e.currentTarget.dataset.city;
    const provinceCode = e.currentTarget.dataset.province;
    const cityKey = `${provinceCode}-${city.name}`;
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    const record = visitedCities[cityKey] || {};

    this.setData({
      currentCity: { ...city, provinceCode, key: cityKey }
    });

    const modal = this.selectComponent('#infoModal');
    modal.open({
      on: !!record.on,
      date: record.date || this._todayDate(),
      time: record.time || this._nowTime(),
      note: record.note || ''
    });
  },

  /** 弹层取消 */
  onModalCancel() {
    console.log('用户取消');
  },

  /** 弹层确认保存 */
  onModalConfirm(e) {
    const detail = e.detail; // { on, date, time, datetime, note }
    const city = this.data.currentCity;
    if (!city) return;
    //从本地存储获取当前访问的列表id
    const currentMapId = wx.getStorageSync('currentMapId') || 'map1';
    // 从本地存储获取已访问的城市数据
    const visitedCities = wx.getStorageSync(`visitedCities_${currentMapId}`) || {};

    visitedCities[city.key] = detail;

    wx.setStorageSync(`visitedCities_${currentMapId}`, visitedCities);

    // 更新展示数据
    this.refreshData();

    wx.showToast({
      title: detail.on ? `点亮了${city.name}` : `关闭了${city.name}`,
      icon: 'success',
      duration: 1000
    });
  },

  /** 搜索城市或省份 */
  onSearchInput(e) {
    const searchText = e.detail.value.trim();
    this.setData({ searchText });

    if (!searchText) {
      this.setData({ displayData: this.data.citiesData });
      return;
    }

    const filteredData = this.data.citiesData.map(province => {
      const provinceMatch = province.province.includes(searchText);
      const matchedCities = province.cities.filter(c => c.name.includes(searchText));
      if (provinceMatch || matchedCities.length) {
        return {
          ...province,
          expanded: true,
          cities: provinceMatch ? province.cities : matchedCities
        };
      }
      return null;
    }).filter(Boolean);

    this.setData({ displayData: filteredData });
  },

  /** 当前日期与时间 */
  _todayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  _nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
});
