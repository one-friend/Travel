// cloudfunctions/createMap/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { mapId, cities } = event;
  const wxContext = cloud.getWXContext(); // 获取用户的 OPENID

  try {
    // 创建新的足迹记录，并关联到当前用户的 OPENID
    await db.collection('visitedCities').add({
      data: {
        mapId: mapId,
        cities: cities || {},  // 默认空对象
        description: '这是我的新足迹，欢迎点亮更多城市！',
        _openid: wxContext.OPENID, // 用户的唯一标识
        createTime: db.serverDate() // 创建时间
      }
    });

    return {
      success: true,
      message: '足迹创建成功'
    };
  } catch (err) {
    console.error('创建足迹失败', err);
    return {
      success: false,
      message: err.message
    };
  }
};