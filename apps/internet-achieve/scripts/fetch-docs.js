import https from 'https';

https.get('https://kaiads.com/publishers/sdk.html', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
