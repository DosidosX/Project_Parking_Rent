require('dotenv').config();  // โหลดตัวแปรจากไฟล์ .env
const express = require('express');
const mqtt = require('mqtt');
const axios = require('axios');
const bodyParser = require('body-parser');
const { json } = require('express/lib/response');

const app = express();
const PORT = process.env.PORT || 18989;

// เชื่อมต่อกับ CloudMQTT โดยใช้ค่าจาก .env
const mqttClient = mqtt.connect(`mqtt://${process.env.CLOUDMQTT_SERVER}`, {
  port: process.env.CLOUDMQTT_PORT,
  username: process.env.CLOUDMQTT_USERNAME,
  password: process.env.CLOUDMQTT_PASSWORD
});

mqttClient.on('connect', () => {
  console.log('Connected to CloudMQTT');
});

// ใช้ body-parser เพื่อแปลงข้อมูล JSON
app.use(bodyParser.json());
app.get("/",(req,res) =>{
    res.send("Welcome Line MOMO SEVER!")
})
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  events.forEach((event) => {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;

      let mqttMessage = '';

      if (userMessage === 'ชำระเงินสำเร็จ') {
        mqttMessage = 'ชำระเงินสำเร็จ';
      } else if (userMessage === 'ชำระเงินไม่สำเร็จ') {
        mqttMessage = 'ชำระเงินไม่สำเร็จ';
      }

      if (mqttMessage) {
        // ส่งข้อความผ่าน MQTT ไปยัง ESP8266
        mqttClient.publish('parkingproject', mqttMessage);
      }

      // ส่งข้อความตอบกลับไปยัง LINE โดยใช้ Channel Access Token จาก .env
      const reply = {
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `กำลังดำเนินการ: ${userMessage}`,
          },
        ],
      };

      axios.post(
        'https://api.line.me/v2/bot/message/reply',
        reply,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
        }
      ).catch(error => {
        console.error('Error replying message:', error);
      });
    }
  });

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
