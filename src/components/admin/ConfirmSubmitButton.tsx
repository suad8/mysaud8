"use client";

import { Button } from "@/components/ui/Button";

/** زر إرسال داخل form عادي، يطلب تأكيداً من المستخدم قبل submit فعلياً. */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...rest
}: { confirmMessage: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...rest}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
