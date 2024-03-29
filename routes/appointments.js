var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');

const appointmentModel = require('../models/appointments.model')
const serviceModel = require('../models/services.model')
const userModel = require('../models/users.model')

/* List all appointments. */
router.get('/', function(req, res) {
    let appointmentObj = new appointmentModel();
    appointmentModel.find()
    .then(services=>{
        res.send({status:200, services: services});
    })    
});


/**Add new appointments
 * 
 * datetime
 * userClientId
 * userEmpId
 * servicesId
 * status
 * description
 */
router.post('/add',function(req, res) {
    const dateString = req.body.datetime;
    let appointmentObj = new appointmentModel(req.body);
    const [year, month, day, hour, minute] = dateString.split(/[-T:]/);
    const dt = new Date(Date.UTC(year, month - 1, day, hour, minute));

    appointmentObj.datetime = new Date(dt);
    getSumMinutesServices(req.body.servicesId)
    .then(async sum => {
        let dtemp = new Date(dt);
        dtemp.setMinutes(dtemp.getMinutes()+sum);
        appointmentObj.dateFin = new Date(dtemp);
        
        await verrifAppointmentDurationConflit(appointmentObj.userEmpId,appointmentObj.datetime,appointmentObj.dateFin)
        .then(data=>{                        
            let superp = false;
            data.forEach(element => {
                if(element.superpose)superp=true;
            });            
            if(!superp||data.length==0){                
                appointmentObj.save()
                .then(d=>{
                        res.send({status:201, message: 'Appointment addded successfully', id: d._id});
                })
            }else{
                let temp = [];
                data.forEach(element => {
                    if(element.superpose)temp.push(element);
                });
                res.send({status:200, error: "appointment superposition",data_error:temp});
            }
        })
        .catch(err=>{
            console.log(err);
        })
    })
    .catch(err=>{
        console.log(err);
    })
});

/**Update appointments
 * 
 * idappointment
 */
router.post('/update/:data',(req,res)=> {
    const param = req.params.data;
    appointmentModel.findById(req.body.idappointment)
    .then(appointment=>{
        if(appointment){
            if(param=="execute"||param=="cancel"){
                appointment.status = req.body.status;
                appointment.save();
                if(param=='execute'){
                    res.send({status:201, message: 'Appointment updated successfully'});
                }else{
                    res.send({status:201, message: 'Appointment canceled successfully'});
                }
            }else{
                res.send({status:200, message: 'need execute or cancel'});
            }
        }
    });
});

/**Search by date */
router.post('/search/date',(req,res)=>{
    let date1 = req.body.date1;
    let date2 = req.body.date2;
    appointmentModel.aggregate([
    {
        $match: {      
            datetime: {
                $gte: new Date(date1),
                $lte: new Date(date2)
            }
        }
    }
    ]).then(data=>{
        res.status(200).json({dataSearch: data});
    }).catch(err=>{
        res.status(200).json({error: "Can't search"});  
    });

});

/**Search by description */
router.post('/search/description',(req,res)=>{
    let search = req.body.search;    
    let userId = req.body.iduser;    
    userModel.aggregate([
        {
          $match: {
            role: 2,
            _id: new mongoose.Types.ObjectId(userId)
          }
        },
        {
          $lookup: {
            from: "appointments",
            localField: "_id",
            foreignField: "userEmpId",
            as: "userappointments"
          }
        },
        {
          $unwind: "$userappointments"
        },
        {
          $lookup: {
            from: "services",
            localField: "userappointments.servicesId",
            foreignField: "_id",
            as: "userappointments.serviceDetails"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "userappointments.userClientId",
            foreignField: "_id",
            as: "userappointments.clientDetails"
          }
        },
        {
          $match: {
            "userappointments.description": { $regex: search, $options: "i" }
          }
        },
        {
          $sort: { "userappointments.datetime": 1 } 
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            contact: 1,
            "userappointments._id": 1,
            "userappointments.datetime": 1,
            "userappointments.dateFin": 1,
            "userappointments.description": 1,
            "userappointments.status": 1,
            "userappointments.serviceDetails": 1,
            "userappointments.clientDetails._id": 1,
            "userappointments.clientDetails.name": 1
          }
        },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            email: { $first: "$email" },
            contact: { $first: "$contact" },
            userappointments: { $push: "$userappointments" }
          }
        }
      ]).then(data=>{
        res.status(200).json({dataSearch: data});
    }).catch(err=>{
        res.status(200).json({error: "Can't search"});  
    });
});

/**Get historique */
router.post('/historique', (req,res)=>{
    let iduser = req.body.iduser;
    db.appointments.aggregate([
        {
            $match: {
                userClientId: new mongoose.Types.ObjectId(iduser),
                status: "payed"
            }
        },{
            $sort:{
                datetime: -1
            }
        },{
            $lookup:{
                from: "users",
                localField: "userEmpId",
                foreignField: "_id",
                as: "employe"
            }
        },{
            $lookup:{
                from: "services",
                localField: "servicesId",
                foreignField: "_id",
                as: "services"
            }
        },{
            $project: {
                _id: 1,
                datetime: 1,
                status: 1,
                description:1,
                "employe._id": 1,
                "employe.name": 1,
                "services.name":1
            }
          }
    ])
    .then(data=>{
        res.status(200).json({dataHistory: data});
    }).catch(err=>{
        res.status(200).json({error: "Can't reach history"});  
    });
});

/**Verify if the appointments overlaps  */
async function verrifAppointmentDurationConflit(idemp,datetime,datefin){
    try{
        const date1 = new Date(datetime);
        const date2 = new Date(datefin);     
        console.log(date1, date2, idemp);
        return appointmentModel.aggregate([
        {
            $match: {
            userEmpId: new mongoose.Types.ObjectId(idemp),
            datetime: {
                $gte: new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()), 
                $lt: new Date(date1.getFullYear(), date1.getMonth(), date1.getDate() + 1) 
            }
            }
        },
        {
            $project: {
            datetime: 1,
            dateFin: 1,
            date1: date1,
            date2: date2,
            superpose: {
                $cond: [	      	
                    {
                        $or: [	      	
                            { $and: [{$gte:[date1,"$datetime"]},{$lte:[date1,"$dateFin"]}]},
                            { $and: [{$gte:[date2,"$datetime"]},{$lte:[date2,"$dateFin"]}]},
                            { $and: [{$lte:[date1,"$datetime"]},{$gte:[date2,"$dateFin"]}]}
                        ]
                    },
                    true,false
                    ]
                }
            }                  
        }
        ]);        
    }catch(err){
        console.log(err);
    }
}
/**Sum the service of the duration */
async function getSumMinutesServices(idServices) {
    try {
      const totalDuration = await serviceModel.aggregate([
        { 
            $match: {
                 _id: { 
                    $in: idServices.map(id =>new mongoose.Types.ObjectId(id)) 
                } 
            } 
        },{ 
            $group: { 
                _id: null, 
                totalDuration: { 
                    $sum: '$durationMinute' 
                } 
            } 
        } 
      ]);
  
      return totalDuration.length > 0 ? totalDuration[0].totalDuration : 0; 
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

router.post('/test',function(req, res) {
    console.log(req.body)
});

module.exports = router;
