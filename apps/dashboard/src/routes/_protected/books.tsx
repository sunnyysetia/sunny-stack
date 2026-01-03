import { createFileRoute } from '@tanstack/react-router';

import { booksQueryOptions } from '@/features/books/api/queries';
import BooksPage from '@/features/books/page';

export const Route = createFileRoute('/_protected/books')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(booksQueryOptions());
  },
});

function RouteComponent() {
  return <BooksPage />;
}
