// pages/index/index.js
const geojson = require('../../data/china.js') // 你的完整 GeoJSON

Page({
  data: {
    visitedProvinces: wx.getStorageSync('visitedProvinces') || [],
    totalProvinces: 0,
    mapBounds: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },

  onReady() {
    this.calculateBounds()
    this.drawChinaMap()
  },

  // 计算地图边界和缩放参数
  calculateBounds() {
    const width = wx.getSystemInfoSync().windowWidth
    const height = wx.getSystemInfoSync().windowHeight
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

    geojson.features.forEach(f => {
      let rings = []
      if(f.geometry.type === 'Polygon') rings = f.geometry.coordinates
      else if(f.geometry.type === 'MultiPolygon') rings = f.geometry.coordinates.flat()

      rings.forEach(ring => {
        ring.forEach(p => {
          minX = Math.min(minX, p[0])
          maxX = Math.max(maxX, p[0])
          minY = Math.min(minY, p[1])
          maxY = Math.max(maxY, p[1])
        })
      })
    })

    const scaleX = width / (maxX - minX)
    const scaleY = height / (maxY - minY)
    const scale = Math.min(scaleX, scaleY) * 0.9 // 留边
    const offsetX = (width - (maxX - minX) * scale) / 2
    const offsetY = (height - (maxY - minY) * scale) / 2

    this.setData({ mapBounds: { minX, maxX, minY, maxY }, scale, offsetX, offsetY })
  },

  // 地理坐标 -> canvas 坐标
  mapX(x) {
    return (x - this.data.mapBounds.minX) * this.data.scale + this.data.offsetX
  },
  mapY(y) {
    return (this.data.mapBounds.maxY - y) * this.data.scale + this.data.offsetY
  },

  drawChinaMap() {
    const ctx = wx.createCanvasContext('chinaMap')
    const visited = new Set(this.data.visitedProvinces)
    const width = wx.getSystemInfoSync().windowWidth
    const height = wx.getSystemInfoSync().windowHeight
  
    ctx.clearRect(0, 0, width, height)
    ctx.setLineWidth(1)
  
    const textPositions = [] // 已绘制文字位置，用于避让
  
    geojson.features.forEach(f => {
      const name = f.properties.name
      let rings = []
      if(f.geometry.type === 'Polygon') rings = f.geometry.coordinates
      else if(f.geometry.type === 'MultiPolygon') rings = f.geometry.coordinates.flat()
  
      // 绘制省份
      rings.forEach(ring => {
        if (!ring || ring.length < 3) return
  
        ctx.beginPath()
        ring.forEach((point, i) => {
          const x = this.mapX(point[0])
          const y = this.mapY(point[1])
          if(i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
  
        ctx.setStrokeStyle('#555')
        ctx.setFillStyle(visited.has(name) ? 'rgba(255,215,0,0.66)' : 'rgba(204,204,204,0.33)')
        ctx.fill()
        ctx.stroke()
      })
  
      // 计算文字中心：包围盒中心
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      rings.forEach(ring => {
        ring.forEach(p => {
          minX = Math.min(minX, p[0])
          maxX = Math.max(maxX, p[0])
          minY = Math.min(minY, p[1])
          maxY = Math.max(maxY, p[1])
        })
      })
      let center = [(minX + maxX)/2, (minY + maxY)/2]
  
      // 根据面积调整字体
      const area = (maxX - minX) * (maxY - minY)
      let fontSize = area > 300 ? 10 : area > 100 ? 8 : 6
      ctx.setFontSize(fontSize)
      ctx.setFillStyle('#111')
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
  
      // 简单文字避让
      let textX = this.mapX(center[0])
      let textY = this.mapY(center[1])
      let attempts = 0
      while (textPositions.some(pos => Math.abs(pos.x - textX) < 20 && Math.abs(pos.y - textY) < 10) && attempts < 5) {
        textX += 10
        textY -= 10
        attempts++
      }
      textPositions.push({x: textX, y: textY})
  
      ctx.fillText(name, textX, textY)
    })
  
    ctx.draw()
    this.setData({ totalProvinces: geojson.features.length })
  },
  

  onCanvasTap(e) {
    const { x, y } = e.detail
    const visited = new Set(this.data.visitedProvinces)
    let clicked = null

    geojson.features.forEach(f => {
      const name = f.properties.name
      let rings = []
      if(f.geometry.type === 'Polygon') rings = f.geometry.coordinates
      else if(f.geometry.type === 'MultiPolygon') rings = f.geometry.coordinates.flat()

      for (const ring of rings) {
        const mappedRing = ring.map(p => ({ x: this.mapX(p[0]), y: this.mapY(p[1]) }))
        if (this.pointInPolygon({x, y}, mappedRing)) {
          clicked = name
          break
        }
      }
    })

    if (clicked) {
      if (visited.has(clicked)) visited.delete(clicked)
      else visited.add(clicked)

      wx.setStorageSync('visitedProvinces', Array.from(visited))
      this.setData({ visitedProvinces: Array.from(visited) })
      this.drawChinaMap()

      wx.showToast({
        title: `${clicked} 已${visited.has(clicked) ? '点亮' : '取消'}`,
        icon: 'none'
      })
    }
  },

  pointInPolygon(point, vs) {
    const {x, y} = point
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x, yi = vs[i].y
      const xj = vs[j].x, yj = vs[j].y
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi)*(y - yi)/(yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  },
})
