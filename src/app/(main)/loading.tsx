export default function MainLoading() {
  return (
    <main className='app-shell grid min-h-[100dvh] place-items-center px-6'>
      <div role='status' aria-live='polite' className='flex flex-col items-center gap-4 text-[var(--ink)]'>
        <span
          aria-hidden='true'
          className='size-10 animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--btn)]'
        />
        <span className='text-sm font-medium'>Loading your page...</span>
      </div>
    </main>
  );
}
