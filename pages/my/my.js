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
    showDescriptionModal: false, 
    currentDescription: '',      
    descriptionInput: '',        
    currentCity: {},
    newMapName: '',
    renameText: '',
    renamingIndex: -1
  },

  async onShow() {
    const maps = wx.getStorageSync('maps') || this.data.maps;
    const currentMapId = wx.getStorageSync('currentMapId') || maps[this.data.currentMapIndex].id;
    
    const currentIndex = maps.findIndex(item => item.id === currentMapId);
    
    this.setData({
      maps,
      currentMapIndex: currentIndex > -1 ? currentIndex : 0,
      currentMapName: maps[currentIndex > -1 ? currentIndex : 0].name,
    });
    
    // 核心修改：使用 await 等待当前地图的数据在云端被创建，确保后续操作有文档可读写
    wx.showLoading({ title: '加载数据中', mask: true });
    try {
        await this._ensureMapData(currentMapId);
        // 数据创建或确保存在后，再获取和展示数据
        this.getVisitedCities(currentMapId);
    } catch (e) {
        console.error('初始化数据失败:', e);
        wx.showToast({ title: '初始化失败', icon: 'none' });
    } finally {
        wx.hideLoading();
    }
    
    // 加载用户信息（与其他数据无强依赖关系，可异步）
    this._loadUserInfo();
  },
    
  /**
   * 确保足迹数据在云端有记录 (现在返回 Promise，可 await)
   * @param {string} mapId - 当前地图 ID
   */
  _ensureMapData(mapId) {
    return wx.cloud.callFunction({
      name: 'mapService',
      data: {
        action: 'ensureMapData',
        mapId: mapId
      }
    }).then(res => {
      if (!res.result.success) {
        throw new Error(res.result.errMsg || '云端初始化失败');
      }
      return res;
    }).catch(err => {
      console.error(`调用 ensureMapData 失败 for ${mapId}`, err);
      // 抛出错误，以便 onShow 可以捕获
      throw err;
    });
  },

  // 从云数据库获取已访问城市数据和文案
  getVisitedCities(mapId) {
    const db = wx.cloud.database();
    db.collection('visitedCities').where({
      mapId: mapId
    }).get({
      success: res => {
        const data = res.data[0];
        const visitedCities = data ? data.cities : {};
        // 提取 description，提供一个友好的默认值
        const description = data && data.description !== undefined ? data.description : '这是一个新的足迹，还没有任何介绍哦！';
        
        this.setData({
          visitedCities: this._parseVisitedCities(visitedCities),
          currentDescription: description // 更新当前文案
        });
      },
      fail: err => {
        console.error('获取已访问城市失败', err);
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
    
    wx.setStorageSync('currentMapId', currentMapId)
    this.setData({
      currentMapIndex: index,
      currentMapName: this.data.maps[index].name
    });
    
    // 切换地图时，也要确保数据存在并获取
    wx.showLoading({ title: '切换中', mask: true });
    this._ensureMapData(currentMapId)
      .then(() => {
          this.getVisitedCities(currentMapId);
      })
      .catch(e => {
           wx.showToast({ title: '数据加载失败', icon: 'none' });
           console.error('切换地图数据初始化失败:', e);
      })
      .finally(() => {
          wx.hideLoading();
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

  // 确认创建足迹 (使用云函数)
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
    const name = newMapName.trim();
    const isDuplicate = maps.some(map => map.name === name);
    if (isDuplicate) {
      wx.showToast({
        title: '名称已存在',
        icon: 'none'
      });
      return;
    }

    // 生成新的足迹ID
    const newMapId = `map${Date.now()}`;
    
    // 调用云函数创建地图数据
    wx.cloud.callFunction({
      name: 'mapService',
      data: {
        action: 'createMap',
        mapId: newMapId
      }
    }).then(res => {
      if (res.result.success) {
        // 客户端更新 maps 列表
        const newMap = { name: name, id: newMapId };
        const newMaps = [...maps, newMap];
        
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
      } else {
        throw new Error(res.result.errMsg || '创建地图数据失败');
      }
    }).catch(err => {
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      });
      console.error('调用 createMap 云函数失败', err);
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
    const name = renameText.trim();
    const isDuplicate = maps.some((map, index) => 
      index !== renamingIndex && map.name === name
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
    newMaps[renamingIndex].name = name;
    
    this.setData({
      maps: newMaps,
      currentMapName: renamingIndex === this.data.currentMapIndex ? name : this.data.currentMapName
    });

    // 保存到本地存储
    wx.setStorageSync('maps', newMaps);
    
    this.closeRenameModal();
    
    wx.showToast({
      title: '重命名成功',
      icon: 'success'
    });
  },
  
  // 显示说明文案编辑弹层
  showDescriptionModal() {
    this.setData({
      showDescriptionModal: true,
      descriptionInput: this.data.currentDescription 
    });
  },

  // 关闭说明文案编辑弹层
  closeDescriptionModal() {
    this.setData({
      showDescriptionModal: false,
      descriptionInput: ''
    });
  },

  // 说明文案输入
  onDescriptionInput(e) {
    this.setData({
      descriptionInput: e.detail.value
    });
  },

  // 确认更新说明文案 (使用云函数)
  confirmUpdateDescription() {
    const { currentMapIndex, maps, descriptionInput } = this.data;
    const currentMapId = maps[currentMapIndex].id;
    const newDescription = descriptionInput.trim();

    if (!newDescription) {
      wx.showToast({
        title: '文案不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 调用云函数更新描述
    wx.cloud.callFunction({
      name: 'mapService',
      data: {
        action: 'updateDescription',
        mapId: currentMapId,
        description: newDescription
      }
    }).then(res => {
      if (res.result.success) {
        // 更新成功后，更新本地数据和UI
        this.setData({
          currentDescription: newDescription,
          showDescriptionModal: false
        });
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 这里的错误会被捕获并显示 '云端更新失败'
        // 现在云函数会返回 'No matching record found...' 如果 document 不存在
        throw new Error(res.result.errMsg || '云端更新失败');
      }
    }).catch(err => {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
      console.error('调用 updateDescription 云函数失败', err);
    });
  },
  
  // --- 用户信息相关逻辑保持不变 ---

  async _loadUserInfo() {
    // 1. 本地缓存
    const local = wx.getStorageSync('userInfo');
    if (local && Object.keys(local).length > 0) {
      this.setData({ userInfo: local });
      app.setGlobalData && app.setGlobalData('userInfo', local);
      return;
    }

    // 2. 云数据库
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserInfo',
      });

      if (res && res.result && res.result.data) {
        const cloudInfo = res.result.data;
        this.setData({ userInfo: cloudInfo });
        wx.setStorageSync('userInfo', cloudInfo);
        app.setGlobalData && app.setGlobalData('userInfo', cloudInfo);
      } else {
        this._initUserInfo();
      }

    } catch (err) {
      console.error("❌ 获取云端用户信息失败", err);
    }
  },

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

  async chooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    const cloudUrl = await this._uploadAvatar(tempPath);
    this._updateUserInfo({ avatarUrl: cloudUrl });
  },

  inputNickName(e) {
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
      return res.fileID;
    } catch (err) {
      console.error("❌ 上传失败，使用临时路径：", err);
      return tempPath; 
    }
  },
  
  _updateUserInfo(changes) {
    const userInfo = { ...this.data.userInfo, ...changes };
    this.setData({ userInfo });
    wx.setStorageSync('userInfo', userInfo);
    app.setGlobalData && app.setGlobalData('userInfo', userInfo);

    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      this._syncUserInfoToCloud(userInfo);
    }, 600);
  },

  async _syncUserInfoToCloud(userInfo) {
    try {
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { userInfo }
      });
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
    // 退出逻辑
  },

  goListPage(){
    wx.navigateTo({
      url: '/pages/cityList/cityList'
    })
  }
});