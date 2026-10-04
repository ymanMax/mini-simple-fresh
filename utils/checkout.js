// utils/checkout.js —— 结算中转：购物车结算 / 立即购买
var _payload = null

function setCheckout(payload) { _payload = payload }
function getCheckout() { return _payload }
function clearCheckout() { _payload = null }

module.exports = {
  setCheckout: setCheckout,
  getCheckout: getCheckout,
  clearCheckout: clearCheckout
}
