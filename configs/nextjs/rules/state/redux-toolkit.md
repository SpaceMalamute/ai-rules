---
description: "Redux Toolkit with Next.js"
paths:
  - "**/*slice*.ts"
  - "**/*store*.ts"
  - "**/store/**/*.ts"
  - "**/redux/**/*.ts"
---

# Redux Toolkit State Management

## Store Setup

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

## Typed Hooks

```typescript
// store/hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
```

## Provider (Next.js Specific)

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

## Creating Slices

```typescript
// slices/user-slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  },
});

export const { setUser, logout } = userSlice.actions;

// Co-locate selectors with slice
export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
```

## Async Thunks

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

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

// In slice — handle all 3 states
export const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[], isLoading: false, error: null as string | null },
  reducers: { /* sync reducers */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCart.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload; })
      .addCase(fetchCart.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});
```

## RTK Query

```typescript
// api/api-slice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User', 'Product'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetUsersQuery, useGetUserQuery, useCreateUserMutation } = apiSlice;
```

## Anti-patterns

```typescript
// BAD: Don't duplicate Server Component data in Redux
// If data is fetched server-side, pass it as props — don't re-fetch in Redux

// BAD: Using Redux for everything
// Use Redux for complex client state, not for server state (use Server Components)
// or simple local state (use useState)

// BAD: Not using typed hooks
const dispatch = useDispatch(); // Untyped!
// GOOD:
const dispatch = useAppDispatch(); // Typed
```
