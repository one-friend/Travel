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
    // 获取当前足迹ID
    const currentMapId = wx.getStorageSync('currentMapId') || 'map1';

    // 获取云数据库中的已访问城市数据
    this.getVisitedCities(currentMapId);
  },

  /** 从云数据库获取已访问城市数据 */
  getVisitedCities(mapId) {
    wx.cloud.callFunction({
      name: 'getVisitedCities',
      data: { mapId },
      success: res => {
        const visitedCities = res.result.success ? res.result.data : {};
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
        const zxsVCount = zxs.reduce((sum, p) => sum + p.visitedCount, 0);

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
      fail: err => {
        console.error('获取已访问城市失败', err);
      }
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

    this.setData({
      currentCity: { ...city, provinceCode, key: cityKey }
    });

    const modal = this.selectComponent('#infoModal');
    modal.open({
      on: !!this.data.currentCity.visited,
      date: this.data.currentCity.lastTime || this._todayDate(),
      time: this.data.currentCity.time || this._nowTime(),
      note: this.data.currentCity.note || ''
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
  
    // 获取当前足迹ID
    const currentMapId = wx.getStorageSync('currentMapId') || 'map1';
  
    // 在本地更新数据
    const citiesData = [...this.data.citiesData];
    let zxs = [];  // 直辖市
    let zxsVCount = 0;  // 直辖市已访问数量
  
    citiesData.forEach(province => {
      // 判断是否是直辖市（省份代码为 110000, 120000, 310000, 500000）
      const isZxs = ["110000", "120000", "310000", "500000"].includes(province.provinceCode);
  
      let visitedCount = 0;  // 每个省份的已访问城市数量
      province.cities.forEach(cityItem => {
        const cityKey = `${province.provinceCode}-${cityItem.name}`;
        if (cityKey === city.key) {
          // 更新对应城市的访问状态
          cityItem.visited = detail.on;
          cityItem.note = detail.note || '';
          cityItem.lastTime = detail.datetime || '';
        }
  
        // 统计已访问城市
        if (cityItem.visited) {
          visitedCount++;
        }
      });
  
      // 更新每个省份的访问数量
      province.visitedCount = visitedCount;
  
      // 处理直辖市数据
      if (isZxs) {
        zxs.push(province);  // 添加到直辖市列表
        zxsVCount += visitedCount;  // 统计直辖市的已访问城市数量
      }
    });
  
    // 更新视图
    this.setData({
      citiesData,
      displayData: citiesData,
      zxs,  // 更新直辖市列表
      zxsVCount,  // 更新直辖市已访问数量
    });
  
    // 保存到云数据库（异步操作）
    this.saveVisitedCity(currentMapId, city.key, detail);
  
    wx.showToast({
      title: detail.on ? `点亮了${city.name}` : `关闭了${city.name}`,
      icon: 'success',
      duration: 1000
    });
  },
  
  

  /** 保存城市访问状态到云数据库 */
  saveVisitedCity(mapId, cityKey, detail) {
    wx.cloud.callFunction({
      name: 'updateVisitedCities',
      data: { mapId, cityKey, detail },
      success: res => {
        console.log('城市访问状态已更新');
      },
      fail: err => {
        console.error('更新城市访问状态失败', err);
      }
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
