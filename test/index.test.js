const Espresso = require('../lib');
const assert = require('assert');
const axios = require('axios');
const cors = require('cors');

describe('Espresso', function() {
  let server;

  afterEach(function() {
    server && server.close();
  });

  it('works in the basic Hello, World case', async function() {
    const app = new Espresso();
    app.use((req, res, next) => {
      res.end('Hello, world!');
      next();
    });
    server = app.listen(3000);

    const res = await axios.get('http://localhost:3000');
    assert.equal(res.data, 'Hello, world!');
  });

  it('works with real Express middleware (CORS)', async function() {
    const app = new Espresso();
    app.use(cors());
    app.use((req, res, next) => {
      res.end('Hello with CORS');
      next();
    });
    server = app.listen(3000);

    const res = await axios.get('http://localhost:3000');

    // This is the header that `cors()` should set
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.data, 'Hello with CORS');
  });

  it('basic routing', async function() {
    const app = new Espresso();
    app.get('/hello/:id', (req, res) => res.end(`Hello, ${req.params.id}`));
    app.get('/goodbye/:id', (req, res) => res.end(`Goodbye, ${req.params.id}`));
    server = app.listen(3000);

    let res = await axios.get('http://localhost:3000/hello/world');
    assert.equal(res.data, 'Hello, world');

    res = await axios.get('http://localhost:3000/goodbye/everyone');
    assert.equal(res.data, 'Goodbye, everyone');
  });
});
