
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const dates = require('date-and-time');
const request = require("request");
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const moment = require('moment');

// TABLES
const EmployeeMaster = require('../../models/employeeMasterModel');
const EmployeeAttendance = require('../../models/employeeAttendanceModel');
const BranchMaster = require('../../models/branchMasterModel');
const EmployeeTracking = require('../../models/employeeTrackingModel');
const TrackingNotification = require('../../models/trackingNotificationModel');
const EmployeeLiveTracking = require("../../models/live_trackingModel");


function isTimeWithinRange(time, startTime, endTime) {
    return moment(time, 'HH:mm').isSameOrAfter(moment(startTime, 'HH:mm')) && moment(time, 'HH:mm').isSameOrBefore(moment(endTime, 'HH:mm'));
}

// const formatDateMiddleware = (req, res, next) => {
//     const originalJson = res.json;
//     const recursiveFormatDates = (obj) => {
//         for (const key in obj) {
//             if (obj.hasOwnProperty(key)) {
//                 if (obj[key] instanceof Date) {
//                     obj[key] = moment(obj[key]).format('DD-MM-YYYY');
//                 } else if (typeof obj[key] === 'object') {
//                     recursiveFormatDates(obj[key]);
//                 }
//             }
//         }
//     };
//     res.json = function (body) {
//         if (typeof body === 'object') {
//             recursiveFormatDates(body);
//         }
//         originalJson.call(this, body);
//     };
//     next();
// };

const formatDateMiddleware = (req, res, next) => {
    const originalJson = res.json;
    const recursiveFormatDates = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key] instanceof Date) {
                    obj[`${key}TIME`] = moment(obj[key]).format('DD-MM-YYYY HH:mm');
                    obj[key] = moment(obj[key]).format('DD-MM-YYYY');
                } else if (typeof obj[key] === 'object') {
                    recursiveFormatDates(obj[key]);
                }
            }
        }
    };
    res.json = function (body) {
        if (typeof body === 'object') {
            recursiveFormatDates(body);
        }
        originalJson.call(this, body);
    };
    next();
};

router.use(formatDateMiddleware);


function calculateDistanceMeter(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Convert to meters

//    return d;
}

function isWithinRadius(lat, lng, brlat, brlng, radius = 50) {
    const earthRadius = 6371000;
    const latRad = lat * Math.PI / 180;
    const lngRad = lng * Math.PI / 180;
    const brlatRad = brlat * Math.PI / 180;
    const brlngRad = brlng * Math.PI / 180;

    const dLat = brlatRad - latRad;
    const dLng = brlngRad - lngRad;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latRad) * Math.cos(brlatRad) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance <= radius;
}
  

