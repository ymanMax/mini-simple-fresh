// pages/address/edit.js —— 地址新增/编辑：表单校验
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

var PROVINCES = ['北京市', '上海市', '天津市', '重庆市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省', '山东省', '河南省', '河北省', '福建省', '安徽省', '陕西省', '云南省', '辽宁省', '黑龙江省', '吉林省', '广西壮族自治区', '新疆维吾尔自治区', '内蒙古自治区', '西藏自治区', '宁夏回族自治区', '甘肃省', '青海省', '海南省', '贵州省', '山西省', '香港特别行政区', '澳门特别行政区', '台湾省']
var TAGS = ['家', '公司', '学校']

Page({
  data: {
    id: null,
    provinces: PROVINCES,
    tags: TAGS,
    provinceIndex: 0,
    tagIndex: 0,
    name: '',
    phone: '',
    province: PROVINCES[0],
    city: '',
    district: '',
    detail: '',
    tag: '家',
    isDefault: false,
    title: '新增收货地址'
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ id: Number(options.id), title: '编辑收货地址' })
      this.loadDetail(Number(options.id))
    }
  },

  loadDetail: function (id) {
    var that = this
    api.get('/api/addresses/list').then(function (data) {
      var a = data.list.filter(function (x) { return x.id === id })[0]
      if (!a) return
      var pi = PROVINCES.indexOf(a.province)
      var ti = TAGS.indexOf(a.tag)
      that.setData({
        name: a.name, phone: a.phone,
        province: a.province, city: a.city, district: a.district, detail: a.detail,
        tag: a.tag, isDefault: a.isDefault,
        provinceIndex: pi >= 0 ? pi : 0,
        tagIndex: ti >= 0 ? ti : 0
      })
    })
  },

  onField: function (e) {
    var field = e.currentTarget.dataset.field
    var patch = {}
    patch[field] = e.detail.value
    this.setData(patch)
  },

  pickProvince: function (e) {
    var i = Number(e.detail.value)
    this.setData({ provinceIndex: i, province: PROVINCES[i] })
  },

  pickTag: function (e) {
    var i = Number(e.detail.value)
    this.setData({ tagIndex: i, tag: TAGS[i] })
  },

  toggleDefault: function () {
    this.setData({ isDefault: !this.data.isDefault })
  },

  save: function () {
    var d = this.data
    if (!d.name.trim()) return toast.toast('请填写收货人姓名')
    if (!/^1[3-9]\d{9}$/.test(d.phone)) return toast.toast('请填写正确的11位手机号')
    if (!d.city.trim()) return toast.toast('请填写城市')
    if (!d.district.trim()) return toast.toast('请填写区/县')
    if (!d.detail.trim()) return toast.toast('请填写详细地址')
    var that = this
    api.post('/api/addresses/save', {
      id: d.id,
      name: d.name.trim(),
      phone: d.phone.trim(),
      province: d.province,
      city: d.city.trim(),
      district: d.district.trim(),
      detail: d.detail.trim(),
      tag: d.tag,
      isDefault: d.isDefault
    }).then(function () {
      toast.success('保存成功')
      wx.navigateBack()
    })
  }
})
