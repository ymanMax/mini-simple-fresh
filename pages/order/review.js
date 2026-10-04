// pages/order/review.js 订单评价
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

var TAG_POOL = ['新鲜', '口感甜', '包装好', '个头大', '配送快', '性价比高', '分量足', '坏果包赔']

Page({
  data: {
    orderId: null,
    items: [],
    shopScores: { fresh: 5, speed: 5, package: 5 },
    shopContent: '',
    availableTags: TAG_POOL,
    submitting: false,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    this.orderId = Number(options.orderId)
    var that = this
    api.orderDetail(this.orderId).then(function (o) {
      if (!o) { toast.toast('订单不存在'); return }
      // 每个商品初始化评价状态
      var items = (o.items || []).map(function (it) {
        return Object.assign({}, it, {
          score: 5,
          selectedTags: [],
          content: '',
          images: []
        })
      })
      that.setData({ items: items })
    })
  },

  // 商品星级
  setScore: function (e) {
    var idx = e.currentTarget.dataset.index
    var score = Number(e.currentTarget.dataset.score)
    var items = this.data.items.slice()
    items[idx].score = score
    this.setData({ items: items })
  },

  // 店铺星级
  setShopScore: function (e) {
    var dim = e.currentTarget.dataset.dim
    var score = Number(e.currentTarget.dataset.score)
    var shopScores = Object.assign({}, this.data.shopScores)
    shopScores[dim] = score
    this.setData({ shopScores: shopScores })
  },

  // 快捷标签
  toggleTag: function (e) {
    var idx = e.currentTarget.dataset.index
    var tag = e.currentTarget.dataset.tag
    var items = this.data.items.slice()
    var arr = items[idx].selectedTags
    if (arr.indexOf(tag) >= 0) arr = arr.filter(function (t) { return t !== tag })
    else arr.push(tag)
    items[idx].selectedTags = arr
    this.setData({ items: items })
  },

  onContentInput: function (e) {
    var idx = e.currentTarget.dataset.index
    var items = this.data.items.slice()
    items[idx].content = e.detail.value.slice(0, 100)
    this.setData({ items: items })
  },

  onShopContentInput: function (e) {
    this.setData({ shopContent: e.detail.value.slice(0, 100) })
  },

  // 晒图（mock：选用本地商品图）
  addImage: function (e) {
    var idx = e.currentTarget.dataset.index
    var items = this.data.items.slice()
    if (items[idx].images.length >= 6) { toast.toast('最多上传6张'); return }
    items[idx].images.push(items[idx].pic)
    this.setData({ items: items })
  },

  removeImage: function (e) {
    var idx = e.currentTarget.dataset.index
    var imgIdx = e.currentTarget.dataset.imgidx
    var items = this.data.items.slice()
    items[idx].images.splice(imgIdx, 1)
    this.setData({ items: items })
  },

  submit: function () {
    if (this.data.submitting) return
    var that = this
    // 逐商品提交评价
    var tasks = this.data.items.map(function (it) {
      return api.submitReview({
        orderId: that.orderId,
        goodsId: it.goodsId,
        score: it.score,
        tags: it.selectedTags,
        content: it.content || '好评！',
        images: it.images
      })
    })
    this.setData({ submitting: true })
    toast.showLoading('提交中...')
    Promise.all(tasks).then(function () {
      toast.hideLoading()
      that.setData({ submitting: false })
      toast.success('评价成功，赠20积分')
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/order/detail?id=' + that.orderId })
      }, 800)
    })
  },

  onImgError: function (e) { img.make(this)(e) }
})
