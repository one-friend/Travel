// utils/canvasExport.js
export function exportEChartImage(echartsComponent, opts = {}) {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery();
    query.select(`#${echartsComponent.id}`).boundingClientRect(rect => {
      const width = rect.width;
      const height = rect.height;
      const dpr = wx.getSystemInfoSync().pixelRatio;

      echartsComponent.canvasToTempFilePath({
        width,
        height,
        destWidth: width * dpr * 2,
        destHeight: height * dpr * 2,
        fileType: opts.fileType || 'png',
        quality: opts.quality || 1,
        success(res) {
          resolve(res.tempFilePath);
        },
        fail(err) {
          reject(err);
        }
      });
    }).exec();
  });
}
