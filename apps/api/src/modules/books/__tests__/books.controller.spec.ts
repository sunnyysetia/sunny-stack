import {
  type INestApplication,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { BooksController } from '../books.controller';
import type { CreateBookInput } from '../books.schemas';
import { BooksService } from '../books.service';

// Boots the controller over real HTTP with the same global pipe + interceptor
// as AppModule (auth guard and DB left out), to pin down how Nest's native
// Standard Schema support treats our Zod schemas.
const book = {
  id: '0199a6b2-7c3e-7d4f-8a1b-2c3d4e5f6a7b',
  title: 'Dune',
  status: 'draft',
  publishedAt: new Date('1965-08-01T00:00:00.000Z'),
};

const booksService = { getBooks: vi.fn(), createBook: vi.fn() };

describe('BooksController (native Zod validation)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        { provide: BooksService, useValue: booksService },
        { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    booksService.createBook.mockResolvedValue(book);
    booksService.getBooks.mockResolvedValue([book]);
  });

  const post = (body: unknown) =>
    fetch(`${baseUrl}/books`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('passes the parsed body (with coercion) to the handler', async () => {
    const res = await post({ title: 'Dune', publishedAt: '1965-08-01' });

    expect(res.status).toBe(201);
    const input = booksService.createBook.mock.lastCall?.[0] as CreateBookInput;
    expect(input.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid body with a 400 listing each issue', async () => {
    const res = await post({ title: '', publishedAt: '1965-08-01', status: 'bogus' });

    expect(res.status).toBe(400);
    const { message } = (await res.json()) as { message: string[] };
    expect(message).toEqual([
      expect.stringMatching(/^title: /),
      expect.stringMatching(/^status: /),
    ]);
    expect(booksService.createBook).not.toHaveBeenCalled();
  });

  it('strips fields not in the response schema', async () => {
    booksService.getBooks.mockResolvedValue([{ ...book, internalNote: 'secret' }]);

    const res = await fetch(`${baseUrl}/books`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ ...book, publishedAt: book.publishedAt.toISOString() }]);
  });

  it('fails with a 500 when the handler returns an off-schema response', async () => {
    booksService.getBooks.mockResolvedValue([{ ...book, status: 'not-a-status' }]);

    const res = await fetch(`${baseUrl}/books`);

    expect(res.status).toBe(500);
  });
});
