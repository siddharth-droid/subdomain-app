import { redirect } from 'next/navigation';

interface CallbackPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  
  // Forward all search params to the API route
  for (const [key, value] of Object.entries(params)) {
    if (value && typeof value === 'string') {
      urlParams.append(key, value);
    }
  }
  
  // Redirect to API route which handles everything and returns HTML
  redirect(`/api/auth/callback?${urlParams.toString()}`);
}