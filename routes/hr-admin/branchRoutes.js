const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const baseURL = process.env.BASE_URL;
const googleMapKey = process.env.GOOGLE_MAP_KEY;
const moment = require('moment');
const dates = require('date-and-time');
const request = require("request");
const path = require('path');
const fs = require('fs');
const { executeOracleQuery } = require('../../config/oracle'); 
const mongoose = require('mongoose');
const axios = require('axios');
const XLSX = require('xlsx');


const formatDateMiddleware = (req, res, next) => {
    const originalJson = res.json;
    const recursiveFormatDates = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key] instanceof Date) {
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

// TABLES
const BranchMaster = require('../../models/branchMasterModel');
var iot_branch_codeModel = require('../../models/iot_branch_codeModel');

router.post('/createBranch', async (req, res) => {
    try {
        const {
            BRCODE,
            BRNAME,
            BRADDRESS,
            BRLAT,
            BRLNG,
            MARKEDLAT,
            MARKEDLNG,
            MARKEDAREA,
            MEASUREMENT,
            BRSTATUS,
            BRSTARTTIME,
            BRENDTIME
        } = req.body;

        // Create a new branch record
        const newBranch = new BranchMaster({
            BRCODE,
            BRNAME,
            BRADDRESS,
            BRLAT,
            BRLNG,
            MARKEDLAT,
            MARKEDLNG,
            MARKEDAREA,
            MEASUREMENT,
            BRSTATUS,
            BRSTARTTIME,
            BRENDTIME
        });

        // Save the new branch record to the database
        const savedBranch = await newBranch.save();

        res.json({ Status: 'Success', Message: 'Branch created successfully', Data: savedBranch, Code: 200 });
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.post('/update-all-branches-location', async (req, res) => {
    try {
        const branches = await BranchMaster.find();
        const updatedBranches = [];

        for (const branch of branches) {
            const branchLocation = await iot_branch_codeModel.findOne({ branch_code: branch.BRCODE });
            if (branchLocation) {
                const updatedBranch = await BranchMaster.findOneAndUpdate(
                    { BRCODE: branch.BRCODE },
                    { 
                        BRLAT: branchLocation.branch_lat,
                        BRLNG: branchLocation.branch_long,
                        MARKEDLAT: branchLocation.branch_lat,
                        MARKEDLNG: branchLocation.branch_long
                    },
                    { new: true } // To return the updated document
                );
                if (updatedBranch) {
                    updatedBranches.push(updatedBranch);
                }
            }
        }
        return res.status(200).json({ message: 'All branch locations updated successfully', updatedBranches });
    } catch (error) {
        console.error('Error updating branch locations:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/oracle-shifgroup', async (req, res) => {
    try {
        // Step 1: Retrieve all branches from the BranchMaster table
        const branches = await BranchMaster.find();
        const skippedBranches = [];
        // Step 2: Loop through each branch
        for (const branch of branches) {
            // Step 3: Match the branch with the PA_SHGRP_MST table
            const shiftGroupQuery = `SELECT * FROM PA_SHGRP_MST WHERE PA_SGR_BRCODE = :branchCode AND PA_SGR_CODE = :NOGRP AND PA_SGR_YRCD = :yrCode`;
            const shiftGroupBindParams = { branchCode: branch.BRCODE , NOGRP: "NOGRP" , yrCode: 24 };
            const shiftGroupOptions = { autoCommit: true };
            const shiftGroupResult = await executeOracleQuery(shiftGroupQuery, shiftGroupBindParams, shiftGroupOptions);
            console.log("========shiftGroupResult",shiftGroupResult);
            if (shiftGroupResult.rows.length === 0) {
                console.log(`No shift group found for branch ${branch.BRCODE}`);
                skippedBranches.push({ branchCode: branch.BRCODE, reason: "No shift group found" });
                continue; // Skip further processing for this branch
            }

            const shiftGroup = shiftGroupResult.rows.map(row => {
                const mergedObject = {};
                shiftGroupResult.metaData.forEach((meta, index) => {
                  mergedObject[meta.name] = row[index];
                });
                return mergedObject;
              });
              // Step 4: Get the shift code (PA_SGR_SHTCD) from the matched record
              const shiftCode = shiftGroup[0].PA_SGR_SHTCD;
              console.log("========shiftCode",shiftCode);

            // Step 5: Fetch corresponding records from the PA_SHIFT_MST table
            const shiftDetailsQuery = `SELECT * FROM PA_SHIFT_MST WHERE PA_SHT_CODE = :shiftCode`;
            const shiftDetailsBindParams = { shiftCode: shiftCode };
            const shiftDetailsOptions = { autoCommit: true };
            const shiftDetailsResult = await executeOracleQuery(shiftDetailsQuery, shiftDetailsBindParams, shiftDetailsOptions);
            console.log("=========shiftDetailsResult",shiftDetailsResult);
            const shiftDetails = shiftDetailsResult.rows.map(row => {
                const mergedObject = {};
                shiftDetailsResult.metaData.forEach((meta, index) => {
                  mergedObject[meta.name] = row[index];
                });
                return mergedObject;
              });
            
            const shift = shiftDetails[0];
            console.log("=========shift",shift);
            const inTime = shift.PA_SHT_INTIME.replace(/(\d{2})(\d{2})/, '$1:$2');
            const outTime = shift.PA_SHT_OUTTIME.replace(/(\d{2})(\d{2})/, '$1:$2');
            await BranchMaster.updateOne({ BRCODE: branch.BRCODE }, {
                BRSTARTTIME: inTime,
                BRENDTIME: outTime
            });
        }

        res.json({ Status: "Success", Message: "Shift timings updated successfully", Code: 200, skippedBranches: skippedBranches });
    } catch (error) {
        console.error('Error updating shift timings:', error);
        res.status(500).json({ Status: "Failed", Message: "Internal Server Error", Code: 500 });
    }
});



router.post('/importBranches', async (req, res) => {
    try {
        if (!req.files || !req.files.xlsxFile) {
            return res.status(400).json({ Status: 'Failed', Message: 'No xlsx file uploaded', Data: {}, Code: 400 });
        }
        const xlsxFile = req.files.xlsxFile;
        const workbook = XLSX.read(xlsxFile.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const branchesData = XLSX.utils.sheet_to_json(sheet);
        const promises = branchesData.map(async branch => {
            console.log("==============branch",branch)
                let address = branch['Branch Address with PIN code'];
                
                address = address.replace(/JOHNSON\s+LIFTS\s+PVT(\.|)\s+LTD(\.|,)/gi, '')
                 .replace(/\s{2,}/g, ' ') // Remove multiple spaces
                 .trim(); 
                
                console.log("=========modifiedAddresses",address);
                

                const geocodingResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: {
                        address: address,
                        key: googleMapKey
                    }
                });
                const location = geocodingResponse.data.results[0].geometry.location;
                console.log("================location",location);
                return {
                    BRCODE: (branch['B.code'] && branch['B.code']!=undefined) ? branch['B.code'] : branch['B.code_1'],
                    BRNAME: branch['Branch Name'],
                    BRADDRESS: address,
                    BRLAT: location.lat,
                    BRLNG: location.lng
                };
            
        });
        const branchesToInsert = (await Promise.all(promises)).filter(branch => branch);
        console.log("============branchesToInsert",branchesToInsert);
        // console.log("============branchesToInsert",branchesToInsert);
        const insertedBranches = await BranchMaster.insertMany(branchesToInsert);
        // const updateResult = await BranchMaster.updateMany(
        //     { BRCODE: { $in: branchesToInsert.map(branch => branch.BRCODE) } },
        //     { $set: { ...branchesToInsert } },
        //     { upsert: true }
        // );

        //fs.unlinkSync(xlsxFile.tempFilePath); 
        res.json({ Status: 'Success', Message: 'Branches imported successfully', Data: branchesToInsert, Code: 200 });
    } catch (error) {
        console.error('Error importing branches:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.post('/getAllBranches', async (req, res) => {
    try {
        let filter = {};
        if (req.body.BRCODE) {
            filter.BRCODE = req.body.BRCODE;
        }
        const branches = await BranchMaster.find(filter);
        res.json({ Status: 'Success', Message: 'Branches retrieved successfully', Data: branches, Code: 200 });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});

router.get('/branches/:branchId', async (req, res) => {
    try {
        const branchId = req.params.branchId;
        const branch = await BranchMaster.findById(branchId);
        if (!branch) {
            return res.json({ Status: 'Failed', Message: 'Branch not found', Data: {}, Code: 404 });
        }
        res.json({ Status: 'Success', Message: 'Branch retrieved successfully', Data: branch, Code: 200 });
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.post('/branches/:branchId', async (req, res) => {
    try {
        const branchId = req.params.branchId;
        const updateData = req.body;
        const updatedBranch = await BranchMaster.findByIdAndUpdate(branchId, updateData, { new: true });
        if (!updatedBranch) {
            return res.json({ Status: 'Failed', Message: 'Branch not found', Data: {}, Code: 404 });
        }
        res.json({ Status: 'Success', Message: 'Branch updated successfully', Data: updatedBranch, Code: 200 });
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.delete('/branches/:branchId', async (req, res) => {
    try {
        const branchId = req.params.branchId;
        const deletedBranch = await BranchMaster.findByIdAndDelete(branchId);
        if (!deletedBranch) {
            return res.json({ Status: 'Failed', Message: 'Branch not found', Data: {}, Code: 404 });
        }
        res.json({ Status: 'Success', Message: 'Branch deleted successfully', Data: deletedBranch, Code: 200 });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


router.post('/update-plot-area', async (req, res) => {
    const branchId = req.body.id;
    const updateData = req.body;
    console.log("======update-plot-area",updateData);

    function calculateMidpoint(points) {
        const totalLat = points.reduce((sum, point) => sum + point.lat, 0);
        const totalLng = points.reduce((sum, point) => sum + point.lng, 0);
        const avgLat = totalLat / points.length;
        const avgLng = totalLng / points.length;
        return { lat: avgLat, lng: avgLng };
    }
    
    const buildingMidpoint = calculateMidpoint(req.body.MEASUREMENT.points)
    console.log("======buildingMidpoint",buildingMidpoint);
    updateData.MARKEDLAT = buildingMidpoint.lat
    updateData.MARKEDLNG = buildingMidpoint.lng
    updateData.BRLAT = buildingMidpoint.lat
    updateData.BRLNG = buildingMidpoint.lng
    console.log("======updateData",updateData);
    try {
        const updatedBranch = await BranchMaster.findByIdAndUpdate(branchId, updateData, { new: true });

        if (!updatedBranch) {
            return res.status(404).json({ Status: 'Failed', Message: 'Branch not found', Data: {}, Code: 404 });
        }

        return res.json({ Status: 'Success', Message: 'Branch updated successfully', Data: updatedBranch, Code: 200 });
    } catch (error) {
        console.error('Error updating branch:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Data: {}, Code: 500 });
    }
});


module.exports = router;
  