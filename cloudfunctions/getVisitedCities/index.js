const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event) => {
  const { mapId } = event;

  try {
    const res = await db.collection('visitedCities')
      .where({ mapId })
      .get();

    if (res.data.length > 0) {
      return {
        success: true,
        data: res.data[0].cities
      };
    }

    return {
      success: true,
      data: {}
    };
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
};
