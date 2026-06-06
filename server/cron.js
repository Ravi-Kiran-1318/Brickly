const cron = require('node-cron');
const User = require('./models/User');
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
};

module.exports = { initCronJobs };
