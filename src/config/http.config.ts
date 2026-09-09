// src/config/http.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('http', () => ({
  timeout: parseInt(process.env.HTTP_TIMEOUT || '8000', 10),
  maxRedirects: parseInt(process.env.HTTP_MAX_REDIRECTS || '5', 10),
  thirdParty: {
    baseUrl: process.env.THIRD_PARTY_API_BASE_URL || '',
    apiKey: process.env.THIRD_PARTY_API_KEY || '',
  },
}));
