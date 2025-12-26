// api/ocr.js
import { Buffer } from 'node:buffer';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    // Отримуємо фото від ESP32
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const imageData = Buffer.concat(chunks);

    // Перетворюємо в base64
    const base64Image = imageData.toString('base64');

    // Перевірка API ключа
    if (!process.env.OCR_API_KEY) {
      throw new Error('OCR_API_KEY not set');
    }

    // Надсилаємо в OCR.Space
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        apikey: process.env.OCR_API_KEY,
        base64Image: 'image/jpeg;base64,' + base64Image,
        language: 'eng',
        OCREngine: 2,
        scale: 'true'
      }),
    });

    const result = await ocrResponse.json();

    // Отримуємо текст
    let plateText = '';
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      plateText = result.ParsedResults[0].ParsedText || '';
    }

    // Приклад списку дозволених номерів
    const allowedPlates = (process.env.ALLOWED_PLATES || '').split(',');
    const cleanPlate = plateText.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const allowed = allowedPlates.includes(cleanPlate);

    // Повертаємо результат
    res.status(200).json({
      plate: cleanPlate,
      allowed: allowed,
      raw: plateText
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
