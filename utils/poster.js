// utils/poster.js
import { exportEChartImage } from './canvasExport';
import { drawRoundImg, drawTextBlock } from './drawHelper';

export function createSharePoster(options) {
  return new Promise(async (resolve, reject) => {
    try {
      const { chartComponent, userInfo, text, watermark, logo } = options;
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

      // 3. 设置固定海报尺寸
      const posterWidth = 600;
      const posterHeight = 1000;
      const dpr = wx.getSystemInfoSync().pixelRatio;

      const ctx = wx.createCanvasContext('posterCanvas');

      // 4. 背景设计：渐变色 + 纹理效果
      const gradient = ctx.createLinearGradient(0, 0, 0, posterHeight);
      gradient.addColorStop(0, '#011f38');  // 深蓝色
      gradient.addColorStop(1, '#074974');  // 过渡到灰蓝色
      ctx.setFillStyle(gradient);
      ctx.fillRect(0, 0, posterWidth, posterHeight);
      
      // 加入微妙的纹理效果（可以是某种艺术的模糊图案或者渐变）
      // ctx.setFillStyle('rgba(255, 255, 255, 0.1)');
      // ctx.beginPath();
      // ctx.arc(posterWidth / 2, posterHeight / 3, 200, 0, Math.PI * 2);
      // ctx.fill();


      // 5. 头像 + 昵称
      const avatarSize = 80;
      const avatarX = 40;
      const avatarY = avatarSize - 40;
      await drawRoundImg(ctx, userInfo.avatar, avatarX, avatarY, avatarSize);

      // 第一段文字
      ctx.setFillStyle('#FFFFFF');
      ctx.setFontSize(26);
      ctx.font = 'italic 26px "Times New Roman", serif';
      ctx.setTextAlign('left');
      ctx.setTextBaseline('alphabetic');
      ctx.setShadow(2, 2, 5, 'rgba(0, 0, 0, 0.3)');
      ctx.fillText(userInfo.nickname, avatarX + avatarSize + 10, avatarY + 35);

      // 完全重置第二段文字的所有样式
      ctx.setFillStyle('#BDC3C7');
      ctx.setFontSize(22);
      ctx.font = 'normal 22px sans-serif';
      ctx.setTextAlign('left');
      ctx.setTextBaseline('alphabetic');
      ctx.setShadow(0, 0, 0, 'rgba(0, 0, 0, 0)'); // 明确清除阴影
      ctx.fillText(`这里写点文案`, avatarX + avatarSize + 10, avatarY + 65);

      // 6. 顶部区域：标题
      const titleH = avatarY + avatarSize + 70
      ctx.setFontSize(46);
      ctx.setFillStyle('#FFFFFF'); // 白色文字
      ctx.setTextAlign('left');
      ctx.font = 'bold 46px "Helvetica Neue", sans-serif';  // 艺术字体
      ctx.fillText('山川有迹-脚步有光', avatarX, titleH);

      // 7. 副文案
      drawTextBlock(ctx, '我用脚步丈量世界 ，用心点亮每一座城市',avatarX, titleH + 70, posterWidth / 2, 50, '#FFFFFF', 32)

      // 8. 图表区域：增加边框 + 光影效果
      const chartMaxWidth = posterWidth;
      const chartMaxHeight = 500;
      
      const chartRatio = imageInfo.width / imageInfo.height;
      let chartWidth = chartMaxWidth;
      let chartHeight = chartWidth / chartRatio;
      
      if (chartHeight > chartMaxHeight) {
        chartHeight = chartMaxHeight;
        chartWidth = chartHeight * chartRatio;
      }

      const chartX = (posterWidth - chartWidth) / 2;
      const chartY = titleH + 100;

      // 绘制图表背景：精致边框 + 投影效果
      // ctx.setFillStyle('#F7F7F7');  // 浅色背景
      // ctx.fillRect(chartX, chartY, chartWidth, chartHeight); // 绘制背景，不加边框
      // ctx.fillRect(chartX - 15, chartY - 15, chartWidth + 30, chartHeight + 30); // 加粗边框
      // ctx.setShadow(5, 5, 15, 'rgba(0, 0, 0, 0.2)'); // 添加阴影效果
      // ctx.fillRect(chartX - 15, chartY - 15, chartWidth + 30, chartHeight + 30); // 绘制阴影边框
      // ctx.setShadow(0, 0, 0, 'rgba(0, 0, 0, 0)'); // 清除阴影

      // 绘制图表
      ctx.drawImage(chartImage, chartX, chartY, chartWidth, chartHeight);

      // 9. 底部文案
      const bottomY = chartY + chartHeight + 10;
      drawTextBlock(ctx, '已点亮 4 个城市 ， 色彩正在继续',avatarX, bottomY, posterWidth , 50, '#FFFFFF', 32);


      // 10. 添加底部logo：保持简洁
      const logoSize = 50;
      const logoX = posterWidth - logoSize - 20;
      const logoY = posterHeight - logoSize - 20;
      if (logo) {
        await drawRoundImg(ctx, 'cloud://cloud1-6gdihppzc46de958.636c-cloud1-6gdihppzc46de958-1385249519/gh_c084e7dde486_258.jpg', logoX, logoY, logoSize);
      }

      // 10. 绘制并导出
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
