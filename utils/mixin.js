// utils/mixin.js —— 页面公共逻辑：图片 binderror 兜底、购物车角标、跳转
var api = require('./api.js')

// 图片加载失败回退到本地默认图（wxml: <image data-key="goods.pic" binderror="onImgError" src="{{goods.pic}}">）
function onImgError(e) {
  var key = e.currentTarget.dataset.key
  if (!key) return
  var patch = {}
  patch[key] = '/images/default.png'
  this.setData(patch)
}

// 刷新购物车角标数量（tabBar 角标）
function updateTabBadge() {
  var count = api.cartCount()
  if (count > 0) {
    wx.setTabBarBadge({ index: 2, text: String(count) })
  } else {
    wx.removeTabBarBadge({ index: 2 })
  }
}

function goDetail(id) {
  wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
}

function goSearch() {
  wx.navigateTo({ url: '/pages/search/search' })
}

module.exports = { onImgError: onImgError, updateTabBadge: updateTabBadge, goDetail: goDetail, goSearch: goSearch, api: api }
