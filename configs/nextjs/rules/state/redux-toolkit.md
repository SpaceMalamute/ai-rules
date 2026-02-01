---
paths:
  - "**/*slice*.ts"
  - "**/*store*.ts"
  - "**/store/**/*.ts"
  - "**/redux/**/*.ts"
---

# Redux Toolkit State Management

Use Redux Toolkit (RTK) for complex client-side state management.

## When to Use

- Large applications with complex state
- Team already familiar with Redux
- Need advanced DevTools (time-travel debugging)
- Using RTK Query for data fetching
- Complex async logic with middleware

## Store Structure

```
libs/
  [domain]/
    data-access/
      store/
        index.ts            # Store configuration
        hooks.ts            # Typed hooks
      slices/
        user-slice.ts
        cart-slice.ts
      api/
        user-api.ts         # RTK Query
```

## Store Setup

### Configure Store

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { userSlice } from '../slices/user-slice';
import { cartSlice } from '../slices/cart-slice';
import { apiSlice } from '../api/api-slice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      user: userSlice.reducer,
      cart: cartSlice.reducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

### Typed Hooks

```typescript
// store/hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
```

### Provider Setup

```tsx
// app/providers.tsx
'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>();

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

```tsx
// app/layout.tsx
import { StoreProvider } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
```

## Creating Slices

### Basic Slice

```typescript
// slices/user-slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
  },
});

export const { setUser, logout, updateProfile } = userSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
```

### Slice with Async Thunks

```typescript
// slices/cart-slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  isLoading: false,
  error: null,
};

// Async thunk
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/cart/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch cart');
      return response.json();
    } catch (error) {
      return rejectWithValue('Failed to fetch cart');
    }
  }
);

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find((item) => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartTotal = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
export const selectCartItemCount = (state: RootState) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
```

## RTK Query (Data Fetching)

```typescript
// api/api-slice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User', 'Product'],
  endpoints: (builder) => ({
    // Queries
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Mutations
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: string; body: Partial<User> }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = apiSlice;
```

## Using in Components

### Basic Usage

```tsx
'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCurrentUser, logout } from '@/slices/user-slice';

export function UserProfile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);

  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={() => dispatch(logout())}>Logout</button>
    </div>
  );
}
```

### Using RTK Query

```tsx
'use client';

import { useGetUsersQuery, useDeleteUserMutation } from '@/api/api-slice';

export function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>
          {user.name}
          <button
            onClick={() => deleteUser(user.id)}
            disabled={isDeleting}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## Testing

### Slice Testing

```typescript
import { userSlice, setUser, logout, selectCurrentUser } from './user-slice';

describe('userSlice', () => {
  const initialState = { currentUser: null, isAuthenticated: false };

  it('should handle setUser', () => {
    const user = { id: '1', name: 'John', email: 'john@test.com' };
    const state = userSlice.reducer(initialState, setUser(user));

    expect(state.currentUser).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const loggedInState = {
      currentUser: { id: '1', name: 'John', email: 'john@test.com' },
      isAuthenticated: true,
    };
    const state = userSlice.reducer(loggedInState, logout());

    expect(state.currentUser).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
```

### Component Testing with Store

```tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { UserProfile } from './user-profile';

function renderWithStore(ui: React.ReactElement, preloadedState = {}) {
  const store = makeStore();
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('UserProfile', () => {
  it('should render user info', () => {
    renderWithStore(<UserProfile />);
    // ...
  });
});
```

## Best Practices

- Use typed hooks (`useAppDispatch`, `useAppSelector`)
- Keep slices focused on a single domain
- Use RTK Query for server state
- Use selectors for derived state
- Don't duplicate Server Component data in Redux
- Use Redux DevTools for debugging
