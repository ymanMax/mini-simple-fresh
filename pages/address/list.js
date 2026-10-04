// pages/address/list.js 收货地址列表
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    addresses: [],
    mode: 'normal', // normal / select
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    this.setData({ mode: options.mode || 'normal' })
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    api.getAddresses().then(function (list) {
      that.setData({ addresses: list || [], loading: false })
    })
  },

  tapAddress: function (e) {
    var id = e.currentTarget.dataset.id
    var addr = this.data.addresses.filter(function (a) { return a.id === id })[0]
    if (!addr) return
    if (this.data.mode === 'select') {
      wx.setStorageSync('fl_selected_address', addr)
      wx.navigateBack()
    } else {
      // 普通模式：进入编辑
      wx.navigateTo({ url: '/pages/address/edit?id=' + id })
    }
  },

  setDefault: function (e) {
    var id = e.currentTarget.dataset.id
    api.setDefaultAddress(id).then(function () {
      toast.success('已设为默认地址')
    })
    this.load()
  },

  edit: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/address/edit?id=' + id })
  },

  remove: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    toast.confirm('确定删除该地址？').then(function (ok) {
      if (!ok) return
      api.deleteAddress(id).then(function () {
        toast.success('已删除')
        that.load()
      })
    })
  },

  addAddress: function () {
    wx.navigateTo({ url: '/pages/address/edit' })
  },

  onImgError: function (e) { img.make(this)(e) }
})
