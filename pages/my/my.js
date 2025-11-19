const app = getApp();
let updateTimer = null;
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
    const maps = wx.getStorageSync('maps') || this.data.maps;
    // 初始化每个足迹的数据
    this.initializeMapsData(maps);
    const currentMapId = wx.getStorageSync('currentMapId') || maps[this.data.currentMapIndex].id;
    
    // 从云数据库获取已访问城市数据
    this.getVisitedCities(currentMapId);

    this.setData({
      maps,
      currentMapName: maps[this.data.currentMapIndex].name,
      currentMapIndex: maps.findIndex(item => item.id === currentMapId)
    });
    this._loadUserInfo()
  },
    /**
   * 进入页面加载用户信息
   * 优先本地 → 无则云端 → 云端也没有则初始化
   */
  async _loadUserInfo() {
    // 1. 本地缓存
    const local = wx.getStorageSync('userInfo');
    console.log(local)
    if (local && Object.keys(local).length > 0) {
      this.setData({ userInfo: local });
      app.setGlobalData && app.setGlobalData('userInfo', local);
      console.log("📌 已从本地读取用户信息");
      return;
    }

    // 2. 云数据库
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
      });

      if (res && res.result && res.result.data) {
        const cloudInfo = res.result.data;

        // 存本地 & UI
        this.setData({ userInfo: cloudInfo });
        wx.setStorageSync('userInfo', cloudInfo);
        app.setGlobalData && app.setGlobalData('userInfo', cloudInfo);
        console.log("☁ 已从云端加载用户信息");

      } else {
        console.log("⚠ 云端无用户信息，初始化中...");
        this._initUserInfo();
      }

    } catch (err) {
      console.error("❌ 获取云端用户信息失败", err);
    }
  },

  /**
   * 首次使用时初始化用户信息
   */
  _initUserInfo() {
    const initData = {
      avatarUrl: '',
      nickName: '',
      createdAt: Date.now(),
    };

    this.setData({ userInfo: initData });
    wx.setStorageSync('userInfo', initData);
    app.setGlobalData && app.setGlobalData('userInfo', initData);
  },
  // 从云数据库获取已访问城市数据
  getVisitedCities(mapId) {
    const db = wx.cloud.database();
    db.collection('visitedCities').where({
      mapId: mapId
    }).get({
      success: res => {
        const visitedCities = res.data[0] ? res.data[0].cities : {};
        this.setData({
          visitedCities: this._parseVisitedCities(visitedCities)
        });
      },
      fail: err => {
        console.error('获取已访问城市失败', err);
      }
    });
  },

  // 初始化足迹数据
  initializeMapsData(maps) {
    maps.forEach(map => {
      this.checkMapData(map.id);
    });
  },

  // 检查足迹是否有数据，如果没有则创建空数据
  checkMapData(mapId) {
    const db = wx.cloud.database();
    db.collection('visitedCities').where({
      mapId: mapId
    }).get({
      success: res => {
        if (res.data.length === 0) {
          db.collection('visitedCities').add({
            data: {
              mapId: mapId,
              cities: {}
            }
          });
        }
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
    
    // 从云数据库获取新足迹的数据
    this.getVisitedCities(currentMapId);
    wx.setStorageSync('currentMapId', currentMapId)
    this.setData({
      currentMapIndex: index,
      currentMapName: this.data.maps[index].name
    });
  },

  // 创建新足迹
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

    // 将新足迹数据保存到云数据库
    const db = wx.cloud.database();
    db.collection('visitedCities').add({
      data: {
        mapId: newMapId,
        cities: {}
      },
      success: () => {
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
      fail: err => {
        wx.showToast({
          title: '创建失败',
          icon: 'none'
        });
        console.error('创建新足迹失败', err);
      }
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

  async chooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;

    // ① 上传到云存储
    const cloudUrl = await this._uploadAvatar(tempPath);

    // ② 存储 fileID
    this._updateUserInfo({ avatarUrl: cloudUrl });
  },

  inputNickName(e) {
    console.log(e)
    const nickName = e.detail.value.trim();
    this._updateUserInfo({ nickName });
  },

  async _uploadAvatar(tempPath) {
    try {
      const ext = tempPath.split('.').pop(); // jpg/png
      const cloudPath = `avatars/${Date.now()}.${ext}`;

      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      });

      console.log("☁ 上传成功 fileID:", res.fileID);
      return res.fileID;

    } catch (err) {
      console.error("❌ 上传失败，使用临时路径：", err);
      return tempPath; 
    }
  },
  /**
   * 核心统一处理用户信息更新
   * 1. 更新 UI
   * 2. 存本地缓存
   * 3. 同步到全局
   * 4. 自动节流后同步到云服务
   */
  _updateUserInfo(changes) {
    const userInfo = { ...this.data.userInfo, ...changes };

    // 更新 UI
    this.setData({ userInfo });

    // 本地缓存
    wx.setStorageSync('userInfo', userInfo);

    // 全局缓存
    app.setGlobalData && app.setGlobalData('userInfo', userInfo);

    // 600ms 节流后更新云端
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      this._syncUserInfoToCloud(userInfo);
    }, 600);
  },

   /**
   * 真正更新到云数据库
   */
  async _syncUserInfoToCloud(userInfo) {
    try {
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { userInfo }
      });
      console.log('☁ 用户信息已同步到云', userInfo);
    } catch (err) {
      console.error('❌ 同步失败：', err);
    }
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
  },

  goListPage(){
    wx.navigateTo({
      url: '/pages/cityList/cityList'
    })
  }
});
