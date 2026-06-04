const express = require('express');
const router = express.Router();
const contractorController = require('./controllers/contractor');
const jobController = require('./controllers/jobController');
const professionalController = require('./controllers/professionalController');
const portfolioController = require('./controllers/portfolioController');
const procurementController = require('./controllers/procurementController');

const handlers = [
    ['contractorController.getProfile', contractorController.getProfile],
    ['contractorController.updateProfile', contractorController.updateProfile],
    ['contractorController.getStats', contractorController.getStats],
    ['jobController.createJob', jobController.createJob],
    ['jobController.getMyJobs', jobController.getMyJobs],
    ['jobController.updateJob', jobController.updateJob],
    ['jobController.deleteJob', jobController.deleteJob],
    ['jobController.getApplicants', jobController.getApplicants],
    ['jobController.updateApplicantStatus', jobController.updateApplicantStatus],
    ['jobController.hireProfessional', jobController.hireProfessional],
    ['professionalController.getAllAvailability', professionalController.getAllAvailability],
    ['professionalController.hireDirectly', professionalController.hireDirectly],
    ['portfolioController.createPortfolio', portfolioController.createPortfolio],
    ['portfolioController.getMyPortfolio', portfolioController.getMyPortfolio],
    ['portfolioController.updatePortfolio', portfolioController.updatePortfolio],
    ['portfolioController.deletePortfolio', portfolioController.deletePortfolio],
    ['procurementController.getAllDealers', procurementController.getAllDealers],
    ['procurementController.getDealerProfile', procurementController.getDealerProfile],
    ['procurementController.sendQuoteRequest', procurementController.sendQuoteRequest],
    ['procurementController.getMyQuotes', procurementController.getMyQuotes],
    ['procurementController.acceptQuote', procurementController.acceptQuote],
    ['procurementController.getMyOrders', procurementController.getMyOrders],
    ['procurementController.getActiveDeals', procurementController.getActiveDeals],
    ['contractorController.getMyReviews', contractorController.getMyReviews],
    ['contractorController.getNotifications', contractorController.getNotifications],
    ['contractorController.readAllNotifications', contractorController.readAllNotifications],
    ['contractorController.readNotification', contractorController.readNotification],
    ['contractorController.deleteNotification', contractorController.deleteNotification],
    ['contractorController.getInterests', contractorController.getInterests],
    ['contractorController.viewInterest', contractorController.viewInterest]
];

handlers.forEach(([name, handler]) => {
    if (typeof handler !== 'function') {
        console.error(`ERROR: Handler "${name}" is not a function! (Value: ${typeof handler})`);
    } else {
        console.log(`OK: Handler "${name}" is a function.`);
    }
});
