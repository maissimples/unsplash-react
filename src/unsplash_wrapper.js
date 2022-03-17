import { createApi } from 'unsplash-js'

class ChaosMonkey {
  constructor(shouldDoAnything) {
    if (shouldDoAnything) {
      this.process = (r) => (Math.random() > 0.5 ? this.failResponse(r) : r)
    } else {
      this.process = (r) => r
    }
  }

  failResponse(_response) {
    const errors = [
      [400, 'bad request'],
      [503, 'gateway timeout'],
      [500, 'server error'],
      [401, 'not authorized'],
    ]
    const error = errors[Math.round(Math.random() * (errors.length - 1))]
    return new Response(JSON.stringify({}), {
      status: error[0],
      statusText: error[1],
    })
  }
}

export default class UnsplashWrapper {
  constructor({ accessKey, __debug_chaosMonkey = false }) {
    this.__debug_chaosMonkey = new ChaosMonkey(__debug_chaosMonkey)
    this.unsplash = createApi({ accessKey })
  }

  // eslint-disable-next-line max-params
  listPhotos = (page, perPage, proxyUrl, orderBy = 'popular') => {
    if (proxyUrl) {
      const newProxyUrl = `${proxyUrl}?&orderBy=${orderBy}&page=${page}&per_page=${perPage}`
      return fetch(newProxyUrl)
        .then((resp) => resp.json())
        .then((resp) => resp)
    }

    return this.unsplash.photos
      .list({ page, perPage, orderBy })
      .then(this.processResponse)
      .then(({ response }) => response.results)
  }

  // eslint-disable-next-line max-params
  searchPhotos = (query, page, perPage, customQueryParams = {}, proxyUrl) => {
    if (proxyUrl) {
      let newProxyUrl = `${proxyUrl}/search?query=${query}&page=${page}&per_page=${perPage}`
      Object.keys(customQueryParams).forEach((key) => {
        newProxyUrl += `&${key}=${customQueryParams[key]}`
      })

      return fetch(newProxyUrl)
        .then((resp) => resp.json())
        .then((resp) => resp)
    }

    return this.unsplash.search
      .getPhotos({ query, page, perPage, ...customQueryParams })
      .then(this.processResponse)
      .then(({ response }) => response)
  }

  getPhoto = (id, { width, height } = {}) => {
    return this.unsplash.photos
      .get({ photoId: id, width, height })
      .then(this.processResponse)
      .then(({ response }) => response)
  }

  downloadPhoto = (photo, proxyUrl) => {
    const ixid = photo.links.download_location.split('ixid=')[1]
    const newProxyUrl = `${proxyUrl}/download?id=${photo.id}&ixid=${ixid}`

    return fetch(newProxyUrl)
      .then((resp) => resp.json())
      .then((response) => response)
  }

  processResponse = (incomingResponse) => {
    const response = Promise.resolve(
      this.__debug_chaosMonkey.process(incomingResponse)
    )

    return response.then(this.handleErrors)
  }

  handleErrors(response) {
    if (response.type !== 'success') {
      const error = Error(response.statusText)
      error.status = response.status
      throw error
    }

    return response
  }
}
