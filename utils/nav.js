// 统一跳转：自动区分 tab 页与普通页
const TABS = ['/pages/index/index', '/pages/vip/vip', '/pages/shop/shop', '/pages/me/me']

function go(link) {
  if (!link) return
  if (link.indexOf('modal:') === 0) return
  if (TABS.indexOf(link) >= 0) { wx.switchTab({ url: link }) }
  else { wx.navigateTo({ url: link }) }
}
function redirect(link) {
  if (TABS.indexOf(link) >= 0) wx.switchTab({ url: link })
  else wx.redirectTo({ url: link })
}
module.exports = { go: go, redirect: redirect, TABS: TABS }
