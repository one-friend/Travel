// utils/canvasExport.js
export function exportEChartImage(echartsComponent, opts = {}) {
  return new Promise((resolve, reject) => {
    // 先等待一下确保图表渲染完成
    setTimeout(() => {
      const query = wx.createSelectorQuery();
      query.select(`#${echartsComponent.id}`).boundingClientRect(rect => {
        if (!rect || rect.width === 0) {
          reject(new Error('图表容器未找到或宽度为0'));
          return;
        }

        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        echartsComponent.canvasToTempFilePath({
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height,
          destWidth: rect.width * dpr,
          destHeight: rect.height * dpr,
          fileType: opts.fileType || 'png',
          quality: opts.quality || 1,
          success(res) {
            console.log('图表导出成功:', res.tempFilePath);
            resolve(res.tempFilePath);
          },
          fail: reject
        });
      }).exec();
    }, 1000); // 重要：给图表足够时间渲染
  });
}