var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    var db = req.sequelize;
    res.render('index')
});


module.exports = router;
