const app = getApp();
let updateTimer = null;
Page({
  data: {
    userInfo: {
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      nickName: '微信用户'
    },
    visitedCities: [],
    maps: [],
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
    await this._loadUserInfo();
    const maps = this.data.userInfo.maps;
    const currentMapId = wx.getStorageSync('currentMapId') || (maps.length > 0 ? maps[this.data.currentMapIndex].id : null);
    
    if (!currentMapId || maps.length === 0) {
      if (maps.length === 0) {
        // 如果用户没有任何地图，可以考虑初始化一个默认地图
        const defaultMap = { name: '足迹1', id: 'map1' };
        this._initUserInfo(defaultMap); 
        this.setData({
          maps: [defaultMap],
          currentMapName: defaultMap.name,
        });
        wx.setStorageSync('currentMapId', defaultMap.id);
        
        await this._ensureMapData(defaultMap.id);
        await this.getVisitedCities(defaultMap.id);
      }
      return;
    }

    const currentIndex = maps.findIndex(item => item.id === currentMapId);
    const initialIndex = currentIndex > -1 ? currentIndex : 0;
    
    this.setData({
      maps,
      currentMapIndex: initialIndex,
      currentMapName: maps[initialIndex].name,
    });
    
    wx.showLoading({ title: '加载数据中', mask: true });
    try {
        // 1. 确保数据存在 (调用 mapService/ensureMapData)
        await this._ensureMapData(currentMapId);
        // 2. 获取和展示数据 (调用云函数)
        await this.getVisitedCities(currentMapId);
    } catch (e) {
        console.error('初始化数据失败:', e);
        wx.showToast({ title: '初始化/加载失败', icon: 'none' });
    } finally {
        wx.hideLoading();
    }
  },
    
  /**
   * 确保足迹数据在云端有记录 (调用 mapService/ensureMapData)
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
      throw err;
    });
  },

  /**
   * ⚠️ 核心修改：从云数据库获取已访问城市数据和文案，改为分别调用云函数
   */
  async getVisitedCities(mapId) {
    try {
        // 1. 调用 getVisitedCities 云函数获取已访问城市数据
        const citiesRes = await wx.cloud.callFunction({
          name: 'getVisitedCities', // 获取 cities 数据
          data: { mapId: mapId }
        });
        
        if (!citiesRes.result.success) {
            throw new Error(citiesRes.result.message || '获取城市数据失败');
        }

        const visitedCitiesData = citiesRes.result.data; // {城市Key: 城市详情} 的对象

        // 2. 调用 mapService 云函数获取 description 文案
        const descriptionRes = await wx.cloud.callFunction({
            name: 'mapService',
            data: {
                action: 'getDescription', // 新增的 action
                mapId: mapId
            }
        });
        
        if (!descriptionRes.result.success) {
             throw new Error(descriptionRes.result.message || '获取文案失败');
        }

        const description = descriptionRes.result.data.description; 

        this.setData({
          visitedCities: this._parseVisitedCities(visitedCitiesData),
          currentDescription: description
        });

    } catch (err) {
      console.error('❌ 获取地图数据失败 (云函数调用失败)', err);
      wx.showToast({ title: '加载地图数据失败', icon: 'none' });
      this.setData({ visitedCities: [], currentDescription: '数据加载失败，请重试。' });
    }
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
          this.getVisitedCities(currentMapId); // 调用优化的获取方法
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

  // 确认创建足迹 (调用 mapService/createMap)
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

        this._updateUserInfo({ maps: newMaps, });

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

    this._updateUserInfo({ maps: newMaps, });
    
    this.closeRenameModal();
    
    wx.showToast({
      title: '重命名成功',
      icon: 'success'
    });
  },

  // 删除足迹地图
  deleteMap(e) {
    const index = e.currentTarget.dataset.index;
    const mapToDelete = this.data.maps[index];

    wx.showModal({
      title: '删除确认',
      content: `确定要删除足迹地图：${mapToDelete.name} 吗？\n所有点亮城市记录也将被删除！`,
      confirmText: '删除',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 1. 调用云函数删除地图数据 (假设 mapOperations 提供了 deleteMap)
            // ⚠️ 确保 mapOperations/deleteMap 云函数也做了 OPENID 隔离
            await wx.cloud.callFunction({
              name: 'mapOperations',
              data: {
                action: 'deleteMap',
                mapId: mapToDelete.id
              }
            });

            // 2. 更新本地数据
            const newMaps = this.data.maps.filter((_, i) => i !== index);
            console.log(newMaps)
            let newCurrentMapId = newMaps.length > 0 ? newMaps[0].id : null;
            let newCurrentMapIndex = 0;
            
            if (mapToDelete.id !== wx.getStorageSync('currentMapId') && newMaps.length > 0) {
              // 如果删除的不是当前地图，则保持当前地图不变
              // newCurrentMapId = wx.getStorageSync('currentMapId');
              // newCurrentMapIndex = newMaps.findIndex(map => map.id === newCurrentMapId);
              // newCurrentMapIndex = newCurrentMapIndex > -1 ? newCurrentMapIndex : 0;
            } else if (newMaps.length > 0) {
              // 如果删除的是当前地图，切换到新列表的第一个
              newCurrentMapId = newMaps[0].id;
              newCurrentMapIndex = 0;
            }


            this.setData({
              maps: newMaps,
              currentMapIndex: newCurrentMapIndex,
              currentMapName: newMaps.length > 0 ? newMaps[newCurrentMapIndex].name : '我的足迹'
            });

            this._updateUserInfo({ maps: newMaps, });

            if (newMaps.length > 0) {
              wx.setStorageSync('currentMapId', newCurrentMapId);
              this.getVisitedCities(newCurrentMapId); // 重新加载新地图的数据
            } else {
              // 全部删光，设置空状态
              wx.removeStorageSync('currentMapId');
              this.setData({ visitedCities: [], currentDescription: '快来创建一个新的足迹吧！' });
            }

            wx.showToast({ title: '删除成功', icon: 'success' });
          } catch (error) {
            console.error('❌ 删除地图失败', error);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
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

  // 确认更新说明文案 (调用 mapService/updateDescription)
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
    return new Promise(async (resolve, reject) => {
      // 1. 本地缓存
      const local = wx.getStorageSync('userInfo');
      if (local && Object.keys(local).length > 0) {
        this.setData({ userInfo: local });
        app.setGlobalData && app.setGlobalData('userInfo', local);
        resolve()
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
          // 初始化默认用户数据
          this._initUserInfo();
        }
        resolve()
      } catch (err) {
        console.error("❌ 获取云端用户信息失败", err);
        resolve()
      }
    })
  },

  _initUserInfo(defaultMap) {
    const initData = {
      avatarUrl: this.data.userInfo.avatarUrl,
      nickName: this.data.userInfo.nickName,
      maps: defaultMap ? [defaultMap] : [ { name: '足迹1', id: 'map1' } ],
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
      // ⚠️ 确保 updateUserInfo 云函数也实现了 OPENID 隔离
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