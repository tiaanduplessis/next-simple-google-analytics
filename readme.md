
# next-simple-google-analytics
[![package version](https://img.shields.io/npm/v/next-simple-google-analytics.svg?style=flat-square)](https://npmjs.org/package/next-simple-google-analytics)
[![package downloads](https://img.shields.io/npm/dm/next-simple-google-analytics.svg?style=flat-square)](https://npmjs.org/package/next-simple-google-analytics)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/next-simple-google-analytics.svg?style=flat-square)](https://npmjs.org/package/next-simple-google-analytics)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Add Google Analytics to your Next.js site in a jiffy

## Table of Contents

- [About](#about)
- [Usage](#usage)
- [Install](#install)
- [Contribute](#contribute)
- [License](#License)

## About

This module is heavily based on the [official example](https://github.com/zeit/next.js/tree/canary/examples/with-google-analytics).

## Usage

Add the default export to the `Head` of `_document.js`:

```js
import Document, { Html, Head, Main, NextScript } from 'next/document'
import GoogleAnalytics from 'next-simple-google-analytics'

class MainDocument extends Document {
  static async getInitialProps (ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render () {
    return (
      <Html lang='en'>
        <Head>
          <GoogleAnalytics id="UA-X00XXX0X-X"/>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MainDocument

```


## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com).

```sh
$ npm install next-simple-google-analytics
$ # OR
$ yarn add next-simple-google-analytics
```

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT © Tiaan du Plessis
