export const geojson = (provinceCode) => {
  return new Promise((resolve,reject) => {
    wx.request({
      url: `https://geojson.cn/api/china/1.6.2/${provinceCode}.json`,
      success: function(res) {
        resolve(res && res.data)
      }
    })
  })
}