// pages/order/review.js —— 订单评价：逐商品星级+标签+文字+晒图；店铺三维度星级；提交赠20积分
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    order: null,
    items: [],           // 逐商品评价状态
    shopScores: { fresh: 5, speed: 5, package: 5 },
    shopContent: '',
    tagPool: ['新鲜', '口感甜', '包装好', '个头大', '配送快', '性价比高', '坏果包赔', '当日鲜'],
    submitting: false
  },

  onLoad: function (options) {
    this.orderId = options.id
    this.loadOrder()
  },

  loadOrder: function () {
    var that = this
    this.setData({ loading: true })
    api.getOrderDetail(this.orderId).then(function (o) {
      if (!o) {
        wx.showToast({ title: '订单不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1200)
        return
      }
      var items = o.items.map(function (it) {
        return { goodsId: it.goodsId, name: it.name, pic: it.pic, specText: it.specText, score: 5, tags: [], content: '', images: [], tagList: that.buildTagList([]) }
      })
      that.setData({ order: o, items: items, loading: false })
    })
  },

  // 商品星级
  setScore: function (e) {
    var idx = e.currentTarget.dataset.idx
    var score = Number(e.currentTarget.dataset.score)
    var items = this.data.items.slice()
    items[idx].score = score
    this.setData({ items: items })
  },

  // 快捷标签多选
  buildTagList: function (selected) {
    return this.data.tagPool.map(function (t) { return { name: t, selected: selected.indexOf(t) >= 0 } })
  },
  toggleTag: function (e) {
    var idx = e.currentTarget.dataset.idx
    var tag = e.currentTarget.dataset.tag
    var items = this.data.items.slice()
    var arr = items[idx].tags
    if (arr.indexOf(tag) >= 0) arr.splice(arr.indexOf(tag), 1)
    else arr.push(tag)
    items[idx].tagList = this.buildTagList(arr)
    this.setData({ items: items })
  },

  // 文字输入
  onContentInput: function (e) {
    var idx = e.currentTarget.dataset.idx
    var items = this.data.items.slice()
    items[idx].content = e.detail.value.slice(0, 100)
    this.setData({ items: items })
  },

  // 店铺星级
  setShopScore: function (e) {
    var dim = e.currentTarget.dataset.dim
    var score = Number(e.currentTarget.dataset.score)
    this.setData({ shopScores: Object.assign({}, this.data.shopScores, { [dim]: score }) })
  },

  onShopContentInput: function (e) {
    this.setData({ shopContent: e.detail.value.slice(0, 100) })
  },

  // 选择晒图（用本地商品图模拟，最多6张）
  chooseImages: function (e) {
    var idx = e.currentTarget.dataset.idx
    var items = this.data.items.slice()
    var existing = items[idx].images || []
    if (existing.length >= 6) { wx.showToast({ title: '最多上传6张', icon: 'none' }); return }
    // 演示环境：从商品图中补充一张
    var next = items[idx].pic
    if (existing.indexOf(next) < 0) existing.push(next)
    items[idx].images = existing
    this.setData({ items: items })
    wx.showToast({ title: '已添加晒图', icon: 'none' })
  },

  // 提交评价
  submit: function () {
    var that = this
    if (this.data.submitting) return
    // 校验：每个商品至少评分
    var incomplete = this.data.items.some(function (i) { return !i.score })
    if (incomplete) { wx.showToast({ title: '请为每个商品评分', icon: 'none' }); return }
    this.setData({ submitting: true })
    api.submitReview({ orderId: this.orderId, items: this.data.items }).then(function (res) {
      that.setData({ submitting: false })
      if (res.success) {
        wx.showModal({
          title: '评价成功', content: res.msg + '，已同步到商品详情评价区',
          showCancel: false, success: function () { wx.navigateBack() }
        })
      } else wx.showToast({ title: res.msg, icon: 'none' })
    })
  },

  onImgError: mixin.onImgError
})
