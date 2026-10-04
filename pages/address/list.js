// pages/address/list.js —— 收货地址列表（选择模式/管理模式）
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

Page({
  data: {
    list: [],
    mode: 'manage',
    loading: true
  },

  onLoad: function (options) {
    this.setData({ mode: options.mode || 'manage' })
  },

  onShow: function () {
    this.loadList()
  },

  loadList: function () {
    var that = this
    api.get('/api/addresses/list').then(function (data) {
      that.setData({ list: data.list, loading: false })
    }).catch(function () { that.setData({ loading: false }) })
  },

  // 选择模式：点击选中并返回
  pickAddress: function (e) {
    if (this.data.mode !== 'select') return
    var id = e.currentTarget.dataset.id
    wx.setStorageSync('selected_address_id', id)
    wx.navigateBack()
  },

  edit: function (e) {
    wx.navigateTo({ url: '/pages/address/edit?id=' + e.currentTarget.dataset.id })
  },

  add: function () {
    wx.navigateTo({ url: '/pages/address/edit' })
  },

  setDefault: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/addresses/setDefault', { id: id }).then(function () {
      toast.success('已设为默认')
    })
  },

  remove: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    toast.confirm('确定删除该地址吗？', '删除', function () {
      api.post('/api/addresses/delete', { id: id }).then(function () {
        toast.success('已删除')
        that.loadList()
      })
    })
  }
})
