// utils/api.js —— 请求封装（走 mock 拦截器，Promise 化）
function request(url, data, method) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      data: data || {},
      method: method || 'GET',
      success: function (res) {
        var body = res.data
        if (body && body.errno === 0) resolve(body.data)
        else {
          wx.showToast({ title: (body && body.msg) || '请求失败', icon: 'none' })
          reject(body)
        }
      },
      fail: function (err) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

function get(url, data) { return request(url, data, 'GET') }
function post(url, data) { return request(url, data, 'POST') }

module.exports = { get: get, post: post }
