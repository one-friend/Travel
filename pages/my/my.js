const app = getApp();

Page({
  data: {
    userInfo: {
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      nickName: '微信用户'
    },
    visitedCities: [],
    maps: [
      { name: '足迹1', id: 'map1' },
      { name: '足迹2', id: 'map2' },
      { name: '足迹3', id: 'map3' }
    ],
    currentMapIndex: 0,
    currentMapName: '足迹1',
    showDetailModal: false,
    showCreateModal: false,
    showRenameModal: false,
    currentCity: {},
    newMapName: '',
    renameText: '',
    renamingIndex: -1
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    const maps = wx.getStorageSync('maps') || this.data.maps;
    
    // 初始化每个足迹的数据
    this.initializeMapsData(maps);
    const currentMapId = wx.getStorageSync('currentMapId') || maps[this.data.currentMapIndex].id;
    const visitedCities = wx.getStorageSync(`visitedCities_${currentMapId}`) || {};
    
    this.setData({
      userInfo,
      maps,
      currentMapName: maps[this.data.currentMapIndex].name,
      visitedCities: this._parseVisitedCities(visitedCities),
      currentMapIndex: maps.findIndex(item => item.id === currentMapId)
    });
  },

  // 初始化足迹数据
  initializeMapsData(maps) {
    maps.forEach(map => {
      const mapData = wx.getStorageSync(`visitedCities_${map.id}`);
      if (!mapData) {
        wx.setStorageSync(`visitedCities_${map.id}`, {});
      }
    });
  },

  // 提取已点亮城市
  _parseVisitedCities(data) {
    return Object.keys(data)
      .filter(key => data[key]?.on === true)
      .map(key => ({
        key,
        name: key.split('-')[1],
        date: data[key].date,
        datetime: data[key].datetime,
        note: data[key].note || ''
      }))
      .sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));
  },

  // 切换足迹
  switchMap(e) {
    const index = e.currentTarget.dataset.index;
    const currentMapId = this.data.maps[index].id;
    
    // 加载新足迹的数据
    const visitedCities = wx.getStorageSync(`visitedCities_${currentMapId}`) || {};
    wx.setStorageSync('currentMapId', currentMapId)
    this.setData({
      currentMapIndex: index,
      currentMapName: this.data.maps[index].name,
      visitedCities: this._parseVisitedCities(visitedCities)
    });
  },

  // 显示创建足迹弹层
  showCreateModal() {
    this.setData({
      showCreateModal: true,
      newMapName: `足迹${this.data.maps.length + 1}`
    });
  },

  // 关闭创建足迹弹层
  closeCreateModal() {
    this.setData({
      showCreateModal: false,
      newMapName: ''
    });
  },

  // 新足迹名称输入
  onNewMapNameInput(e) {
    this.setData({
      newMapName: e.detail.value
    });
  },

  // 确认创建足迹
  confirmCreateMap() {
    const { newMapName, maps } = this.data;
    
    if (!newMapName.trim()) {
      wx.showToast({
        title: '名称不能为空',
        icon: 'none'
      });
      return;
    }

    // 检查名称是否重复
    const isDuplicate = maps.some(map => map.name === newMapName.trim());
    if (isDuplicate) {
      wx.showToast({
        title: '名称已存在',
        icon: 'none'
      });
      return;
    }

    // 生成新的足迹ID和名称
    const newMapId = `map${Date.now()}`;
    const newMap = {
      name: newMapName.trim(),
      id: newMapId
    };

    // 更新maps数据
    const newMaps = [...maps, newMap];
    
    // 初始化新足迹的数据存储
    wx.setStorageSync(`visitedCities_${newMapId}`, {});

    this.setData({
      maps: newMaps,
      showCreateModal: false,
      newMapName: ''
    });

    // 保存到本地存储
    wx.setStorageSync('maps', newMaps);
    
    wx.showToast({
      title: '创建成功',
      icon: 'success'
    });
  },

  // 显示重命名弹层
  showRenameModal(e) {
    const index = e.currentTarget.dataset.index;
    const currentName = this.data.maps[index].name;
    
    this.setData({
      showRenameModal: true,
      renamingIndex: index,
      renameText: currentName
    });
  },

  // 关闭重命名弹层
  closeRenameModal() {
    this.setData({
      showRenameModal: false,
      renamingIndex: -1,
      renameText: ''
    });
  },

  // 重命名输入
  onRenameInput(e) {
    this.setData({
      renameText: e.detail.value
    });
  },

  // 确认重命名
  confirmRename() {
    const { renamingIndex, renameText, maps } = this.data;
    
    if (!renameText.trim()) {
      wx.showToast({
        title: '名称不能为空',
        icon: 'none'
      });
      return;
    }

    // 检查名称是否重复（排除自己）
    const isDuplicate = maps.some((map, index) => 
      index !== renamingIndex && map.name === renameText.trim()
    );
    if (isDuplicate) {
      wx.showToast({
        title: '名称已存在',
        icon: 'none'
      });
      return;
    }

    // 更新maps数据
    const newMaps = [...maps];
    newMaps[renamingIndex].name = renameText.trim();
    
    this.setData({
      maps: newMaps,
      currentMapName: renamingIndex === this.data.currentMapIndex ? renameText.trim() : this.data.currentMapName
    });

    // 保存到本地存储
    wx.setStorageSync('maps', newMaps);
    
    this.closeRenameModal();
    
    wx.showToast({
      title: '重命名成功',
      icon: 'success'
    });
  },

  chooseAvatar(e) {
    let { userInfo } = this.data;
    userInfo.avatarUrl = e.detail.avatarUrl;
    this._syncUserInfo(userInfo);
  },

  inputNickName(e) {
    let { userInfo } = this.data;
    userInfo.nickName = e.detail.value;
    this._syncUserInfo(userInfo);
  },

  _syncUserInfo(userInfo) {
    this.setData({ userInfo });
    wx.setStorageSync('userInfo', userInfo);
    app.setGlobalData && app.setGlobalData('userInfo', userInfo);
  },

  // 显示城市详情
  showCityDetail(e) {
    const city = e.currentTarget.dataset.city;
    this.setData({
      showDetailModal: true,
      currentCity: city
    });
  },

  // 关闭弹层
  closePopup() {
    this.setData({
      showDetailModal: false,
      currentCity: {}
    });
  },

  // 阻止事件冒泡
  stopTap() {
    return;
  },

  // 退出登录
  logout() {
    // wx.removeStorageSync('userInfo');
  }
});