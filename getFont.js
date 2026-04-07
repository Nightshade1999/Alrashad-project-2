const https = require('https');
https.get('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Amiri-Regular.ttf', (res) => {
  if (res.statusCode === 200) {
    const file = require('fs').createWriteStream('public/fonts/Amiri-RegularConfigured.ttf');
    res.pipe(file);
    file.on('finish', () => console.log('Downloaded Amiri from CDNJS'));
  } else {
    console.log('Failed:', res.statusCode);
  }
});