router.post('/create-tracking', async (req, res) => {
    try {
        const { EMPNO, ENAME, REPMGR, REPHR, LATITUDE, LONGITUDE, ADDRESS, ACTIVITY, BRCODE } = req.body;
        console.log("==create-tracking=============ENAME",ENAME)
        console.log("==create-tracking=============EMPNO",EMPNO)
        if (!EMPNO || !LATITUDE || !LONGITUDE || !ADDRESS || !BRCODE || !ENAME) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO, LATITUDE, LONGITUDE, and ADDRESS are required fields' });
        }

        const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
        if (!userExists) {
            return res.status(404).json({ Status: 'Failed', Message: 'User with provided EMPNO does not exist', Data: {}, Code: 404 });
        }

        const currentDate = moment().startOf('day').format('YYYY-MM-DD'); 
        const newTrackingRecord = new EmployeeTracking({
            EMPNO,
            EMPID : userExists._id,
            GRADE : userExists.GRADE,
            DEPT : userExists.DEPT,
            ENAME,
            BRCODE,
            REPMGR,
            REPHR: REPHR ? REPHR : '',
            DATE: new Date(),
            LATITUDE,
            LONGITUDE,
            ADDRESS,
            ACTIVITY
        });
        await newTrackingRecord.save();

        const employeeData = await EmployeeMaster.findOne({ ECODE: EMPNO }).select('LOCCODE');
        if(employeeData.LOCCODE == 'NONFLD') {
            const branchRecord = await BranchMaster.findOne({ BRCODE });
            const { BRLAT, BRLNG, MEASUREMENT } = branchRecord;
            let distance = 0;
            let isWithinBounds;
            if (MEASUREMENT && MEASUREMENT.points && MEASUREMENT.points.length > 0) {
                const { points } = MEASUREMENT;
                for (let i = 0; i < points.length - 1; i++) {
                    const start = points[i];
                    const end = points[i + 1];
                    const distanceStart = calculateDistance(LATITUDE, LONGITUDE, start.lat, start.lng);
                    const distanceEnd = calculateDistance(LATITUDE, LONGITUDE, end.lat, end.lng);
                    const distanceSegment = calculateDistance(start.lat, start.lng, end.lat, end.lng);
                    //console.log("===distanceStart========",distanceStart,distanceEnd, distanceSegment);
                    //console.log("===math.aps========", Math.abs(distanceStart + distanceEnd - distanceSegment) );
                    distance = Math.abs(distanceStart + distanceEnd - distanceSegment);
                    if (Math.abs(distanceStart + distanceEnd - distanceSegment) < 50) { 
                        isWithinBounds  = true;
                        break;
                    }
                }
            } else {
                isWithinBounds = isWithinRadius(LATITUDE, LONGITUDE, BRLAT, BRLNG);
                console.log("===distance=======elseeeeeeeeee===",isWithinBounds);
            }
            //console.log("==finalllllllllll=distance==========",isWithinBounds);
            if (isWithinBounds == false) {
                const currentDate = moment().toDate();
                const currentTime = moment().format('hh:mm A');
                let DESCRIPTION  = `${ENAME} - ${EMPNO} this employee away from the branch location at ${ moment().format('DD-MM-YYYY   hh:mm A') } `;
                const existingRecord = await TrackingNotification.findOne({
                    USERNO: EMPNO,
                    //DATE: currentDate,
                    TIME: currentTime
                });
                if (!existingRecord) {   
                    const trackingNotificationData = [];
                    trackingNotificationData.push({
                        EMPNO: EMPNO,
                        USERNAME: ENAME,
                        USERNO: EMPNO,
                        TRACKINGID: newTrackingRecord._id,
                        DATE: currentDate,
                        TIME: currentTime,
                        TYPE: "USER",
                        ACTIVITY,
                        DESCRIPTION: "You are away from the branch location",
                        STATUS: 'Not View'
                    });

                    if (REPMGR || REPHR) {
                    
                        if (REPMGR) {
                            trackingNotificationData.push({
                                EMPNO: REPMGR,
                                USERNAME: ENAME,
                                USERNO: EMPNO,
                                TRACKINGID: newTrackingRecord._id,
                                DATE: currentDate,
                                TIME: currentTime,
                                TYPE: "REPORTINGUSER",
                                ACTIVITY,
                                DESCRIPTION,
                                STATUS: 'Not View'
                            });
                        }
                        if (REPHR) {
                            trackingNotificationData.push({
                                EMPNO: REPHR,
                                USERNAME: ENAME,
                                USERNO: EMPNO,
                                TRACKINGID: newTrackingRecord._id,
                                DATE: currentDate,
                                TIME: currentTime,
                                TYPE: "REPORTINGUSER",
                                ACTIVITY,
                                DESCRIPTION,
                                STATUS: 'Not View'
                            });
                        }
                        if (trackingNotificationData.length > 0) {
                            await TrackingNotification.insertMany(trackingNotificationData);
                        }
                    }
                }

            }
        }
        return res.status(200).json({ Status: 'Success', Message: 'Employee tracking record created successfully', Code: 200 });
    } catch (error) {
        console.error('Error creating employee tracking record:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});


router.post('/list-tracking-notification', async (req, res) => {
    try {
        const { EMPNO } = req.body;
        if (!EMPNO) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO is required' });
        }
        
        const today = moment().startOf('day'); 
        const sortedAttendance = await EmployeeAttendance.findOne({
            EMPNO,
            LVDT: { $gte: today.toDate() }
          }).sort({ ENTRYDT: -1 });
          console.log("====sortedAttendance======",sortedAttendance);
          if (sortedAttendance && sortedAttendance.CHECKINSTATUS) {
            const notification = await TrackingNotification.findOne({ EMPNO, STATUS: 'Not View', TYPE: "USER" });
            console.log("=========notification",notification, EMPNO);
            if (notification) {
                return res.status(200).json({ Status: 'Success', Message: 'Notification retrieved successfully', Data: [notification], Code: 200 });
            } else {
                return res.status(200).json({ Status: 'Success', Message: 'No notifications found', Data: [], Code: 200 });
            }
        } else {
            return res.status(200).json({ Status: 'Success', Message: 'No notifications found', Data: [], Code: 200 });
        }

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

router.post('/all-tracking-notification', async (req, res) => {
    try {
        const { EMPNO } = req.body;
        if (!EMPNO) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO is required' });
        }
        const today = moment().startOf('day'); 
        const tomorrow = moment(today).add(1, 'days'); 
        const notifications = await TrackingNotification.find({ 
            EMPNO, 
            TYPE: "REPORTINGUSER",
            DATE: {
                $gte: today.toDate(), 
                $lt: tomorrow.toDate() 
            } 
        });
        return res.status(200).json({ Status: 'Success', Message: 'List of notifications retrieved successfully', Data: notifications, Code: 200 });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

router.post('/update-tracking-notification', async (req, res) => {
    try {
        const { EMPNO, notificationId } = req.body;
        if (!EMPNO || !notificationId) {
            return res.status(400).json({ Status: 'Failed', Message: 'EMPNO, notificationId are required fields' });
        }
        const updatedNotifications = await TrackingNotification.updateMany({ EMPNO }, { STATUS: "View" });
        return res.status(200).json({ Status: 'Success', Message: 'Status updated successfully', Data: updatedNotifications, Code: 200 });
    } catch (error) {
        console.error('Error updating status:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

router.post('/list-employee-tracking', async (req, res) => {
    try {
        const trackingRecords = await EmployeeTracking.find({ STATUS : "Not View" });
        return res.status(200).json({ Status: 'Success', Message: 'Employee tracking records fetched successfully', Data: trackingRecords, Code: 200 });
    } catch (error) {
        console.error('Error fetching employee tracking records:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.post('/list-allemployee-tracking', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const filter = {};
        if (startDate && endDate) {
            filter.DATE = {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            };
        }
        if (req.body.BRCODE && Array.isArray(req.body.BRCODE)) {
            filter.BRCODE = { $in: req.body.BRCODE };
        }
        if (req.body.EMPNO && req.body.EMPNO.length > 0 ) {
            filter.EMPNO = { $in: req.body.EMPNO };
        }

        console.log("========filter",filter);
        const trackingRecords = await EmployeeTracking.find(filter);
        return res.status(200).json({ Status: 'Success', Message: 'Employee tracking records fetched successfully', Data: trackingRecords, Code: 200 });
    } catch (error) {
        console.error('Error fetching employee tracking records:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.post('/per-day-km-tracking', async (req, res) => {
    try {
        // Get the date from the query parameters
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }

        const currentDate = moment(date, 'DD-MM-YYYY').startOf('day').toDate();
        const endDate = moment(date, 'DD-MM-YYYY').endOf('day').toDate();

        // Get all tracking records for the specified date and sort by date
        const trackingRecords = await EmployeeTracking.find({ EMPNO: "E21347", DATE: { $gte: currentDate, $lte: endDate } }).sort({ DATE: 1 });

        // Calculate total distance travelled for the day
        let totalDistance = 0;

        // Iterate through the sorted records
        for (let i = 0; i < trackingRecords.length - 1; i++) {
            const currentRecord = trackingRecords[i];
            const nextRecord = trackingRecords[i + 1];

            // Calculate distance between current and next record
            const distance = calculateDistance(currentRecord, nextRecord);

            // Add distance to total
            totalDistance += distance;
        }
        totalDistance = totalDistance.toFixed(2);
        // Send the total distance travelled for the day as response
        res.json({ date: currentDate, totalDistanceKm: totalDistance });
    } catch (error) {
        console.error('Error fetching per day km tracking:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Function to calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
    const earthRadius = 6371; // Earth's radius in km
    const { LATITUDE: lat1, LONGITUDE: lon1 } = point1;
    const { LATITUDE: lat2, LONGITUDE: lon2 } = point2;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    return distance;
}



// tracking 1min for field and 1hr for non field

router.post("/create-Live-tracking", async (req, res) => {
    try {
      const {
        EMPNO,
        ENAME,
        REPMGR,
        REPHR,
        LATITUDE,
        LONGITUDE,
        ADDRESS,
        ACTIVITY,
        BRCODE,
      } = req.body;
      console.log("==create-tracking=============ENAME", ENAME);
      console.log("==create-tracking=============EMPNO", EMPNO);
      if (!EMPNO || !LATITUDE || !LONGITUDE || !ADDRESS || !BRCODE || !ENAME) {
        return res
          .status(400)
          .json({
            Status: "Failed",
            Message:
              "EMPNO, LATITUDE, LONGITUDE, and ADDRESS are required fields",
          });
      }
  
      const userExists = await EmployeeMaster.findOne({ ECODE: EMPNO });
      if (!userExists) {
        return res
          .status(404)
          .json({
            Status: "Failed",
            Message: "User with provided EMPNO does not exist",
            Data: {},
            Code: 404,
          });
      }
  
      const currentDate = moment().startOf("day").format("YYYY-MM-DD");
      const newTrackingRecord = new EmployeeLiveTracking({
        EMPNO,
        EMPID: userExists._id,
        GRADE: userExists.GRADE,
        DEPT: userExists.DEPT,
        ENAME,
        BRCODE,
        REPMGR,
        REPHR: REPHR ? REPHR : "",
        DATE: new Date(),
        LATITUDE,
        LONGITUDE,
        ADDRESS,
        ACTIVITY,
      });
      await newTrackingRecord.save();
  
      const employeeData = await EmployeeMaster.findOne({ ECODE: EMPNO }).select('LOCCODE');
      if(employeeData.LOCCODE == 'NONFLD') {
          const branchRecord = await BranchMaster.findOne({ BRCODE });
          const { BRLAT, BRLNG, MEASUREMENT } = branchRecord;
          let distance = 0;
          let isWithinBounds;
          if (MEASUREMENT && MEASUREMENT.points && MEASUREMENT.points.length > 0) {
              const { points } = MEASUREMENT;
              for (let i = 0; i < points.length - 1; i++) {
                  const start = points[i];
                  const end = points[i + 1];
                  const distanceStart = calculateDistance(LATITUDE, LONGITUDE, start.lat, start.lng);
                  const distanceEnd = calculateDistance(LATITUDE, LONGITUDE, end.lat, end.lng);
                  const distanceSegment = calculateDistance(start.lat, start.lng, end.lat, end.lng);
                  //console.log("===distanceStart========",distanceStart,distanceEnd, distanceSegment);
                  //console.log("===math.aps========", Math.abs(distanceStart + distanceEnd - distanceSegment) );
                  distance = Math.abs(distanceStart + distanceEnd - distanceSegment);
                  if (Math.abs(distanceStart + distanceEnd - distanceSegment) < 50) {
                      isWithinBounds  = true;
                      break;
                  }
              }
          } else {
              isWithinBounds = isWithinRadius(LATITUDE, LONGITUDE, BRLAT, BRLNG);
              console.log("===distance=======elseeeeeeeeee===",isWithinBounds);
          }
          //console.log("==finalllllllllll=distance==========",isWithinBounds);
          if (isWithinBounds == false) {
              const currentDate = moment().toDate();
              const currentTime = moment().format('hh:mm A');
              let DESCRIPTION  = `${ENAME} - ${EMPNO} this employee away from the branch location at ${ moment().format('DD-MM-YYYY   hh:mm A') } `;
              const existingRecord = await TrackingNotification.findOne({
                  USERNO: EMPNO,
                  //DATE: currentDate,
                  TIME: currentTime
              });
              if (!existingRecord) {
                  const trackingNotificationData = [];
                  trackingNotificationData.push({
                      EMPNO: EMPNO,
                      USERNAME: ENAME,
                      USERNO: EMPNO,
                      TRACKINGID: newTrackingRecord._id,
                      DATE: currentDate,
                      TIME: currentTime,
                      TYPE: "USER",
                      ACTIVITY,
                      DESCRIPTION: "You are away from the branch location",
                      STATUS: 'Not View'
                  });
  
                  if (REPMGR || REPHR) {
  
                      if (REPMGR) {
                          trackingNotificationData.push({
                              EMPNO: REPMGR,
                              USERNAME: ENAME,
                              USERNO: EMPNO,
                              TRACKINGID: newTrackingRecord._id,
                              DATE: currentDate,
                              TIME: currentTime,
                              TYPE: "REPORTINGUSER",
                              ACTIVITY,
                              DESCRIPTION,
                              STATUS: 'Not View'
                          });
                      }
                      if (REPHR) {
                          trackingNotificationData.push({
                              EMPNO: REPHR,
                              USERNAME: ENAME,
                              USERNO: EMPNO,
                              TRACKINGID: newTrackingRecord._id,
                              DATE: currentDate,
                              TIME: currentTime,
                              TYPE: "REPORTINGUSER",
                              ACTIVITY,
                              DESCRIPTION,
                              STATUS: 'Not View'
                          });
                      }
                      if (trackingNotificationData.length > 0) {
                          await TrackingNotification.insertMany(trackingNotificationData);
                      }
                  }
              }
  
          }
      }
      return res
        .status(200)
        .json({
          Status: "Success",
          Message: "Employee tracking record created successfully",
          Code: 200,
        });
    } catch (error) {
      console.error("Error creating employee tracking record:", error);
      return res
        .status(500)
        .json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
    }
  });



module.exports = router;
  