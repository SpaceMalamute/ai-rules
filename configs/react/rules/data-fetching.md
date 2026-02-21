---
description: "TanStack Query v5 data fetching and mutations"
paths:
  - "**/src/api/**"
  - "**/src/hooks/use*Query*"
  - "**/src/hooks/use*Mutation*"
  - "**/src/features/**/api/**"
---

# TanStack Query v5

## Provider Setup

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 minute
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

## Queries

### GOOD

```tsx
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data: users, isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### BAD

```tsx
// v4 syntax — don't use positional args
const { data, isLoading } = useQuery(['users'], fetchUsers);

// Don't use isLoading — use isPending (v5)
const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
```

## Query Keys

### GOOD

```tsx
// Hierarchical keys for cache invalidation
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Filters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Usage
useQuery({ queryKey: userKeys.detail(userId), queryFn: () => api.getUser(userId) });
useQuery({ queryKey: userKeys.list({ role: 'admin' }), queryFn: () => api.getUsers({ role: 'admin' }) });

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: userKeys.all });

// Invalidate only user lists
queryClient.invalidateQueries({ queryKey: userKeys.lists() });
```

### BAD

```tsx
// Flat, unstructured keys — hard to invalidate selectively
useQuery({ queryKey: ['users-list-admin'], queryFn: fetchAdminUsers });
useQuery({ queryKey: ['user-42'], queryFn: () => fetchUser('42') });
```

## Mutations

### GOOD

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateUserForm() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateUserInput) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      mutate({ name: formData.get('name') as string });
    }}>
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### BAD

```tsx
// Don't manually update state after mutation — invalidate queries
const { mutate } = useMutation({
  mutationFn: api.createUser,
  onSuccess: (newUser) => {
    setUsers(prev => [...prev, newUser]); // Stale, duplicated state
  },
});
```

## Optimistic Updates

### GOOD

```tsx
const { mutate } = useMutation({
  mutationFn: (data: { id: string; done: boolean }) => api.updateTodo(data),
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    const previous = queryClient.getQueryData<Todo[]>(['todos']);

    queryClient.setQueryData<Todo[]>(['todos'], old =>
      old?.map(t => t.id === newTodo.id ? { ...t, done: newTodo.done } : t)
    );

    return { previous };
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

## Dependent Queries

### GOOD

```tsx
// Second query waits for first
function UserProjects({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.getUser(userId),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', { orgId: user?.orgId }],
    queryFn: () => api.getProjects(user!.orgId),
    enabled: !!user?.orgId,
  });

  return <ProjectList projects={projects ?? []} />;
}
```

## Pagination

### GOOD

```tsx
import { keepPreviousData } from '@tanstack/react-query';

function PaginatedUsers() {
  const [page, setPage] = useState(1);

  const { data, isPlaceholderData } = useQuery({
    queryKey: ['users', { page }],
    queryFn: () => api.getUsers({ page }),
    placeholderData: keepPreviousData,
  });

  return (
    <div style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      <UserList users={data?.items ?? []} />
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)} disabled={!data?.hasMore}>
        Next
      </button>
    </div>
  );
}
```

### BAD

```tsx
// Don't use keepPreviousData as a string — it's a function in v5
useQuery({ queryKey: ['users', page], keepPreviousData: true });
```
