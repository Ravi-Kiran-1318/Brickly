const fs = require('fs');

const files = [
  { path: 'src/components/contractor/NotificationsTab.jsx', endpoint: '/api/contractor/notifications/delete-all' },
  { path: 'src/components/dealer/NotificationsTab.jsx', endpoint: '/api/dealer/notifications/delete-all' },
  { path: 'src/components/professional/NotificationsTab.jsx', endpoint: '/api/professional/notifications/delete-all' }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');

  // Skip if already patched
  if (content.includes('showClearConfirm')) {
    console.log(`Already patched ${file.path}`);
    continue;
  }

  // 1. Add imports
  content = content.replace(/import {([^}]+)} from '@tabler\/icons-react';/, (match, group1) => {
    return `import {${group1}, IconX, IconAlertTriangle} from '@tabler/icons-react';`;
  });

  // 2. Add state
  content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, `const [loading, setLoading] = useState(true);\n  const [showClearConfirm, setShowClearConfirm] = useState(false);`);

  // 3. Add handleDeleteAll function
  const deleteFunc = `
  const handleDeleteAll = async () => {
    try {
      await api.delete('${file.endpoint}');
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
    } catch (err) { console.error(err); }
  };
  `;
  content = content.replace(/(const fetchNotifications = async \(\) => {[\s\S]*?\n  };)/, `$1\n${deleteFunc}`);

  // 4. Update the header
  const headerRegex = /(<h2 className="text-2xl[^>]*>.*?<\/h2>)\s*\{notifications\.some\(n => !n\.isRead\) && \([\s\S]*?<\/button>\s*\)\}/;
  content = content.replace(headerRegex, (match, h2) => {
    return `${h2}
        <div className="flex gap-4">
          {notifications.some(n => !n.isRead) && (
            <button onClick={markAllAsRead || handleReadAll} className="text-sm font-bold text-accent hover:underline flex items-center gap-1.5 transition-all">
               <IconCheck size={18}/> Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)} className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1.5 transition-all">
               <IconTrash size={18}/> Clear all
            </button>
          )}
        </div>`;
  });

  // Handle Mark All as Read alias
  content = content.replace('onClick={markAllAsRead || handleReadAll}', file.path.includes('contractor') ? 'onClick={handleReadAll}' : 'onClick={markAllAsRead}');

  // 5. Add popup markup before the last </div>
  const popupMarkup = `
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 relative z-10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <IconAlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-primary dark:text-white mb-2">Delete all notifications?</h3>
            <p className="text-slate-500 text-sm mb-8">This action cannot be undone. Are you sure you want to permanently delete all notifications?</p>
            <div className="flex gap-4">
               <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
               <button onClick={handleDeleteAll} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  `;
  content = content.replace(/<\/div>\s*<AnimatePresence>/, `${popupMarkup}\n      <AnimatePresence>`);
  
  if (!content.includes(popupMarkup.trim().split('\\n')[0])) {
     // If not replaced (contractor doesn't have AnimatePresence usually)
     content = content.replace(/<\/div>\s*\);\s*};\s*export default NotificationsTab;/, `${popupMarkup}\n  );\n};\n\nexport default NotificationsTab;`);
  }

  fs.writeFileSync(file.path, content);
  console.log(`Patched frontend ${file.path}`);
}
