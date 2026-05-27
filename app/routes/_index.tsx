export default function Index() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-6 text-center'>
      <h1 className='text-4xl font-semibold tracking-tight sm:text-5xl'>
        t4t Gateway
      </h1>
      <p className='mt-4 max-w-xl text-base text-neutral-600'>
        OpenAI-compatible API on Token4Token. 50 xBZZ welcome credit, no wallet
        needed.
      </p>
      <div className='mt-8 flex gap-3'>
        <a
          href='/signup'
          className='inline-flex h-10 items-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700'
        >
          Sign up
        </a>
        <a
          href='/login'
          className='inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-medium hover:bg-neutral-100'
        >
          Log in
        </a>
      </div>
    </main>
  );
}
