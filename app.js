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
    }
  },
  globalData: {
    userInfo: null
  },
  setGlobalData: function(key,data) {
    this.globalData[key] = data;
  },
})
