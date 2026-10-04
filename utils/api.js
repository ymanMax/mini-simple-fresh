// utils/api.js —— 页面统一数据入口：直接调用内存 Mock store（Promise，含延迟）
// 同时导出 binderror 图片兜底处理，避免裂图

var store = require('../mock/store.js')

// 图片 binderror 统一兜底：src 失效时切换到本地默认图
function imgError(e) {
  var src = (e && e.detail && e.detail.src) || ''
  if (src.indexOf('/images/default.png') >= 0) return
  var page = getCurrentPages()
  var cur = page[page.length - 1]
  // 通过 dataset 定位元素并替换 src
  var id = e.currentTarget.dataset.errkey
  if (id) {
    var key = 'imgErrMap.' + id
    var obj = {}
    obj[key] = '/images/default.png'
    cur.setData(obj)
  } else {
    // 简单兜底：触发一次 setData 无效时直接全局替换（大多数页面用 data-binderror 配合 data-src）
    wx.showToast({ title: '图片加载失败', icon: 'none', duration: 1000 })
  }
}

module.exports = Object.assign({ imgError: imgError, cartCount: function () { return store.cartCount() } }, store)
