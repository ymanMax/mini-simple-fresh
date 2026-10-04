// pages/detail/detail.js —— 商品详情：轮播 / 规格选择 / 加购 / 收藏 / 评价 / 看了又看
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var checkout = require('../../utils/checkout.js')
var imgBehavior = require('../../utils/imgBehavior.js')

Page({
  behaviors: [imgBehavior],
  data: {
    goods: null,
    reviews: [],
    recommend: [],
    avgScore: 5,
    isCollect: false,
    loading: true,
    // 规格弹层
    showSpec: false,
    specIndex: 0,
    quantity: 1,
    panelMode: 'cart', // cart | buy
    swiperCurrent: 0,
    cartCount: 0,
    panelPriceYuan: '0.00'
  },

  onLoad: function (options) {
    var id = options.id || options.sku
    this.loadDetail(options.id ? { id: options.id } : { sku: options.sku })
  },

  onShow: function () {
    badge.refreshCartBadge()
    this.setData({ cartCount: badge.cartCount() })
  },

  loadDetail: function (query) {
    var that = this
    this.setData({ loading: true })
    api.get('/api/goods/detail', query).then(function (data) {
      that.setData({
        goods: data.goods,
        reviews: data.reviews,
        recommend: data.recommend,
        avgScore: data.avgScore,
        isCollect: data.isCollect,
        loading: false
      })
      wx.setNavigationBarTitle({ title: data.goods.categoryName || '商品详情' })
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  onSwiperChange: function (e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  // ===== 规格弹层 =====
  openSpec: function (e) {
    var mode = e.currentTarget.dataset.mode || 'cart'
    this.setData({ showSpec: true, panelMode: mode, quantity: 1, specIndex: 0 })
    this.computePanelPrice()
  },

  closeSpec: function () {
    this.setData({ showSpec: false })
  },

  stopProp: function () {},

  chooseSpec: function (e) {
    this.setData({ specIndex: Number(e.currentTarget.dataset.index) })
    this.computePanelPrice()
  },

  computePanelPrice: function () {
    var spec = this.currentSpec()
    this.setData({ panelPriceYuan: fmt.yuan(spec.price) })
  },

  changeQty: function (e) {
    var delta = Number(e.currentTarget.dataset.delta)
    var stock = this.currentSpec().stock
    var q = this.data.quantity + delta
    q = Math.max(1, Math.min(q, stock))
    this.setData({ quantity: q })
  },

  currentSpec: function () {
    var specs = this.data.goods.specs
    return specs[0].values[this.data.specIndex]
  },

  confirmSpec: function () {
    var g = this.data.goods
    var spec = this.currentSpec()
    var count = this.data.quantity
    if (this.data.panelMode === 'buy') {
      // 立即购买
      checkout.setCheckout({
        mode: 'buyNow',
        items: [{
          goodsId: g.id, sku: g.sku, name: g.name, pic: g.pic,
          specText: spec.label, price: spec.price, count: count
        }]
      })
      this.setData({ showSpec: false })
      wx.navigateTo({ url: '/pages/buy/buy?mode=buyNow' })
      return
    }
    api.post('/api/cart/add', { goodsId: g.id, specLabel: spec.label, count: count }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
    })
    this.setData({ showSpec: false, quantity: 1, specIndex: 0 })
  },

  // ===== 收藏 =====
  toggleCollect: function () {
    var that = this
    api.post('/api/favorites/toggle', { goodsId: this.data.goods.id }).then(function (data) {
      that.setData({ isCollect: data.isCollect })
      toast.success(data.isCollect ? '已收藏' : '已取消收藏')
    })
  },

  goCart: function () {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  goRecommend: function (e) {
    var id = e.currentTarget.dataset.id
    wx.redirectTo({ url: '/pages/detail/detail?id=' + id })
  },

  goReviewList: function () {
    // 评价区本地展示，无独立页；滚动到评价
    wx.pageScrollTo({ selector: '#reviews', duration: 300 })
  },

  // 图片点击全屏预览（需求6.1）
  previewImage: function (e) {
    var idx = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.goods.pics[idx],
      urls: this.data.goods.pics
    })
  },

  previewReview: function (e) {
    var idx = e.currentTarget.dataset.index
    var images = this.data.reviews[idx].images
    if (!images || !images.length) return
    wx.previewImage({ current: images[0], urls: images })
  },

  // 分享（需求6.1）
  onShareAppMessage: function () {
    var g = this.data.goods
    return {
      title: g.name + ' ￥' + g.minPriceYuan + '，鲜生活产地直发！',
      imageUrl: g.pic,
      path: '/pages/detail/detail?sku=' + g.sku
    }
  },

  onShareTimeline: function () {
    var g = this.data.goods
    return {
      title: g.name + ' ￥' + g.minPriceYuan + '，鲜生活产地直发！',
      query: 'id=' + g.id
    }
  }
})
