const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const dates = require("date-and-time");
const request = require("request");
const path = require("path");
const fs = require("fs");
const { executeOracleQuery } = require("../../config/oracle");
const mongoose = require("mongoose");
const xlsx = require('xlsx');

const moment = require('moment');

// TABLES
const EmployeeMaster = require("../../models/employeeMasterModel");
const LeaveAttendanceMaster = require("../../models/leaveAttendanceMasterModel");
const LeaveDetail = require("../../models/leaveDetailModel");
const EmployeeAttendance = require("../../models/employeeAttendanceModel");
const BranchMaster = require("../../models/branchMasterModel");
const Permission = require('../../models/permissionModel');
const admin_accessModel = require('../../models/admin_accessModel');
const EmployeeTracking = require('../../models/employeeTrackingModel');
const CompensatoryOff = require('../../models/compensatoryOffModel');
const BalanceLeave = require('../../models/balanceLeaveModel');

router.put('/update-all-employees', async (req, res) => {
    try {
        // Update all documents in the EmployeeMaster collection
        const result = await EmployeeMaster.updateMany({}, {
            $set: {
                // DEPUTATION_WITHDRAWAL_STATUS: false,
                // RESIGN_WITHDRAWAL_STATUS: false,
                // EXIT_WITHDRAWAL_STATUS: false,
                // HOLD_RELEASE_STATUS: false,
                //RESIDENTIAL_TRANSFER_STATUS: false
                BLOCKSTATUS: false
            }
        });

        // Check if any documents were updated
        if (result.nModified === 0) {
            return res.status(404).json({ message: 'No documents found or updated' });
        }

        return res.status(200).json({ message: 'EXIT_WITHDRAWAL_STATUS and HOLD_RELEASE_STATUS updated for all employees' });
    } catch (error) {
        console.error('Error updating statuses:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


// REFERENCE ALREADY EXISTS IN ORACLE-SYNC-ROUTES

router.get('/sync-attendance-to-master-table', async (req, res) => {
    try {
        // const dailyAttendance = await EmployeeAttendance.aggregate([
        //     {
        //         $group: {
        //             _id: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
        //             checkins: { $push: { $cond: [{ $eq: ["$CHECKINSTATUS", true] }, "$$ROOT", null] } },
        //             checkouts: { $push: { $cond: [{ $eq: ["$CHECKOUTSTATUS", true] }, "$$ROOT", null] } }
        //         }
        //     }
        // ]);
        const currentDate = moment().startOf('day').toDate(); 
        const dailyAttendance = await EmployeeAttendance.aggregate([
            {
                $match: {
                    LVDT: {
                        $gte: currentDate, // Records with LVDT greater than or equal to the start of the current date
                        $lt: moment(currentDate).add(1, 'day').toDate() // Records with LVDT less than the start of the next date
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$LVDT" } },
                    checkins: { $push: { $cond: [{ $eq: ["$CHECKINSTATUS", true] }, "$$ROOT", null] } },
                    checkouts: { $push: { $cond: [{ $eq: ["$CHECKOUTSTATUS", true] }, "$$ROOT", null] } }
                }
            }
        ]);
        console.log("=============sync-attendance===========",dailyAttendance)
        const syncPromises = dailyAttendance.map(async (attendance) => {
            const { _id, checkins, checkouts } = attendance;
            const LVDT = new Date(_id);
            
            // Extract the first check-in and last check-out records
            // const existingAttendanceMaster = await LeaveAttendanceMaster.findOne({ LVDT });
            // if (existingAttendanceMaster) {
            //     let ISESLVCODE = existingAttendanceMaster.ISESLVCODE;
            //     let IISESLVCODE = existingAttendanceMaster.IISESLVCODE;
            //     if (!ISESLVCODE || !IISESLVCODE) {
            //         await LeaveAttendanceMaster.updateOne(
            //             { _id: existingAttendanceMaster._id },
            //             {
            //                 $set: {
            //                     ISESLVCODE,
            //                     IISESLVCODE
            //                 }
            //             }
            //         );
            //     }
            // }

            const firstCheckin = checkins.filter(checkin => checkin)[0];
            const lastCheckout = checkouts.filter(checkout => checkout).pop();
            
            console.log("=============sync-firstCheckin===========",firstCheckin)
            console.log("=============sync-lastCheckout===========",lastCheckout)

            if (firstCheckin && lastCheckout) {
                const branchRecord = await BranchMaster.findOne({ BRCODE: firstCheckin.BRCODE });
                if (!branchRecord) {
                    console.log(`Branch with BRCODE ${firstCheckin.BRCODE} does not exist.`);
                    return;
                }

                const branchStartTime = moment(branchRecord.BRSTARTTIME, 'HH:mm');
                const branchEndTime = moment(branchRecord.BRENDTIME, 'HH:mm');
                
                const checkinTime = moment(firstCheckin.CHECKINTIME, 'HH:mm:ss');
                const checkoutTime = moment(lastCheckout.CHECKOUTTIME, 'HH:mm:ss');
                
                let gracePeriodMinutes = 5; 
                if (['TN01', 'TN11', 'TN13'].includes(branchRecord.BRCODE)) {
                    gracePeriodMinutes = 30; 
                }
                const gracePeriod = moment.duration(gracePeriodMinutes, 'minutes');

                
                const checkinBeforeStart = checkinTime.isBefore(branchStartTime.add(gracePeriod));
                const checkinAfterEnd = checkinTime.isAfter(branchEndTime.subtract(gracePeriod));

                // Check if check-out is after branch end time
                const checkoutAfterEnd = checkoutTime.isAfter(branchEndTime);

                console.log("=========branchRecord========",branchRecord);
                console.log("=========gracePeriod========",gracePeriod);
                console.log("=========branchStartTime========",branchStartTime);
                console.log("=========branchEndTime========",branchEndTime);
                console.log("=========checkinTime========",checkinTime);
                console.log("=========checkinBeforeStart========",checkinBeforeStart);
                console.log("=========checkinAfterEnd========",checkinAfterEnd);
                console.log("=========checkoutTime========",checkoutTime);
                console.log("=========checkoutAfterEnd========",checkoutAfterEnd);

                // Determine ISESLVCODE and IISESLVCODE
                let ISESLVCODE = checkinBeforeStart ? 'PT' : 'AB';
                let IISESLVCODE = checkoutAfterEnd ? 'PT' : 'AB';
                const afternoonStart = moment('12:00', 'HH:mm');
                const afternoonSession = checkinTime.isAfter(afternoonStart);
                if (afternoonSession) {
                    ISESLVCODE = 'AB';
                    if(checkoutAfterEnd) {
                        IISESLVCODE = 'PT';
                    } else {
                        IISESLVCODE = 'AB';
                    }
                }
                const newAttendanceMaster = new LeaveAttendanceMaster({
                    LVYR: moment(LVDT).format('YYYY'),
                    LVDT,
                    EMPNO: firstCheckin.EMPNO,
                    EMPNAME: firstCheckin.EMPNAME,
                    BRCODE: firstCheckin.BRCODE,
                    ISESLVCODE,
                    IISESLVCODE,
                    ENTRYBY: firstCheckin.ENTRYBY,
                    ENTRYDT: firstCheckin.LVDT,
                    MODBY: lastCheckout.ENTRYBY,
                    MODDT: lastCheckout.LVDT,
                    SOURCE: 'JLSMART',
                    TYPE: 'ATTENDANCE'
                });
                await newAttendanceMaster.save();
            }
        });
        await Promise.all(syncPromises);

        return res.json({ Status: 'Success', Message: 'Attendance synced successfully.', Code: 200 });
    } catch (error) {
        console.error('Error syncing attendance:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.post('/branch-admin-create', async (req, res) => {
    try {
        // Load the XLSX file
        if (!req.files || !req.files.xlsxFile) {
            return res.status(400).json({ Status: 'Failed', Message: 'XLSX file is required', Code: 400 });
        }

        const xlsxFile = req.files.xlsxFile;

        // Load the XLSX file
        const workbook = xlsx.read(xlsxFile.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert XLSX data to JSON format
        const data = xlsx.utils.sheet_to_json(worksheet);
        const branchAdminData = [];
        
        for (const row of data) {
            if(row['Emp No'] && row['Emp No']!=null){
                const existingUser = await admin_accessModel.findOne({ user_name: row['Emp No'] });
                if (existingUser) {
                    continue;
                }
                console.log("=========row",row);
                let filter = {};
                if (row['BRANCH \nCODE']) {
                    filter.BRCODE = row['BRANCH \nCODE'];
                }
                const branchData = await BranchMaster.findOne(filter);
                const newUser = {
                    firstname: row['EMP NAME'],
                    lastname: '', // Assuming no last name provided in the sheet
                    status: 'active', // Assuming default status is active
                    email_id: row['MAIL ID'],
                    mobile_no: row['MOBILE NO.'],
                    user_name: row['Emp No'],
                    password: 'BranchAdmin@123', // Assuming default password
                    confirm_password: 'BranchAdmin@123', // Assuming default password
                    access_location: [branchData],
                    delete_status: '0', // Assuming default delete status is false
                    type: 'employee', // Assuming default type is employee
                    type: "HRSUBADMIN",
                    last_login: new Date()
                };
            console.log("=============newUser===",newUser);
                branchAdminData.push(newUser);
                // Create the new user in the database
                //await admin_accessModel.create(newUser);
            }
        }

        console.log("============branchAdminData",branchAdminData);
        if (branchAdminData.length > 0) {
            await admin_accessModel.insertMany(branchAdminData);
        }

        res.json({ Status: 'Success', Message: 'Users added successfully',branchAdminData:branchAdminData, Code: 200 });
    } catch (error) {
        console.error('Error adding users:', error);
        res.json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }

});


router.post('/remove-duplicates', async (req, res) => {
    try {
      const distinctEmployees = await EmployeeMaster.aggregate([
        {
          $group: {
            _id: '$ECODE', // Group by ECODE field
            employee: { $first: '$$ROOT' } // Keep the first document encountered for each ECODE
          }
        },
        { $replaceRoot: { newRoot: '$employee' } } // Replace the root document with the original document
      ]);
  
      // Remove existing documents
      await EmployeeMaster.deleteMany();
  
      // Insert distinct employees back into the database
      await EmployeeMaster.insertMany(distinctEmployees);
  
      res.status(200).json({ Status: 'Success', Message: 'Duplicate records removed successfully', Data: distinctEmployees, Code: 200 });
    } catch (error) {
      res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
  });

router.post('/update-shift-timings', async (req, res) => {
    try {
      const employees = await EmployeeMaster.find({});
      const branchTimings = await BranchMaster.find({}, { _id: 0, BRCODE: 1, BRSTARTTIME: 1, BRENDTIME: 1 });
      // Update shift timings for each employee
      for (const employee of employees) {
        const branchTiming = branchTimings.find(bt => bt.BRCODE === employee.BRCODE);
        if (branchTiming) {
            employee.BRSTARTTIME = branchTiming.BRSTARTTIME;
            employee.BRENDTIME = branchTiming.BRENDTIME;
            await employee.save();
    
        }
      }
      return res.status(200).json({ message: 'Shift timings updated successfully.' });
    } catch (error) {
      console.error('Error updating shift timings:', error);
      return res.status(500).json({ message: 'Internal Server Error.' });
    }
});
  
router.post('/remove-shift-timings', async (req, res) => {
    try {
      // Update all documents in EmployeeMaster collection
      await EmployeeMaster.updateMany(
        {},
        { $unset: { SHIFTSTARTTIME: '', SHIFTENDTIME: '' } }
      );
  
      return res.status(200).json({ message: 'SHIFTSTARTTIME and SHIFTENDTIME keys and values removed successfully.' });
    } catch (error) {
      console.error('Error removing SHIFTSTARTTIME and SHIFTENDTIME keys and values:', error);
      return res.status(500).json({ message: 'Internal Server Error.' });
    }
});

router.post('/update-loc-code', async (req, res) => {
    try {
      const employeeNumbers = ["E12989", "E5451", "E0442", "E2804", "E3838", "E15199", "E12260", "E8895", "E13282", "E10435", "E16743", "E14950", "E14720", "E17353", "E3661", "E14392", "E12719", "E16106", "E17862", "E16560", "E16429", "A00631", "E13141", "E20261", "E16199", "E20681", "E9647", "E20149", "E19041", "E8342", "E14558", "E11054", "E14484", "E12779", "E12775", "E17992", "E17718", "E17717", "E21714", "E15727", "E17151", "E20223", "E11047", "E11051", "E18768", "E4599", "E15344", "E15335", "E21461", "E14466", "E17193", "E20697", "E21932", "E14922", "E5571", "E21934", "E16621", "E21752", "E22275", "E22276", "E21069", "E8173", "E4882", "E8066", "E19891", "E13455", "E2843", "E21990", "E8891", "E20988", "E13443", "E20742", "E13444", "E15133", "E21989", "E15073", "E22161", "E20301", "E14883", "E19325", "E20790", "E14304", "E16904", "E19291", "E13648", "E15723", "E21762", "E2838", "E13754", "E19287", "E12762", "E14462", "E7713", "E19012", "E18902", "E15080", "E19727", "E12769", "E13704", "E21292", "E13752", "E20192", "E16684", "E18135", "E19908", "E18134", "E21445", "E14250", "E14111", "E18136", "E22368", "E13491", "A00642", "E9146", "E18441", "E15670", "E16790", "E14859", "E14665", "E13640", "E18765", "E15959", "E13172", "E20454", "E17378", "E16653", "E17670", "E20239", "E14861", "E7815", "E13171", "E15476", "E14853", "E19340", "E16143", "E14671", "E13169", "E14862", "E18408", "E17014", "E14855", "E16562", "E19292", "E7817", "E14672", "E18398", "E17040", "E16455", "E20620", "E21210", "E20696", "E21999", "E20693", "E9295", "E20695", "E11591", "E21655", "E19027", "E14347", "E19029", "E16529", "E9150", "E14408", "E11034", "E15958", "E15671", "E13641", "E8582", "E15143", "E19331", "E20735", "E14000", "E14580", "E14582", "E19330", "E20733", "E20738", "E15434", "E13848", "E14773", "E20712", "E16765", "E12869", "E11258", "E18694", "E13352", "E18697", "E7297", "E8534", "E13347", "E17557", "E14988", "E15060", "E13174", "E19415", "E15263", "E19413", "E17642", "E20964", "E21450", "E21982", "E15852", "E16047", "E15936", "E19505", "E18223", "E19857", "E10089", "E14382", "E15295", "E21722", "E15376", "E15266", "E18217", "E21448", "E18218", "E15119", "E7865", "E13033", "E13181", "E4185", "E18675", "E15591", "E10062", "E13102", "E13181", "E15090", "E16296", "E14679", "E17926", "E10935", "E12535", "E18679", "E14458", "E13183", "E16441", "E12920", "E18676", "E15522", "E14684", "E3949", "E16057", "E15083", "E7118", "E7009", "E14996", "E20160", "E21023", "E19872", "E18841", "E14977", "E16531", "E16656", "E17108", "E18642", "E13054", "E15930", "E18667", "E11067", "E19861", "E6381", "E22089", "E14291", "E21050", "E22090", "E20899", "E22093", "E19696", "E19708", "E16540", "E9735", "E16701", "E19409", "E16537", "E15784", "E9734", "E14163", "E17750", "E7398"];
  
      const result = await EmployeeMaster.updateMany(
        { EMPNO: { $in: employeeNumbers } },
        { $set: { LOCCODE: "FIELD", RESIDENTIAL_TRANSFER_STATUS: true } }
      );

      return res.status(200).json({ message: `LOCCODE updated for ${result.nModified} employees.` });
    } catch (error) {
      console.error('Error updating LOCCODE:', error);
      return res.status(500).json({ message: 'Internal Server Error.' });
    }
});
  

router.post('/remove-entries', async (req, res) => {
    try {
      // Extract date from the request body
      const { date } = req.body;
  
      // Check if the date is provided in the correct format (e.g., "01-05-2024")
      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required.' });
      }
      let requestedDate = moment(date, "DD-MM-YYYY"); // Specify format as DD-MM-YYYY
      startDate = requestedDate.startOf('day').toDate();
      endDate = requestedDate.endOf('day').toDate();
      console.log("===startDate==date",startDate);
      console.log("===endDate==date",endDate);
      // Remove entries with LVDT falling within the specified date range
      const result = await LeaveAttendanceMaster.updateMany(
        { "attendanceRecords.TYPE": "ATTENDANCE", 'attendanceRecords.LVDT': { $gte: startDate, $lt: endDate } },
        { $pull: { attendanceRecords: { LVDT: { $gte: startDate, $lt: endDate } } } }
      );
  
      // Check if any entries were removed
      if (result.nModified > 0) {
        return res.status(200).json({ message: `Entries for date ${date} removed successfully.` });
      } else {
        return res.status(404).json({ message: `No entries found for date ${date}.` });
      }
    } catch (error) {
      console.error('Error removing entries:', error);
      return res.status(500).json({ message: 'Internal Server Error.' });
    }
  });
  
  router.post('/remove-duplicate-employees', async (req, res) => {
    try {
      const duplicateRecords = await EmployeeMaster.aggregate([
        {
          $group: {
            _id: { ECODE: '$ECODE' }, 
            count: { $sum: 1 }, 
            duplicates: { $push: '$_id' } 
          }
        },
        {
          $match: {
            count: { $gt: 1 } 
          }
        }
      ]);
  
      const deletionPromises = duplicateRecords.map(async record => {
        const duplicateIds = record.duplicates.slice(1); 
        console.log("=======duplicateIds",duplicateIds);
        await EmployeeMaster.deleteMany({ _id: { $in: duplicateIds } }); // Delete duplicates
      });
  
      // Wait for all deletions to complete
      await Promise.all(deletionPromises);
  
  
      res.status(200).json({
        Status: 'Success',
        Data: [],
        Message: 'Duplicate ECODE entries deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting duplicate ECODE entries:', error);
      res.status(500).json({
        Status: 'Error',
        Message: 'Internal Server Error'
      });
    }
  });
  


  router.get('/update-tracking-brcode', async (req, res) => {
    try {
        const trackingRecords = await EmployeeTracking.find();
        for (const record of trackingRecords) {
          const employeeRecord = await EmployeeMaster.findOne({ EMPNO: record.EMPNO });
          if (employeeRecord) {
              record.BRCODE = employeeRecord.BRCODE;
              await record.save();
          }
        }
        return res.status(200).json({ Status: 'Success', Message: 'BRCODE updated in tracking records', Code: 200 });
    } catch (error) {
        console.error('Error updating BRCODE in tracking records:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});


router.get('/update-balanceLeave-brcode', async (req, res) => {
  try {
      const trackingRecords = await BalanceLeave.find();
      for (const record of trackingRecords) {
        const employeeRecord = await EmployeeMaster.findOne({ EMPNO: record.PA_ELSTD_EMPNO });
        if (employeeRecord) {
            record.BRCODE = employeeRecord.BRCODE;
            await record.save();
        }
      }
      return res.status(200).json({ Status: 'Success', Message: 'BRCODE updated in tracking records', Code: 200 });
  } catch (error) {
      console.error('Error updating BRCODE in tracking records:', error);
      return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
  }
});


router.get('/update-admin-access-details', async (req, res) => {
  try {
      const adminAccessDetails = await admin_accessModel.find({ type:  "HRSUBADMIN" });
      for (const detail of adminAccessDetails) {
        const employeeRecord = await EmployeeMaster.findOne({ ECODE: detail.user_name });
        if (employeeRecord) {
          await  admin_accessModel.updateOne({ _id: detail._id }, { $set: { firstname: employeeRecord.ENAME } });
        }
      }
      return res.status(200).json({ Status: 'Success', Message: 'Admin access details fetched successfully', Data: adminAccessDetails, Code: 200 });
  } catch (error) {
      console.error('Error fetching admin access details:', error);
      return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
  }
});



async function updateEMPID(schema, empMap) {
    const records = await schema.find();
    for (const record of records) {
        const empId = empMap[record.EMPNO];
        if (empId) {
            record.EMPNAME = empId;
            await record.save();
        }
    }
}

router.get('/update-empid', async (req, res) => {
    try {
        // Create a map of EMPNO to _id from EmployeeMaster
        const employees = await EmployeeMaster.find({}, { ENAME: 1, EMPNO: 1, _id: 1, GRADE:1, DEPT:1 });
        const empMap = employees.reduce((acc, emp) => {
            acc[emp.EMPNO] = emp.ENAME;
            return acc;
        }, {});

        // Update EMPID in all schemas
        //await updateEMPID(CompensatoryOff, empMap);
        //await updateEMPID(BalanceLeave, empMap);
        //await updateEMPID(EmployeeTracking, empMap);
        //await updateEMPID(Permission, empMap);
        // await updateEMPID(EmployeeAttendance, empMap);
        await updateEMPID(LeaveDetail, empMap);

        res.status(200).json({ Status: 'Success', Message: 'EMPID updated successfully in all schemas', Data: {}, Code: 200 });
    } catch (error) {
        console.error('Error updating EMPID:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

// Helper function to update EMPID in LeaveAttendanceMaster
async function updateEMPIDInLeaveAttendance(empMap) {
    const records = await LeaveAttendanceMaster.find();
    for (const record of records) {
        const empId = empMap[record.EMPNO];
        if (empId) {
            record.EMPID = empId;
            await record.save();
        }
    }
}

router.get('/update-leave-attendance-empid', async (req, res) => {
    try {
        // Create a map of EMPNO to _id from EmployeeMaster
        const employees = await EmployeeMaster.find({}, { EMPNO: 1, _id: 1 });
        const empMap = employees.reduce((acc, emp) => {
            acc[emp.EMPNO] = emp._id;
            return acc;
        }, {});
        // Update EMPID in LeaveAttendanceMaster
        await updateEMPIDInLeaveAttendance(empMap);
        res.status(200).json({ Status: 'Success', Message: 'EMPID updated successfully in LeaveAttendanceMaster', Data: {}, Code: 200 });
    } catch (error) {
        console.error('Error updating EMPID:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});



module.exports = router;
