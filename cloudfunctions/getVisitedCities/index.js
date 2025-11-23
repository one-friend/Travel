// cloudfunctions/getVisitedCities/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { mapId } = event;
  const wxContext = cloud.getWXContext(); // 获取用户的 OPENID

  try {
    // 仅查询当前用户 (通过 _openid) 且 mapId 匹配的记录
    const res = await db.collection('visitedCities')
      .where({
        mapId,
        _openid: wxContext.OPENID // 确保只查询当前用户的记录
      })
      .get();

    if (res.data.length > 0) {
      return {
        success: true,
        data: res.data[0].cities // 只返回 cities 数据
      };
    }

    // 如果没有找到记录，返回空对象
    return {
      success: true,
      data: {}
    };
  } catch (err) {
    console.error('获取足迹失败', err);
    return {
      success: false,
      message: err.message
    };
  }
};