// app.js
App({
  onLaunch() {
    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-6gdihppzc46de958', // 这里填你的云环境 ID
        traceUser: true
      })

      this._loadUserInfo()
    }
  },
  globalData: {
    userInfo: {
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      nickName: '微信用户'
    },
  },
  setGlobalData: function(key,data) {
    this.globalData[key] = data;
  },
  async _loadUserInfo() {
    // 1. 本地缓存
    const local = wx.getStorageSync('userInfo');
    console.log(local)
    if (local && Object.keys(local).length > 0) {
      this.setGlobalData && this.setGlobalData('userInfo', local);
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
        wx.setStorageSync('userInfo', cloudInfo);
        this.setGlobalData && this.setGlobalData('userInfo', cloudInfo);
        console.log("☁ 已从云端加载用户信息");

      } else {
        console.log("⚠ 云端无用户信息，初始化中...");
      }

    } catch (err) {
      console.error("❌ 获取云端用户信息失败", err);
    }
  },
})
