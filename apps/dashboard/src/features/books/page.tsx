import { useQuery } from '@tanstack/react-query';

import { booksQueryOptions } from './api/queries';
import { BookCard } from './components/book-card';
import type { Book } from './types';

const BooksPage = () => {
  const { data: books } = useQuery(booksQueryOptions());
  return (
    <div>
      {books?.map((book: Book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
};

export default BooksPage;
