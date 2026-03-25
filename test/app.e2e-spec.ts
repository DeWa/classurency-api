import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createConfiguredE2eApp } from './e2e-bootstrap';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createConfiguredE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect('Hello World!');
  });
});
