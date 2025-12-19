import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/books')({
  component: RouteComponent,
  beforeLoad: async ({ context: { trpcClient } }) => {
    const books = await trpcClient.books.listPublic.query();
    console.log(books);
    // await queryClient.fetchQuery(booksQueryOptions);
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext(); // Available because of layout route
  return (
    <div>
      userId: {session.user.id}
      <br />
      sessionId: {session.session.id}
    </div>
  );
}
