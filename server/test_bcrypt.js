const bcrypt = require('bcryptjs');
bcrypt.hash('test', 10).then(h => console.log('OK', h)).catch(e => console.log('FAIL', e));
