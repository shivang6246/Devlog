import Link from 'next/link';
import { Eclipse } from '@/components/design';
import { primaryButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Eclipse className="absolute w-[min(18rem,78vw)] opacity-70 sm:w-96" />
      <div className="relative">
        <p className="font-display text-[7rem] leading-none text-white sm:text-[10rem]">404</p>
        <h1 className="mt-2 font-display text-3xl italic text-slate-300">Lost in the archive</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
          Page not found. This page doesn&apos;t exist, or the post hasn&apos;t been published.
        </p>
        <Link href="/" className={`${primaryButton} mt-8`}>
          Back to the feed
        </Link>
      </div>
    </div>
  );
}
