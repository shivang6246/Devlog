import { Eclipse, Eyebrow, RevealText } from './design';

/** Split layout for login / register / verify / reset: cinematic quote left, form right. */
export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100svh-16rem)] items-center gap-16 py-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <aside aria-hidden="true" className="relative hidden h-full min-h-[520px] lg:block">
        <div className="absolute left-[8%] top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-[110px] haze" />
        <Eclipse className="absolute left-[12%] top-1/2 w-[340px] -translate-y-1/2" />
        <div className="absolute bottom-6 left-0 max-w-md">
          <p className="font-display text-5xl leading-[1.05] text-white">
            Every great system <em className="text-slate-400">began as a draft.</em>
          </p>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">DevLog — write · publish · share</p>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-sm lg:max-w-none">
        {eyebrow && <Eyebrow className="fade-in mb-5">{eyebrow}</Eyebrow>}
        <RevealText as="h1" text={title} className="font-display text-5xl leading-none tracking-tight text-white" />
        {subtitle && (
          <p className="fade-in mt-4 text-sm leading-relaxed text-slate-400" style={{ '--d': '300ms' }}>
            {subtitle}
          </p>
        )}
        <div className="fade-in mt-9" style={{ '--d': '450ms' }}>
          {children}
        </div>
        {footer && <div className="mt-8 text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
