import {
  type INestApplication,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { BooksController } from './books.controller.js';
import type { CreateBookInput } from './books.schemas.js';
import { BooksService } from './books.service.js';

// Drives the controller over HTTP with the same global pipe + interceptor as
// AppModule (auth guard and DB left out), to pin down how Nest's native
// Standard Schema support treats our Zod schemas.
const book = {
  id: '0199a6b2-7c3e-7d4f-8a1b-2c3d4e5f6a7b',
  title: 'Dune',
  status: 'draft',
  publishedAt: new Date('1965-08-01T00:00:00.000Z'),
};

const booksService = { getBooks: vi.fn(), createBook: vi.fn() };

describe('BooksController', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        { provide: BooksService, useValue: booksService },
        { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    await app.init();

    booksService.createBook.mockResolvedValue(book);
    booksService.getBooks.mockResolvedValue([book]);
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes the parsed body (with coercion) to the handler', async () => {
    await request(app.getHttpServer())
      .post('/books')
      .send({ title: 'Dune', publishedAt: '1965-08-01' })
      .expect(201);

    const input = booksService.createBook.mock.lastCall?.[0] as CreateBookInput;
    expect(input.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid body with a 400 listing each issue', async () => {
    const res = await request(app.getHttpServer())
      .post('/books')
      .send({ title: '', publishedAt: '1965-08-01', status: 'bogus' })
      .expect(400);

    const { message } = res.body as { message: string[] };
    expect(message).toEqual([
      expect.stringMatching(/^title: /),
      expect.stringMatching(/^status: /),
    ]);
    expect(booksService.createBook).not.toHaveBeenCalled();
  });

  it('strips fields not in the response schema', async () => {
    booksService.getBooks.mockResolvedValue([{ ...book, internalNote: 'secret' }]);

    await request(app.getHttpServer())
      .get('/books')
      .expect(200)
      .expect([{ ...book, publishedAt: book.publishedAt.toISOString() }]);
  });

  it('fails with a 500 when the handler returns an off-schema response', async () => {
    booksService.getBooks.mockResolvedValue([{ ...book, status: 'not-a-status' }]);

    await request(app.getHttpServer()).get('/books').expect(500);
  });
});
