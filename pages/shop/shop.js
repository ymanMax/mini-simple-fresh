// pages/shop/shop.js —— 购物车：列表 / stepper / 单选全选 / 删除 / 失效区 / 结算 / 空态推荐
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var imgBehavior = require('../../utils/imgBehavior.js')

Page({
  behaviors: [imgBehavior],
  data: {
    validItems: [],
    invalidItems: [],
    totalCount: 0,
    totalPriceYuan: '0.00',
    allChecked: false,
    loading: true,
    recommend: [],
    freeShipTip: '',
    promoTip: '',
    swipedId: null,
    isEmpty: false
  },

  onShow: function () {
    badge.refreshAllBadges()
    this.loadCart()
    this.loadRecommend()
  },

  loadCart: function () {
    var that = this
    this.setData({ loading: true })
    api.get('/api/cart').then(function (data) {
      // 满59免配送费提示
      var totalFen = data.totalPrice
      var tip = ''
      if (totalFen <= 0) tip = '满 59 元免配送费'
      else if (totalFen < 5900) tip = '还差 ￥' + fmt.yuan(5900 - totalFen) + ' 即可免配送费'
      else tip = '🎉 已享受免配送费'
      // 满减优惠提示（需求9.2）
      var promoTip = ''
      if (data.fullReduce > 0) {
        promoTip = '已选满减优惠：立减 ￥' + data.fullReduceYuan
      } else if (data.nextTier) {
        promoTip = '再买 ￥' + fmt.yuan(data.nextTier.threshold - totalFen) + ' 可享满减 ' + data.nextTier.title
      }
      that.setData({
        validItems: data.validItems,
        invalidItems: data.invalidItems,
        totalCount: data.totalCount,
        totalPriceYuan: data.totalPriceYuan,
        allChecked: data.allChecked,
        loading: false,
        isEmpty: data.items.length === 0,
        freeShipTip: tip,
        promoTip: promoTip,
        swipedId: null
      })
    }).catch(function () { that.setData({ loading: false }) })
  },

  loadRecommend: function () {
    var that = this
    api.get('/api/goods/list', { page: 1, pageSize: 8, sort: 'sells' }).then(function (data) {
      that.setData({ recommend: data.list })
    })
  },

  // ===== 单选 / 全选 =====
  toggleItem: function (e) {
    var id = e.currentTarget.dataset.id
    var item = this.data.validItems.filter(function (i) { return i.id === id })[0]
    api.post('/api/cart/update', { id: id, checked: !item.checked }).then(function () {
      // 乐观刷新，直接重取
    })
    this.loadCart()
  },

  toggleAll: function () {
    var that = this
    api.post('/api/cart/toggleAll', { checked: !this.data.allChecked }).then(function () {
      that.loadCart()
    })
  },

  // ===== 数量 =====
  changeCount: function (e) {
    var id = e.currentTarget.dataset.id
    var delta = Number(e.currentTarget.dataset.delta)
    var item = this.data.validItems.filter(function (i) { return i.id === id })[0]
    var count = item.count + delta
    if (count < 1) {
      this.removeItem(e)
      return
    }
    if (count > item.stock) {
      toast.toast('库存不足，最多 ' + item.stock + ' 件')
      return
    }
    api.post('/api/cart/update', { id: id, count: count }).then(function () {
      // loadCart 由外部触发
    })
    this.loadCart()
    badge.refreshCartBadge()
  },

  // ===== 删除（二次确认）=====
  removeItem: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确定从购物车删除该商品吗？', '删除', function () {
      api.post('/api/cart/remove', { id: id }).then(function () {
        toast.success('已删除')
        that.loadCart()
        badge.refreshCartBadge()
      })
    })
  },

  clearInvalid: function () {
    var that = this
    toast.confirm('清空全部失效商品吗？', '清空', function () {
      api.post('/api/cart/clearInvalid', {}).then(function () {
        that.loadCart()
      })
    })
  },

  // ===== 左滑 =====
  touchStart: function (e) {
    this._startX = e.touches[0].clientX
    this._startY = e.touches[0].clientY
  },
  touchEnd: function (e) {
    var dx = e.changedTouches[0].clientX - this._startX
    var dy = e.changedTouches[0].clientY - this._startY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      var id = e.currentTarget.dataset.id
      this.setData({ swipedId: dx < 0 ? id : null })
    } else {
      this.setData({ swipedId: null })
    }
  },
  closeSwipe: function () { this.setData({ swipedId: null }) },

  // ===== 结算 =====
  checkout: function () {
    if (this.data.totalCount === 0) {
      toast.toast('请先选择要结算的商品')
      return
    }
    wx.navigateTo({ url: '/pages/buy/buy?mode=cart' })
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.gid || e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  addRec: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/cart/add', { goodsId: id, specLabel: '标准装', count: 1 }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
      this.loadCart()
    }.bind(this))
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadCart()
    this.loadRecommend()
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  }
})
