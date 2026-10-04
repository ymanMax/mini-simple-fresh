// pages/order/review.js —— 订单评价：逐商品星级+标签+文字+晒图，店铺三维度，提交赠20积分
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

var QUICK_TAGS = ['新鲜', '口感甜', '包装好', '个头大', '物流快', '性价比高', '分量足', '回购']

Page({
  data: {
    order: null,
    loading: true,
    tags: QUICK_TAGS,
    // 每个商品的评价状态
    goodsReviews: [],
    shopScore: { fresh: 5, speed: 5, package: 5 },
    shopText: '',
    submitting: false
  },

  onLoad: function (options) {
    this._id = options.id
    var that = this
    api.get('/api/orders/detail', { id: options.id }).then(function (data) {
      var order = data.order
      var goodsReviews = order.items.map(function (it) {
        return {
          goodsId: it.goodsId,
          name: it.name,
          pic: it.pic,
          score: 5,
          tags: [],
          content: '',
          images: []
        }
      })
      goodsReviews = goodsReviews.map(function (g) {
        g.chips = QUICK_TAGS.map(function (t) { return { name: t, on: false } })
        return g
      })
      that.setData({ order: order, goodsReviews: goodsReviews, loading: false })
    })
  },

  // 商品星级
  setScore: function (e) {
    var idx = e.currentTarget.dataset.idx
    var score = e.currentTarget.dataset.score
    var gr = this.data.goodsReviews
    gr[idx].score = score
    this.setData({ goodsReviews: gr })
  },

  toggleTag: function (e) {
    var idx = e.currentTarget.dataset.idx
    var tag = e.currentTarget.dataset.tag
    var gr = this.data.goodsReviews
    gr[idx].chips.forEach(function (c) {
      if (c.name === tag) c.on = !c.on
    })
    gr[idx].tags = gr[idx].chips.filter(function (c) { return c.on }).map(function (c) { return c.name })
    this.setData({ goodsReviews: gr })
  },

  onContent: function (e) {
    var idx = e.currentTarget.dataset.idx
    var gr = this.data.goodsReviews
    gr[idx].content = e.detail.value.slice(0, 100)
    this.setData({ goodsReviews: gr })
  },

  // 晒图（选择本地图片）
  chooseImages: function (e) {
    var idx = e.currentTarget.dataset.idx
    var that = this
    wx.chooseMedia({
      count: 6 - this.data.goodsReviews[idx].images.length,
      mediaType: ['image'],
      success: function (res) {
        var paths = res.tempFiles.map(function (f) { return f.tempFilePath })
        var gr = that.data.goodsReviews
        gr[idx].images = gr[idx].images.concat(paths).slice(0, 6)
        that.setData({ goodsReviews: gr })
      }
    })
  },

  removeImage: function (e) {
    var idx = e.currentTarget.dataset.idx
    var imgIdx = e.currentTarget.dataset.i
    var gr = this.data.goodsReviews
    gr[idx].images.splice(imgIdx, 1)
    this.setData({ goodsReviews: gr })
  },

  // 店铺评分
  setShopScore: function (e) {
    var dim = e.currentTarget.dataset.dim
    var score = e.currentTarget.dataset.score
    var s = this.data.shopScore
    s[dim] = score
    this.setData({ shopScore: s })
  },

  onShopText: function (e) {
    this.setData({ shopText: e.detail.value.slice(0, 100) })
  },

  submit: function () {
    if (this.data.submitting) return
    var that = this
    // 至少写点评价
    var valid = this.data.goodsReviews.filter(function (g) { return g.content || g.tags.length })
    this.setData({ submitting: true })
    api.post('/api/orders/review', {
      orderId: this._id,
      goodsReviews: this.data.goodsReviews,
      shopScore: this.data.shopScore,
      shopText: this.data.shopText
    }).then(function () {
      wx.showModal({
        title: '评价成功',
        content: '感谢您的评价，已赠送 20 积分',
        showCancel: false,
        confirmText: '完成',
        confirmColor: '#e93b3d',
        success: function () {
          wx.navigateBack()
        }
      })
      that.setData({ submitting: false })
    }).catch(function () {
      that.setData({ submitting: false })
    })
  }
})
