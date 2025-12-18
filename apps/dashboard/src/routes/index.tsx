import { createFileRoute } from '@tanstack/react-router';
import BooksPage from '@/features/books/page';

export const Route = createFileRoute('/')({
  component: App,
  loader: async ({ context: { trpc, queryClient } }) => {
    const books = await queryClient.fetchQuery(trpc.books.listPublic.queryOptions());
    return { books };
  },
});

function App() {
  const { books } = Route.useLoaderData();
  return (
    <div>
      {books.map((book) => (
        <div key={book.id}>{book.title}</div>
      ))}
    </div>
  );
}
