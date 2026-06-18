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
      const Notification = require('./models/Notification');
      const { sendMail } = require('./utils/mailer');
      const { getIO } = require('./socket');

      const HiredWorker = require('./models/HiredWorker');
      const User = require('./models/User');

      const expiredResignations = await HiredWorker.find({
        status: { $in: ['ResignationPending', 'ResignationAccepted'] },
        lastWorkingDate: { $lte: new Date() }
      });

      if (!expiredResignations || expiredResignations.length === 0) {
        console.log('[CRON] Cron job: No expired resignations found.');
        return; // Exit gracefully with no action
      }

      for (const hiredWorker of expiredResignations) {
        hiredWorker.status = 'Resigned';
        await hiredWorker.save();

        const prof = await User.findById(hiredWorker.professionalId);
        if (!prof) continue;

        prof.isServingNotice = false;
        prof.noticeStartDate = null;
        prof.noticeEndDate = null;
        prof.currentContractorId = null;
        prof.currentJobRole = null;
        prof.resignationReason = null;
        prof.isAvailable = true;
        await prof.save();

        const notif = new Notification({
          userId: prof._id,
          title: 'Notice Period Ended',
          message: 'Your 7-day notice period has ended. You are now free to apply to new opportunities.',
          type: 'General',
          actionTab: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY
        });
        await notif.save();

        const io = getIO();
        io.to(`user:${prof._id}`).emit('resignationComplete');

        if (prof.email) {
          await sendMail({
            to: prof.email,
            subject: 'Your notice period has ended — Welcome back to BuildR',
            html: '<p>Your 7-day notice period has ended. You are now free to apply to new opportunities.</p>'
          });
        }

        // Notify waiting contractors
        const Application = require('./models/Application');
        const JobPost = require('./models/JobPost');
        
        const pendingApplications = await Application.find({ 
          professionalId: prof._id, 
          status: 'Applied' 
        });

        for (const app of pendingApplications) {
          const job = await JobPost.findById(app.jobPostId);
          if (job) {
            const contractorNotif = new Notification({
              userId: app.contractorId,
              title: 'Candidate Available',
              message: `${prof.name} has completed their notice period and is now available to hire for your job "${job.jobRole}".`,
              type: 'Job',
              actionTab: NOTIFICATION_TABS.CONTRACTOR_MY_JOBS || 'jobs',
              relatedId: job._id
            });
            await contractorNotif.save();

            io.to(`user:${app.contractorId}`).emit('contractor:candidateAvailable', {
              professionalId: prof._id,
              jobPostId: job._id
            });
          }
        }
      }

      console.log(`[CRON] Processed ${expiredResignations.length} completed notice periods.`);
    } catch (error) {
      console.error('[CRON Resignation Error]', error);
    }
  });
};

module.exports = { initCronJobs };
