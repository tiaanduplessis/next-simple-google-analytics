const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const entry = process.argv[2] || path.join(__dirname, '../dist/next-simple-google-analytics.js')
const source = fs.readFileSync(entry, 'utf8')
const warning = 'GoogleAnalytics must be initialized'

function setup (window) {
  const warnings = []
  const context = {
    module: { exports: {} },
    console: { warn: (...args) => warnings.push(args) },
    require (name) {
      if (name === 'react') return { PureComponent: function () {} }
      if (name === 'next/router') return { events: {} }
      throw new Error('Unexpected dependency: ' + name)
    }
  }
  if (arguments.length) context.window = window

  // Only the local module runs. React, Next.js and analytics are doubles;
  // no rendered scripts or network-capable modules are loaded.
  vm.runInNewContext(source, context, { filename: entry })
  return { Analytics: context.module.exports, warnings }
}

function test (name, run) {
  run()
  console.log('PASS ' + name)
}

function assertUnavailable ({ Analytics, warnings }) {
  assert.strictEqual(Analytics.event('local-test', {}), undefined)
  assert.deepStrictEqual(warnings, [[warning]])
}

test('event warns without a browser window', () => {
  assertUnavailable(setup())
})

test('event warns when neither analytics global exists', () => {
  assertUnavailable(setup({}))
})

test('event warns on a ga-only page without invoking ga', () => {
  assertUnavailable(setup({ ga: () => assert.fail('ga must not be called') }))
})

test('event warns for every non-callable gtag value', () => {
  for (const gtag of [undefined, null, false, true, 0, 1, '', 'gtag', {}, []]) {
    assertUnavailable(setup({ ga: () => assert.fail('ga must not be called'), gtag }))
  }
})

test('event sends on a gtag-only page with the original payload', () => {
  const calls = []
  const { Analytics, warnings } = setup({ gtag: (...args) => calls.push(args) })
  const metadata = { category: 'button', label: 'save', value: 0, custom: true }
  assert.strictEqual(Analytics.event('local-test', metadata), undefined)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls)), [
    ['event', 'local-test', { event_category: 'button', event_label: 'save', value: 0, custom: true }]
  ])
  assert.deepStrictEqual(metadata, { category: 'button', label: 'save', value: 0, custom: true })
  assert.deepStrictEqual(warnings, [])
})

test('event sends exactly once through gtag when both globals exist', () => {
  const calls = []
  const { Analytics, warnings } = setup({
    ga: () => assert.fail('ga must not be called'),
    gtag: (...args) => calls.push(args)
  })
  Analytics.event('local-test', {})
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0][0], 'event')
  assert.strictEqual(calls[0][1], 'local-test')
  assert.deepStrictEqual(warnings, [])
})

test('event does not read the unrelated ga global', () => {
  let calls = 0
  const window = { gtag: () => { calls++ } }
  Object.defineProperty(window, 'ga', { get: () => assert.fail('ga must not be read') })
  const { Analytics, warnings } = setup(window)
  Analytics.event('local-test', {})
  assert.strictEqual(calls, 1)
  assert.deepStrictEqual(warnings, [])
})

test('event preserves custom fields and their existing override order', () => {
  let payload
  const nested = { local: true }
  const { Analytics } = setup({ gtag: (command, action, fields) => { payload = fields } })
  Analytics.event('local-test', {
    category: 'category',
    label: 'label',
    value: false,
    event_category: 'custom-category',
    event_label: 'custom-label',
    nested
  })
  assert.strictEqual(payload.event_category, 'custom-category')
  assert.strictEqual(payload.event_label, 'custom-label')
  assert.strictEqual(payload.value, false)
  assert.strictEqual(payload.nested, nested)
  assert.deepStrictEqual(Object.keys(payload).sort(), ['event_category', 'event_label', 'nested', 'value'])
})

test('event keeps absent metadata fields undefined', () => {
  let payload
  const { Analytics } = setup({ gtag: (command, action, fields) => { payload = fields } })
  Analytics.event('local-test', {})
  assert.deepStrictEqual(Object.keys(payload).sort(), ['event_category', 'event_label', 'value'])
  assert.strictEqual(payload.event_category, undefined)
  assert.strictEqual(payload.event_label, undefined)
  assert.strictEqual(payload.value, undefined)
})

test('event preserves the window receiver and ignores transport return values', () => {
  const window = {
    gtag () {
      assert.strictEqual(this, window)
      return 'transport-result'
    }
  }
  const { Analytics } = setup(window)
  assert.strictEqual(Analytics.event('local-test', {}), undefined)
})

test('event propagates errors from a callable gtag', () => {
  const error = new Error('local transport failure')
  const { Analytics, warnings } = setup({ gtag: () => { throw error } })
  assert.throws(() => Analytics.event('local-test', {}), thrown => thrown === error)
  assert.deepStrictEqual(warnings, [])
})
