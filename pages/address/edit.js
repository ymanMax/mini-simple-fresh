// pages/address/edit.js 地址编辑
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

Page({
  data: {
    id: null,
    form: {
      name: '', phone: '', province: '北京市', city: '北京市', district: '',
      detail: '', tag: '家', isDefault: false
    },
    tags: ['家', '学校', '公司'],
    provinces: ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市'],
    cityMap: {
      '北京市': ['北京市'], '上海市': ['上海市'],
      '广州市': ['广州市'], '深圳市': ['深圳市'],
      '杭州市': ['杭州市'], '成都市': ['成都市']
    }
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: Number(options.id) })
      api.getAddresses().then(function (list) {
        var addr = (list || []).filter(function (a) { return a.id === Number(options.id) })[0]
        if (addr) {
          this.setData({ form: Object.assign({}, addr) })
        }
      }.bind(this))
    }
  },

  onFieldInput: function (e) {
    var field = e.currentTarget.dataset.field
    var form = Object.assign({}, this.data.form)
    form[field] = e.detail.value
    this.setData({ form: form })
  },

  pickTag: function (e) {
    var tag = e.currentTarget.dataset.tag
    var form = Object.assign({}, this.data.form)
    form.tag = tag
    this.setData({ form: form })
  },

  pickProvince: function (e) {
    var province = e.currentTarget.dataset.value
    var form = Object.assign({}, this.data.form)
    form.province = province
    form.city = (this.data.cityMap[province] || [province])[0]
    this.setData({ form: form })
  },

  toggleDefault: function () {
    var form = Object.assign({}, this.data.form)
    form.isDefault = !form.isDefault
    this.setData({ form: form })
  },

  validate: function () {
    var f = this.data.form
    if (!f.name.trim()) { toast.toast('请填写收货人姓名'); return false }
    if (!/^1[3-9]\d{9}$/.test(f.phone)) { toast.toast('请填写正确的手机号'); return false }
    if (!f.province || !f.city || !f.district.trim()) { toast.toast('请选择省市区'); return false }
    if (!f.detail.trim()) { toast.toast('请填写详细地址'); return false }
    return true
  },

  save: function () {
    if (!this.validate()) return
    var that = this
    var payload = Object.assign({}, this.data.form, { id: this.data.id || undefined })
    api.saveAddress(payload).then(function (res) {
      if (res.ok) {
        toast.success('保存成功')
        setTimeout(function () { wx.navigateBack() }, 500)
      } else {
        toast.toast(res.msg || '保存失败')
      }
    })
  }
})
