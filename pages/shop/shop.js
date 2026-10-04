// pages/shop/shop.js —— 购物车：列表、数量调整、删除、失效区、结算、空态、猜你喜欢
var mixin = require('../../utils/mixin.js')
var api = mixin.api
var fmt = require('../../utils/format.js')

Page({
  data: {
    loading: true,
    items: [],           // 有效商品
    invalidItems: [],     // 失效商品
    recommend: [],
    allChecked: false,
    totalAmount: 0,      // 分
    totalCount: 0,
    freeShipThreshold: 5900,
    freight: 0,
    diffToFree: 0,       // 还差多少免运费（分）
    swipedId: ''
  },

  onShow: function () {
    this.reload()
  },

  reload: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getCart(), api.getProducts({ page: 1, pageSize: 10, sort: 'sales' }), api.getMember()]).then(function (res) {
      var cart = res[0]
      var recommend = res[1].list
      var member = res[2]
      var valid = cart.filter(function (c) { return !c.invalid })
      var invalid = cart.filter(function (c) { return c.invalid })
      that.setData({
        loading: false, items: valid, invalidItems: invalid, recommend: recommend,
        freeShipThreshold: member.level >= 2 ? 3900 : 5900,
        swipedId: ''
      })
      that.recalc()
      mixin.updateTabBadge.call(that)
    })
  },

  recalc: function () {
    var items = this.data.items
    var checked = items.filter(function (i) { return i.checked })
    var totalAmount = checked.reduce(function (s, i) { return s + i.price * i.count }, 0)
    var totalCount = checked.reduce(function (s, i) { return s + i.count }, 0)
    var freeThreshold = this.data.freeShipThreshold
    var diffToFree = Math.max(0, freeThreshold - totalAmount)
    var freight = totalAmount >= freeThreshold ? 0 : (checked.length ? 600 : 0)
    var allChecked = items.length > 0 && items.every(function (i) { return i.checked })
    // 需求9.2：购物车结算栏显示可享最高满减阶梯
    var fullReduce = api.fullReduceOf(totalAmount)
    this.setData({
      totalAmount: totalAmount, totalCount: totalCount, freight: freight,
      diffToFree: diffToFree, allChecked: allChecked, fullReduce: fullReduce,
      fullReduceText: fullReduce > 0 ? ('已选满' + (totalAmount / 100) + '元，可减' + (fullReduce / 100) + '元') : '满59元可减8元，满99减20元，满199减50元'
    })
  },

  // 单选
  toggleItem: function (e) {
    var id = e.currentTarget.dataset.id
    var items = this.data.items.map(function (i) {
      if (i.id === id) i.checked = !i.checked
      return i
    })
    this.setData({ items: items })
    api.updateCartItem(id, { checked: items.filter(function (i) { return i.id === id })[0].checked })
    this.recalc()
  },

  // 全选
  toggleAll: function () {
    var that = this
    var next = !this.data.allChecked
    var items = this.data.items.map(function (i) { i.checked = next; return i })
    this.setData({ items: items })
    // 批量更新 storage
    Promise.all(items.map(function (i) { return api.updateCartItem(i.id, { checked: next }) })).then(function () {
      that.recalc()
    })
  },

  // 数量 +/-
  changeCount: function (e) {
    var id = e.currentTarget.dataset.id
    var delta = Number(e.currentTarget.dataset.delta)
    var item = this.data.items.filter(function (i) { return i.id === id })[0]
    if (!item) return
    var newCount = item.count + delta
    if (newCount < 1) return
    if (newCount > item.stock) {
      wx.showToast({ title: '库存不足，最多' + item.stock + '件', icon: 'none' })
      return
    }
    var items = this.data.items.map(function (i) {
      if (i.id === id) i.count = newCount
      return i
    })
    this.setData({ items: items })
    api.updateCartItem(id, { count: newCount }).then(function () { this.recalc() }.bind(this))
  },

  // 删除（二次确认）
  removeItem: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var item = this.data.items.filter(function (i) { return i.id === id })[0] || this.data.invalidItems.filter(function (i) { return i.id === id })[0]
    wx.showModal({
      title: '确认删除', content: '确定将「' + (item ? item.name : '') + '」从购物车删除吗？',
      success: function (res) {
        if (res.confirm) {
          api.removeCartItem(id).then(function () {
            wx.showToast({ title: '已删除', icon: 'none' })
            that.reload()
          })
        } else {
          that.setData({ swipedId: '' })
        }
      }
    })
  },

  // 清空失效商品
  clearInvalid: function () {
    var that = this
    wx.showModal({
      title: '清空失效商品', content: '确定清空所有失效商品吗？',
      success: function (res) {
        if (res.confirm) {
          api.clearInvalid().then(function () { that.reload() })
        }
      }
    })
  },

  // 去结算
  checkout: function () {
    if (this.data.totalCount === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    // 将选中项写入 buy_items，跳转订单确认页
    var items = this.data.items.filter(function (i) { return i.checked })
    wx.setStorageSync('buy_items', items.map(function (i) {
      return { goodsId: i.goodsId, name: i.name, pic: i.pic, specText: i.specText, price: i.price, count: i.count }
    }))
    wx.navigateTo({ url: '/pages/buy/buy' })
  },

  // 去逛逛
  goShopping: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 猜你喜欢加购
  addCart: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.addToCart(id, '标准装 · 常规包装', 1).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '加入购物车成功', icon: 'none' })
        that.reload()
      }
    })
  },

  // 跳转商品详情
  goDetail: function (e) {
    mixin.goDetail.call(this, e.currentTarget.dataset.id)
  },

  // 左滑删除：touch 记录
  touchStartX: 0,
  onTouchStart: function (e) { this.touchStartX = e.touches[0].clientX },
  onTouchEnd: function (e) {
    var dx = e.changedTouches[0].clientX - this.touchStartX
    var id = e.currentTarget.dataset.id
    if (dx < -50) this.setData({ swipedId: id })
    else if (dx > 50) this.setData({ swipedId: '' })
  },
  closeSwipe: function () { this.setData({ swipedId: '' }) },

  onPullDownRefresh: function () {
    var that = this
    this.reload()
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  onImgError: mixin.onImgError
})
