// cloudfunctions/userData/index.js
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

// 工具函数：获取用户记录，若不存在则创建
async function getOrCreateUser(openid) {
  const res = await db.collection('user_data').doc(openid).get().catch(() => null)
  if (res && res.data) return res.data
  
  const newDoc = {
    _id: openid,
    visited: {},
    updatedAt: Date.now()
  }
  await db.collection('user_data').doc(openid).set({ data: newDoc })
  return newDoc
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, payload } = event

  switch(action) {
    case 'get':
      return await getOrCreateUser(OPENID)

    case 'updateField':
      return await db.collection('user_data')
        .doc(OPENID)
        .update({
          data: {
            [payload.field]: payload.data,
            updatedAt: Date.now()
          }
        })

    case 'mergeField':
      return await db.collection('user_data')
        .doc(OPENID)
        .update({
          data: {
            [payload.field]: _.set(payload.data),
            updatedAt: Date.now()
          }
        })

    default:
      return { error: 'unknown action' }
  }
}
