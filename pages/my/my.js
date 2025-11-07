Page({
  data: {
    userInfo: {
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      nickName:'微信用户'
    },
    visitedCities: [],
  },

  onLoad() {
    // 假设你已经获取了用户信息和已点亮的城市
    const visitedCities = wx.getStorageSync('visitedCities') || {}
    this.setData({
      visitedCities: this.getCitiesWithTrueValue(visitedCities), // 从缓存获取已点亮城市
    });
  },
  getCitiesWithTrueValue(data) {
    return Object.keys(data)
      .filter(key => data[key] === true)  // 过滤出值为 true 的城市
      .map(key => key.split('-')[1]);     // 提取城市名（按 "-" 分割，取第二部分）
  },

  chooseAvatar(e){
    let { userInfo } = this.data;
    userInfo.avatarUrl = e.detail.avatarUrl;
    this.setData({
      userInfo
    })
  },

  inputNickName(e){
    let { userInfo } = this.data;
    userInfo.nickName = e.detail.value;
    this.setData({
      userInfo
    })
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
