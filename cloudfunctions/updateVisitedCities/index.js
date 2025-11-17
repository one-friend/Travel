const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event) => {
  const { mapId, cityKey, detail } = event;

  try {
    const res = await db.collection('visitedCities')
      .where({ mapId })
      .get();

    let visitedCities = res.data.length > 0 ? res.data[0].cities : {};

    // 更新城市的访问数据
    visitedCities[cityKey] = {
      ...visitedCities[cityKey],
      ...detail
    };

    if (res.data.length > 0) {
      // 更新数据
      await db.collection('visitedCities')
        .doc(res.data[0]._id)
        .update({
          data: {
            cities: visitedCities
          }
        });
    } else {
      // 如果没有记录，插入新数据
      await db.collection('visitedCities').add({
        data: {
          mapId,
          cities: visitedCities
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
