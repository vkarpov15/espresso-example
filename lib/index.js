const http = require('http');

class Espresso {
  constructor() {
    this._stack = [];
  }

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function!');
    }
    this._stack.push(middleware);
  }

  route(method, url, handler) {

  }

  listen(port, callback) {
    const handler = (req, res) => {
      // `this.handle()` executes all middleware defined on this Espresso
      // app instance, will implement this method next!
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

      // Not the same as an internal Express layer, which is an object
      // wrapper around a middleware function. Using the same nomenclature
      // for consistency.
      const layer = this._stack[idx++];
      setImmediate(() => {
        try {
          // Execute the layer and rely on it to call `next()`
          layer(req, res, next);
        } catch(error) {
          next(error);
        }
      });
    };

    next();
  }
}

module.exports = Espresso;
