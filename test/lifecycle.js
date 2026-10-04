const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const entry = process.argv[2] || path.join(__dirname, '../dist/next-simple-google-analytics.js')
const source = fs.readFileSync(entry, 'utf8')

function setup () {
  const listeners = {}
  const calls = []
  const registrations = []
  const removals = []
  const events = {
    on (name, callback) {
      registrations.push([name, callback])
      listeners[name] = (listeners[name] || []).concat(callback)
    },
    off (name, callback) {
      removals.push([name, callback])
      const callbacks = listeners[name] || []
      const index = callbacks.indexOf(callback)
      if (index !== -1) callbacks.splice(index, 1)
    },
    emit (name, url) {
      ;(listeners[name] || []).slice().forEach(callback => callback(url))
    }
  }

  function PureComponent (props) { this.props = props }

  // Execute only the local module. React, Next.js and analytics are all stubs;
  // no rendered scripts or network-capable modules are loaded by these tests.
  const context = {
    module: { exports: {} },
    window: { gtag: (...args) => calls.push(args) },
    require (name) {
      if (name === 'react') return { PureComponent }
      if (name === 'next/router') return { events }
      throw new Error('Unexpected dependency: ' + name)
    }
  }
  vm.runInNewContext(source, context, { filename: entry })

  return { Analytics: context.module.exports, events, calls, listeners, registrations, removals }
}

function route (events, url) {
  events.emit('routeChangeComplete', url)
}

function test (name, run) {
  run()
  console.log('PASS ' + name)
}

test('mounted callback reports the route and current tracking ID', () => {
  const { Analytics, events, calls } = setup()
  const component = new Analytics({ id: 'G-LOCAL-TEST' })
  component.componentDidMount()
  route(events, '/first')
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0][0], 'config')
  assert.strictEqual(calls[0][1], 'G-LOCAL-TEST')
  assert.strictEqual(calls[0][2].page_path, '/first')

  component.props = { id: 'G-UPDATED-TEST' }
  route(events, '/second')
  assert.strictEqual(calls.length, 2)
  assert.strictEqual(calls[1][1], 'G-UPDATED-TEST')
  assert.strictEqual(calls[1][2].page_path, '/second')
})

test('unmount removes the exact registered callback and stops route sends', () => {
  const { Analytics, events, calls, registrations, removals, listeners } = setup()
  const component = new Analytics({ id: 'G-LOCAL-TEST' })
  component.componentDidMount()
  route(events, '/mounted')
  component.componentWillUnmount()
  assert.strictEqual(removals.length, 1)
  assert.strictEqual(removals[0][0], 'routeChangeComplete')
  assert.strictEqual(removals[0][1], registrations[0][1])
  assert.strictEqual(listeners.routeChangeComplete.length, 0)
  route(events, '/unmounted')
  assert.strictEqual(calls.length, 1)
})

test('cleanup preserves earlier, later and unrelated listeners', () => {
  const { Analytics, events, calls, listeners } = setup()
  const observed = []
  const earlier = url => observed.push('earlier:' + url)
  const later = url => observed.push('later:' + url)
  const unrelated = url => observed.push('start:' + url)
  events.on('routeChangeComplete', earlier)
  events.on('routeChangeStart', unrelated)
  const component = new Analytics({ id: 'G-LOCAL-TEST' })
  component.componentDidMount()
  events.on('routeChangeComplete', later)
  route(events, '/mounted')
  component.componentWillUnmount()
  route(events, '/unmounted')
  events.emit('routeChangeStart', '/next')
  assert.deepStrictEqual(listeners.routeChangeComplete, [earlier, later])
  assert.deepStrictEqual(listeners.routeChangeStart, [unrelated])
  assert.deepStrictEqual(observed, [
    'earlier:/mounted', 'later:/mounted',
    'earlier:/unmounted', 'later:/unmounted', 'start:/next'
  ])
  assert.strictEqual(calls.length, 1)
})

test('repeated mount/unmount cycles leave no callbacks behind', () => {
  const { Analytics, events, calls, listeners } = setup()
  for (let index = 0; index < 3; index++) {
    const component = new Analytics({ id: 'G-LOCAL-TEST' })
    component.componentDidMount()
    assert.strictEqual(listeners.routeChangeComplete.length, 1)
    route(events, '/mounted-' + index)
    component.componentWillUnmount()
    assert.strictEqual(listeners.routeChangeComplete.length, 0)
    route(events, '/unmounted-' + index)
    assert.strictEqual(calls.length, index + 1)
  }
})

test('the same instance can remount without duplicate route sends', () => {
  const { Analytics, events, calls, listeners } = setup()
  const component = new Analytics({ id: 'G-LOCAL-TEST' })
  for (let index = 0; index < 3; index++) {
    component.componentDidMount()
    assert.strictEqual(listeners.routeChangeComplete.length, 1)
    route(events, '/mounted-' + index)
    component.componentWillUnmount()
    assert.strictEqual(listeners.routeChangeComplete.length, 0)
    route(events, '/unmounted-' + index)
    assert.strictEqual(calls.length, index + 1)
  }
})

test('unmounting one instance preserves another instance callback', () => {
  const { Analytics, events, calls, listeners } = setup()
  const first = new Analytics({ id: 'G-FIRST-TEST' })
  const second = new Analytics({ id: 'G-SECOND-TEST' })
  first.componentDidMount()
  second.componentDidMount()
  first.componentWillUnmount()
  assert.strictEqual(listeners.routeChangeComplete.length, 1)
  route(events, '/second-only')
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0][1], 'G-SECOND-TEST')
  second.componentWillUnmount()
  assert.strictEqual(listeners.routeChangeComplete.length, 0)
  route(events, '/neither')
  assert.strictEqual(calls.length, 1)
})

test('repeated cleanup does not remove an unrelated callback', () => {
  const { Analytics, events, listeners } = setup()
  const other = () => {}
  events.on('routeChangeComplete', other)
  const component = new Analytics({ id: 'G-LOCAL-TEST' })
  component.componentDidMount()
  component.componentWillUnmount()
  component.componentWillUnmount()
  assert.deepStrictEqual(listeners.routeChangeComplete, [other])
})
