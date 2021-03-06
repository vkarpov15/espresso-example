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

  it('using router', async function() {
    const app = new Espresso();

    const nestedRouter = Espresso.Router();
    nestedRouter.get('/own', (req, res) => res.end('Wrote your own Express!'));

    const router = Espresso.Router();
    router.use('/your', nestedRouter);

    app.use('/write', router);

    server = app.listen(3000);

    let res = await axios.get('http://localhost:3000/write/your/own');
    assert.equal(res.data, 'Wrote your own Express!');
  });

  it('using async/await', async function() {
    const app = new Espresso();

    // This does **not** currently work with Express, the request will just
    // hang forever.
    app.get('/', async function(req, res) {
      throw new Error('woops!');
    });

    server = app.listen(3000);

    let threw = false;
    try {
      await axios.get('http://localhost:3000/');
    } catch (error) {
      assert.equal(error.response.status, 500);
      assert.equal(error.response.data, 'Internal Server Error');
      threw = true;
    }
    assert.ok(threw);
  });
});
