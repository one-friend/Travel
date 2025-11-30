export const geojson = (provinceCode) => {
  return new Promise((resolve,reject) => {
    console.log(provinceCode)
    const geo =  wx.getStorageSync(provinceCode);
    if(geo){
      resolve(geo)
      return
    }
    wx.request({
      url: `https://geojson.cn/api/china/1.6.2/${provinceCode}.json`,
      success: function(res) {
        resolve(res && res.data)
        wx.setStorageSync(provinceCode, res.data)
      }
    })
  })
}