const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const REVIEW_FILE = path.join(DATA_DIR, 'review.json');
const COMM_FILE = path.join(DATA_DIR, 'commissions.json');

// ensure commissions file exists
try { if (!fs.existsSync(COMM_FILE)) fs.writeFileSync(COMM_FILE, '[]'); } catch (e) { /* ignore */ }

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// GET reviews
app.get('/api/reviews', (req, res) => {
  fs.readFile(REVIEW_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: '리뷰 파일을 읽을 수 없습니다.' });
    try {
      const parsed = JSON.parse(data || '[]');
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: '리뷰 파일 파싱 오류' });
    }
  });
});

// POST review
app.post('/api/reviews', (req, res) => {
  const review = req.body;
  if (!review || !review.author || !review.content) {
    return res.status(400).json({ error: 'author와 content가 필요합니다.' });
  }
  fs.readFile(REVIEW_FILE, 'utf8', (err, data) => {
    let arr = [];
    try { arr = JSON.parse(data || '[]'); } catch (e) { arr = []; }
    arr.unshift(review); // newest first
    fs.writeFile(REVIEW_FILE, JSON.stringify(arr, null, 2), 'utf8', (err) => {
      if (err) return res.status(500).json({ error: '리뷰 저장 실패' });
      res.json({ success: true });
    });
  });
});

// POST commission: save and optional email
app.post('/api/commissions', (req, res) => {
  const commission = req.body;
  if (!commission || !commission.name || !commission.email || !commission.message) {
    return res.status(400).json({ error: 'name, email, message 필수' });
  }

  fs.readFile(COMM_FILE, 'utf8', (err, data) => {
    let arr = [];
    try { arr = JSON.parse(data || '[]'); } catch (e) { arr = []; }
    arr.unshift({ ...commission, date: new Date().toISOString() });
    fs.writeFile(COMM_FILE, JSON.stringify(arr, null, 2), 'utf8', async (err) => {
      if (err) return res.status(500).json({ error: '저장 실패' });

      // optional email via nodemailer
      if (process.env.SMTP_HOST && process.env.COMMISSION_RECEIVER) {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });

          const html = `<p>새 커미션 신청이 도착했습니다.</p>
            <p><strong>이름:</strong> ${commission.name}</p>
            <p><strong>이메일:</strong> ${commission.email}</p>
            <p><strong>요청:</strong><br/>${commission.message}</p>
            <p><strong>스타일:</strong> ${commission.style || ''}</p>
            <p><strong>예산:</strong> ${commission.budget || ''}</p>`;

          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.COMMISSION_RECEIVER,
            subject: `새 커미션 신청: ${commission.name}`,
            html
          });
        } catch (e) {
          console.error('이메일 전송 실패', e);
        }
      }

      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});
