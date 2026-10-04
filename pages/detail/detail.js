// pages/detail/detail.js —— 商品详情：轮播、规格SKU、加购、收藏、评价、看了又看
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    product: null,
    reviews: [],
    recommend: [],
    isCollect: false,
    // SKU 选择
    specIndex: [0, 0],
    specText: '标准装 · 常规包装',
    selectedPrice: 0,
    selectedStock: 0,
    count: 1,
    showSkuPanel: false,
    actionType: 'cart', // cart | buy
    // 图片预览
    previewImages: []
  },

  onLoad: function (options) {
    var id = options.id || options.sku || 'g1'
    this.productId = id
    this.loadDetail(id)
  },

  loadDetail: function (id) {
    var that = this
    this.setData({ loading: true })
    api.getProductDetail(id).then(function (res) {
      if (!res || !res.product) {
        wx.showToast({ title: '商品不存在', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1200)
        return
      }
      var p = res.product
      var specIndex = [0, 0]
      var selPrice = that.calcPrice(p, specIndex)
      var selStock = p.specs[0].values[0].stock
      // 需求6.1：评分汇总（平均分 + 评价数）
      var reviewCount = res.reviews.length
      var avg = reviewCount ? (res.reviews.reduce(function (s, r) { return s + r.score }, 0) / reviewCount) : 4.8
      that.setData({
        loading: false, product: p, reviews: res.reviews, recommend: res.recommend,
        isCollect: res.isCollect, specIndex: specIndex, selectedPrice: selPrice,
        selectedStock: selStock, specText: that.buildSpecText(p, specIndex), count: 1,
        specsView: that.buildSpecsView(p, specIndex),
        avgScore: Math.round(avg * 10) / 10, reviewCount: reviewCount,
        cartCount: api.cartCount(), currentImage: 0
      })
      // 记录浏览足迹
      api.addFootprint(p.id)
    })
  },

  // 轮播指示器：当前图序号（需求6.1：指示器"1/5"）
  onSwiperChange: function (e) { this.setData({ currentImage: e.detail.current }) },

  // 购物车图标 → 切到购物车Tab
  goCartTab: function () { wx.switchTab({ url: '/pages/shop/shop' }) },

  // 分享（需求6.1：标题=商品名+价格，封面=主图，path带sku）
  onShareAppMessage: function () {
    var p = this.data.product
    return {
      title: p.name + ' ¥' + (p.price / 100).toFixed(2) + '，新鲜直达坏果包赔！',
      imageUrl: p.pic,
      path: '/pages/detail/detail?id=' + p.id
    }
  },

  onShow: function () {
    // 返回时刷新收藏状态与购物车角标
    if (this.productId) {
      api.getProductDetail(this.productId).then(function (res) {
        if (res && res.product) {
          var p = res.product
          var reviewCount = res.reviews.length
          var avg = reviewCount ? (res.reviews.reduce(function (s, r) { return s + r.score }, 0) / reviewCount) : 4.8
          this.setData({ isCollect: res.isCollect, reviews: res.reviews, avgScore: Math.round(avg * 10) / 10, reviewCount: reviewCount, cartCount: api.cartCount() })
        }
      }.bind(this))
    }
    mixin.updateTabBadge.call(this)
  },

  // 计算规格价格：基础价 + 规格加价
  calcPrice: function (p, specIndex) {
    var price = p.price
    p.specs.forEach(function (spec, i) {
      var v = spec.values[specIndex[i]]
      if (v && v.price) price += v.price
    })
    return price
  },
  buildSpecText: function (p, specIndex) {
    return p.specs.map(function (spec, i) { return spec.values[specIndex[i]].label }).join(' · ')
  },

  // 渲染用规格视图：给每个 value 加上 selected 标记与原始下标
  buildSpecsView: function (p, specIndex) {
    return p.specs.map(function (spec, i) {
      return {
        name: spec.name,
        values: spec.values.map(function (v, vi) {
          var o = Object.assign({}, v)
          o._idx = vi
          o.selected = specIndex[i] === vi
          return o
        })
      }
    })
  },

  // 选择规格
  chooseSpec: function (e) {
    var specIdx = e.currentTarget.dataset.specidx
    var valIdx = e.currentTarget.dataset.validx
    var specIndex = this.data.specIndex.slice()
    specIndex[specIdx] = valIdx
    var p = this.data.product
    this.setData({
      specIndex: specIndex,
      selectedPrice: this.calcPrice(p, specIndex),
      selectedStock: p.specs[specIdx].values[valIdx].stock,
      specText: this.buildSpecText(p, specIndex),
      specsView: this.buildSpecsView(p, specIndex)
    })
  },

  // 数量增减
  changeCount: function (e) {
    var delta = e.currentTarget.dataset.delta
    var count = this.data.count + delta
    if (count < 1) count = 1
    if (count > this.data.selectedStock) {
      count = this.data.selectedStock
      wx.showToast({ title: '库存不足', icon: 'none' })
    }
    this.setData({ count: count })
  },

  // SKU 面板
  openSku: function (e) {
    var action = e.currentTarget.dataset.action || 'cart'
    this.setData({ showSkuPanel: true, actionType: action })
  },
  closeSku: function () { this.setData({ showSkuPanel: false }) },

  // 确认加购
  confirmAddCart: function () {
    var that = this
    var p = this.data.product
    api.addToCart(p.id, this.data.specText, this.data.count).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '加入购物车成功', icon: 'none' })
        that.setData({ showSkuPanel: false })
        mixin.updateTabBadge.call(that)
      }
    })
  },

  // 立即购买：带规格跳订单确认页
  confirmBuy: function () {
    var p = this.data.product
    var items = [{ goodsId: p.id, name: p.name, pic: p.pic, specText: this.data.specText, price: this.data.selectedPrice, count: this.data.count }]
    wx.setStorageSync('buy_items', items)
    wx.navigateTo({ url: '/pages/buy/buy' })
  },

  // 收藏切换
  toggleCollect: function () {
    var that = this
    api.toggleFavorite(this.productId).then(function (res) {
      that.setData({ isCollect: res.isCollect })
      wx.showToast({ title: res.isCollect ? '已收藏' : '已取消收藏', icon: 'none' })
    })
  },

  // 预览图片
  previewImage: function (e) {
    var idx = e.currentTarget.dataset.index
    wx.previewImage({ urls: this.data.product.images, current: this.data.product.images[idx] })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.redirectTo({ url: '/pages/detail/detail?id=' + id })
  },

  onImgError: mixin.onImgError
})
