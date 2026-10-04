// pages/index/index.js
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    banner: [],
    categories: [],
    tiles: [],
    products: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    cartCount: 0,
    seckill: [],
    countdownText: '00:00:00',
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function () {
    this.loadData()
    this.loadSeckill()
  },

  onUnload: function () {
    if (this._timer) clearInterval(this._timer)
  },

  onShow: function () {
    this.refreshCartBadge()
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    api.home().then(function (res) {
      var d = res || {}
      that.setData({
        banner: d.banner || [],
        categories: (d.categoryAreaV2 && d.categoryAreaV2.lanternArea) || [],
        tiles: (d.categoryAreaV2 && d.categoryAreaV2.tileArea) || [],
        loading: false
      })
      that.loadGoods(1, true)
    })
  },

  loadSeckill: function () {
    var that = this
    api.getPromotions().then(function (p) {
      var goods = (p.seckillGoods || []).slice(0, 6).map(function (g) {
        return Object.assign({}, g)
      })
      that.setData({ seckill: goods, countdownText: F.countDown(p.countdownMs || 0) })
      that._timer = setInterval(function () {
        api.getPromotions().then(function (pp) {
          that.setData({ countdownText: F.countDown(pp.countdownMs || 0) })
        })
      }, 1000)
    })
  },

  seckillAdd: function (e) {
    var goodsId = e.currentTarget.dataset.id
    api.seckillAddToCart(goodsId, 1).then(function (res) {
      if (res.ok) toast.success('抢购商品已加入购物车')
      else toast.toast(res.msg || '加入购物车失败')
    })
    this.refreshCartBadge()
  },

  goPromotion: function () {
    wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
  },

  loadGoods: function (page, reset) {
    var that = this
    api.getGoods({ page: page, pageSize: this.data.pageSize }).then(function (res) {
      var list = (res && res.list) || []
      // 统一金额分->元，附加展示字段
      list = list.map(function (g) {
        return Object.assign({}, g, {
          priceYuan: F.fen2yuan(g.minPrice),
          originalYuan: F.fen2yuan(g.originalPrice),
          salesText: g.salesVolume > 10000 ? (g.salesVolume / 10000).toFixed(1) + '万' : g.salesVolume + ''
        })
      })
      var products = reset ? list : that.data.products.concat(list)
      that.setData({
        products: products,
        page: page,
        hasMore: !!(res && res.hasMore),
        loading: false
      })
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadGoods(this.data.page + 1, false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadData()
    wx.stopPullDownRefresh()
  },

  refreshCartBadge: function () {
    api.getCart().then(function (cart) {
      var count = 0
      ;(cart || []).forEach(function (c) { count += c.count })
      // tabbar 角标
      if (count > 0) {
        wx.setTabBarBadge({ index: 2, text: '' + count })
      } else {
        wx.removeTabBarBadge({ index: 2 })
      }
    })
  },

  goSearch: function () {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  openLink: function (e) {
    var link = e.currentTarget.dataset.link
    if (!link) {
      toast.toast('活动即将上线，敬请期待')
      return
    }
    // Tab 页必须使用 switchTab，其余使用 navigateTo
    var tabPages = ['/pages/index/index', '/pages/vip/vip', '/pages/shop/shop', '/pages/me/me']
    var base = link.split('?')[0]
    if (tabPages.indexOf(base) >= 0) {
      wx.switchTab({ url: base })
    } else {
      wx.navigateTo({ url: link })
    }
  },

  addToCart: function (e) {
    var id = e.currentTarget.dataset.id
    var g = null
    for (var i = 0; i < this.data.products.length; i++) {
      if (this.data.products[i].id === id) { g = this.data.products[i]; break }
    }
    if (!g) return
    api.addToCart({
      goodsId: g.id, name: g.name, pic: g.pic,
      specText: '标准装', price: g.minPrice, count: 1
    }).then(function (res) {
      if (res.ok) {
        toast.success('加入购物车成功')
      } else {
        toast.toast(res.msg || '加入购物车失败')
      }
    })
    this.refreshCartBadge()
  },

  onImgError: function (e) {
    // 图片失效回退默认图，杜绝灰色裂图
    img.make(this)(e)
  }
})
