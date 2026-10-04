// pages/detail/detail.js
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    product: null,
    reviews: [],
    alsoLike: [],
    selectedSpec: 1, // 默认标准装
    count: 1,
    isFavorite: false,
    activeTab: 'detail', // detail / reviews
    loading: true,
    priceYuan: '0.00',
    memberYuan: '0.00',
    skuShow: false,
    avgScore: 4.8,
    reviewCount: 0,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    var that = this
    var params = {}
    if (options.id) params.id = options.id
    else if (options.sku) params.sku = options.sku
    api.productDetail(params).then(function (res) {
      var p = res && res.product
      if (!p) { toast.toast('商品加载失败'); return }
      // 记录浏览足迹
      api.addFootprint(p.id)
      // 收藏状态
      var favs = wx.getStorageSync('fl_favorites') || []
      var isFav = favs.indexOf(p.id) >= 0
      var specIdx = 1
      if (p.specs && p.specs[0] && p.specs[0].values && p.specs[0].values[1]) specIdx = 1
      var sel = p.specs[0].values[specIdx]
      // 展示字段：分->元，规格附加展示价
      var specsView = (p.specs || []).map(function (sp) {
        return Object.assign({}, sp, {
          values: sp.values.map(function (v) {
            return Object.assign({}, v, { priceYuan: F.fen2yuan(v.price) })
          })
        })
      })
      var productView = Object.assign({}, p, {
        specs: specsView,
        originalYuan: F.fen2yuan(p.originalPrice),
        salesText: p.salesVolume > 10000 ? (p.salesVolume / 10000).toFixed(1) + '万' : p.salesVolume + ''
      })
      var reviewsView = ((res && res.reviews) || []).map(function (r) {
        return Object.assign({}, r, { createTimeText: F.formatTime(r.createTime) })
      })
      var alsoLikeView = ((res && res.alsoLike) || []).map(function (g) {
        return Object.assign({}, g, { priceYuan: F.fen2yuan(g.minPrice) })
      })
      that.setData({
        product: productView,
        reviews: reviewsView,
        alsoLike: alsoLikeView,
        selectedSpec: specIdx,
        isFavorite: isFav,
        loading: false,
        avgScore: res.avgScore || 4.8,
        reviewCount: res.reviewCount || 0,
        priceYuan: F.fen2yuan(sel.price),
        memberYuan: F.fen2yuan(Math.round(sel.price * 0.92))
      })
    })
  },

  onShow: function () {
    this.refreshCartBadge()
  },

  refreshCartBadge: function () {
    var that = this
    api.getCart().then(function (cart) {
      var count = 0
      ;(cart || []).forEach(function (c) { count += c.count })
      if (count > 0) wx.setTabBarBadge({ index: 2, text: '' + count })
      else wx.removeTabBarBadge({ index: 2 })
    })
  },

  selectSpec: function (e) {
    var idx = Number(e.currentTarget.dataset.index)
    var p = this.data.product
    var sel = p.specs[0].values[idx]
    this.setData({
      selectedSpec: idx,
      count: Math.min(this.data.count, sel.stock || 1),
      priceYuan: F.fen2yuan(sel.price),
      memberYuan: F.fen2yuan(Math.round(sel.price * 0.92))
    })
  },

  increase: function () {
    var p = this.data.product
    var sel = p.specs[0].values[this.data.selectedSpec]
    if (this.data.count >= sel.stock) { toast.toast('库存不足'); return }
    this.setData({ count: this.data.count + 1 })
  },

  decrease: function () {
    if (this.data.count <= 1) return
    this.setData({ count: this.data.count - 1 })
  },

  getSelectedItem: function () {
    var p = this.data.product
    var sel = p.specs[0].values[this.data.selectedSpec]
    return {
      goodsId: p.id, name: p.name, pic: p.pic,
      specText: sel.label, price: sel.price, count: this.data.count, stock: sel.stock
    }
  },

  // 打开/关闭 SKU 半屏弹层
  openSku: function () { this.setData({ skuShow: true }) },
  closeSku: function () { this.setData({ skuShow: false }) },

  addToCart: function () {
    var item = this.getSelectedItem()
    api.addToCart(item).then(function (res) {
      if (res.ok) { toast.success('加入购物车成功') }
      else toast.toast(res.msg || '加入购物车失败')
    })
    this.setData({ skuShow: false })
    this.refreshCartBadge()
  },

  confirmBuyNow: function () {
    var item = this.getSelectedItem()
    wx.setStorageSync('fl_checkout', [item])
    wx.setStorageSync('fl_checkout_is_direct', true)
    this.setData({ skuShow: false })
    wx.navigateTo({ url: '/pages/buy/buy' })
  },

  buyNow: function () {
    // 先打开规格选择
    this.setData({ skuShow: true })
  },

  // 图片全屏预览（轮播图 + 详情图 + 评价晒图）
  previewImage: function (e) {
    var urls = this.data.product.pics || []
    var current = e.currentTarget.dataset.url || urls[0]
    wx.previewImage({ current: current, urls: urls })
  },

  // 分享
  onShareAppMessage: function () {
    var p = this.data.product
    return {
      title: p.name + ' ¥' + this.data.priceYuan,
      imageUrl: p.pic,
      path: '/pages/detail/detail?id=' + p.id
    }
  },

  toggleFavorite: function () {
    var that = this
    var id = this.data.product.id
    api.toggleFavorite(id).then(function (res) {
      that.setData({ isFavorite: res.isFavorite })
      toast.toast(res.isFavorite ? '已收藏' : '已取消收藏')
    })
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.redirectTo({ url: '/pages/detail/detail?id=' + id })
  },

  goCart: function () {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  onImgError: function (e) { img.make(this)(e) }
})
