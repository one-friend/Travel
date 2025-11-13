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
    showDetailModal: false,
    currentCity: {}
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    const visitedCities = wx.getStorageSync('visitedCities') || {};
    this.setData({
      userInfo,
      visitedCities: this._parseVisitedCities(visitedCities)
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

  switchMap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentMapIndex: index });
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

  // 退出登录
  logout() {
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('visitedCities');
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
