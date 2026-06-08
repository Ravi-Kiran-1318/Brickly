const cron = require('node-cron');
const User = require('./models/User');
const NOTIFICATION_TABS = require('../shared/notificationConstants');
// const { sendMail } = require('./utils/mailer'); // Assuming mailer exists

const initCronJobs = () => {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Starting Daily Job Alert Digest process...');
    try {
      // Find professionals who have pending job alert emails
      const professionals = await User.find({
        role: 'professional',
        'pendingJobAlertEmails.0': { $exists: true }
      });

      for (const prof of professionals) {
        if (!prof.pendingJobAlertEmails || prof.pendingJobAlertEmails.length === 0) continue;

        const jobSummaries = prof.pendingJobAlertEmails;

        // Build a styled HTML digest
        const jobsHtmlList = jobSummaries.map(job => `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin-top: 0; margin-bottom: 8px; color: #1e293b;">${job.jobRole}</h3>
            <p style="margin: 4px 0; color: #64748b;"><strong>Company:</strong> ${job.contractorName}</p>
            <p style="margin: 4px 0; color: #64748b;"><strong>Salary:</strong> ${job.salary}</p>
            <p style="margin: 4px 0; color: #64748b;"><strong>Location:</strong> ${job.workLocation}</p>
            <p style="margin: 12px 0 0 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" 
                 style="background-color: #f97316; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; display: inline-block;">
                 View Job
              </a>
            </p>
          </div>
        `).join('');

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0f172a; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">BuildR</h1>
            </div>
            <div style="background-color: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px; border-radius: 0 0 12px 12px;">
              <h2 style="margin-top: 0; color: #0f172a;">New Job Opportunities</h2>
              <p style="color: #64748b; line-height: 1.6;">Hello ${prof.name}, here are the new matching jobs posted since your last digest:</p>
              
              <div style="margin-top: 24px;">
                ${jobsHtmlList}
              </div>

              <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; pt-4">
                <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you have Job Alerts enabled on BuildR. You can change your preferences in your profile settings.</p>
              </div>
            </div>
          </div>
        `;

        // await sendMail({
        //   to: prof.email,
        //   subject: 'New Job Opportunities on BuildR',
        //   html: emailHtml
        // });

        // Clear the array after sending
        await User.findByIdAndUpdate(prof._id, {
          $set: { pendingJobAlertEmails: [] }
        });
        
        console.log(`[CRON] Sent digest with ${jobSummaries.length} jobs to ${prof.email}`);
      }
      
      console.log('[CRON] Daily Job Alert Digest process completed.');
    } catch (error) {
      console.error('[CRON Error]', error);
    }
  });

  // Run every day at midnight (00:00) to check notice periods
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Starting Resignation Notice Period Check...');
    try {
      const HiredWorker = require('./models/HiredWorker');
      const Application = require('./models/Application');
      const DirectHireRequest = require('./models/DirectHireRequest');
      const Notification = require('./models/Notification');
      const { sendMail } = require('./utils/mailer');
      const { getIO } = require('./socket');

      const today = new Date();
      // Find all ResignationAccepted where lastWorkingDate is today or earlier
      const endingWorkers = await HiredWorker.find({
        status: 'ResignationAccepted',
        lastWorkingDate: { $lte: today }
      });

      for (const worker of endingWorkers) {
        // Update HiredWorker
        worker.status = 'Resigned';
        await worker.save();

        // Update Application or DirectHireRequest
        if (worker.applicationId) {
          await Application.findByIdAndUpdate(worker.applicationId, { status: 'Resigned' });
        } else if (worker.directHireRequestId) {
          await DirectHireRequest.findByIdAndUpdate(worker.directHireRequestId, { status: 'Resigned' });
        }

        const profUser = await User.findById(worker.professionalId);
        const contractorUser = await User.findById(worker.contractorId);

        // Notify Contractor
        const contractorNotif = new Notification({
          userId: worker.contractorId,
          title: 'Team Member Has Left',
          message: `${profUser.name}'s last working day has passed. They have been removed from your active team.`,
          type: 'General',
          actionTab: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW
        });
        await contractorNotif.save();

        // Notify Professional
        const profNotif = new Notification({
          userId: worker.professionalId,
          title: 'Resignation Complete',
          message: `Your resignation is complete. You are now available for new opportunities. Post your availability to find new jobs.`,
          type: 'General',
          actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
        });
        await profNotif.save();

        const io = getIO();
        io.to(`user:${worker.contractorId}`).emit('notification', { notification: contractorNotif });
        io.to(`user:${worker.professionalId}`).emit('notification', { notification: profNotif });

        // Emails
        if (contractorUser.email) {
          await sendMail({
            to: contractorUser.email,
            subject: 'Team Member Notice Period Completed',
            html: `<p><strong>${profUser.name}</strong>'s notice period is complete and they have been removed from your active team.</p>`
          });
        }
        if (profUser.email) {
          await sendMail({
            to: profUser.email,
            subject: 'Resignation Complete',
            html: `<p>Your resignation from <strong>${contractorUser.companyName || contractorUser.name}</strong> is complete.</p>
                   <p>You are now available for new opportunities. Log in to BuildR and post your availability!</p>`
          });
        }
      }

      console.log(`[CRON] Processed ${endingWorkers.length} completed resignations.`);
    } catch (error) {
      console.error('[CRON Resignation Error]', error);
    }
  });
};

module.exports = { initCronJobs };
