---
description: "React hooks patterns and best practices"
paths:
  - "src/hooks/**/*.ts"
  - "src/features/**/hooks/**/*.ts"
---

# React Hooks

## Custom Hook Structure

### GOOD

```tsx
export function useUsers(filters?: UserFilters) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        setIsLoading(true);
        const data = await api.getUsers(filters);
        if (!cancelled) {
          setUsers(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchUsers();
    return () => { cancelled = true; };
  }, [filters]);

  return { users, isLoading, error };
}
```

### BAD

```tsx
// Missing cleanup, no error handling
export function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(setUsers);
  }, []);

  return users;
}
```

## useActionState (React 19)

### GOOD

```tsx
async function submitForm(prevState: FormState, formData: FormData) {
  const result = await api.submit(formData);
  return { success: true, data: result };
}

function Form() {
  const [state, formAction, isPending] = useActionState(submitForm, { success: false });

  return (
    <form action={formAction}>
      <input name="email" disabled={isPending} />
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
      {state.success && <p>Success!</p>}
    </form>
  );
}
```

## useOptimistic (React 19)

### GOOD

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  );

  async function handleAdd(formData: FormData) {
    const newTodo = { id: crypto.randomUUID(), text: formData.get('text') };
    addOptimisticTodo(newTodo);
    await api.addTodo(newTodo);
  }

  return (
    <form action={handleAdd}>
      <input name="text" />
      <ul>
        {optimisticTodos.map(todo => <li key={todo.id}>{todo.text}</li>)}
      </ul>
    </form>
  );
}
```

## use() Hook (React 19)

### GOOD

```tsx
// Unwrap promise in render
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}

// Unwrap context conditionally
function ThemeButton({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext);
    return <button style={{ color: theme.primary }}>Themed</button>;
  }
  return <button>Default</button>;
}
```

## useMemo / useCallback

### GOOD

```tsx
// Expensive computation
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// Stable callback for child components
const handleSelect = useCallback(
  (id: string) => onSelect(items.find(item => item.id === id)),
  [items, onSelect]
);
```

### BAD

```tsx
// Unnecessary memoization
const name = useMemo(() => user.firstName + ' ' + user.lastName, [user]);

// Missing dependency
const handleClick = useCallback(() => {
  doSomething(value); // value not in deps
}, []);
```

## useEffect Cleanup

### GOOD

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData);

  return () => controller.abort();
}, [url]);
```

### BAD

```tsx
useEffect(() => {
  // No cleanup for subscriptions
  socket.on('message', handleMessage);
}, []);
```
