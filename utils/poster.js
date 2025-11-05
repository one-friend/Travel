// utils/poster.js
import { exportEChartImage } from './canvasExport';
import { drawRoundImg, drawTextBlock } from './drawHelper';

export function createSharePoster(options) {
  return new Promise(async (resolve, reject) => {
    try {
      const { chartComponent, userInfo, text, watermark } = options;
      
      // 1. 导出图表
      const chartImage = await exportEChartImage(chartComponent);
      
      // 2. 获取图表实际尺寸
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: chartImage,
          success: resolve,
          fail: reject
        });
      });

      // 3. 设置固定海报尺寸（避免复杂计算）
      const posterWidth = 600;
      const posterHeight = 1000;
      const dpr = wx.getSystemInfoSync().pixelRatio;

      const ctx = wx.createCanvasContext('posterCanvas');

      // 4. 绘制背景
      ctx.setFillStyle('#ffffff');
      ctx.fillRect(0, 0, posterWidth, posterHeight);

      // 5. 顶部区域 - 用户信息
      // 头像
      await drawRoundImg(ctx, userInfo.avatar, 30, 30, 60);
      
      // 昵称和等级
      ctx.setFontSize(28);
      ctx.setFillStyle('#333333');
      ctx.fillText(userInfo.nickname, 110, 55);
      
      ctx.setFontSize(24);
      ctx.setFillStyle('#666666');
      ctx.fillText(`已点亮${userInfo.level || 100}°`, 110, 90);

      // 6. 标题区域
      ctx.setFontSize(32);
      ctx.setFillStyle('#000000');
      ctx.setTextAlign('center');
      ctx.fillText(text.title || '我已经点亮了100个地方', posterWidth / 2, 160);
      
      ctx.setFontSize(26);
      ctx.setFillStyle('#666666');
      ctx.fillText(text.desc || '探索世界的每一个角落', posterWidth / 2, 200);

      // 7. 图表区域 - 关键修复
      const chartMaxWidth = posterWidth - 80; // 左右各留40边距
      const chartMaxHeight = 500; // 固定最大高度
      
      // 按比例计算实际显示尺寸
      const chartRatio = imageInfo.width / imageInfo.height;
      let chartWidth = chartMaxWidth;
      let chartHeight = chartWidth / chartRatio;
      
      if (chartHeight > chartMaxHeight) {
        chartHeight = chartMaxHeight;
        chartWidth = chartHeight * chartRatio;
      }
      
      const chartX = (posterWidth - chartWidth) / 2;
      const chartY = 240;

      console.log('图表绘制参数:', {
        width: chartWidth,
        height: chartHeight,
        x: chartX,
        y: chartY,
        ratio: chartRatio
      });

      // 绘制图表背景
      ctx.setFillStyle('#f8f9fa');
      ctx.fillRect(chartX - 10, chartY - 10, chartWidth + 20, chartHeight + 20);
      
      // 绘制图表
      ctx.drawImage(chartImage, chartX, chartY, chartWidth, chartHeight);

      // 8. 底部区域
      const bottomY = chartY + chartHeight + 50;
      
      ctx.setFontSize(24);
      ctx.setFillStyle('#333333');
      ctx.fillText('继续去看看更大的世界吧', posterWidth / 2, bottomY);
      
      if (watermark) {
        ctx.setFontSize(20);
        ctx.setFillStyle('#999999');
        ctx.fillText(watermark, posterWidth / 2, bottomY + 40);
      }

      // 9. 绘制并导出
      ctx.draw(false, () => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'posterCanvas',
            destWidth: posterWidth * dpr,
            destHeight: posterHeight * dpr,
            success: (res) => {
              resolve(res.tempFilePath);
            },
            fail: reject
          });
        }, 500);
      });

    } catch (error) {
      reject(error);
    }
  });
}