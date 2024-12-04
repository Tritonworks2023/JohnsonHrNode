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

const Holiday = require('../../models/holidayModel');


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

// Create Holiday
router.post('/create-holiday', async (req, res) => {
    try {
        const holiday = new Holiday(req.body);
        await holiday.save();
        return res.status(200).json({ Status: 'Success', Message: 'Holiday Created successfully',Data: [], Code: 200 });
    } catch (error) {
        console.error('Error creating holiday:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

router.post('/update-holiday', async (req, res) => {
    try {
        const holidayId = req.body.id;
        const holiday = await Holiday.findById(holidayId);
        if (!holiday) {
            return res.status(404).json({ Status: 'Failed', Message: 'Holiday not found', Code: 404 });
        }
        holiday.HLDYYR = req.body.HLDYYR;
        holiday.HLDYDT = req.body.HLDYDT;
        holiday.BRCODE = req.body.BRCODE;
        holiday.HLDYCD = req.body.HLDYCD;
        holiday.HLDYNAME = req.body.HLDYNAME;
        await holiday.save();
        return res.status(200).json({ Status: 'Success', Message: 'Holiday updated successfully', Data: holiday, Code: 200 });
    } catch (error) {
        console.error('Error updating holiday:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});


// Read Holidays
router.get('/getHolidays', async (req, res) => {
    try {
        const holidays = await Holiday.find();
        return res.status(200).json({ Status: 'Success', Message: 'Holiday list retrieved successfully',Data: holidays, Code: 200 });
    } catch (error) {
        console.error('Error retrieving holidays:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

// Update Holiday
router.post('/getHolidayById', async (req, res) => {
    try {
        const { id } = req.body;
        const holiday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ Status: 'Success', Message: 'Holiday list retrieved successfully',Data: holiday, Code: 200 });
    } catch (error) {
        console.error('Error updating holiday:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

// Delete Holiday
router.delete('/holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Holiday.findByIdAndDelete(id);
        return res.status(200).json({ Status: 'Success', Message: 'Holiday deleted successfully',Data: [], Code: 200 });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        return res.status(500).json({ Status: 'Failed', Message: 'Internal Server Error', Code: 500 });
    }
});

module.exports = router;
