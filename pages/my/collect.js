// pages/my/collect.js —— 收藏列表：网格卡片、左滑删除、点击跳详情、空态
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    favorites: [],
    swipedId: ''
  },

  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    api.getFavorites().then(function (list) {
      that.setData({ loading: false, favorites: list, swipedId: '' })
    })
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  // 取消收藏
  unfavorite: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消收藏', content: '确定取消收藏该商品吗？',
      success: function (res) {
        if (res.confirm) {
          api.toggleFavorite(id).then(function () { that.loadData(); wx.showToast({ title: '已取消收藏', icon: 'none' }) })
        } else that.setData({ swipedId: '' })
      }
    })
  },

  // 左滑删除
  touchStartX: 0,
  onTouchStart: function (e) { this.touchStartX = e.touches[0].clientX },
  onTouchEnd: function (e) {
    var dx = e.changedTouches[0].clientX - this.touchStartX
    var id = e.currentTarget.dataset.id
    if (dx < -50) this.setData({ swipedId: id })
    else if (dx > 50) this.setData({ swipedId: '' })
  },
  closeSwipe: function () { this.setData({ swipedId: '' }) },

  goShopping: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: mixin.onImgError
})
