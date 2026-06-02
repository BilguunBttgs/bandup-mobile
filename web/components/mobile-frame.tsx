// Constrains the whole app to a mobile viewport.
// On phones (< sm) it fills the screen; on larger screens it renders a
// centered, mobile-sized card — mirroring the onboarding chat layout.
export function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh justify-center sm:items-center sm:bg-secondary">
      <div className="relative flex h-svh w-full flex-col overflow-hidden bg-background sm:max-h-[800px] sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-2xl">
        {children}
      </div>
    </div>
  )
}
