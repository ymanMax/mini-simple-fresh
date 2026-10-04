// pages/shop/shop.js 购物车
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    cart: [],
    validItems: [],
    invalidItems: [],
    selectedCount: 0,
    totalFen: 0,
    totalYuan: '0.00',
    allChecked: false,
    recommend: [],
    loading: true,
    freightHint: '',
    fullReduceFen: 0,
    fullReduceYuan: '0.00',
    fullReduceText: '',
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    // 进入页面刷新：详情返回、下单清空后同步
    this.loadCart()
  },

  loadCart: function () {
    var that = this
    api.getCart().then(function (cart) {
      cart = cart || []
      // 失效判定：库存为0或无库存
      cart.forEach(function (c) {
        c.invalid = c.stock <= 0 || c.count > c.stock
        c.priceYuan = F.fen2yuan(c.price)
      })
      var validItems = cart.filter(function (c) { return !c.invalid })
      var invalidItems = cart.filter(function (c) { return c.invalid })
      that.setData({ cart: cart, validItems: validItems, invalidItems: invalidItems, loading: false })
      that.compute()
      that.loadRecommend()
    })
  },

  loadRecommend: function () {
    var that = this
    api.getGoods({ page: 1, pageSize: 10 }).then(function (res) {
      var list = (res && res.list) || []
      var rec = list.slice(0, 8).map(function (g) {
        return Object.assign({}, g, { priceYuan: F.fen2yuan(g.minPrice) })
      })
      that.setData({ recommend: rec })
    })
  },

  compute: function () {
    var selected = this.data.validItems.filter(function (c) { return c.checked })
    var totalFen = 0
    selected.forEach(function (c) { totalFen += c.price * c.count })
    var allChecked = this.data.validItems.length > 0 && this.data.validItems.every(function (c) { return c.checked })
    // 免配送费提示：满59元（5900分）免基础配送费
    var freightHint = ''
    if (totalFen < 5900) {
      var diff = F.fen2yuan(5900 - totalFen)
      freightHint = '还差 ¥' + diff + ' 免配送费（满59元免基础配送费）'
    } else {
      freightHint = '已享免配送费'
    }
    // 满减优惠（最高可享阶梯）
    var fullReduceFen = api.fullReduce(totalFen)
    var fullReduceYuan = F.fen2yuan(fullReduceFen)
    var fullReduceText = ''
    if (fullReduceFen >= 5000) fullReduceText = '已选满199元，可减50元'
    else if (fullReduceFen >= 2000) fullReduceText = '已选满99元，可减20元'
    else if (fullReduceFen >= 800) fullReduceText = '已选满59元，可减8元'
    this.setData({
      selectedCount: selected.reduce(function (s, c) { return s + c.count }, 0),
      totalFen: totalFen,
      totalYuan: F.fen2yuan(totalFen),
      allChecked: allChecked,
      freightHint: freightHint,
      fullReduceFen: fullReduceFen,
      fullReduceYuan: fullReduceYuan,
      fullReduceText: fullReduceText
    })
    // tabbar 角标
    var cartCount = this.data.cart.reduce(function (s, c) { return s + c.count }, 0)
    if (cartCount > 0) wx.setTabBarBadge({ index: 2, text: '' + cartCount })
    else wx.removeTabBarBadge({ index: 2 })
  },

  toggleItem: function (e) {
    var id = e.currentTarget.dataset.id
    var item = this.data.cart.filter(function (c) { return c.id === id })[0]
    api.toggleCheck(id, !item.checked).then(function () {})
    // 本地即时更新
    var cart = this.data.cart.map(function (c) {
      if (c.id === id) c.checked = !c.checked
      return c
    })
    this.setData({ cart: cart })
    this.loadCart()
  },

  toggleAll: function () {
    var that = this
    var next = !this.data.allChecked
    api.toggleAll(next).then(function () { that.loadCart() })
  },

  increase: function (e) {
    var id = e.currentTarget.dataset.id
    var item = this.data.cart.filter(function (c) { return c.id === id })[0]
    if (item.count >= item.stock) { toast.toast('库存不足，最多' + item.stock + '件'); return }
    api.updateCartCount(id, item.count + 1).then(function () {})
    this.loadCart()
  },

  decrease: function (e) {
    var id = e.currentTarget.dataset.id
    var item = this.data.cart.filter(function (c) { return c.id === id })[0]
    var next = item.count - 1
    if (next <= 0) {
      this.removeItem(e)
      return
    }
    api.updateCartCount(id, next).then(function () {})
    this.loadCart()
  },

  removeItem: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    toast.confirm('确定删除该商品吗？').then(function (ok) {
      if (!ok) return
      api.removeCartItem(id).then(function () {
        toast.success('已删除')
        that.loadCart()
      })
    })
  },

  clearInvalid: function () {
    var that = this
    toast.confirm('清空所有失效商品？').then(function (ok) {
      if (!ok) return
      var ids = that.data.invalidItems.map(function (c) { return c.id })
      Promise.all(ids.map(function (id) { return api.removeCartItem(id) })).then(function () {
        toast.success('已清空失效商品')
        that.loadCart()
      })
    })
  },

  goSettle: function () {
    if (this.data.selectedCount === 0) { toast.toast('请先选择商品'); return }
    wx.navigateTo({ url: '/pages/buy/buy' })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  addRec: function (e) {
    var id = e.currentTarget.dataset.id
    var g = this.data.recommend.filter(function (x) { return x.id === id })[0]
    if (!g) return
    api.addToCart({
      goodsId: g.id, name: g.name, pic: g.pic,
      specText: '标准装', price: g.minPrice, count: 1
    }).then(function (res) {
      if (res.ok) toast.success('加入购物车成功')
      else toast.toast(res.msg || '加入购物车失败')
    })
    this.loadCart()
  },

  onImgError: function (e) { img.make(this)(e) }
})
