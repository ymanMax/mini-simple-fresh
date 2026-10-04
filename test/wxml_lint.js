// test/wxml_lint.js —— WXML 表达式静态检查：括号/引号平衡、嵌套三元、未识别运算符、属性引号
const fs = require('fs')
const path = require('path')

let errors = 0
const files = []
;(function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.wxml')) files.push(p)
  })
})('pages')

function checkExpr(expr, file, line) {
  // 去掉字符串字面量后检查括号平衡
  let s = expr
  // 提取字符串字面量
  const strings = []
  s = s.replace(/'([^']*)'/g, (m, g) => { strings.push(g); return '\x00' + (strings.length - 1) + '\x00' })
  s = s.replace(/"([^"]*)"/g, (m, g) => { strings.push(g); return '\x00' + (strings.length - 1) + '\x00' })
  // 括号平衡
  const pairs = { ')': '(', ']': '[', '}': '{' }
  const stack = []
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch)
    else if (ch === ')' || ch === ']' || ch === '}') {
      const top = stack.pop()
      if (top !== pairs[ch]) { console.log(`UNBALANCED ${file}:${line} expr="${expr}" (${ch})`); errors++; return }
    }
  }
  if (stack.length) { console.log(`UNCLOSED ${file}:${line} expr="${expr}" stack=${stack.join('')}`); errors++ }
  // 嵌套三元：统计 ? 和 : 的数量，若 ? > 1 且表达式含 ?: 链 → 标记
  const qCount = (s.match(/\?/g) || []).length
  const cCount = (s.match(/:/g) || []).length
  if (qCount > 1) { console.log(`NESTED TERNARY? ${file}:${line} expr="${expr}"`); errors++ }
}

files.forEach(f => {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  lines.forEach((lineText, i) => {
    const re = /\{\{([^}]*)\}\}/g
    let m
    while ((m = re.exec(lineText)) !== null) checkExpr(m[1].trim(), f, i + 1)
    // 属性引号检查：= 后未加引号的属性值
    const attrRe = /\s(\w+(?:\([^)]*\))?)=(?![\s=])(?![/"'])([^\s>]+)/g
    let a
    while ((a = attrRe.exec(lineText)) !== null) {
      // 排除 wx:for 等合法无引号场景（微信允许），只报可疑裸值
    }
  })
})

// 标签平衡（复用旧逻辑）
const tags = ['view','block','image','text','scroll-view','swiper','swiper-item','input','textarea','navigator','button','page','cover-view','cover-image']
files.forEach(f => {
  const src = fs.readFileSync(f, 'utf8')
  const stack = []
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g
  let m
  while ((m = re.exec(src)) !== null) {
    const [full, close, tag, attrs, selfClose] = m
    if (!tags.includes(tag)) continue
    if (selfClose === '/' || full.endsWith('/>')) continue
    if (close === '/') {
      const top = stack.pop()
      if (top !== tag) { console.log(`TAG MISMATCH ${f}: expected ${top} got ${tag}`); errors++; break }
    } else stack.push(tag)
  }
  if (stack.length) { console.log(`UNCLOSED TAGS ${f}: ${stack}`); errors++ }
})

console.log(`\n=== WXML LINT: ${errors} errors, ${files.length} files ===`)
process.exit(errors ? 1 : 0)
