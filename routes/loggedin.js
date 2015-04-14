var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
    var db = req.sequelize;
    Userlist.findAll().then(function(projects) {
        res.json(projects)
    });
});

router.post('/adduser', function(req,res){
    console.log("creating user");
    Userlist.create(req.body);
});

module.exports = router;
