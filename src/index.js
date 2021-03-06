// eslint-disable-next-line
import React, { Fragment } from 'react'
import Router from 'next/router'

class GoogleAnalytics extends React.PureComponent {
  static pageview = (url = '', fields = {}) => {
    if (!window.ga) {
      console.warn('GoogleAnalytics must be initialized')
      return
    }

    window.ga('send', 'pageview', url || window.location.pathname, fields)
  }

  static event = (action, { category, label, value, ...rest }) => {
    if (!window.ga) {
      console.warn('GoogleAnalytics must be initialized')
      return
    }

    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...rest
    })
  }

  componentDidMount () {
    Router.events.on('routeChangeComplete', url => {
      window.gtag('config', this.props.id, {
        page_path: url
      })
    })
  }

  render () {
    const { id } = this.props

    const html = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments)}
                gtag("js", new Date());
                gtag("config", "${id}");
            `

    /*eslint-disable */
    return <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <script dangerouslySetInnerHTML={{ __html: html }} />
    </>
      /* eslint-enable */
  }
}

export default GoogleAnalytics
