// pages/address/list.js —— 地址列表：展示、设为默认、编辑、删除；支持选择模式（返回订单确认页）
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    addresses: [],
    mode: 'list' // list | select
  },

  onLoad: function (options) {
    this.setData({ mode: options.mode === 'select' ? 'select' : 'list' })
  },
  onShow: function () { this.loadList() },

  loadList: function () {
    var that = this
    this.setData({ loading: true })
    api.getAddresses().then(function (list) {
      that.setData({ loading: false, addresses: list })
    })
  },

  // 选择模式：点击地址返回
  tapAddress: function (e) {
    if (this.data.mode !== 'select') return
    var id = e.currentTarget.dataset.id
    var addr = this.data.addresses.filter(function (a) { return a.id === id })[0]
    wx.setStorageSync('selected_address', addr)
    wx.navigateBack()
  },

  // 设为默认
  setDefault: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.setDefaultAddress(id).then(function () { that.loadList(); wx.showToast({ title: '已设为默认', icon: 'success' }) })
  },

  // 编辑
  edit: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/address/edit?id=' + id })
  },

  // 删除（二次确认）
  remove: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除地址', content: '确定删除该收货地址吗？',
      success: function (res) {
        if (res.confirm) {
          api.deleteAddress(id).then(function () { that.loadList(); wx.showToast({ title: '已删除', icon: 'none' }) })
        }
      }
    })
  },

  addNew: function () {
    wx.navigateTo({ url: '/pages/address/edit' })
  },

  onImgError: mixin.onImgError
})
