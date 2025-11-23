// cloudfunctions/updateVisitedCities/index.js 
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { mapId, cityKey, detail } = event;
  const wxContext = cloud.getWXContext(); // 获取用户的 OPENID

  try {
    // 仅查询当前用户 (通过 _openid) 且 mapId 匹配的记录
    const res = await db.collection('visitedCities')
      .where({
        mapId,
        _openid: wxContext.OPENID // 加上用户 OPENID 作为查询条件
      })
      .get();

    let visitedCities = res.data.length > 0 ? res.data[0].cities : {};

    // 更新城市的访问数据
    visitedCities[cityKey] = {
      ...visitedCities[cityKey],
      ...detail
    };

    if (res.data.length > 0) {
      // 找到记录，更新数据
      await db.collection('visitedCities')
        .doc(res.data[0]._id)
        .update({
          data: {
            cities: visitedCities,
            updateTime: db.serverDate() // 更新时间
          }
        });
    } else {
      // 如果没有记录（比如用户第一次更新），插入新数据，并带上 OPENID
      await db.collection('visitedCities').add({
        data: {
          mapId,
          cities: visitedCities,
          _openid: wxContext.OPENID, // 用户的唯一标识
          createTime: db.serverDate()
        }
      });
    }

    return {
      success: true,
      message: "城市访问状态更新成功"
    };

  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
};