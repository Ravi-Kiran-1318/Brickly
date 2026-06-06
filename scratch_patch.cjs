const fs = require('fs');
const files = [
  'server/controllers/contractor.js',
  'server/controllers/dealerController.js',
  'server/controllers/professionalController.js'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('deleteAllNotifications')) {
    content = content.replace(/exports\.deleteNotification = async \(req, res\) => \{[\s\S]*?\};\n/, match => {
      return match + `\nexports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};\n`;
    });
    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  }
}
const routes = [
  { path: 'server/routes/contractor.js', ctrl: 'contractorController' },
  { path: 'server/routes/dealer.js', ctrl: 'dealerController' },
  { path: 'server/routes/professional.js', ctrl: 'professionalController' }
];
for (const route of routes) {
  let content = fs.readFileSync(route.path, 'utf8');
  if (!content.includes('/notifications/delete-all')) {
    content = content.replace(/(router\.delete\('\/notifications\/:id',\s*\w+\.deleteNotification\);)/, 
      `router.delete('/notifications/delete-all', ${route.ctrl}.deleteAllNotifications);\n$1`);
    fs.writeFileSync(route.path, content);
    console.log(`Patched ${route.path}`);
  }
}
