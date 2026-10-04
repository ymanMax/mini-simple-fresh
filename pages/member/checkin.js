// pages/member/checkin.js 每日签到（日历 + 7天梯度奖励）
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    days: [],
    monthRecords: [],
    today: 0,
    streak: 0,
    totalDays: 0,
    todaySigned: false,
    rewards: [],
    todayReward: 5,
    points: 0,
    year: 0,
    month: 0,
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    api.getCheckin().then(function (c) {
      var today = new Date().getDate()
      // 日历格子
      var days = []
      for (var i = 1; i <= c.daysInMonth; i++) {
        days.push({ day: i, signed: c.monthRecords.indexOf(i) >= 0, isToday: i === today })
      }
      that.setData({
        days: days,
        monthRecords: c.monthRecords,
        today: today,
        streak: c.streak,
        totalDays: c.totalDays,
        todaySigned: c.todaySigned,
        rewards: c.rewards,
        todayReward: c.todayReward,
        points: c.member ? c.member.points : 0,
        year: c.year,
        month: c.month,
        loading: false
      })
    })
  },

  doCheckin: function () {
    var that = this
    if (this.data.todaySigned) { toast.toast('今日已签到'); return }
    api.checkin().then(function (res) {
      if (res.ok) {
        toast.success('签到成功 +' + res.reward + '积分')
        that.load()
      } else {
        toast.toast(res.msg || '签到失败')
      }
    })
  },

  onImgError: function (e) { img.make(this)(e) }
})
