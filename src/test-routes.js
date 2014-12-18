var router = require('express').Router();

router.use(function(req, res, next) {
  console.log('From router.use');
  next();
});

router.get('/thing', function(req, res) {
  console.log('GET /thing');
  res.send({
    url: req.url
  });
});

router.all('/thing/:id', function(req, res, next) {
  console.log('ALL /thing/:id');
  next();
});

router.all('/thing/:id/*', function(req, res, next) {
  console.log('ALL /thing/:id/*');
  next();
});

router.all('/thing/:id/*/zebras', function(req, res, next) {
  console.log('ALL /thing/:id/*/zebras');
  next();
});

router.get('/thing/:id', function(req, res) {
  console.log('GET /thing/:id');
  res.send({
    url: req.url,
    id: req.params.id
  });
});

router.get('/thing/:id/items', function(req, res) {
  console.log('GET /thing/:id/items');
  res.send({
    url: req.url,
    id: req.params.id
  });
});

router.get('/thing/:id/items/zebras', function(req, res) {
  console.log('GET /thing/:id/items/zebras');
  res.send({
    url: req.url,
    id: req.params.id
  });
});

module.exports = router;
