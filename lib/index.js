const http = require('http');
const pathToRegexp = require('path-to-regexp');

class Layer {
  constructor(method, url, middleware) {
    this.method = method;
    if (url != null) {
      this.keys = [];
      this.url = pathToRegexp(url, this.keys);
    }
    this.middleware = middleware;
  }

  match(method, url) {
    // Matching method is easy: if specified, check to see if it matches
    if (this.method != null && this.method !== method) {
      return false;
    }
    // Matching URL is harder: need to check if the regexp matches, and
    // then pull out the URL params.
    if (this.url != null) {
      const match = this.url.exec(url);
      // If the URL doesn't match, this layer doesn't match
      if (match == null) {
        return false;
      }

      // Copy over params
      this.params = {};
      for (let i = 1; i < match.length; ++i) {
        // First element of the `match` array is always the part of the URL
        // that matched.
        this.params[this.keys[i - 1].name] = decodeURIComponent(match[i]);
      }
    }

    return true;
  }
}

class Espresso {
  constructor() {
    this._stack = [];
  }

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function!');
    }
    this._stack.push(new Layer(null, null, middleware));
  }

  route(method, url, handler) {
    this._stack.push(new Layer(method, url, handler));
    return this;
  }

  get(url, handler) {
    return this.route('GET', url, handler);
  }

  listen(port, callback) {
    const handler = (req, res) => {
      this.handle(req, res, err => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });
    };
    return http.createServer(handler).listen({ port }, callback);
  }

  handle(req, res, callback) {
    let idx = 0;

    const next = (err) => {
      // If an error occurred, bypass the rest of the pipeline. In Express,
      // you would still need to look for error handling middleware, but
      // this example does not support that.
      if (err != null) {
        return setImmediate(() => callback(err));
      }
      if (idx >= this._stack.length) {
        return setImmediate(() => callback());
      }

      let layer = this._stack[idx++];
      // Find the next layer that matches
      while (idx <= this._stack.length && !layer.match(req.method, req.url)) {
        layer = this._stack[idx++];
      }
      // If no more layers, we're done.
      if (layer == null) {
        return setImmediate(() => callback());
      }

      // Decorate `req` with the layer's `params`. Make sure to do it
      // **outside** `setImmediate()` because of concurrency concerns.
      req.params = Object.assign({}, layer.params);

      setImmediate(() => {
        try {
          // Execute the layer and rely on it to call `next()`
          layer.middleware(req, res, next);
        } catch(error) {
          next(error);
        }
      });
    };

    next();
  }
}

module.exports = Espresso;
