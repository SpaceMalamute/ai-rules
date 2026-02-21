---
description: "React Router v7 routing and code splitting"
paths:
  - "**/src/router.*"
  - "**/src/routes/**"
  - "**/src/pages/**"
  - "**/src/app/routes/**"
---

# React Router v7

## Router Setup

### GOOD

```tsx
// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    lazy: {
      Component: () => import('./routes/root').then(m => m.Root),
    },
    children: [
      {
        index: true,
        lazy: {
          loader: () => import('./routes/home.loader').then(m => m.loader),
          Component: () => import('./routes/home').then(m => m.Home),
        },
      },
      {
        path: 'users',
        lazy: {
          loader: () => import('./routes/users.loader').then(m => m.loader),
          Component: () => import('./routes/users').then(m => m.Users),
        },
      },
      {
        path: 'users/:userId',
        lazy: {
          loader: () => import('./routes/user-detail.loader').then(m => m.loader),
          Component: () => import('./routes/user-detail').then(m => m.UserDetail),
        },
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

### BAD

```tsx
// Don't use the old JSX route API for data-driven apps
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Loaders

### GOOD

```tsx
// src/routes/users.loader.ts
import type { LoaderFunctionArgs } from 'react-router-dom';
import { api } from '../api/client';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';

  const users = await api.getUsers({ query });
  return { users, query };
}
```

```tsx
// src/routes/users.tsx
import { useLoaderData } from 'react-router-dom';
import type { loader } from './users.loader';

export function Users() {
  const { users, query } = useLoaderData<typeof loader>();

  return (
    <section>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

### BAD

```tsx
// Don't fetch in useEffect when you have a loader
function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(setUsers);
  }, []);
}
```

## Actions (Mutations)

### GOOD

```tsx
// src/routes/user-detail.action.ts
import type { ActionFunctionArgs } from 'react-router-dom';
import { redirect } from 'react-router-dom';
import { api } from '../api/client';

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  if (request.method === 'DELETE') {
    await api.deleteUser(params.userId!);
    return redirect('/users');
  }

  const updates = Object.fromEntries(formData);
  await api.updateUser(params.userId!, updates);
  return { ok: true };
}
```

```tsx
// In the component — use Form, not onSubmit
import { Form, useNavigation } from 'react-router-dom';

export function UserDetail() {
  const user = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post">
      <input name="name" defaultValue={user.name} />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </Form>
  );
}
```

## Error Handling

### GOOD

```tsx
// Route-level error boundary
const router = createBrowserRouter([
  {
    path: '/',
    lazy: {
      Component: () => import('./routes/root').then(m => m.Root),
    },
    errorElement: <RootError />,
    children: [
      {
        path: 'users/:userId',
        lazy: {
          loader: () => import('./routes/user-detail.loader').then(m => m.loader),
          Component: () => import('./routes/user-detail').then(m => m.UserDetail),
        },
        errorElement: <UserError />,
      },
    ],
  },
]);
```

```tsx
// src/components/user-error.tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export function UserError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <p>User not found. <Link to="/users">Back to list</Link></p>;
  }

  return <p>Something went wrong.</p>;
}
```

## Navigation

### GOOD

```tsx
import { Link, NavLink, useNavigate } from 'react-router-dom';

// Declarative navigation
<Link to="/users">Users</Link>

// Active link styling
<NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
  Users
</NavLink>

// Programmatic navigation (after an action, not for data fetching)
const navigate = useNavigate();
function handleLogout() {
  auth.logout();
  navigate('/login');
}
```

### BAD

```tsx
// Don't use window.location for SPA navigation
window.location.href = '/users';

// Don't navigate in useEffect for redirects — use loader redirects
useEffect(() => {
  if (!user) navigate('/login');
}, [user]);
```
