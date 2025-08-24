const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const moment = require('moment');

class OCRService {
  constructor() {
    this.worker = null;
    this.initWorker();
  }

  async initWorker() {
    try {
      this.worker = await Tesseract.createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-.: ',
      });
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }

  async preprocessImage(imageBuffer) {
    try {
      // Enhance image for better OCR accuracy
      const processedImage = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();
      
      return processedImage;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageBuffer;
    }
  }

  async extractDatesFromImage(imageBuffer) {
    try {
      if (!this.worker) {
        await this.initWorker();
      }

      const processedImage = await this.preprocessImage(imageBuffer);
      const { data: { text } } = await this.worker.recognize(processedImage);
      
      return this.parseDatesFromText(text);
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        error: 'Failed to extract dates from image',
        extractedText: '',
        dates: {}
      };
    }
  }

  parseDatesFromText(text) {
    const dates = {};
    const extractedText = text.replace(/\n/g, ' ').trim();
    
    // Common date patterns
    const datePatterns = [
      // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
      // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
      // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
      // Month DD, YYYY
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi,
      // DD Month YYYY
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi
    ];

    const foundDates = [];
    
    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(extractedText)) !== null) {
        foundDates.push(match[0]);
      }
    });

    // Look for specific keywords
    const keywords = {
      expiry: ['exp', 'expiry', 'expires', 'use by', 'use before'],
      bestBefore: ['best before', 'best by', 'bb', 'best'],
      manufactured: ['mfg', 'manufactured', 'mfd', 'made', 'production']
    };

    // Try to categorize dates based on nearby keywords
    foundDates.forEach(dateStr => {
      const dateIndex = extractedText.toLowerCase().indexOf(dateStr.toLowerCase());
      const contextBefore = extractedText.toLowerCase().substring(Math.max(0, dateIndex - 20), dateIndex);
      const contextAfter = extractedText.toLowerCase().substring(dateIndex, dateIndex + dateStr.length + 20);
      const context = contextBefore + ' ' + contextAfter;

      let dateType = 'unknown';
      
      // Check for expiry keywords
      if (keywords.expiry.some(keyword => context.includes(keyword))) {
        dateType = 'expiry';
      }
      // Check for best before keywords
      else if (keywords.bestBefore.some(keyword => context.includes(keyword))) {
        dateType = 'bestBefore';
      }
      // Check for manufactured keywords
      else if (keywords.manufactured.some(keyword => context.includes(keyword))) {
        dateType = 'manufactured';
      }

      // Parse the date
      const parsedDate = this.parseDate(dateStr);
      if (parsedDate && parsedDate.isValid()) {
        if (!dates[dateType] || moment(parsedDate).isAfter(dates[dateType])) {
          dates[dateType] = parsedDate.format('YYYY-MM-DD');
        }
      }
    });

    // If we found dates but couldn't categorize them, assume the latest is expiry
    if (Object.keys(dates).length === 0 && foundDates.length > 0) {
      const latestDate = foundDates
        .map(dateStr => this.parseDate(dateStr))
        .filter(date => date && date.isValid())
        .sort((a, b) => b.diff(a))[0];
      
      if (latestDate) {
        dates.expiry = latestDate.format('YYYY-MM-DD');
      }
    }

    return {
      success: true,
      extractedText,
      dates,
      foundDates
    };
  }

  parseDate(dateStr) {
    const formats = [
      'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD',
      'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD',
      'DD.MM.YYYY', 'MM.DD.YYYY', 'YYYY.MM.DD',
      'MMM DD, YYYY', 'DD MMM YYYY',
      'MMMM DD, YYYY', 'DD MMMM YYYY'
    ];

    for (const format of formats) {
      const parsed = moment(dateStr, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }

    return null;
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new OCRService();
