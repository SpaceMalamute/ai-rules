---
description: "React state management patterns"
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# React State Management

## Local State

### GOOD

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### BAD

```tsx
// Don't use refs for render-affecting state
function Counter() {
  const countRef = useRef(0);
  return <button onClick={() => countRef.current++}>Count: {countRef.current}</button>;
}
```

## Derived State

### GOOD

```tsx
function FilteredList({ items, filter }: Props) {
  // Derive during render, no state needed
  const filteredItems = items.filter(item => item.name.includes(filter));

  return <ul>{filteredItems.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
```

### BAD

```tsx
function FilteredList({ items, filter }: Props) {
  // Unnecessary state sync
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  useEffect(() => {
    setFilteredItems(items.filter(item => item.name.includes(filter)));
  }, [items, filter]);
}
```

## useReducer for Complex State

### GOOD

```tsx
type State = { items: Item[]; loading: boolean; error: Error | null };
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
  }
}
```

## Context for Shared State

### GOOD

```tsx
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext value={{ user, login, logout }}>
      {children}
    </AuthContext>
  );
}
```

### BAD

```tsx
// Missing null check in custom hook
export function useAuth() {
  return useContext(AuthContext); // Could be null
}

// Putting everything in one giant context
const AppContext = createContext({
  user: null,
  theme: 'light',
  locale: 'en',
  cart: [],
  // ... everything else
});
```

## Server State (TanStack Query)

### GOOD

```tsx
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error error={error} />;

  return <ul>{data.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### BAD

```tsx
// Reimplementing query caching manually
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
}
```

## State Colocation

### GOOD

```tsx
// State lives where it's used
function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchInput value={query} onChange={setQuery} />
      <SearchResults query={query} />
    </>
  );
}
```

### BAD

```tsx
// State lifted too high
function App() {
  const [searchQuery, setSearchQuery] = useState(''); // Only used in one page
  return <SearchPage query={searchQuery} onQueryChange={setSearchQuery} />;
}
```
