// pages/address/edit.js —— 地址编辑：表单（姓名/电话/省市区/详细地址/标签）+ 校验 + 保存
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    isEdit: false,
    id: '',
    form: { name: '', phone: '', province: '北京市', city: '北京市', district: '', detail: '', tag: '家', isDefault: false },
    tags: ['家', '学校', '公司'],
    districts: ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '通州区'],
    districtIndex: 0
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ isEdit: true, id: options.id })
      this.loadAddress(options.id)
    }
  },

  loadAddress: function (id) {
    var that = this
    api.getAddress(id).then(function (a) {
      if (a) {
        var districtIndex = Math.max(0, that.data.districts.indexOf(a.district))
        that.setData({ form: Object.assign({}, a), districtIndex: districtIndex })
      }
    })
  },

  onInput: function (e) {
    var field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  pickTag: function (e) { this.setData({ 'form.tag': e.currentTarget.dataset.tag }) },
  pickDistrict: function (e) {
    var idx = Number(e.currentTarget.dataset.idx)
    this.setData({ districtIndex: idx, 'form.district': this.data.districts[idx] })
  },
  toggleDefault: function () { this.setData({ 'form.isDefault': !this.data.form.isDefault }) },

  // 校验
  validate: function () {
    var f = this.data.form
    if (!f.name.trim()) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return false }
    if (!/^1[3-9]\d{9}$/.test(f.phone.trim())) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return false }
    if (!f.district) { wx.showToast({ title: '请选择所在区', icon: 'none' }); return false }
    if (!f.detail.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return false }
    return true
  },

  save: function () {
    var that = this
    if (!this.validate()) return
    var form = Object.assign({}, this.data.form, {
      name: this.data.form.name.trim(),
      phone: this.data.form.phone.trim(),
      detail: this.data.form.detail.trim()
    })
    if (this.data.isEdit) form.id = this.data.id
    api.saveAddress(form).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 800)
      } else wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onImgError: mixin.onImgError
})
