import { StoreLogo } from "@/components/StoreLogo";
import type { StoreInfoSettings } from "@/server/settings";

/** شاشة «نعود قريباً» التي يراها الزوار أثناء وضع الصيانة. */
export function MaintenanceScreen({ store, message }: { store: StoreInfoSettings; message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-50 px-4 dark:bg-ink-950">
      <div className="max-w-md text-center">
        <div className="mx-auto w-fit">
          <StoreLogo name={store.name} logoUrl={store.logoUrl} size={72} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">{store.name}</h1>
        <p className="mt-2 text-lg font-semibold text-brand-700 dark:text-brand-300">نعود قريباً</p>
        {message && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{message}</p>}
        {(store.phone || store.email) && (
          <p className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            {store.phone && (
              <a href={`tel:${store.phone}`} className="num font-medium text-brand-700 hover:underline" dir="ltr">
                {store.phone}
              </a>
            )}
            {store.email && (
              <a href={`mailto:${store.email}`} className="font-medium text-brand-700 hover:underline" dir="ltr">
                {store.email}
              </a>
            )}
          </p>
        )}
      </div>
    </main>
  );
}
