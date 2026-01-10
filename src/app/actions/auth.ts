'use server';

import { signIn } from 'next-auth/react';

export async function loginUser(email: string, password: string) {
  try {
    const result = await signIn('credentials', {
      redirect: false,
      email: email.trim(),
      password: password,
    });

    if (result?.error) {
      return { success: false, error: 'Invalid email or password' };
    }

    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Login failed' };
  }
}