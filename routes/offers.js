var express = require('express');
var router = express.Router();
const offerModel = require('../models/offers.model')

/**Add new Service
 * name
 * coast
 * durationMinute
 */
router.post('/add',function(req, res) {
    let offerObj = new offerModel(req.body);
    offerObj.save()
    .then(d=>{
        res.send({status:201, message: 'Offer addded successfully', id: d._id});
    })
    .catch(err=>{
        console.log(err);
    })
});


router.get('/offerList',function(req,res){
    offerModel.aggregate([
        {
            $lookup:{
              from: "services",
              localField: "services",
              foreignField: "_id",
              as: "services_concerned"
            }
        },{
            $sort:{
                "start":-1
            }
        }
    ])
    .then(data=>{
        res.send({status:200, offers: data});
    })
    .catch(err=>{
        res.send({error:"error fetching offers list",message:err});
    });
});

module.exports = router;
