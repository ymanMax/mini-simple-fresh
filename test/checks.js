// test/checks.js —— 静态检查：JSON合法、WXML标签平衡、导航URL注册、图片引用齐全
const fs = require('fs')
const path = require('path')

// 1. JSON 合法性
let badJson = 0
function walkDir(d, cb) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walkDir(p, cb)
    else cb(p)
  })
}
walkDir('pages', p => {
  if (p.endsWith('.json')) {
    try { JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { badJson++; console.log('BAD JSON', p, e.message) }
  }
})
try { JSON.parse(fs.readFileSync('app.json', 'utf8')) } catch (e) { badJson++; console.log('BAD JSON app.json') }
console.log('JSON bad:', badJson)

// 2. WXML 标签平衡
const tags = ['view', 'block', 'image', 'text', 'scroll-view', 'swiper', 'swiper-item', 'input', 'textarea', 'navigator', 'button', 'page', 'cover-view', 'cover-image']
let wxmlErrors = 0
walkDir('pages', p => {
  if (!p.endsWith('.wxml')) return
  const src = fs.readFileSync(p, 'utf8')
  const stack = []
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g
  let m
  while ((m = re.exec(src)) !== null) {
    const [full, close, tag, attrs, selfClose] = m
    if (!tags.includes(tag)) continue
    if (selfClose === '/' || full.endsWith('/>')) continue
    if (close === '/') {
      const top = stack.pop()
      if (top !== tag) { wxmlErrors++; console.log('MISMATCH', p, 'expected', top, 'got', tag); break }
    } else stack.push(tag)
  }
  if (stack.length) { wxmlErrors++; console.log('UNCLOSED', p, stack) }
})
console.log('WXML errors:', wxmlErrors)

// 3. 导航URL全部注册
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const registered = new Set(app.pages)
const urlRe = /url:\s*['"]([^'"]+)['"]/g
const urls = new Set()
walkDir('pages', p => {
  if (!p.endsWith('.js')) return
  const s = fs.readFileSync(p, 'utf8')
  let m
  while ((m = urlRe.exec(s)) !== null) if (m[1].startsWith('/pages')) urls.add(m[1].split('?')[0])
})
const badUrls = [...urls].filter(u => !registered.has(u.slice(1)))
console.log('navigation URLs:', urls.size, 'unregistered:', badUrls.length ? badUrls : 'NONE')
console.log('registered pages:', app.pages.length)

// 4. 图片引用齐全
const imgRe = /\/images\/[A-Za-z0-9_\/.-]+/g
const refs = new Set()
walkDir('pages', p => {
  if (!p.endsWith('.js') && !p.endsWith('.wxml')) return
  const s = fs.readFileSync(p, 'utf8')
  let m
  while ((m = imgRe.exec(s)) !== null) refs.add(m[0])
})
;['mock/seed.js', 'mock/store.js', 'app.js'].forEach(f => {
  const s = fs.readFileSync(f, 'utf8')
  let m
  while ((m = imgRe.exec(s)) !== null) refs.add(m[0])
})
const missingImg = [...refs].filter(r => !fs.existsSync('.' + r))
console.log('referenced assets:', refs.size, 'missing:', missingImg.length ? missingImg : 'NONE')

// 5. JS 语法检查
let jsErrors = 0
walkDir('pages', p => {
  if (!p.endsWith('.js')) return
  try { new Function(fs.readFileSync(p, 'utf8')) } catch (e) { jsErrors++; console.log('JS SYNTAX', p, e.message) }
})
;['mock/seed.js', 'mock/store.js', 'mock/interceptor.js', 'utils/format.js', 'utils/toast.js', 'utils/api.js', 'utils/mixin.js', 'app.js'].forEach(f => {
  try { new Function(fs.readFileSync(f, 'utf8')) } catch (e) { jsErrors++; console.log('JS SYNTAX', f, e.message) }
})
console.log('JS errors:', jsErrors)

const total = badJson + wxmlErrors + badUrls.length + missingImg.length + jsErrors
console.log('\n=== TOTAL CHECK FAILURES:', total, '===')
process.exit(total ? 1 : 0)
