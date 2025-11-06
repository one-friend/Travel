Page({
  data: {
    userInfo: {},
    visitedCities: [],
  },

  onLoad() {
    // 假设你已经获取了用户信息和已点亮的城市
    const visitedCities = wx.getStorageSync('visitedCities') || {}
    this.setData({
      userInfo: wx.getStorageSync('userInfo'),  // 从缓存获取用户信息
      visitedCities: this.getCitiesWithTrueValue(visitedCities), // 从缓存获取已点亮城市
    });
  },
  getCitiesWithTrueValue(data) {
    return Object.keys(data)
      .filter(key => data[key] === true)  // 过滤出值为 true 的城市
      .map(key => key.split('-')[1]);     // 提取城市名（按 "-" 分割，取第二部分）
  },
  // 跳转到个人资料页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings',  // 你需要自己实现这个页面
    });
  },

  // 跳转到帮助页面
  goToHelp() {
    wx.navigateTo({
      url: '/pages/help/help',  // 你需要自己实现这个页面
    });
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('userInfo');  // 清除用户信息缓存
    wx.removeStorageSync('visitedCities');  // 清除已点亮城市缓存
    wx.reLaunch({
      url: '/pages/login/login',  // 跳转到登录页
    });
  }
});
