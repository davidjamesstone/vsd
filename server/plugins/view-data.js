/*
* Add an `onPreResponse` listener to log request errors
*/

const defaultMetaData = {
  title: 'VisualDEV',
  description: 'Web application builder for hapi and mongo',
  keywords: 'hapijs,mongoose,nodejs,ide,web,javascript,standardjs',
  author: 'vsd'
}

module.exports = {
  plugin: {
    name: 'log-errors',
    register: (server, options) => {
      server.ext('onPostHandler', (request, h) => {
        const response = request.response

        if (response.variety === 'view') {
          if (!response.source.context) {
            response.source.context = {}
          }

          // Apply the default page meta data
          // to the view context meta data
          const context = response.source.context
          context.meta = context.meta || {}

          for (var key in defaultMetaData) {
            if (!context.meta[key]) {
              context.meta[key] = defaultMetaData[key]
            }
          }

          /*
           * Apply auth to the
           * view context data
           */
          const auth = request.auth
          const isAuthenticated = auth.isAuthenticated

          context.isAuthenticated = isAuthenticated
          if (isAuthenticated) {
            const credentials = auth.credentials
            context.auth = credentials
            context.authJSON = JSON.stringify(credentials)
          }
        }

        return h.continue
      })
    }
  }
}
